import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { basename, extname } from 'node:path'

import { STUDIO_EDIT_SCHEMA } from '../../src/lib/studio-edit-schema.ts'
import {
  getSignatureAffiliationDisplayRows,
  normalizeSignatureAffiliationLines,
} from '../../src/lib/signature-identity.ts'
import { getDocumentsStore, json, parseBody, requireSession } from './_utils.mjs'

const DOCUMENT_TYPES = new Set(['resume', 'cover-letter', 'email-signature'])
const AI_TOKEN_TTL_SECONDS = 60 * 15
const AI_DRAFT_PREFIX = 'ai/drafts'
const AI_REVIEW_PREFIX = 'ai/review'
const AI_ARTIFACT_PREFIX = 'ai/artifacts'

const AI_SCOPES = [
  'schema:read',
  'documents:read',
  'drafts:write',
  'drafts:read',
  'drafts:apply',
  'exports:write',
]

const AI_ISSUED_SCOPES = [
  'schema:read',
  'documents:read',
  'drafts:write',
  'drafts:read',
  'drafts:apply',
  'exports:write',
]

const legacyRoiSlug = ['fis', 'cal-ai'].join('')

const ASSET_ALIAS_MAP = {
  '73strings': ['73strings', '73-strings'],
  bloomberg: ['bloomberg'],
  bmo: ['bmo'],
  cfa: ['cfa'],
  coursera: ['coursera'],
  csi: ['csi'],
  ets: ['ets'],
  roi: ['roi', legacyRoiSlug],
  'grant-thornton': ['grant-thornton'],
  irving: ['irving'],
  mcgill: ['mcgill'],
  'mcgill-alt': ['mcgill-alt'],
  ncc: ['ncc', 'northeast-christian-college', 'northeast_christian_college'],
  queens: ['queens'],
  'queens-alt': ['queens-alt'],
  rbc: ['rbc'],
  rotman: ['rotman'],
  td: ['td'],
  'training-the-street': ['training-the-street'],
  unb: ['unb'],
  'unb-full': ['unb-full'],
  'united-way': ['united-way'],
  uoft: ['uoft'],
  'wall-street-prep': ['wall-street-prep'],
  'profile-tyler': ['profile-tyler'],
  'profile-tyler-alt': ['profile-tyler-alt'],
  'signature-tyler': ['signature-tyler'],
}

const SIGNATURE_EXPERIENCE_LOGO_TOKENS = new Set([
  '73strings',
  'roi',
  'bmo',
  'td',
  'rbc',
  'irving',
  'grant-thornton',
])

const SIGNATURE_CERTIFICATION_LOGO_TOKENS = new Set([
  'bloomberg',
  'cfa',
  'coursera',
  'csi',
  'ets',
  'training-the-street',
  'wall-street-prep',
])

const SIGNATURE_EDUCATION_LOGO_TOKENS = {
  unb: new Set(['unb-full']),
  mcgill: new Set(['mcgill-alt', 'unb-full']),
  queens: new Set(['queens-alt', 'unb-full']),
  rotman: new Set(['rotman', 'unb-full']),
  strings: new Set(['unb-full']),
}

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const clone = (value) => JSON.parse(JSON.stringify(value))
const asString = (value, fallback = '') => (typeof value === 'string' ? value : fallback)
const asArray = (value) => (Array.isArray(value) ? value : [])
const clampEntryGroupColumns = (value) => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) return 2
  return Math.min(3, Math.max(1, Math.round(parsed)))
}
const normalizeLayout = (value) => (asString(value).toLowerCase() === 'grid' ? 'grid' : 'stack')
const normalizeColumn = (value) => (asString(value).toLowerCase() === 'right' ? 'right' : 'left')
const normalizeLogoTone = (value) => (asString(value).toLowerCase() === 'monochrome' ? 'monochrome' : 'original')
const escapeHtml = (value) =>
  asString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
const getStudioOrigin = (event) => {
  const host = event?.headers?.['x-forwarded-host'] || event?.headers?.host || 'finchat.ca'
  const proto = event?.headers?.['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

const getAiConfig = () => {
  const clientId = process.env.AI_SERVICE_CLIENT_ID
  const clientSecret = process.env.AI_SERVICE_CLIENT_SECRET
  const jwtSecret = process.env.AI_JWT_SECRET
  const issuer = process.env.AI_JWT_ISSUER || 'tylerbustard-private-studio'
  const audience = process.env.AI_JWT_AUDIENCE || 'studio-ai'

  if (!clientId || !clientSecret || !jwtSecret) {
    throw new Error('Missing AI service environment variables')
  }

  return { clientId, clientSecret, jwtSecret, issuer, audience }
}

const base64UrlEncode = (value) => Buffer.from(value, 'utf8').toString('base64url')
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8')
const signPayload = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url')

const encodeAiToken = (claims, secret) => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64UrlEncode(JSON.stringify(claims))
  const signature = signPayload(`${header}.${payload}`, secret)
  return `${header}.${payload}.${signature}`
}

const decodeAiToken = (token, secret, issuer, audience) => {
  if (!token || typeof token !== 'string') return null

  const [header, payload, signature] = token.split('.')
  if (!header || !payload || !signature) return null

  const expected = signPayload(`${header}.${payload}`, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload))
    if (
      parsed?.iss !== issuer ||
      parsed?.aud !== audience ||
      typeof parsed?.sub !== 'string' ||
      typeof parsed?.iat !== 'number' ||
      typeof parsed?.exp !== 'number' ||
      !Array.isArray(parsed?.scope)
    ) {
      return null
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

const getBearerToken = (event) => {
  const header = event.headers.authorization || event.headers.Authorization
  if (!header || typeof header !== 'string') return ''
  const match = header.match(/^Bearer\s+(.+)$/iu)
  return match?.[1] ?? ''
}

const requireAiScopes = (event, scopes) => {
  try {
    const { jwtSecret, issuer, audience } = getAiConfig()
    const claims = decodeAiToken(getBearerToken(event), jwtSecret, issuer, audience)
    if (!claims) {
      return {
        claims: null,
        response: json(401, { error: 'Invalid or expired AI token' }),
      }
    }

    const missingScope = scopes.find((scope) => !claims.scope.includes(scope))
    if (missingScope) {
      return {
        claims: null,
        response: json(403, { error: `Missing required scope: ${missingScope}` }),
      }
    }

    return { claims }
  } catch (error) {
    return {
      claims: null,
      response: json(500, { error: error instanceof Error ? error.message : 'AI auth unavailable' }),
    }
  }
}

const normalizeValueForHash = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValueForHash(item))
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalizeValueForHash(value[key])
        return accumulator
      }, {})
  }

  return value
}

const sha256 = (value) =>
  createHash('sha256').update(JSON.stringify(normalizeValueForHash(value))).digest('hex')

const sanitizeFileSegment = (value, fallback) => {
  const normalized = asString(value, fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')

  return normalized || fallback
}

const normalizeJobMetadata = (value) => {
  if (!isRecord(value)) return undefined

  const normalized = {
    jobId: asString(value.jobId),
    jobUrl: asString(value.jobUrl),
    company: asString(value.company),
    role: asString(value.role),
    packageId: asString(value.packageId),
  }

  if (Object.values(normalized).every((entry) => !entry)) {
    return undefined
  }

  return normalized
}

const assetOptionsForSource = (source) => STUDIO_EDIT_SCHEMA.assetOptions[source] ?? []
const assetLabelMap = new Map(
  Object.values(STUDIO_EDIT_SCHEMA.assetOptions)
    .flat()
    .map((option) => [option.value, option.label]),
)

const getAssetNeedle = (value) => {
  const trimmed = asString(value).trim()
  if (!trimmed) return ''

  const toBasenameNeedle = (input) => {
    const fileName = basename(input)
    const extension = extname(fileName)
    return decodeURIComponent(fileName.slice(0, extension ? -extension.length : undefined)).toLowerCase()
  }

  try {
    const url = new URL(trimmed, 'https://studio.local')
    return toBasenameNeedle(url.pathname)
  } catch {
    return toBasenameNeedle(trimmed)
  }
}

const normalizeAssetToken = (value) => {
  const trimmed = asString(value).trim()
  if (!trimmed) return ''
  if (assetLabelMap.has(trimmed)) return trimmed

  const needle = getAssetNeedle(trimmed)
  if (!needle) return trimmed

  const tokens = Object.entries(ASSET_ALIAS_MAP).sort((left, right) => right[0].length - left[0].length)
  for (const [token, patterns] of tokens) {
    if (patterns.some((pattern) => needle.includes(pattern))) {
      return token
    }
  }

  return trimmed
}

const ensureAssetToken = (value, source) => {
  const token = normalizeAssetToken(value)
  const allowed = new Set(assetOptionsForSource(source).map((option) => option.value))
  if (!allowed.has(token)) {
    throw new HttpError(422, `Unknown asset selection: ${value}`)
  }
  return token
}

const toStringArray = (value) =>
  asArray(value)
    .map((item) => asString(item).trim())
    .filter(Boolean)

const toAssetTokenList = (value, source = 'logos') => {
  const allowed = new Set(assetOptionsForSource(source).map((option) => option.value))
  const rawItems = asArray(value)
  const tokens = rawItems
    .map((item) => {
      if (isRecord(item)) return normalizeAssetToken(item.src)
      return normalizeAssetToken(item)
    })
    .filter((item) => allowed.has(item))

  return [...new Set(tokens)]
}

const getSignatureEducationLogoTokens = (templateId) =>
  SIGNATURE_EDUCATION_LOGO_TOKENS[templateId] ?? SIGNATURE_EDUCATION_LOGO_TOKENS.unb

const normalizeSignatureLogoTokens = (value, allowedTokens) =>
  toAssetTokenList(value, 'logos').filter((token) => allowedTokens.has(token))

const getAllowedSignatureLogoTokensForField = (template, descriptor) => {
  if (descriptor.documentType !== 'email-signature') return null
  if (descriptor.jsonPath === 'data.experienceLogos') return SIGNATURE_EXPERIENCE_LOGO_TOKENS
  if (descriptor.jsonPath === 'data.certificationLogos') return SIGNATURE_CERTIFICATION_LOGO_TOKENS
  if (descriptor.jsonPath === 'data.educationLogos') {
    return getSignatureEducationLogoTokens(asString(template.id, 'unb'))
  }
  return null
}

const normalizeAssetListForDescriptor = (template, descriptor, value) => {
  const tokens = toAssetTokenList(value, 'logos')
  const allowedTokens = getAllowedSignatureLogoTokensForField(template, descriptor)
  return allowedTokens ? tokens.filter((token) => allowedTokens.has(token)) : tokens
}

const assertAssetListTokenAllowed = (template, descriptor, token) => {
  const allowedTokens = getAllowedSignatureLogoTokensForField(template, descriptor)
  if (allowedTokens && !allowedTokens.has(token)) {
    throw new HttpError(422, `Logo is not allowed for ${descriptor.fieldId}: ${token}`)
  }
}

const toLogoAssets = (tokens) =>
  tokens.map((token) => ({
    src: token,
    alt: assetLabelMap.get(token) ?? token,
  }))

const setAssetField = (target, key, token) => {
  target[key] = token
  const altKey = key.replace(/Src$/u, 'Alt')
  if (altKey !== key) {
    target[altKey] = assetLabelMap.get(token) ?? token
  }
}

const resolvePathContext = (root, path) => {
  const segments = path.split('.').filter(Boolean)
  let current = root
  let parent = null
  let key = null

  for (const segment of segments) {
    parent = current
    if (Array.isArray(current)) {
      const index = current.findIndex((item) => isRecord(item) && asString(item.id) === segment)
      if (index === -1) {
        throw new HttpError(422, `Unable to resolve path segment: ${segment}`)
      }
      key = index
      current = current[index]
      continue
    }

    if (!isRecord(current) || !(segment in current)) {
      throw new HttpError(422, `Unable to resolve path: ${path}`)
    }

    key = segment
    current = current[segment]
  }

  return {
    parent,
    key,
    value: current,
  }
}

const resolvePathValue = (root, path) => resolvePathContext(root, path).value

const resolvePathValueOrFallback = (root, path, fallback) => {
  try {
    return resolvePathValue(root, path)
  } catch {
    return fallback
  }
}

const resolveWritablePathContext = (root, path) => {
  const segments = path.split('.').filter(Boolean)
  if (segments.length === 0) {
    throw new HttpError(422, `Unable to set path: ${path}`)
  }

  const parentPath = segments.slice(0, -1).join('.')
  const parent = parentPath ? resolvePathValue(root, parentPath) : root
  const finalSegment = segments[segments.length - 1]

  if (Array.isArray(parent)) {
    const index = parent.findIndex((item) => isRecord(item) && asString(item.id) === finalSegment)
    if (index === -1) {
      throw new HttpError(422, `Unable to resolve path segment: ${finalSegment}`)
    }

    return { parent, key: index }
  }

  if (!isRecord(parent)) {
    throw new HttpError(422, `Unable to resolve writable parent path: ${path}`)
  }

  return { parent, key: finalSegment }
}

const setPathValue = (root, path, nextValue) => {
  const { parent, key } = resolveWritablePathContext(root, path)
  parent[key] = nextValue
}

const getDocumentState = async (event, documentType) => {
  if (!DOCUMENT_TYPES.has(documentType)) {
    throw new HttpError(400, 'Invalid document type')
  }

  const store = getDocumentsStore(event)
  const document = await store.get(`${documentType}.json`, { type: 'json' })
  if (!document || !Array.isArray(document.templates)) {
    throw new HttpError(404, 'Document state not initialized')
  }

  return { store, state: document }
}

const getTemplateById = (state, templateId) => {
  const template = asArray(state.templates).find((entry) => isRecord(entry) && asString(entry.id) === templateId)
  if (!template) {
    throw new HttpError(404, `Template not found: ${templateId}`)
  }
  return template
}

const replaceTemplateInState = (state, templateId, nextTemplate) => ({
  ...state,
  templates: asArray(state.templates).map((template) =>
    isRecord(template) && asString(template.id) === templateId ? nextTemplate : template,
  ),
})

const saveDocumentState = async (store, documentType, state) => {
  const updatedAt = new Date().toISOString()
  await store.set(
    `${documentType}.json`,
    JSON.stringify({
      ...state,
      updatedAt,
    }),
    {
      metadata: {
        type: documentType,
        updatedAt,
      },
    },
  )

  return updatedAt
}

const getSectionMeta = (documentType, sectionId) => {
  const section = STUDIO_EDIT_SCHEMA.documents[documentType].sections.find((entry) => entry.id === sectionId)
  return section ?? { id: sectionId, label: sectionId, description: '' }
}

const getFieldTemplate = (documentType, templateGroup, key) => {
  const template = STUDIO_EDIT_SCHEMA.documents[documentType].fieldTemplates[templateGroup]?.find(
    (entry) => entry.key === key,
  )

  if (!template) {
    throw new HttpError(500, `Missing schema template for ${documentType}:${templateGroup}.${key}`)
  }

  return template
}

const buildFieldDescriptor = ({
  documentType,
  sectionId,
  templateGroup,
  key,
  jsonPath,
  currentValue,
}) => {
  const template = getFieldTemplate(documentType, templateGroup, key)
  const section = getSectionMeta(documentType, sectionId)

  return {
    documentType,
    templateSection: sectionId,
    sectionLabel: section.label,
    fieldLabel: template.fieldLabel,
    fieldId: jsonPath,
    jsonPath,
    valueType: template.valueType,
    allowedOps: template.allowedOps,
    affectsOutput: template.affectsOutput,
    locked: template.allowedOps.length === 0,
    currentValue,
    assetSource: template.assetSource,
    assetOptions: template.assetSource ? assetOptionsForSource(template.assetSource) : undefined,
  }
}

const buildCollectionDescriptor = ({
  documentType,
  sectionId,
  sectionLabel,
  collectionId,
  entryType,
  allowedOps,
  itemIds,
}) => ({
  documentType,
  templateSection: sectionId,
  sectionLabel,
  collectionId,
  jsonPath: collectionId,
  entryType,
  allowedOps,
  itemIds,
})

const buildResumeContext = (template) => {
  const data = isRecord(template.data) ? template.data : {}
  const header = isRecord(data.header) ? data.header : {}
  const contact = isRecord(header.contact) ? header.contact : {}
  const education = asArray(data.education)
  const primaryExperience = asArray(isRecord(data.experience) ? data.experience.primary : [])
  const experienceGroups = asArray(isRecord(data.experience) ? data.experience.groups : [])
  const certificationAreas = asArray(isRecord(data.certifications) ? data.certifications.areas : [])
  const leadershipGroups = asArray(data.leadership)

  const snapshot = {
    header: {
      name: asString(header.name),
      title: asString(header.title),
      profileSrc: normalizeAssetToken(header.profileSrc),
      summary: asString(header.summary),
      contact: {
        email: asString(contact.email),
        phone: asString(contact.phone),
        website: asString(contact.website),
        location: asString(contact.location),
      },
    },
    education: education.map((entry) => ({
      id: asString(entry.id),
      degree: asString(entry.degree),
      program: asString(entry.program),
      school: asString(entry.school),
      date: asString(entry.date),
      logoSrc: normalizeAssetToken(entry.logoSrc),
      bullets: toStringArray(entry.bullets),
    })),
    experience: {
      primary: primaryExperience.map((entry) => ({
        id: asString(entry.id),
        role: asString(entry.role),
        company: asString(entry.company),
        location: asString(entry.location),
        date: asString(entry.date),
        logoSrc: normalizeAssetToken(entry.logoSrc),
        bullets: toStringArray(entry.bullets),
        skills: toStringArray(entry.skills),
      })),
      groups: experienceGroups.map((group) => ({
        id: asString(group.id),
        title: asString(group.title),
        layout: normalizeLayout(group.layout),
        columns: clampEntryGroupColumns(group.columns),
        items: asArray(group.items).map((entry) => ({
          id: asString(entry.id),
          role: asString(entry.role),
          company: asString(entry.company),
          location: asString(entry.location),
          date: asString(entry.date),
          logoSrc: normalizeAssetToken(entry.logoSrc),
          bullets: toStringArray(entry.bullets),
          skills: toStringArray(entry.skills),
        })),
      })),
    },
    certifications: {
      areas: certificationAreas.map((area) => ({
        id: asString(area.id),
        title: asString(area.title),
        column: normalizeColumn(area.column),
        caption: asString(area.caption),
        summaryValue: asString(area.summaryValue),
        summaryLogos: toAssetTokenList(area.summaryLogos, 'logos'),
        items: asArray(area.items).map((entry) => ({
          id: asString(entry.id),
          name: asString(entry.name),
          issuer: asString(entry.issuer),
          year: asString(entry.year),
          detail: asString(entry.detail),
          logoSrc: normalizeAssetToken(entry.logoSrc),
          emphasis: Boolean(entry.emphasis),
        })),
      })),
    },
    leadership: leadershipGroups.map((group) => ({
      id: asString(group.id),
      title: asString(group.title),
      layout: normalizeLayout(group.layout),
      columns: clampEntryGroupColumns(group.columns),
      items: asArray(group.items).map((entry) => ({
        id: asString(entry.id),
        role: asString(entry.role),
        organization: asString(entry.organization),
        location: asString(entry.location),
        date: asString(entry.date),
        logoSrc: normalizeAssetToken(entry.logoSrc),
        bullets: toStringArray(entry.bullets),
        skills: toStringArray(entry.skills),
      })),
    })),
  }

  const fields = [
    buildFieldDescriptor({ documentType: 'resume', sectionId: 'header', templateGroup: 'header', key: 'name', jsonPath: 'data.header.name', currentValue: snapshot.header.name }),
    buildFieldDescriptor({ documentType: 'resume', sectionId: 'header', templateGroup: 'header', key: 'title', jsonPath: 'data.header.title', currentValue: snapshot.header.title }),
    buildFieldDescriptor({ documentType: 'resume', sectionId: 'header', templateGroup: 'header', key: 'profileSrc', jsonPath: 'data.header.profileSrc', currentValue: snapshot.header.profileSrc }),
    buildFieldDescriptor({ documentType: 'resume', sectionId: 'header', templateGroup: 'header', key: 'summary', jsonPath: 'data.header.summary', currentValue: snapshot.header.summary }),
    buildFieldDescriptor({ documentType: 'resume', sectionId: 'contact-rail', templateGroup: 'contactRail', key: 'email', jsonPath: 'data.header.contact.email', currentValue: snapshot.header.contact.email }),
    buildFieldDescriptor({ documentType: 'resume', sectionId: 'contact-rail', templateGroup: 'contactRail', key: 'phone', jsonPath: 'data.header.contact.phone', currentValue: snapshot.header.contact.phone }),
    buildFieldDescriptor({ documentType: 'resume', sectionId: 'contact-rail', templateGroup: 'contactRail', key: 'website', jsonPath: 'data.header.contact.website', currentValue: snapshot.header.contact.website }),
    buildFieldDescriptor({ documentType: 'resume', sectionId: 'contact-rail', templateGroup: 'contactRail', key: 'location', jsonPath: 'data.header.contact.location', currentValue: snapshot.header.contact.location }),
  ]

  for (const entry of snapshot.education) {
    fields.push(
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'education', templateGroup: 'educationEntry', key: 'degree', jsonPath: `data.education.${entry.id}.degree`, currentValue: entry.degree }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'education', templateGroup: 'educationEntry', key: 'program', jsonPath: `data.education.${entry.id}.program`, currentValue: entry.program }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'education', templateGroup: 'educationEntry', key: 'school', jsonPath: `data.education.${entry.id}.school`, currentValue: entry.school }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'education', templateGroup: 'educationEntry', key: 'date', jsonPath: `data.education.${entry.id}.date`, currentValue: entry.date }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'education', templateGroup: 'educationEntry', key: 'logoSrc', jsonPath: `data.education.${entry.id}.logoSrc`, currentValue: entry.logoSrc }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'education', templateGroup: 'educationEntry', key: 'bullets', jsonPath: `data.education.${entry.id}.bullets`, currentValue: entry.bullets }),
    )
  }

  for (const entry of snapshot.experience.primary) {
    fields.push(
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'primary-experience', templateGroup: 'experienceEntry', key: 'role', jsonPath: `data.experience.primary.${entry.id}.role`, currentValue: entry.role }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'primary-experience', templateGroup: 'experienceEntry', key: 'company', jsonPath: `data.experience.primary.${entry.id}.company`, currentValue: entry.company }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'primary-experience', templateGroup: 'experienceEntry', key: 'location', jsonPath: `data.experience.primary.${entry.id}.location`, currentValue: entry.location }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'primary-experience', templateGroup: 'experienceEntry', key: 'date', jsonPath: `data.experience.primary.${entry.id}.date`, currentValue: entry.date }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'primary-experience', templateGroup: 'experienceEntry', key: 'logoSrc', jsonPath: `data.experience.primary.${entry.id}.logoSrc`, currentValue: entry.logoSrc }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'primary-experience', templateGroup: 'experienceEntry', key: 'bullets', jsonPath: `data.experience.primary.${entry.id}.bullets`, currentValue: entry.bullets }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'primary-experience', templateGroup: 'experienceEntry', key: 'skills', jsonPath: `data.experience.primary.${entry.id}.skills`, currentValue: entry.skills }),
    )
  }

  for (const group of snapshot.experience.groups) {
    fields.push(
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceGroup', key: 'title', jsonPath: `data.experience.groups.${group.id}.title`, currentValue: group.title }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceGroup', key: 'layout', jsonPath: `data.experience.groups.${group.id}.layout`, currentValue: group.layout }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceGroup', key: 'columns', jsonPath: `data.experience.groups.${group.id}.columns`, currentValue: clampEntryGroupColumns(resolvePathValueOrFallback(template, `data.experience.groups.${group.id}.columns`, group.columns)) }),
    )

    for (const entry of group.items) {
      fields.push(
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceEntry', key: 'role', jsonPath: `data.experience.groups.${group.id}.items.${entry.id}.role`, currentValue: entry.role }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceEntry', key: 'company', jsonPath: `data.experience.groups.${group.id}.items.${entry.id}.company`, currentValue: entry.company }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceEntry', key: 'location', jsonPath: `data.experience.groups.${group.id}.items.${entry.id}.location`, currentValue: entry.location }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceEntry', key: 'date', jsonPath: `data.experience.groups.${group.id}.items.${entry.id}.date`, currentValue: entry.date }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceEntry', key: 'logoSrc', jsonPath: `data.experience.groups.${group.id}.items.${entry.id}.logoSrc`, currentValue: entry.logoSrc }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceEntry', key: 'bullets', jsonPath: `data.experience.groups.${group.id}.items.${entry.id}.bullets`, currentValue: entry.bullets }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'additional-experience', templateGroup: 'experienceEntry', key: 'skills', jsonPath: `data.experience.groups.${group.id}.items.${entry.id}.skills`, currentValue: entry.skills }),
      )
    }
  }

  for (const area of snapshot.certifications.areas) {
    fields.push(
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationArea', key: 'title', jsonPath: `data.certifications.areas.${area.id}.title`, currentValue: area.title }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationArea', key: 'column', jsonPath: `data.certifications.areas.${area.id}.column`, currentValue: area.column }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationArea', key: 'caption', jsonPath: `data.certifications.areas.${area.id}.caption`, currentValue: area.caption }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationArea', key: 'summaryValue', jsonPath: `data.certifications.areas.${area.id}.summaryValue`, currentValue: area.summaryValue }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationArea', key: 'summaryLogos', jsonPath: `data.certifications.areas.${area.id}.summaryLogos`, currentValue: area.summaryLogos }),
    )

    for (const entry of area.items) {
      fields.push(
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationItem', key: 'name', jsonPath: `data.certifications.areas.${area.id}.items.${entry.id}.name`, currentValue: entry.name }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationItem', key: 'issuer', jsonPath: `data.certifications.areas.${area.id}.items.${entry.id}.issuer`, currentValue: entry.issuer }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationItem', key: 'year', jsonPath: `data.certifications.areas.${area.id}.items.${entry.id}.year`, currentValue: entry.year }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationItem', key: 'detail', jsonPath: `data.certifications.areas.${area.id}.items.${entry.id}.detail`, currentValue: entry.detail }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationItem', key: 'logoSrc', jsonPath: `data.certifications.areas.${area.id}.items.${entry.id}.logoSrc`, currentValue: entry.logoSrc }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'grouped-certifications', templateGroup: 'certificationItem', key: 'emphasis', jsonPath: `data.certifications.areas.${area.id}.items.${entry.id}.emphasis`, currentValue: entry.emphasis }),
      )
    }
  }

  for (const group of snapshot.leadership) {
    fields.push(
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipGroup', key: 'title', jsonPath: `data.leadership.${group.id}.title`, currentValue: group.title }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipGroup', key: 'layout', jsonPath: `data.leadership.${group.id}.layout`, currentValue: group.layout }),
      buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipGroup', key: 'columns', jsonPath: `data.leadership.${group.id}.columns`, currentValue: clampEntryGroupColumns(resolvePathValueOrFallback(template, `data.leadership.${group.id}.columns`, group.columns)) }),
    )

    for (const entry of group.items) {
      fields.push(
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipItem', key: 'role', jsonPath: `data.leadership.${group.id}.items.${entry.id}.role`, currentValue: entry.role }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipItem', key: 'organization', jsonPath: `data.leadership.${group.id}.items.${entry.id}.organization`, currentValue: entry.organization }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipItem', key: 'location', jsonPath: `data.leadership.${group.id}.items.${entry.id}.location`, currentValue: entry.location }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipItem', key: 'date', jsonPath: `data.leadership.${group.id}.items.${entry.id}.date`, currentValue: entry.date }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipItem', key: 'logoSrc', jsonPath: `data.leadership.${group.id}.items.${entry.id}.logoSrc`, currentValue: entry.logoSrc }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipItem', key: 'bullets', jsonPath: `data.leadership.${group.id}.items.${entry.id}.bullets`, currentValue: entry.bullets }),
        buildFieldDescriptor({ documentType: 'resume', sectionId: 'community', templateGroup: 'leadershipItem', key: 'skills', jsonPath: `data.leadership.${group.id}.items.${entry.id}.skills`, currentValue: entry.skills }),
      )
    }
  }

  const collections = [
    buildCollectionDescriptor({
      documentType: 'resume',
      sectionId: 'education',
      sectionLabel: getSectionMeta('resume', 'education').label,
      collectionId: 'data.education',
      entryType: 'educationEntry',
      allowedOps: ['createEntry', 'deleteEntry'],
      itemIds: snapshot.education.map((entry) => entry.id),
    }),
    buildCollectionDescriptor({
      documentType: 'resume',
      sectionId: 'primary-experience',
      sectionLabel: getSectionMeta('resume', 'primary-experience').label,
      collectionId: 'data.experience.primary',
      entryType: 'experienceEntry',
      allowedOps: ['createEntry', 'deleteEntry'],
      itemIds: snapshot.experience.primary.map((entry) => entry.id),
    }),
    buildCollectionDescriptor({
      documentType: 'resume',
      sectionId: 'additional-experience',
      sectionLabel: getSectionMeta('resume', 'additional-experience').label,
      collectionId: 'data.experience.groups',
      entryType: 'experienceGroup',
      allowedOps: ['createEntry', 'deleteEntry'],
      itemIds: snapshot.experience.groups.map((entry) => entry.id),
    }),
    buildCollectionDescriptor({
      documentType: 'resume',
      sectionId: 'grouped-certifications',
      sectionLabel: getSectionMeta('resume', 'grouped-certifications').label,
      collectionId: 'data.certifications.areas',
      entryType: 'certificationArea',
      allowedOps: ['createEntry', 'deleteEntry'],
      itemIds: snapshot.certifications.areas.map((entry) => entry.id),
    }),
    buildCollectionDescriptor({
      documentType: 'resume',
      sectionId: 'community',
      sectionLabel: getSectionMeta('resume', 'community').label,
      collectionId: 'data.leadership',
      entryType: 'leadershipGroup',
      allowedOps: ['createEntry', 'deleteEntry'],
      itemIds: snapshot.leadership.map((entry) => entry.id),
    }),
  ]

  for (const group of snapshot.experience.groups) {
    collections.push(
      buildCollectionDescriptor({
        documentType: 'resume',
        sectionId: 'additional-experience',
        sectionLabel: getSectionMeta('resume', 'additional-experience').label,
        collectionId: `data.experience.groups.${group.id}.items`,
        entryType: 'experienceEntry',
        allowedOps: ['createEntry', 'deleteEntry'],
        itemIds: group.items.map((entry) => entry.id),
      }),
    )
  }

  for (const area of snapshot.certifications.areas) {
    collections.push(
      buildCollectionDescriptor({
        documentType: 'resume',
        sectionId: 'grouped-certifications',
        sectionLabel: getSectionMeta('resume', 'grouped-certifications').label,
        collectionId: `data.certifications.areas.${area.id}.items`,
        entryType: 'certificationItem',
        allowedOps: ['createEntry', 'deleteEntry'],
        itemIds: area.items.map((entry) => entry.id),
      }),
    )
  }

  for (const group of snapshot.leadership) {
    collections.push(
      buildCollectionDescriptor({
        documentType: 'resume',
        sectionId: 'community',
        sectionLabel: getSectionMeta('resume', 'community').label,
        collectionId: `data.leadership.${group.id}.items`,
        entryType: 'leadershipItem',
        allowedOps: ['createEntry', 'deleteEntry'],
        itemIds: group.items.map((entry) => entry.id),
      }),
    )
  }

  return {
    snapshot,
    fields,
    collections,
  }
}

const buildCoverLetterContext = (template) => {
  const config = isRecord(template.config) ? template.config : {}
  const data = isRecord(template.data) ? template.data : {}

  const snapshot = {
    config: {
      presetLabel: asString(config.presetLabel),
      tagline: asString(config.tagline),
      contextNote: asString(config.contextNote),
      profileSrc: normalizeAssetToken(config.profileSrc),
      signatureSrc: normalizeAssetToken(config.signatureSrc),
    },
    data: {
      yourName: asString(data.yourName),
      yourEmail: asString(data.yourEmail),
      yourPhone: asString(data.yourPhone),
      yourWebsite: asString(data.yourWebsite),
      yourAddress: asString(data.yourAddress),
      companyName: asString(data.companyName),
      position: asString(data.position),
      hiringManager: asString(data.hiringManager),
      date: asString(data.date),
      companyAddress: asString(data.companyAddress),
      openingParagraph: asString(data.openingParagraph),
      bodyParagraph1: asString(data.bodyParagraph1),
      bodyParagraph2: asString(data.bodyParagraph2),
      bodyParagraph3: asString(data.bodyParagraph3),
      closingParagraph: asString(data.closingParagraph),
      signoffLabel: asString(data.signoffLabel),
    },
  }

  const fields = [
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'template', templateGroup: 'template', key: 'presetLabel', jsonPath: 'config.presetLabel', currentValue: snapshot.config.presetLabel }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'template', templateGroup: 'template', key: 'tagline', jsonPath: 'config.tagline', currentValue: snapshot.config.tagline }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'template', templateGroup: 'template', key: 'contextNote', jsonPath: 'config.contextNote', currentValue: snapshot.config.contextNote }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'template', templateGroup: 'template', key: 'profileSrc', jsonPath: 'config.profileSrc', currentValue: snapshot.config.profileSrc }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'template', templateGroup: 'template', key: 'signatureSrc', jsonPath: 'config.signatureSrc', currentValue: snapshot.config.signatureSrc }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'sender', templateGroup: 'sender', key: 'yourName', jsonPath: 'data.yourName', currentValue: snapshot.data.yourName }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'sender', templateGroup: 'sender', key: 'yourEmail', jsonPath: 'data.yourEmail', currentValue: snapshot.data.yourEmail }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'sender', templateGroup: 'sender', key: 'yourPhone', jsonPath: 'data.yourPhone', currentValue: snapshot.data.yourPhone }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'sender', templateGroup: 'sender', key: 'yourWebsite', jsonPath: 'data.yourWebsite', currentValue: snapshot.data.yourWebsite }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'sender', templateGroup: 'sender', key: 'yourAddress', jsonPath: 'data.yourAddress', currentValue: snapshot.data.yourAddress }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'recipient', templateGroup: 'recipient', key: 'companyName', jsonPath: 'data.companyName', currentValue: snapshot.data.companyName }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'recipient', templateGroup: 'recipient', key: 'position', jsonPath: 'data.position', currentValue: snapshot.data.position }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'recipient', templateGroup: 'recipient', key: 'hiringManager', jsonPath: 'data.hiringManager', currentValue: snapshot.data.hiringManager }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'recipient', templateGroup: 'recipient', key: 'date', jsonPath: 'data.date', currentValue: snapshot.data.date }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'recipient', templateGroup: 'recipient', key: 'companyAddress', jsonPath: 'data.companyAddress', currentValue: snapshot.data.companyAddress }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'body', templateGroup: 'body', key: 'openingParagraph', jsonPath: 'data.openingParagraph', currentValue: snapshot.data.openingParagraph }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'body', templateGroup: 'body', key: 'bodyParagraph1', jsonPath: 'data.bodyParagraph1', currentValue: snapshot.data.bodyParagraph1 }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'body', templateGroup: 'body', key: 'bodyParagraph2', jsonPath: 'data.bodyParagraph2', currentValue: snapshot.data.bodyParagraph2 }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'body', templateGroup: 'body', key: 'bodyParagraph3', jsonPath: 'data.bodyParagraph3', currentValue: snapshot.data.bodyParagraph3 }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'body', templateGroup: 'body', key: 'closingParagraph', jsonPath: 'data.closingParagraph', currentValue: snapshot.data.closingParagraph }),
    buildFieldDescriptor({ documentType: 'cover-letter', sectionId: 'body', templateGroup: 'body', key: 'signoffLabel', jsonPath: 'data.signoffLabel', currentValue: snapshot.data.signoffLabel }),
  ]

  return {
    snapshot,
    fields,
    collections: [],
  }
}

const buildSignatureContext = (template) => {
  const data = isRecord(template.data) ? template.data : {}
  const templateId = asString(template.id, 'unb')
  const snapshot = {
    data: {
      name: asString(data.name),
      affiliationLines: normalizeSignatureAffiliationLines(data),
      signoff: asString(data.signoff),
      email: asString(data.email),
      website: asString(data.website),
      phone: asString(data.phone),
      location: asString(data.location),
      profileSrc: normalizeAssetToken(data.profileSrc),
      experienceLogos: normalizeSignatureLogoTokens(
        data.experienceLogos ?? data.logos,
        SIGNATURE_EXPERIENCE_LOGO_TOKENS,
      ),
      educationLogos: normalizeSignatureLogoTokens(
        data.educationLogos,
        getSignatureEducationLogoTokens(templateId),
      ),
      certificationLogos: normalizeSignatureLogoTokens(
        data.certificationLogos,
        SIGNATURE_CERTIFICATION_LOGO_TOKENS,
      ),
      logoTone: normalizeLogoTone(data.logoTone),
    },
  }

  const fields = [
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'name', jsonPath: 'data.name', currentValue: snapshot.data.name }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'affiliationLines', jsonPath: 'data.affiliationLines', currentValue: snapshot.data.affiliationLines }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'signoff', jsonPath: 'data.signoff', currentValue: snapshot.data.signoff }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'email', jsonPath: 'data.email', currentValue: snapshot.data.email }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'website', jsonPath: 'data.website', currentValue: snapshot.data.website }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'phone', jsonPath: 'data.phone', currentValue: snapshot.data.phone }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'location', jsonPath: 'data.location', currentValue: snapshot.data.location }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'profileSrc', jsonPath: 'data.profileSrc', currentValue: snapshot.data.profileSrc }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'experienceLogos', jsonPath: 'data.experienceLogos', currentValue: snapshot.data.experienceLogos }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'educationLogos', jsonPath: 'data.educationLogos', currentValue: snapshot.data.educationLogos }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'certificationLogos', jsonPath: 'data.certificationLogos', currentValue: snapshot.data.certificationLogos }),
    buildFieldDescriptor({ documentType: 'email-signature', sectionId: 'identity', templateGroup: 'identity', key: 'logoTone', jsonPath: 'data.logoTone', currentValue: snapshot.data.logoTone }),
  ]

  return {
    snapshot,
    fields,
    collections: [],
  }
}

const buildDocumentContext = (documentType, template) => {
  const base =
    documentType === 'resume'
      ? buildResumeContext(template)
      : documentType === 'cover-letter'
        ? buildCoverLetterContext(template)
        : buildSignatureContext(template)

  return {
    ...base,
    baseHash: sha256(base.snapshot),
    fieldMap: new Map(base.fields.map((field) => [field.fieldId, field])),
    collectionMap: new Map(base.collections.map((collection) => [collection.collectionId, collection])),
  }
}

const sanitizeString = (value, fallback = '') => asString(value, fallback).trim()

const sanitizeEntryValue = (entryType, value, template) => {
  const payload = isRecord(value) ? value : {}

  switch (entryType) {
    case 'educationEntry': {
      const logoSrc = payload.logoSrc ? ensureAssetToken(payload.logoSrc, 'logos') : 'unb-full'
      return {
        id: sanitizeString(payload.id, `education-${randomUUID()}`),
        degree: sanitizeString(payload.degree, 'New Degree'),
        program: sanitizeString(payload.program, 'Program'),
        school: sanitizeString(payload.school, 'Institution'),
        date: sanitizeString(payload.date, 'Year'),
        bullets: toStringArray(payload.bullets),
        logoSrc,
        logoAlt: assetLabelMap.get(logoSrc) ?? logoSrc,
      }
    }
    case 'experienceEntry': {
      const logoSrc = payload.logoSrc ? ensureAssetToken(payload.logoSrc, 'logos') : '73strings'
      return {
        id: sanitizeString(payload.id, `experience-${randomUUID()}`),
        role: sanitizeString(payload.role, 'New Role'),
        company: sanitizeString(payload.company, 'Organization'),
        location: sanitizeString(payload.location, 'Location'),
        date: sanitizeString(payload.date, 'Year'),
        bullets: toStringArray(payload.bullets),
        skills: toStringArray(payload.skills),
        logoSrc,
        logoAlt: assetLabelMap.get(logoSrc) ?? logoSrc,
      }
    }
    case 'experienceGroup': {
      return {
        id: sanitizeString(payload.id, `experience-group-${randomUUID()}`),
        title: sanitizeString(payload.title, 'Experience group'),
        layout: normalizeLayout(payload.layout),
        columns: clampEntryGroupColumns(payload.columns),
        items: asArray(payload.items).map((item) => sanitizeEntryValue('experienceEntry', item, template)),
      }
    }
    case 'certificationArea': {
      const areas = asArray(template.data?.certifications?.areas)
      const leftCount = areas.filter((area) => asString(area.column, 'left') === 'left').length
      const rightCount = areas.length - leftCount
      const payloadColumn = normalizeColumn(payload.column)
      return {
        id: sanitizeString(payload.id, `cert-area-${randomUUID()}`),
        title: sanitizeString(payload.title, 'Certification Area'),
        caption: sanitizeString(payload.caption, 'Editorial caption'),
        column: payload.column ? payloadColumn : leftCount <= rightCount ? 'left' : 'right',
        items: [],
        summaryValue: sanitizeString(payload.summaryValue),
        summaryLogos: toLogoAssets(toAssetTokenList(payload.summaryLogos, 'logos')),
      }
    }
    case 'certificationItem': {
      const logoSrc = payload.logoSrc ? ensureAssetToken(payload.logoSrc, 'logos') : 'csi'
      return {
        id: sanitizeString(payload.id, `cert-${randomUUID()}`),
        name: sanitizeString(payload.name, 'New Certification'),
        issuer: sanitizeString(payload.issuer, 'Issuer'),
        year: sanitizeString(payload.year, 'Year'),
        logoSrc,
        logoAlt: assetLabelMap.get(logoSrc) ?? logoSrc,
        detail: sanitizeString(payload.detail),
        emphasis: typeof payload.emphasis === 'boolean' ? payload.emphasis : false,
      }
    }
    case 'leadershipItem': {
      const logoSrc = payload.logoSrc ? ensureAssetToken(payload.logoSrc, 'logos') : 'united-way'
      return {
        id: sanitizeString(payload.id, `community-${randomUUID()}`),
        role: sanitizeString(payload.role, 'New Role'),
        organization: sanitizeString(payload.organization, 'Organization'),
        location: sanitizeString(payload.location, 'Location'),
        date: sanitizeString(payload.date, 'Year'),
        bullets: toStringArray(payload.bullets),
        skills: toStringArray(payload.skills),
        logoSrc,
        logoAlt: assetLabelMap.get(logoSrc) ?? logoSrc,
      }
    }
    case 'leadershipGroup': {
      return {
        id: sanitizeString(payload.id, `community-group-${randomUUID()}`),
        title: sanitizeString(payload.title, 'Community group'),
        layout: normalizeLayout(payload.layout),
        columns: clampEntryGroupColumns(payload.columns),
        items: asArray(payload.items).map((item) => sanitizeEntryValue('leadershipItem', item, template)),
      }
    }
    default:
      throw new HttpError(422, `Unsupported entry type: ${entryType}`)
  }
}

const getEntrySnapshotFromCollection = (template, collectionId, entryId) => {
  const collection = resolvePathValue(template, collectionId)
  if (!Array.isArray(collection)) return null
  return collection.find((entry) => isRecord(entry) && asString(entry.id) === entryId) ?? null
}

const sanitizeMetadataValue = (descriptor, value) => {
  if (descriptor.jsonPath.endsWith('.layout')) return normalizeLayout(value)
  if (descriptor.jsonPath.endsWith('.column')) return normalizeColumn(value)
  if (descriptor.jsonPath === 'data.logoTone') return normalizeLogoTone(value)
  return asString(value)
}

const applyReplaceField = (template, descriptor, value) => {
  if (descriptor.locked) {
    throw new HttpError(422, `Field is locked: ${descriptor.fieldId}`)
  }

  if (!descriptor.allowedOps.includes('replaceField')) {
    throw new HttpError(422, `replaceField is not allowed for ${descriptor.fieldId}`)
  }

  switch (descriptor.valueType) {
    case 'string':
    case 'text':
    case 'date':
      setPathValue(template, descriptor.jsonPath, asString(value))
      return
    case 'asset': {
      const source = descriptor.assetSource ?? 'logos'
      const token = ensureAssetToken(value, source)
      const { parent, key } = resolvePathContext(template, descriptor.jsonPath)
      if (!isRecord(parent)) {
        throw new HttpError(422, `Unable to update asset field ${descriptor.fieldId}`)
      }
      setAssetField(parent, key, token)
      return
    }
    case 'assetList': {
      const tokens = normalizeAssetListForDescriptor(template, descriptor, value)
      setPathValue(template, descriptor.jsonPath, toLogoAssets(tokens))
      return
    }
    case 'stringList':
      if (!Array.isArray(value)) {
        throw new HttpError(422, `Expected an array for ${descriptor.fieldId}`)
      }
      setPathValue(template, descriptor.jsonPath, toStringArray(value))
      return
    case 'boolean':
      setPathValue(template, descriptor.jsonPath, Boolean(value))
      return
    case 'number':
      setPathValue(template, descriptor.jsonPath, clampEntryGroupColumns(value))
      return
    case 'metadata':
      setPathValue(template, descriptor.jsonPath, sanitizeMetadataValue(descriptor, value))
      return
    default:
      throw new HttpError(422, `Unsupported replaceField target: ${descriptor.fieldId}`)
  }
}

const applyAddListItem = (template, descriptor, value) => {
  if (descriptor.locked || !descriptor.allowedOps.includes('addListItem')) {
    throw new HttpError(422, `addListItem is not allowed for ${descriptor.fieldId}`)
  }

  const current = resolvePathValue(template, descriptor.jsonPath)
  if (!Array.isArray(current)) {
    throw new HttpError(422, `Field is not a list: ${descriptor.fieldId}`)
  }

  if (descriptor.valueType === 'stringList') {
    const nextValue = sanitizeString(value)
    if (!nextValue) {
      throw new HttpError(422, `List value cannot be empty for ${descriptor.fieldId}`)
    }
    current.push(nextValue)
    return
  }

  if (descriptor.valueType === 'assetList') {
    const token = ensureAssetToken(value, 'logos')
    assertAssetListTokenAllowed(template, descriptor, token)
    if (!current.some((entry) => isRecord(entry) && normalizeAssetToken(entry.src) === token)) {
      current.push({ src: token, alt: assetLabelMap.get(token) ?? token })
    }
    return
  }

  throw new HttpError(422, `Field does not support list item addition: ${descriptor.fieldId}`)
}

const applyRemoveListItem = (template, descriptor, operation) => {
  if (descriptor.locked || !descriptor.allowedOps.includes('removeListItem')) {
    throw new HttpError(422, `removeListItem is not allowed for ${descriptor.fieldId}`)
  }

  const current = resolvePathValue(template, descriptor.jsonPath)
  if (!Array.isArray(current)) {
    throw new HttpError(422, `Field is not a list: ${descriptor.fieldId}`)
  }

  let targetIndex = typeof operation.index === 'number' ? operation.index : -1
  if (targetIndex < 0) {
    if (descriptor.valueType === 'assetList') {
      const token = ensureAssetToken(operation.value, 'logos')
      targetIndex = current.findIndex((entry) => isRecord(entry) && normalizeAssetToken(entry.src) === token)
    } else {
      targetIndex = current.findIndex((entry) => asString(entry) === asString(operation.value))
    }
  }

  if (targetIndex < 0 || targetIndex >= current.length) {
    throw new HttpError(422, `List item not found for ${descriptor.fieldId}`)
  }

  current.splice(targetIndex, 1)
}

const applyCreateEntry = (template, collection, value) => {
  if (!collection.allowedOps.includes('createEntry')) {
    throw new HttpError(422, `createEntry is not allowed for ${collection.collectionId}`)
  }

  const current = resolvePathValue(template, collection.collectionId)
  if (!Array.isArray(current)) {
    throw new HttpError(422, `Collection is not an array: ${collection.collectionId}`)
  }

  const entry = sanitizeEntryValue(collection.entryType, value, template)
  current.push(entry)
  return entry.id
}

const applyDeleteEntry = (template, collection, entryId) => {
  if (!collection.allowedOps.includes('deleteEntry')) {
    throw new HttpError(422, `deleteEntry is not allowed for ${collection.collectionId}`)
  }

  const current = resolvePathValue(template, collection.collectionId)
  if (!Array.isArray(current)) {
    throw new HttpError(422, `Collection is not an array: ${collection.collectionId}`)
  }

  const index = current.findIndex((entry) => isRecord(entry) && asString(entry.id) === entryId)
  if (index === -1) {
    throw new HttpError(422, `Entry not found: ${entryId}`)
  }

  current.splice(index, 1)
}

const applyOperationsToTemplate = (documentType, template, operations) => {
  const workingTemplate = clone(template)
  let context = buildDocumentContext(documentType, workingTemplate)
  const diff = []
  const fieldsTouched = new Set()

  for (const operation of operations) {
    if (!operation || typeof operation !== 'object' || typeof operation.op !== 'string') {
      throw new HttpError(400, 'Malformed AI operation')
    }

    switch (operation.op) {
      case 'replaceField': {
        const descriptor = context.fieldMap.get(operation.fieldId)
        if (!descriptor) {
          throw new HttpError(422, `Unknown field: ${operation.fieldId}`)
        }
        const before = clone(descriptor.currentValue)
        applyReplaceField(workingTemplate, descriptor, operation.value)
        context = buildDocumentContext(documentType, workingTemplate)
        const afterDescriptor = context.fieldMap.get(operation.fieldId)
        diff.push({
          op: operation.op,
          fieldId: operation.fieldId,
          fieldLabel: descriptor.fieldLabel,
          jsonPath: descriptor.jsonPath,
          before,
          after: clone(afterDescriptor?.currentValue ?? null),
        })
        fieldsTouched.add(operation.fieldId)
        break
      }
      case 'addListItem': {
        const descriptor = context.fieldMap.get(operation.fieldId)
        if (!descriptor) {
          throw new HttpError(422, `Unknown field: ${operation.fieldId}`)
        }
        const before = clone(descriptor.currentValue)
        applyAddListItem(workingTemplate, descriptor, operation.value)
        context = buildDocumentContext(documentType, workingTemplate)
        const afterDescriptor = context.fieldMap.get(operation.fieldId)
        diff.push({
          op: operation.op,
          fieldId: operation.fieldId,
          fieldLabel: descriptor.fieldLabel,
          jsonPath: descriptor.jsonPath,
          before,
          after: clone(afterDescriptor?.currentValue ?? null),
        })
        fieldsTouched.add(operation.fieldId)
        break
      }
      case 'removeListItem': {
        const descriptor = context.fieldMap.get(operation.fieldId)
        if (!descriptor) {
          throw new HttpError(422, `Unknown field: ${operation.fieldId}`)
        }
        const before = clone(descriptor.currentValue)
        applyRemoveListItem(workingTemplate, descriptor, operation)
        context = buildDocumentContext(documentType, workingTemplate)
        const afterDescriptor = context.fieldMap.get(operation.fieldId)
        diff.push({
          op: operation.op,
          fieldId: operation.fieldId,
          fieldLabel: descriptor.fieldLabel,
          jsonPath: descriptor.jsonPath,
          before,
          after: clone(afterDescriptor?.currentValue ?? null),
        })
        fieldsTouched.add(operation.fieldId)
        break
      }
      case 'createEntry': {
        const collection = context.collectionMap.get(operation.collectionId)
        if (!collection) {
          throw new HttpError(422, `Unknown collection: ${operation.collectionId}`)
        }
        const entryId = applyCreateEntry(workingTemplate, collection, operation.value)
        context = buildDocumentContext(documentType, workingTemplate)
        diff.push({
          op: operation.op,
          collectionId: operation.collectionId,
          fieldLabel: collection.sectionLabel,
          jsonPath: collection.jsonPath,
          before: null,
          after: clone(getEntrySnapshotFromCollection(workingTemplate, operation.collectionId, entryId)),
        })
        fieldsTouched.add(operation.collectionId)
        break
      }
      case 'deleteEntry': {
        const collection = context.collectionMap.get(operation.collectionId)
        if (!collection) {
          throw new HttpError(422, `Unknown collection: ${operation.collectionId}`)
        }
        const before = clone(getEntrySnapshotFromCollection(workingTemplate, operation.collectionId, operation.entryId))
        applyDeleteEntry(workingTemplate, collection, operation.entryId)
        context = buildDocumentContext(documentType, workingTemplate)
        diff.push({
          op: operation.op,
          collectionId: operation.collectionId,
          fieldLabel: collection.sectionLabel,
          jsonPath: collection.jsonPath,
          before,
          after: null,
        })
        fieldsTouched.add(operation.collectionId)
        break
      }
      default:
        throw new HttpError(400, `Unsupported AI operation: ${operation.op}`)
    }
  }

  return {
    template: workingTemplate,
    diff,
    fieldsTouched: [...fieldsTouched],
    projectedHash: context.baseHash,
  }
}

const getReviewIndexKey = (documentType, templateId) => `${AI_REVIEW_PREFIX}/${documentType}/${templateId}.json`
const getDraftKey = (draftId) => `${AI_DRAFT_PREFIX}/${draftId}.json`
const getArtifactKey = (artifactId) => `${AI_ARTIFACT_PREFIX}/${artifactId}.json`

const loadReviewIndex = async (store, documentType, templateId) =>
  (await store.get(getReviewIndexKey(documentType, templateId), { type: 'json' })) ?? {
    documentType,
    templateId,
    pendingDraftIds: [],
    latestAppliedAudit: null,
  }

const saveReviewIndex = async (store, documentType, templateId, index) => {
  await store.set(getReviewIndexKey(documentType, templateId), JSON.stringify(index), {
    metadata: { documentType, templateId },
  })
}

const loadDraft = async (store, draftId) => {
  const draft = await store.get(getDraftKey(draftId), { type: 'json' })
  if (!draft) {
    throw new HttpError(404, `Draft not found: ${draftId}`)
  }
  return draft
}

const saveDraft = async (store, draft) => {
  await store.set(getDraftKey(draft.id), JSON.stringify(draft), {
    metadata: {
      documentType: draft.documentType,
      templateId: draft.templateId,
      status: draft.status,
    },
  })
}

const createDraft = async (event, payload, actor) => {
  const { documentType, templateId, baseHash, operations, jobContext = '', notes = '' } = payload
  if (!DOCUMENT_TYPES.has(documentType)) {
    throw new HttpError(400, 'Invalid document type')
  }
  if (!templateId || typeof templateId !== 'string') {
    throw new HttpError(400, 'Missing templateId')
  }
  if (!baseHash || typeof baseHash !== 'string') {
    throw new HttpError(400, 'Missing baseHash')
  }
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new HttpError(400, 'Draft operations are required')
  }

  const { store, state } = await getDocumentState(event, documentType)
  const template = getTemplateById(state, templateId)
  const context = buildDocumentContext(documentType, template)
  if (context.baseHash !== baseHash) {
    throw new HttpError(409, 'Document content has changed. Refresh the snapshot and try again.')
  }

  const applied = applyOperationsToTemplate(documentType, template, operations)
  const jobMetadata = normalizeJobMetadata(payload.jobMetadata)
  const draft = {
    id: `draft-${randomUUID()}`,
    documentType,
    templateId,
    templateLabel: asString(template.label, templateId),
    baseHash,
    createdAt: new Date().toISOString(),
    createdBy: actor,
    status: 'pending',
    jobContext: asString(jobContext),
    notes: asString(notes),
    jobMetadata,
    operations,
    diff: applied.diff,
    fieldsTouched: applied.fieldsTouched,
    projectedHash: applied.projectedHash,
  }

  await saveDraft(store, draft)
  const index = await loadReviewIndex(store, documentType, templateId)
  index.pendingDraftIds = [draft.id, ...asArray(index.pendingDraftIds).filter((entry) => entry !== draft.id)]
  await saveReviewIndex(store, documentType, templateId, index)

  return draft
}

const applyDraftToDocument = async (event, draftId, actor) => {
  const store = getDocumentsStore(event)
  const draft = await loadDraft(store, draftId)
  if (draft.status !== 'pending') {
    throw new HttpError(409, `Draft is already ${draft.status}`)
  }

  const { state } = await getDocumentState(event, draft.documentType)
  const template = getTemplateById(state, draft.templateId)
  const currentContext = buildDocumentContext(draft.documentType, template)
  if (currentContext.baseHash !== draft.baseHash) {
    throw new HttpError(409, 'Document content changed after the draft was created. Draft must be recreated.')
  }

  const applied = applyOperationsToTemplate(draft.documentType, template, draft.operations)
  const nextState = replaceTemplateInState(state, draft.templateId, applied.template)
  await saveDocumentState(store, draft.documentType, nextState)

  const appliedAt = new Date().toISOString()
  const nextDraft = {
    ...draft,
    status: 'applied',
    appliedAt,
    appliedBy: actor,
  }
  await saveDraft(store, nextDraft)

  const index = await loadReviewIndex(store, draft.documentType, draft.templateId)
  index.pendingDraftIds = asArray(index.pendingDraftIds).filter((entry) => entry !== draft.id)
  index.latestAppliedAudit = {
    draftId: draft.id,
    appliedAt,
    appliedBy: actor,
    fieldsTouched: draft.fieldsTouched,
    jobContext: draft.jobContext,
    notes: draft.notes,
    jobMetadata: draft.jobMetadata,
  }
  await saveReviewIndex(store, draft.documentType, draft.templateId, index)

  return {
    draft: nextDraft,
    updatedAt: appliedAt,
    projectedHash: applied.projectedHash,
  }
}

const rejectDraft = async (event, draftId, actor) => {
  const store = getDocumentsStore(event)
  const draft = await loadDraft(store, draftId)
  if (draft.status !== 'pending') {
    throw new HttpError(409, `Draft is already ${draft.status}`)
  }

  const rejectedAt = new Date().toISOString()
  const nextDraft = {
    ...draft,
    status: 'rejected',
    rejectedAt,
    rejectedBy: actor,
  }
  await saveDraft(store, nextDraft)

  const index = await loadReviewIndex(store, draft.documentType, draft.templateId)
  index.pendingDraftIds = asArray(index.pendingDraftIds).filter((entry) => entry !== draft.id)
  await saveReviewIndex(store, draft.documentType, draft.templateId, index)

  return nextDraft
}

const getReviewState = async (event, documentType, templateId) => {
  if (!DOCUMENT_TYPES.has(documentType)) {
    throw new HttpError(400, 'Invalid document type')
  }
  if (!templateId || typeof templateId !== 'string') {
    throw new HttpError(400, 'Missing templateId')
  }

  const store = getDocumentsStore(event)
  const index = await loadReviewIndex(store, documentType, templateId)
  const pendingDrafts = await Promise.all(
    asArray(index.pendingDraftIds).map(async (draftId) => {
      try {
        return await loadDraft(store, draftId)
      } catch {
        return null
      }
    }),
  )

  return {
    documentType,
    templateId,
    pendingDrafts: pendingDrafts.filter(Boolean).sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    latestAppliedAudit: index.latestAppliedAudit ?? null,
  }
}

const getAiDocumentSnapshot = async (event, documentType, templateId) => {
  const { state } = await getDocumentState(event, documentType)
  const template = getTemplateById(state, templateId)
  const context = buildDocumentContext(documentType, template)

  return {
    documentType,
    templateId,
    templateLabel: asString(template.label, templateId),
    schemaVersion: STUDIO_EDIT_SCHEMA.schemaVersion,
    baseHash: context.baseHash,
    snapshot: context.snapshot,
    fields: context.fields,
    collections: context.collections,
    lockedRules: STUDIO_EDIT_SCHEMA.documents[documentType].lockedRules,
  }
}

const getProjectedTemplate = async (event, documentType, templateId, draftId = '') => {
  const { store, state } = await getDocumentState(event, documentType)
  const template = getTemplateById(state, templateId)
  let projectedTemplate = clone(template)
  let projectedHash = buildDocumentContext(documentType, projectedTemplate).baseHash
  let draft = null

  if (draftId) {
    draft = await loadDraft(store, draftId)
    if (draft.documentType !== documentType || draft.templateId !== templateId) {
      throw new HttpError(422, 'Draft does not match the requested preview target')
    }

    if (draft.status === 'pending') {
      projectedTemplate = applyOperationsToTemplate(documentType, template, draft.operations).template
      projectedHash = buildDocumentContext(documentType, projectedTemplate).baseHash
    }
  }

  return {
    documentType,
    templateId,
    draftId: draft?.id ?? null,
    projectedHash,
    template: projectedTemplate,
  }
}

const getSignatureAssetUrl = (origin, token, logoTone = 'original') => {
  if (token.startsWith('profile-')) {
    return `${origin}/ai-assets/${token}.png`
  }
  const logoPath = logoTone === 'monochrome' ? `logos/mono/${token}.png` : `logos/${token}.png`
  return `${origin}/ai-assets/${logoPath}`
}

const buildSignatureExportHtml = (origin, template) => {
  const data = isRecord(template.data) ? template.data : {}
  const templateId = asString(template.id, 'unb')
  const profileSrc = getSignatureAssetUrl(origin, normalizeAssetToken(data.profileSrc))
  const experienceLogos = normalizeSignatureLogoTokens(
    data.experienceLogos ?? data.logos,
    SIGNATURE_EXPERIENCE_LOGO_TOKENS,
  )
  const educationLogos = normalizeSignatureLogoTokens(
    data.educationLogos,
    getSignatureEducationLogoTokens(templateId),
  )
  const certificationLogos = normalizeSignatureLogoTokens(
    data.certificationLogos,
    SIGNATURE_CERTIFICATION_LOGO_TOKENS,
  )
  const logoTone = normalizeLogoTone(data.logoTone)

  const contactRows = [
    { value: asString(data.phone), href: `tel:${asString(data.phone).replace(/[^+\d]/gu, '')}` },
    { value: asString(data.email), href: `mailto:${asString(data.email)}` },
    { value: asString(data.website), href: `https://${asString(data.website).replace(/^https?:\/\//u, '')}` },
    { value: asString(data.location), href: '' },
  ].filter((entry) => entry.value)

  const contactHtml = contactRows
    .map((entry, index) => {
      const valueHtml = entry.href
        ? `<a href="${escapeHtml(entry.href)}" style="color:#64748b;text-decoration:none;">${escapeHtml(entry.value)}</a>`
        : escapeHtml(entry.value)
      const separator =
        index < contactRows.length - 1
          ? `<td style="padding:0 11px 0 0;vertical-align:middle;color:#cbd5e1;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12.5px;line-height:1.35;">|</td>`
          : ''

      return `
        <td style="padding:0 11px 0 0;vertical-align:middle;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12.5px;line-height:1.35;color:#64748b;white-space:nowrap;">${valueHtml}</td>
        ${separator}
      `
    })
    .join('')

  const renderLogoCells = (tokens) =>
    tokens
      .map((token, index) => {
        const alt = assetLabelMap.get(token) ?? token
        const rightPadding = index === tokens.length - 1 ? '0' : '10px'
        return `
          <td style="padding:0 ${rightPadding} 0 0;vertical-align:middle;"><img src="${escapeHtml(getSignatureAssetUrl(origin, token, logoTone))}" alt="${escapeHtml(alt)}" style="display:block;height:13px;width:auto;max-width:60px;opacity:0.66;border:0;outline:none;text-decoration:none;image-rendering:-webkit-optimize-contrast;" /></td>
        `
      })
      .join('')

  const renderLogoRail = (...tokenGroups) => {
    const visibleGroups = tokenGroups.filter((tokens) => tokens.length > 0)
    if (visibleGroups.length === 0) return ''

    const groups = visibleGroups
      .map((tokens, index) => {
        const rightPadding = index === visibleGroups.length - 1 ? '0' : '13px'

        return `
          <td style="padding:0 ${rightPadding} 0 0;vertical-align:middle;">
            <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
              <tr>${renderLogoCells(tokens)}</tr>
            </table>
          </td>
        `
      })
      .join('')

    return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr>${groups}</tr></table>`
  }

  const logoRailHtml = renderLogoRail(experienceLogos, educationLogos, certificationLogos)
  const affiliationRows = getSignatureAffiliationDisplayRows(data)
  const hasAffiliation = affiliationRows.length > 0

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body style="margin:0;padding:0;background:#ffffff;">
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;background:#ffffff;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;color:#0f172a;max-width:620px;">
      <tr>
        <td style="padding:0;background:#ffffff;">
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 9px 0;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12.8px;line-height:1.35;font-weight:500;letter-spacing:0;color:#475569;">
                ${escapeHtml(asString(data.signoff, 'Best regards,'))}
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0 13px 0 0;vertical-align:top;">
                <img src="${profileSrc}" alt="${escapeHtml(asString(data.profileAlt, 'Tyler Bustard portrait'))}" width="54" height="54" style="display:block;width:54px;height:54px;border-radius:999px;border:1px solid #d7dee8;background:#ffffff;object-fit:cover;object-position:center 12%;" />
              </td>
              <td style="padding:0;vertical-align:top;">
                <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:0;font-family:'Aptos Display','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:24px;line-height:1.05;font-weight:700;letter-spacing:0;color:#0f172a;">
                      ${escapeHtml(asString(data.name))}
                    </td>
                  </tr>
                  ${
                    hasAffiliation
                      ? `<tr><td style="height:3px;font-size:1px;line-height:1px;">&nbsp;</td></tr>${affiliationRows
                          .map(
                            (row, index) =>
                              `<tr><td style="padding:${index === 0 ? '0' : '1px 0 0 0'};font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12.8px;line-height:1.35;font-weight:${index === 0 ? '500' : '600'};letter-spacing:0;color:#334155;">${escapeHtml(row)}</td></tr>`,
                          )
                          .join('')}`
                      : ''
                  }
                </table>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr><td style="height:9px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>${contactHtml}</tr>
          </table>
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr><td style="height:8px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:100%;"><tr><td style="height:1px;background:#e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr><td style="height:9px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
          ${logoRailHtml}
        </td>
      </tr>
    </table>
  </body>
</html>`
}

const saveArtifact = async (store, artifact) => {
  await store.set(getArtifactKey(artifact.artifactId), JSON.stringify(artifact), {
    metadata: {
      contentType: artifact.contentType,
      renderMode: artifact.renderMode,
      documentType: artifact.documentType,
      templateId: artifact.templateId,
    },
  })
}

const createExportArtifact = async (event, payload) => {
  const studioOrigin = getStudioOrigin(event)
  const { documentType, templateId, draftId = '' } = payload
  const artifactPathPrefix =
    typeof payload.artifactPathPrefix === 'string' && payload.artifactPathPrefix.startsWith('/api/')
      ? payload.artifactPathPrefix
      : '/api/ai/artifacts'
  if (!DOCUMENT_TYPES.has(documentType)) {
    throw new HttpError(400, 'Invalid document type')
  }

  const { store, state } = await getDocumentState(event, documentType)
  const template = getTemplateById(state, templateId)
  let workingTemplate = clone(template)
  let effectiveHash = buildDocumentContext(documentType, workingTemplate).baseHash
  let jobMetadata = normalizeJobMetadata(payload.jobMetadata)
  let printDraftId = ''

  if (draftId) {
    const draft = await loadDraft(store, draftId)
    if (draft.documentType !== documentType || draft.templateId !== templateId) {
      throw new HttpError(422, 'Draft does not match the requested document export target')
    }

    if (draft.status === 'pending') {
      workingTemplate = applyOperationsToTemplate(documentType, template, draft.operations).template
      effectiveHash = buildDocumentContext(documentType, workingTemplate).baseHash
      printDraftId = draft.id
    }

    jobMetadata = draft.jobMetadata ?? jobMetadata
  }

  if (documentType === 'email-signature') {
    const html = buildSignatureExportHtml(studioOrigin, workingTemplate)
    const artifactId = `artifact-${randomUUID()}`
    const companySegment = sanitizeFileSegment(jobMetadata?.company, 'company')
    const roleSegment = sanitizeFileSegment(jobMetadata?.role, 'role')
    const artifact = {
      artifactId,
      documentType,
      templateId,
      contentType: 'text/html; charset=utf-8',
      sha256: createHash('sha256').update(html).digest('hex'),
      integrityScope: 'artifact-body',
      renderMode: 'signature-html',
      body: html,
      fileName: `${sanitizeFileSegment(asString(workingTemplate.label, templateId), templateId)}-${companySegment}-${roleSegment}.html`,
      jobMetadata,
    }
    await saveArtifact(store, artifact)

    return {
      artifactId,
      documentType,
      templateId,
      contentType: artifact.contentType,
      downloadUrl: `${studioOrigin}${artifactPathPrefix}/${artifactId}`,
      sha256: artifact.sha256,
      integrityScope: artifact.integrityScope,
      renderMode: artifact.renderMode,
      fileName: artifact.fileName,
      jobMetadata,
    }
  }

  const printParams = new URLSearchParams({
    template: templateId,
    autoprint: '1',
  })
  if (printDraftId) {
    printParams.set('draftId', printDraftId)
  }

  const printUrl =
    documentType === 'resume'
      ? `${studioOrigin}/studio/resume/pdf?${printParams.toString()}`
      : `${studioOrigin}/studio/cover-letter/pdf?${printParams.toString()}`

  const fileNamePrefix =
    documentType === 'resume' ? 'Tyler-Bustard-Resume' : 'Tyler-Bustard-Cover-Letter'
  const companySegment = sanitizeFileSegment(jobMetadata?.company, 'company')
  const roleSegment = sanitizeFileSegment(jobMetadata?.role, 'role')
  const fileName = `${fileNamePrefix}-${companySegment}-${roleSegment}.pdf`

  const artifactId = `artifact-${randomUUID()}`
  const artifact = {
    artifactId,
    documentType,
    templateId,
    contentType: 'application/pdf',
    sha256: effectiveHash,
    sourceSha256: effectiveHash,
    integrityScope: 'source-template',
    renderMode: 'dynamic-print-route',
    redirectUrl: printUrl,
    fileName,
    printUrl,
    jobMetadata,
  }

  await saveArtifact(store, artifact)

  return {
    artifactId,
    documentType,
    templateId,
    contentType: artifact.contentType,
    downloadUrl: `${studioOrigin}${artifactPathPrefix}/${artifactId}`,
    sha256: artifact.sha256,
    sourceSha256: artifact.sourceSha256,
    integrityScope: artifact.integrityScope,
    renderMode: artifact.renderMode,
    fileName,
    printUrl,
    jobMetadata,
  }
}

const getArtifact = async (event, artifactId) => {
  const store = getDocumentsStore(event)
  const artifact = await store.get(getArtifactKey(artifactId), { type: 'json' })
  if (!artifact) {
    throw new HttpError(404, `Artifact not found: ${artifactId}`)
  }
  return artifact
}

const buildAiCapabilities = () => ({
  schemaVersion: STUDIO_EDIT_SCHEMA.schemaVersion,
  documentTypes: [...DOCUMENT_TYPES],
  scopes: AI_SCOPES,
  operations: ['replaceField', 'addListItem', 'removeListItem', 'createEntry', 'deleteEntry'],
  exports: {
    resume: ['application/pdf'],
    'cover-letter': ['application/pdf'],
    'email-signature': ['text/html'],
  },
  tokenScopes: AI_ISSUED_SCOPES,
  reviewMode: 'draft-then-approve',
  adminApprovalRequired: true,
})

const handleHttpError = (error) => {
  if (error instanceof HttpError) {
    return json(error.statusCode, { error: error.message })
  }

  return json(500, { error: error instanceof Error ? error.message : 'Unexpected AI service error' })
}

export {
  AI_ISSUED_SCOPES,
  AI_SCOPES,
  AI_TOKEN_TTL_SECONDS,
  HttpError,
  applyDraftToDocument,
  applyOperationsToTemplate,
  buildAiCapabilities,
  buildDocumentContext,
  buildSignatureExportHtml,
  createDraft,
  createExportArtifact,
  encodeAiToken,
  getAiConfig,
  getAiDocumentSnapshot,
  getArtifact,
  getProjectedTemplate,
  getReviewState,
  handleHttpError,
  parseBody,
  rejectDraft,
  requireAiScopes,
  requireSession,
}
