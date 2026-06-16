import { getDefaultCoverLetterState, getDefaultResumeState, getDefaultSignatureState } from '@/lib/studio-defaults'
import { resolveStudioAssetSrc } from '@/data/assets'
import {
  SIGNATURE_CERTIFICATION_LOGO_VALUES,
  SIGNATURE_EXPERIENCE_LOGO_VALUES,
  getSignatureEducationLogoValues,
  normalizeSignatureLogos,
} from '@/lib/signature-logo-groups'
import { normalizeSignatureAffiliationLines } from '@/lib/signature-identity'
import type {
  CoverLetterConfig,
  CoverLetterTemplate,
  LogoAsset,
  ResumeCertificationArea,
  ResumeCertificationItem,
  ResumeEducationItem,
  ResumeExperienceGroup,
  ResumeExperienceItem,
  ResumeLeadershipGroup,
  ResumeLeadershipItem,
  ResumeTemplate,
  StoredCoverLetterState,
  StoredResumeState,
  StoredSignatureState,
  EmailSignatureTemplate,
} from '@/types'

type MigrationResult<T> = {
  state: T
  migrated: boolean
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const legacyRoiBase = ['Fis', 'cal'].join('')
const legacyRoiSlug = ['fis', 'cal-ai'].join('')
const legacyRoiUnderscore = ['fis', 'cal_ai'].join('')
const legacyRoiTextPatterns = [
  new RegExp(`${legacyRoiBase}\\s*\\.\\s*ai`, 'gi'),
  new RegExp(`${legacyRoiBase}\\s+AI`, 'gi'),
]

const normalizeRoiText = (value: string) =>
  legacyRoiTextPatterns.reduce((next, pattern) => next.replace(pattern, 'ROI'), value)

const normalizeRoiStringArray = (values: string[]) => values.map(normalizeRoiText)

const normalizeRoiId = (value: string) => {
  if (!value) return value
  return value
    .replace(new RegExp(legacyRoiSlug, 'gi'), 'roi')
    .replace(new RegExp(legacyRoiUnderscore, 'gi'), 'roi')
}

const hasLegacyRoiMarker = (value: unknown) => {
  const serialized = JSON.stringify(value)?.toLowerCase() ?? ''
  const markers = [
    legacyRoiSlug,
    legacyRoiUnderscore,
    `${legacyRoiBase.toLowerCase()}.ai`,
    `${legacyRoiBase.toLowerCase()} ai`,
  ]
  return markers.some((marker) => serialized.includes(marker))
}

const hasAssetDrift = (value: string) => value.trim().length > 0 && resolveStudioAssetSrc(value, value) !== value

const asLogoAssetArray = (value: unknown): LogoAsset[] =>
  Array.isArray(value)
    ? value
        .map((item) =>
          isRecord(item)
            ? {
                src: resolveStudioAssetSrc(asString(item.src), asString(item.src)),
                alt: normalizeRoiText(asString(item.alt)),
              }
            : null,
        )
        .filter((item): item is LogoAsset => Boolean(item?.src))
    : []

const LEGACY_SIGNATURE_ROLE = 'Finance & Technology Professional'
const CURRENT_SIGNATURE_ROLE = 'Finance & Technology'
const RESETTABLE_SIGNATURE_ROLES = new Set([LEGACY_SIGNATURE_ROLE, CURRENT_SIGNATURE_ROLE])
const CURRENT_SIGNATURE_SIGNOFF = 'Sincerely'
const RESETTABLE_SIGNATURE_SIGNOFFS = new Set(['Best regards,', 'Best regards'])
const RESETTABLE_SIGNATURE_AFFILIATIONS: Partial<
  Record<EmailSignatureTemplate['id'], { roles: Set<string>; organizations: Set<string> }>
> = {
  unb: {
    roles: new Set(['']),
    organizations: new Set(['University of New Brunswick']),
  },
  mcgill: {
    roles: new Set([
      '',
      'Master of Management in Finance Candidate, 2027',
      'Master of Management in Finance Candidate · 2027',
      'Master of Business Administration Candidate, 2026',
      'MBA Candidate · 2026',
    ]),
    organizations: new Set(['McGill University', 'McGill University · Desautels Faculty of Management']),
  },
  queens: {
    roles: new Set(['']),
    organizations: new Set([
      "Queen's University",
      "Queen's University; Smith School of Business",
      "Queen's University · Smith School of Business",
    ]),
  },
  rotman: {
    roles: new Set([]),
    organizations: new Set(['Rotman School of Management']),
  },
}

const LEGACY_SIGNATURE_LOGO_ALTS: Record<EmailSignatureTemplate['id'], string[][]> = {
  unb: [
    [
      'University of New Brunswick',
      '73 Strings',
      'Royal Bank of Canada',
      'TD Bank',
      'BMO',
      'University of New Brunswick',
      'Irving Oil',
      'Bloomberg',
    ],
    [
      'University of New Brunswick',
      'University of New Brunswick',
      'Irving Oil',
      'Royal Bank of Canada',
      'TD Bank',
      'BMO',
      'ROI',
      '73 Strings',
    ],
  ],
  mcgill: [
    [
      'McGill University',
      '73 Strings',
      'Royal Bank of Canada',
      'TD Bank',
      'BMO',
      'University of New Brunswick',
      'Irving Oil',
      'Bloomberg',
    ],
    [
      'McGill University',
      'University of New Brunswick',
      'Irving Oil',
      'Royal Bank of Canada',
      'TD Bank',
      'BMO',
      'ROI',
      '73 Strings',
    ],
  ],
  queens: [
    [
      "Queen's University",
      '73 Strings',
      'Royal Bank of Canada',
      'TD Bank',
      'BMO',
      'University of New Brunswick',
      'Irving Oil',
      'Bloomberg',
    ],
    [
      "Queen's University",
      'University of New Brunswick',
      'Irving Oil',
      'Royal Bank of Canada',
      'TD Bank',
      'BMO',
      'ROI',
      '73 Strings',
    ],
  ],
  rotman: [
    [
      'Rotman School of Management',
      '73 Strings',
      'Royal Bank of Canada',
      'TD Bank',
      'BMO',
      'University of New Brunswick',
      'Irving Oil',
      'Bloomberg',
    ],
    [
      'Rotman School of Management',
      'University of New Brunswick',
      'Irving Oil',
      'Royal Bank of Canada',
      'TD Bank',
      'BMO',
      'ROI',
      '73 Strings',
    ],
  ],
  strings: [
    ['73 Strings', 'ROI', 'Royal Bank of Canada', 'Bloomberg'],
    ['73 Strings', 'ROI', 'RBC'],
  ],
}

const matchesLegacySignatureLogos = (
  templateId: EmailSignatureTemplate['id'],
  logos: LogoAsset[],
) => {
  const expectedVariants = LEGACY_SIGNATURE_LOGO_ALTS[templateId]
  if (!expectedVariants) return false

  return expectedVariants.some((expectedAlts) => {
    if (logos.length !== expectedAlts.length) return false
    return logos.every((logo, index) => logo.alt === expectedAlts[index])
  })
}

const QUEENS_EDUCATION_YEAR = '2026-2027'

const normalizeTylerContactIdentity = (value: unknown, fallback: string) => {
  const rawValue = asString(value, fallback)
  if (!rawValue) return fallback

  const queenSafeValue = rawValue
    .replace(/tyler\.bustard@queensu\.com\b/giu, 'tyler.bustard@queensu.ca')
    .replace(/\bqueensu\.com\b/giu, 'queensu.ca')

  if (/tylerbustard\.net\b/iu.test(fallback)) {
    return queenSafeValue
      .replace(/tyler@tylerbustard\.com\b/giu, 'tyler@tylerbustard.net')
      .replace(/tylerbustard\.com\b/giu, 'tylerbustard.net')
  }

  if (/tylerbustard\.com\b/iu.test(fallback)) {
    return queenSafeValue
      .replace(/tyler@tylerbustard\.net\b/giu, 'tyler@tylerbustard.com')
      .replace(/tylerbustard\.net\b/giu, 'tylerbustard.com')
  }

  return queenSafeValue
}

const hasTylerContactIdentityDrift = (value: unknown, fallback: string) =>
  normalizeTylerContactIdentity(value, fallback) !== asString(value, fallback)

const normalizeQueensEducationDate = <
  T extends {
    id?: string
    school?: string
    date: string
  },
>(
  templateId: string,
  education: T[],
) =>
  templateId === 'queens'
    ? education.map((item) => {
        const isQueensEntry =
          item.id === 'education-queens' ||
          item.id === 'education-queens-mfin' ||
          item.school === "Queen's University"
        if (!isQueensEntry) return item
        if (item.date === '2026-2027') return item
        if (
          item.date === '2026 - 2027' ||
          item.date === '2026' ||
          item.date === '2027' ||
          item.date === '2027-2026' ||
          item.date === '2027 - 2026'
        ) {
          return { ...item, date: QUEENS_EDUCATION_YEAR }
        }
        return item
      })
    : education

const migrateResumeExperienceItem = (
  value: unknown,
  fallback?: ResumeExperienceItem,
): ResumeExperienceItem | null => {
  if (!isRecord(value)) return fallback ? clone(fallback) : null

  return {
    id: normalizeRoiId(asString(value.id, fallback?.id ?? `experience-${Date.now()}`)),
    role: normalizeRoiText(asString(value.role, fallback?.role ?? '')),
    company: normalizeRoiText(asString(value.company, fallback?.company ?? '')),
    location: normalizeRoiText(asString(value.location, fallback?.location ?? '')),
    date: asString(value.date, fallback?.date ?? ''),
    bullets: normalizeRoiStringArray(
      asStringArray(value.bullets).length ? asStringArray(value.bullets) : (fallback?.bullets ?? []),
    ),
    skills: normalizeRoiStringArray(
      asStringArray(value.skills).length ? asStringArray(value.skills) : (fallback?.skills ?? []),
    ),
    logoSrc: resolveStudioAssetSrc(asString(value.logoSrc, fallback?.logoSrc ?? ''), fallback?.logoSrc ?? ''),
    logoAlt: normalizeRoiText(asString(value.logoAlt, fallback?.logoAlt ?? '')),
  }
}

const migrateResumeExperienceGroup = (
  value: unknown,
  fallback?: ResumeExperienceGroup,
): ResumeExperienceGroup | null => {
  if (!isRecord(value)) return fallback ? clone(fallback) : null

  const rawItems = Array.isArray(value.items) ? value.items : []
  const items = rawItems
    .map((item, index) => migrateResumeExperienceItem(item, fallback?.items[index]))
    .filter((item): item is ResumeExperienceItem => Boolean(item))

  const rawColumns =
    typeof value.columns === 'number'
      ? value.columns
      : typeof fallback?.columns === 'number'
        ? fallback.columns
        : undefined

  return {
    id: asString(value.id, fallback?.id ?? `experience-group-${Date.now()}`),
    title: asString(value.title, fallback?.title ?? ''),
    layout: value.layout === 'grid' ? 'grid' : 'stack',
    columns: typeof rawColumns === 'number' ? Math.min(3, Math.max(1, Math.round(rawColumns))) : undefined,
    items,
  }
}

const migrateCertificationItem = (
  value: unknown,
  fallback?: ResumeCertificationItem,
): ResumeCertificationItem | null => {
  if (!isRecord(value)) return fallback ? clone(fallback) : null

  return {
    id: normalizeRoiId(asString(value.id, fallback?.id ?? `cert-${Date.now()}`)),
    name: normalizeRoiText(asString(value.name, asString(value.title, fallback?.name ?? 'Certification'))),
    issuer: normalizeRoiText(asString(value.issuer, asString(value.organization, fallback?.issuer ?? 'Issuer'))),
    year: asString(value.year, asString(value.date, fallback?.year ?? '')),
    logoSrc: resolveStudioAssetSrc(asString(value.logoSrc, fallback?.logoSrc ?? ''), fallback?.logoSrc ?? ''),
    logoAlt: normalizeRoiText(asString(value.logoAlt, fallback?.logoAlt ?? '')),
    detail: normalizeRoiText(asString(value.detail, fallback?.detail ?? '')),
    emphasis: typeof value.emphasis === 'boolean' ? value.emphasis : fallback?.emphasis ?? false,
  }
}

const migrateCertificationAreas = (
  value: unknown,
  fallbackAreas: ResumeCertificationArea[],
): ResumeCertificationArea[] => {
  if (isRecord(value) && Array.isArray(value.areas)) {
    const areas = value.areas
      .map((area, index) => {
        const fallback = fallbackAreas[index]
        if (!isRecord(area)) return fallback ? clone(fallback) : null
        const items = (Array.isArray(area.items) ? area.items : [])
          .map((item, itemIndex) => migrateCertificationItem(item, fallback?.items[itemIndex]))
          .filter((item): item is ResumeCertificationItem => Boolean(item))

        return {
          id: asString(area.id, fallback?.id ?? `cert-area-${Date.now()}-${index}`),
          title: asString(area.title, fallback?.title ?? 'Certification Area'),
          caption: asString(area.caption, fallback?.caption ?? ''),
          column: area.column === 'right' ? 'right' : area.column === 'left' ? 'left' : fallback?.column,
          items,
          summaryValue: asString(area.summaryValue, ''),
          summaryLogos: asLogoAssetArray(area.summaryLogos),
        }
      })
      .filter((area): area is ResumeCertificationArea => Boolean(area))

    if (areas.length > 0) {
      return areas
    }
  }

  if (isRecord(value) && (Array.isArray(value.featured) || Array.isArray(value.stats))) {
    const importedAreas: ResumeCertificationArea[] = []
    const featured = Array.isArray(value.featured) ? value.featured : []
    const stats = Array.isArray(value.stats) ? value.stats : []

    if (featured.length > 0) {
      importedAreas.push({
        id: 'imported-featured-certifications',
        title: 'Imported Certifications',
        caption: 'Recovered from an earlier studio version',
        column: 'left',
        items: featured
          .map((item) => migrateCertificationItem(item))
          .filter((item): item is ResumeCertificationItem => Boolean(item)),
      })
    }

    for (const stat of stats) {
      if (!isRecord(stat)) continue
      importedAreas.push({
        id: asString(stat.id, `imported-summary-${Date.now()}`),
        title: asString(stat.label, 'Imported Summary'),
        caption: 'Recovered from an earlier studio version',
        column: 'right',
        items: [],
        summaryValue: asString(stat.count),
        summaryLogos: asLogoAssetArray(stat.logos),
      })
    }

    if (importedAreas.length > 0) {
      return importedAreas
    }
  }

  return clone(fallbackAreas)
}

const migrateLeadershipItem = (
  value: unknown,
  fallback?: ResumeLeadershipItem,
): ResumeLeadershipItem | null => {
  if (!isRecord(value)) return fallback ? clone(fallback) : null

  return {
    id: normalizeRoiId(asString(value.id, fallback?.id ?? `community-${Date.now()}`)),
    role: normalizeRoiText(asString(value.role, fallback?.role ?? '')),
    organization: normalizeRoiText(asString(value.organization, fallback?.organization ?? '')),
    location: normalizeRoiText(asString(value.location, fallback?.location ?? '')),
    date: asString(value.date, fallback?.date ?? ''),
    bullets: normalizeRoiStringArray(
      asStringArray(value.bullets).length ? asStringArray(value.bullets) : (fallback?.bullets ?? []),
    ),
    skills: normalizeRoiStringArray(
      asStringArray(value.skills).length ? asStringArray(value.skills) : (fallback?.skills ?? []),
    ),
    logoSrc: resolveStudioAssetSrc(asString(value.logoSrc, fallback?.logoSrc ?? ''), fallback?.logoSrc ?? ''),
    logoAlt: normalizeRoiText(asString(value.logoAlt, fallback?.logoAlt ?? '')),
  }
}

const migrateLeadershipGroup = (
  value: unknown,
  fallback?: ResumeLeadershipGroup,
): ResumeLeadershipGroup | null => {
  if (!isRecord(value)) return fallback ? clone(fallback) : null

  const rawItems = Array.isArray(value.items) ? value.items : []
  const items = rawItems
    .map((item, index) => migrateLeadershipItem(item, fallback?.items[index]))
    .filter((item): item is ResumeLeadershipItem => Boolean(item))

  const rawColumns =
    typeof value.columns === 'number'
      ? value.columns
      : typeof fallback?.columns === 'number'
        ? fallback.columns
        : undefined

  return {
    id: asString(value.id, fallback?.id ?? `community-group-${Date.now()}`),
    title: asString(value.title, fallback?.title ?? ''),
    layout: value.layout === 'grid' ? 'grid' : 'stack',
    columns: typeof rawColumns === 'number' ? Math.min(3, Math.max(1, Math.round(rawColumns))) : undefined,
    items,
  }
}

const hasLegacyResumeTemplateMarkers = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.data)) return false

  const data = value.data
  const templateId = asString(value.id)
  const templateDescription = asString(value.description)
  const header = isRecord(data.header) ? data.header : {}
  const certifications = isRecord(data.certifications) ? data.certifications : {}
  const education = Array.isArray(data.education) ? data.education : []
  const experience = isRecord(data.experience) ? data.experience : {}
  const primary = Array.isArray(experience.primary) ? experience.primary : []
  const groups = Array.isArray(experience.groups) ? experience.groups : []
  const areas = Array.isArray(certifications.areas) ? certifications.areas : []

  const hasImportedCertificationAreas = areas.some(
    (area) =>
      isRecord(area) &&
      (asString(area.title).startsWith('Imported') ||
        asString(area.caption) === 'Recovered from an earlier studio version' ||
        asString(area.summaryValue).trim().length > 0 ||
        (Array.isArray(area.summaryLogos) && area.summaryLogos.length > 0)),
  )

  const hasLegacyEducation = education.some(
    (item) =>
      isRecord(item) &&
      (asString(item.degree) === 'Bachelor of Business Administration' ||
        asString(item.program) === 'Major in Finance'),
  )

  const hasLegacyExperienceGrouping = groups.some(
    (group) =>
      isRecord(group) &&
      ['experience-early', 'experience-coop', 'experience-coop-secondary'].includes(asString(group.id)),
  )

  const isOutdatedUnbBaseline =
    templateId === 'unb' &&
    templateDescription === 'University of New Brunswick content preset in the unified studio style.' &&
    !primary.some(
      (item) =>
        isRecord(item) &&
        (asString(item.company) === 'ROI' || asString(item.role) === 'Equity Analyst'),
    )

  const mcgillEducationText = JSON.stringify(education)
  const hasOutdatedMcgillBaseline =
    templateId === 'mcgill' &&
    (
      asString(header.title) === 'Finance & Technology' ||
      templateDescription !== 'McGill MBA 2026-2027 content preset in the unified studio style.' ||
      /Master of Management in Finance Candidate/iu.test(mcgillEducationText) ||
      /Desautels Capital Management|Chief Sustainability Officer|SRI fund/iu.test(mcgillEducationText) ||
      /two scholarships|\$13,000|recipient of/iu.test(mcgillEducationText) ||
      education.some(
        (item) =>
          isRecord(item) &&
          (
            asString(item.id) === 'education-northeast-christian-college' ||
            asString(item.school) === 'Northeast Christian College' ||
            ['2025-2026', '2025 - 2026', '2025-2027', '2025 - 2027'].includes(asString(item.date))
          ),
      )
    )

  return (
    asString(header.title) === 'Finance & Technology Professional' ||
    hasImportedCertificationAreas ||
    hasLegacyEducation ||
    hasLegacyExperienceGrouping ||
    isOutdatedUnbBaseline ||
    hasOutdatedMcgillBaseline
  )
}

const hasResumeAssetDrift = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.data)) return false

  const data = value.data
  const header = isRecord(data.header) ? data.header : {}
  const education = Array.isArray(data.education) ? data.education : []
  const experience = isRecord(data.experience) ? data.experience : {}
  const primary = Array.isArray(experience.primary) ? experience.primary : []
  const groups = Array.isArray(experience.groups) ? experience.groups : []
  const certifications = isRecord(data.certifications) ? data.certifications : {}
  const areas = Array.isArray(certifications.areas) ? certifications.areas : []
  const leadership = Array.isArray(data.leadership) ? data.leadership : []

  return (
    hasAssetDrift(asString(header.profileSrc)) ||
    education.some((item) => isRecord(item) && hasAssetDrift(asString(item.logoSrc))) ||
    primary.some((item) => isRecord(item) && hasAssetDrift(asString(item.logoSrc))) ||
    groups.some(
      (group) =>
        isRecord(group) &&
        Array.isArray(group.items) &&
        group.items.some((item) => isRecord(item) && hasAssetDrift(asString(item.logoSrc))),
    ) ||
    areas.some(
      (area) =>
        isRecord(area) &&
        Array.isArray(area.items) &&
        area.items.some((item) => isRecord(item) && hasAssetDrift(asString(item.logoSrc))),
    ) ||
    leadership.some(
      (group) =>
        isRecord(group) &&
        Array.isArray(group.items) &&
        group.items.some((item) => isRecord(item) && hasAssetDrift(asString(item.logoSrc))),
    )
  )
}

const hasCoverLetterAssetDrift = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.config)) return false
  return (
    hasAssetDrift(asString(value.config.profileSrc)) ||
    hasAssetDrift(asString(value.config.signatureSrc)) ||
    hasAssetDrift(asString(value.config.credentialLogoSrc))
  )
}

const RESETTABLE_COVER_LETTER_TAGLINES = new Set([
  '',
  'Finance & Technology',
  'Finance & Technology Professional',
  'Finance Graduate · 2020',
  'Master of Finance Candidate, 2026-2027',
  'Master of Finance Candidate, 2027',
  'Master of Finance Candidate · 2027',
  'MBA Candidate · 2026',
  'Master of Management in Finance Candidate · 2027',
  "Queen's University",
  "Queen's University · Smith School of Business",
  'University of New Brunswick · Finance',
  'University of Toronto · Rotman School of Management',
  'McGill University · Desautels Faculty of Management',
])

const RESETTABLE_COVER_LETTER_CONTEXT_NOTES = new Set([
  '',
  'UNB context',
  'University of New Brunswick · Finance',
])

const RESETTABLE_COVER_LETTER_CREDENTIAL_NAMES = new Set([
  '',
  "Queen's University",
  "Queen's University; Smith School of Business",
  "Queen's University · Smith School of Business",
  "Queen's University - Smith School of Business",
  'University of New Brunswick',
  'University of Toronto - Rotman School of Management',
  'McGill University - Desautels Faculty of Management',
])

const RESETTABLE_COVER_LETTER_CREDENTIAL_DETAILS = new Set([
  '',
  'Bachelor of Business Administration, Finance',
  'Bachelor of Business Administration in Finance; Class of 2020',
  'Master of Finance Candidate, 2026',
  'Master of Finance Candidate, 2027',
  'Master of Finance Candidate · 2027',
  'Master of Finance Candidate, 2026-2027',
  'Master of Business Administration Candidate, 2026',
  'MBA Candidate · 2026',
  'Master of Management in Finance Candidate, 2027',
  'Master of Management in Finance Candidate · 2027',
])

const RESETTABLE_COVER_LETTER_CREDENTIAL_LOGO_ALTS = new Set([
  '',
  "Queen's University",
  'University of New Brunswick',
  'Rotman School of Management',
  'McGill University',
])

const shouldResetCoverLetterTagline = (value: unknown, fallback: string) => {
  const tagline = normalizeRoiText(asString(value, fallback))
  return RESETTABLE_COVER_LETTER_TAGLINES.has(tagline) && tagline !== fallback
}

const normalizeCoverLetterTagline = (value: unknown, fallback: string) => {
  const tagline = normalizeRoiText(asString(value, fallback))
  return shouldResetCoverLetterTagline(value, fallback) ? fallback : tagline
}

const normalizeCoverLetterContextNote = (value: unknown, fallback: string) => {
  const contextNote = normalizeRoiText(asString(value, fallback))
  return RESETTABLE_COVER_LETTER_CONTEXT_NOTES.has(contextNote) ? fallback : contextNote
}

const shouldResetCoverLetterCredentialName = (value: unknown, fallback: string) => {
  const credentialName = normalizeRoiText(asString(value, fallback)).trim()
  return RESETTABLE_COVER_LETTER_CREDENTIAL_NAMES.has(credentialName) && credentialName !== fallback
}

const shouldResetCoverLetterCredentialDetail = (value: unknown, fallback: string) => {
  const credentialDetail = normalizeRoiText(asString(value, fallback)).trim()
  return RESETTABLE_COVER_LETTER_CREDENTIAL_DETAILS.has(credentialDetail) && credentialDetail !== fallback
}

const shouldResetCoverLetterCredentialLogoAlt = (value: unknown, fallback: string) => {
  const logoAlt = normalizeRoiText(asString(value, fallback)).trim()
  return RESETTABLE_COVER_LETTER_CREDENTIAL_LOGO_ALTS.has(logoAlt) && logoAlt !== fallback
}

const normalizeCoverLetterCredentialName = (value: unknown, fallback: string) => {
  const credentialName = normalizeRoiText(asString(value, fallback)).trim()
  return shouldResetCoverLetterCredentialName(value, fallback) ? fallback : credentialName
}

const normalizeCoverLetterCredentialDetail = (value: unknown, fallback: string) => {
  const credentialDetail = normalizeRoiText(asString(value, fallback)).trim()
  return shouldResetCoverLetterCredentialDetail(value, fallback) ? fallback : credentialDetail
}

const hasCoverLetterCredentialDrift = (value: unknown, fallback: CoverLetterTemplate) => {
  if (!isRecord(value) || !isRecord(value.config)) return false

  return (
    !('credentialName' in value.config) ||
    !('credentialDetail' in value.config) ||
    !('credentialLogoSrc' in value.config) ||
    !('credentialLogoAlt' in value.config) ||
    shouldResetCoverLetterCredentialName(value.config.credentialName, fallback.config.credentialName) ||
    shouldResetCoverLetterCredentialDetail(value.config.credentialDetail, fallback.config.credentialDetail) ||
    shouldResetCoverLetterCredentialLogoAlt(value.config.credentialLogoAlt, fallback.config.credentialLogoAlt)
  )
}

const hasCoverLetterTaglineDrift = (value: unknown, fallback: CoverLetterTemplate) =>
  isRecord(value) &&
  isRecord(value.config) &&
  (!('tagline' in value.config) ||
    shouldResetCoverLetterTagline(value.config.tagline, fallback.config.tagline))

const hasCoverLetterContextNoteDrift = (value: unknown) =>
  isRecord(value) &&
  isRecord(value.config) &&
  (!('contextNote' in value.config) ||
    RESETTABLE_COVER_LETTER_CONTEXT_NOTES.has(normalizeRoiText(asString(value.config.contextNote))))

const hasResumeContactIdentityDrift = (value: unknown, fallback: ResumeTemplate) => {
  if (!isRecord(value) || !isRecord(value.data)) return false
  const header = isRecord(value.data.header) ? value.data.header : {}
  const contact = isRecord(header.contact) ? header.contact : {}
  return (
    hasTylerContactIdentityDrift(contact.email, fallback.data.header.contact.email) ||
    hasTylerContactIdentityDrift(contact.website, fallback.data.header.contact.website)
  )
}

const hasCoverLetterContactIdentityDrift = (value: unknown, fallback: CoverLetterTemplate) => {
  if (!isRecord(value) || !isRecord(value.data)) return false
  return (
    hasTylerContactIdentityDrift(value.data.yourEmail, fallback.data.yourEmail) ||
    hasTylerContactIdentityDrift(value.data.yourWebsite, fallback.data.yourWebsite)
  )
}

const hasLegacyCoverLetterTemplateMarkers = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.config)) return false

  const data = value.data
  const config = value.config

  return (
    asString(data.companyName) === '[Company Name]' &&
    asString(data.position) === '[Role Title]' &&
    asString(data.companyAddress) === '123 Example Street\nCity, Province Postal Code' &&
    asString(data.openingParagraph) ===
      'I am writing to express my interest in the [Role Title] position at [Company Name]. I am energized by the opportunity to bring my blend of finance and technology experience to your team.' &&
    asString(data.bodyParagraph1) ===
      'In my current role, I [add a quantifiable achievement that demonstrates how you deliver measurable impact aligned with the position].' &&
    asString(data.bodyParagraph2) ===
      'I am especially drawn to [Company Name] because [share a reason that connects your values, industry focus, or recent initiatives].' &&
    asString(data.bodyParagraph3) ===
      'Beyond my technical background, I bring [highlight a leadership, collaboration, or client-facing strength that differentiates you].' &&
    asString(data.closingParagraph) ===
      'Thank you for considering my application. I would welcome the chance to discuss how I can support the [Role Title] mandate at [Company Name].' &&
    asString(config.tagline) === 'Finance & Technology Professional'
  )
}

const hasSignatureAssetDrift = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.data)) return false
  const experienceLogos = Array.isArray(value.data.experienceLogos) ? value.data.experienceLogos : []
  const educationLogos = Array.isArray(value.data.educationLogos) ? value.data.educationLogos : []
  const certificationLogos = Array.isArray(value.data.certificationLogos) ? value.data.certificationLogos : []
  const legacyLogos = Array.isArray(value.data.logos) ? value.data.logos : []
  return (
    hasAssetDrift(asString(value.data.profileSrc)) ||
    experienceLogos.some((logo) => isRecord(logo) && hasAssetDrift(asString(logo.src))) ||
    educationLogos.some((logo) => isRecord(logo) && hasAssetDrift(asString(logo.src))) ||
    certificationLogos.some((logo) => isRecord(logo) && hasAssetDrift(asString(logo.src))) ||
    legacyLogos.some((logo) => isRecord(logo) && hasAssetDrift(asString(logo.src)))
  )
}

const logoAssetArraysMatch = (actual: LogoAsset[], expected: LogoAsset[]) =>
  actual.length === expected.length &&
  actual.every((logo, index) => logo.src === expected[index]?.src && logo.alt === expected[index]?.alt)

const stringArraysMatch = (actual: string[], expected: string[]) =>
  actual.length === expected.length && actual.every((value, index) => value === expected[index])

const hasSignatureLogoGroupDrift = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.data)) return false

  const data = value.data
  const signatureId = (asString(value.id, 'unb') || 'unb') as EmailSignatureTemplate['id']
  const rawExperienceLogos = asLogoAssetArray(data.experienceLogos)
  const rawEducationLogos = asLogoAssetArray(data.educationLogos)
  const rawCertificationLogos = asLogoAssetArray(data.certificationLogos)

  return (
    !logoAssetArraysMatch(
      rawExperienceLogos,
      normalizeSignatureLogos(rawExperienceLogos, SIGNATURE_EXPERIENCE_LOGO_VALUES),
    ) ||
    !logoAssetArraysMatch(
      rawEducationLogos,
      normalizeSignatureLogos(rawEducationLogos, getSignatureEducationLogoValues(signatureId)),
    ) ||
    !logoAssetArraysMatch(
      rawCertificationLogos,
      normalizeSignatureLogos(rawCertificationLogos, SIGNATURE_CERTIFICATION_LOGO_VALUES),
    )
  )
}

const hasSignatureContactIdentityDrift = (value: unknown, fallback: EmailSignatureTemplate) => {
  if (!isRecord(value) || !isRecord(value.data)) return false
  return (
    hasTylerContactIdentityDrift(value.data.email, fallback.data.email) ||
    hasTylerContactIdentityDrift(value.data.website, fallback.data.website)
  )
}

const normalizeSignatureSignoff = (value: unknown, fallback: string) => {
  const signoff = normalizeRoiText(asString(value, fallback))
  return RESETTABLE_SIGNATURE_SIGNOFFS.has(signoff) ? CURRENT_SIGNATURE_SIGNOFF : signoff
}

const hasSignatureSignoffDrift = (value: unknown) =>
  isRecord(value) &&
  isRecord(value.data) &&
  (!('signoff' in value.data) || RESETTABLE_SIGNATURE_SIGNOFFS.has(normalizeRoiText(asString(value.data.signoff))))

const shouldUseFallbackSignatureRole = (
  templateId: EmailSignatureTemplate['id'],
  value: string,
  fallback: string,
) => {
  if (!fallback.trim()) return RESETTABLE_SIGNATURE_ROLES.has(value)
  return RESETTABLE_SIGNATURE_ROLES.has(value) || RESETTABLE_SIGNATURE_AFFILIATIONS[templateId]?.roles.has(value)
}

const shouldUseFallbackSignatureOrganization = (
  templateId: EmailSignatureTemplate['id'],
  value: string,
  fallback: string,
) => {
  if (!fallback.trim()) return false
  return RESETTABLE_SIGNATURE_AFFILIATIONS[templateId]?.organizations.has(value) ?? false
}

const hasSignatureAffiliationDrift = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.data)) return false
  if (!Array.isArray(value.data.affiliationLines)) return true

  const currentLines = normalizeRoiStringArray(asStringArray(value.data.affiliationLines))
  if (hasLegacyQueensMfinAffiliation(asString(value.id), currentLines)) return true
  if (hasLegacyMcgillMbaAffiliation(asString(value.id), currentLines)) return true

  const normalizedLines = normalizeRoiStringArray(normalizeSignatureAffiliationLines(value.data))
  return !stringArraysMatch(currentLines, normalizedLines)
}

const LEGACY_QUEENS_MFIN_AFFILIATION_LINES = new Set([
  'Master of Finance Candidate, 2027',
  'Master of Finance Candidate · 2027',
  'Master of Finance Candidate, 2026',
])

const hasLegacyQueensMfinAffiliation = (templateId: string, lines: string[]) =>
  templateId === 'queens' && lines.some((line) => LEGACY_QUEENS_MFIN_AFFILIATION_LINES.has(line))

const LEGACY_MCGILL_MBA_AFFILIATION_LINES = new Set([
  'Master of Management in Finance Candidate, 2027',
  'Master of Management in Finance Candidate · 2027',
  'Master of Business Administration Candidate, 2026',
  'MBA Candidate · 2026',
])

const hasLegacyMcgillMbaAffiliation = (templateId: string, lines: string[]) =>
  templateId === 'mcgill' && lines.some((line) => LEGACY_MCGILL_MBA_AFFILIATION_LINES.has(line))

const normalizeMcgillEducationDate = <
  T extends {
    id?: string
    school?: string
    date: string
  },
>(
  templateId: string,
  education: T[],
) =>
  templateId === 'mcgill'
    ? education.map((item) => {
        const isMcgillEntry = item.id === 'education-mcgill' || item.school === 'McGill University'
        if (!isMcgillEntry) return item
        if (item.date === '2025-2026' || item.date === '2025-2027') return { ...item, date: '2026-2027' }
        if (item.date === '2025 - 2026' || item.date === '2025 - 2027') return { ...item, date: '2026 - 2027' }
        return item
      })
    : education

const hasMcgillEducationDateDrift = (value: unknown) => {
  if (!isRecord(value) || asString(value.id) !== 'mcgill' || !isRecord(value.data)) return false
  const education = Array.isArray(value.data.education) ? value.data.education : []
  return education.some(
    (item) =>
      isRecord(item) &&
      (asString(item.id) === 'education-mcgill' || asString(item.school) === 'McGill University') &&
      ['2025-2026', '2025 - 2026', '2025-2027', '2025 - 2027'].includes(asString(item.date)),
  )
}

const hasQueensEducationDateDrift = (value: unknown) => {
  if (!isRecord(value) || asString(value.id) !== 'queens' || !isRecord(value.data)) return false
  const education = Array.isArray(value.data.education) ? value.data.education : []
  return education.some(
    (item) =>
      isRecord(item) &&
      (
        asString(item.id) === 'education-queens' ||
        asString(item.id) === 'education-queens-mfin' ||
        asString(item.school) === "Queen's University"
      ) &&
      ['2026 - 2027', '2026', '2027', '2027 - 2026', '2027-2026'].includes(asString(item.date)),
  )
}

const mergeMissingFallbackEducation = (
  education: ResumeEducationItem[],
  fallbackEducation: ResumeEducationItem[],
) => {
  const educationIds = new Set(education.map((item) => item.id))
  const educationSchools = new Set(education.map((item) => item.school))
  const missingFallbackItems = fallbackEducation.filter(
    (item) => !educationIds.has(item.id) && !educationSchools.has(item.school),
  )

  return [...education, ...missingFallbackItems.map((item) => clone(item))]
}

const migrateResumeTemplate = (value: unknown, fallback: ResumeTemplate): ResumeTemplate => {
  if (!isRecord(value) || !isRecord(value.data)) {
    return clone(fallback)
  }

  if (hasLegacyResumeTemplateMarkers(value)) {
    return clone(fallback)
  }

  const data = value.data
  const header = isRecord(data.header) ? data.header : {}
  const headerContact = isRecord(header.contact) ? header.contact : {}
  const experience = isRecord(data.experience) ? data.experience : {}
  const certifications = isRecord(data.certifications) ? data.certifications : {}

  const primary = (Array.isArray(experience.primary) ? experience.primary : [])
    .map((item, index) => migrateResumeExperienceItem(item, fallback.data.experience.primary[index]))
    .filter((item): item is ResumeExperienceItem => Boolean(item))
  const groups = (Array.isArray(experience.groups) ? experience.groups : [])
    .map((group, index) => migrateResumeExperienceGroup(group, fallback.data.experience.groups[index]))
    .filter((group): group is ResumeExperienceGroup => Boolean(group))
  const education = normalizeQueensEducationDate(
    fallback.id,
    normalizeMcgillEducationDate(
      fallback.id,
      (Array.isArray(data.education) ? data.education : [])
        .map((item, index) => {
          const fallbackItem = fallback.data.education[index]
          if (!isRecord(item)) return fallbackItem ? clone(fallbackItem) : null
          return {
            id: normalizeRoiId(asString(item.id, fallbackItem?.id ?? `education-${Date.now()}`)),
            degree: normalizeRoiText(asString(item.degree, fallbackItem?.degree ?? '')),
            program: normalizeRoiText(asString(item.program, fallbackItem?.program ?? '')),
            school: normalizeRoiText(asString(item.school, fallbackItem?.school ?? '')),
            date: asString(item.date, fallbackItem?.date ?? ''),
            bullets: normalizeRoiStringArray(
              asStringArray(item.bullets).length ? asStringArray(item.bullets) : (fallbackItem?.bullets ?? []),
            ),
            logoSrc: resolveStudioAssetSrc(
              asString(item.logoSrc, fallbackItem?.logoSrc ?? ''),
              fallbackItem?.logoSrc ?? '',
            ),
            logoAlt: normalizeRoiText(asString(item.logoAlt, fallbackItem?.logoAlt ?? '')),
          }
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    ),
  )
  const mergedEducation = mergeMissingFallbackEducation(education, fallback.data.education)

  const leadership = (Array.isArray(data.leadership) ? data.leadership : [])
    .map((group, index) => migrateLeadershipGroup(group, fallback.data.leadership[index]))
    .filter((group): group is ResumeLeadershipGroup => Boolean(group))

  return {
    id: fallback.id,
    label: normalizeRoiText(asString(value.label, fallback.label)),
    description: normalizeRoiText(asString(value.description, fallback.description)),
    data: {
      header: {
        name: asString(header.name, fallback.data.header.name),
        title: normalizeRoiText(asString(header.title, fallback.data.header.title)),
        summary: normalizeRoiText(asString(header.summary, fallback.data.header.summary)),
        profileSrc: resolveStudioAssetSrc(
          asString(header.profileSrc, fallback.data.header.profileSrc),
          fallback.data.header.profileSrc,
        ),
        profileAlt: normalizeRoiText(asString(header.profileAlt, fallback.data.header.profileAlt)),
        contact: {
          email: normalizeTylerContactIdentity(headerContact.email, fallback.data.header.contact.email),
          phone: asString(headerContact.phone, fallback.data.header.contact.phone),
          website: normalizeTylerContactIdentity(headerContact.website, fallback.data.header.contact.website),
          location: asString(headerContact.location, fallback.data.header.contact.location),
        },
      },
      education: mergedEducation.length > 0 ? mergedEducation : clone(fallback.data.education),
      experience: {
        primary: primary.length > 0 ? primary : clone(fallback.data.experience.primary),
        groups: groups.length > 0 ? groups : clone(fallback.data.experience.groups),
      },
      certifications: {
        areas: migrateCertificationAreas(certifications, fallback.data.certifications.areas),
      },
      leadership: leadership.length > 0 ? leadership : clone(fallback.data.leadership),
    },
  }
}

const migrateCoverLetterConfig = (value: unknown, fallback: CoverLetterConfig): CoverLetterConfig => {
  if (!isRecord(value)) return clone(fallback)

  const shouldResetCredential =
    shouldResetCoverLetterCredentialName(value.credentialName, fallback.credentialName) ||
    shouldResetCoverLetterCredentialDetail(value.credentialDetail, fallback.credentialDetail) ||
    shouldResetCoverLetterCredentialLogoAlt(value.credentialLogoAlt, fallback.credentialLogoAlt)

  return {
    presetLabel: normalizeRoiText(asString(value.presetLabel, asString(value.organization, fallback.presetLabel))),
    tagline: normalizeCoverLetterTagline(value.tagline, fallback.tagline),
    contextNote: normalizeCoverLetterContextNote(
      'contextNote' in value ? value.contextNote : value.summary,
      fallback.contextNote,
    ),
    credentialName: normalizeCoverLetterCredentialName(value.credentialName, fallback.credentialName),
    credentialDetail: normalizeCoverLetterCredentialDetail(value.credentialDetail, fallback.credentialDetail),
    credentialLogoSrc: shouldResetCredential
      ? fallback.credentialLogoSrc
      : resolveStudioAssetSrc(
          asString(value.credentialLogoSrc, fallback.credentialLogoSrc),
          fallback.credentialLogoSrc,
        ),
    credentialLogoAlt: shouldResetCredential
      ? fallback.credentialLogoAlt
      : normalizeRoiText(asString(value.credentialLogoAlt, fallback.credentialLogoAlt)),
    profileSrc: resolveStudioAssetSrc(asString(value.profileSrc, fallback.profileSrc), fallback.profileSrc),
    profileAlt: normalizeRoiText(asString(value.profileAlt, fallback.profileAlt)),
    signatureSrc: resolveStudioAssetSrc(asString(value.signatureSrc, fallback.signatureSrc), fallback.signatureSrc),
    signatureAlt: normalizeRoiText(asString(value.signatureAlt, fallback.signatureAlt)),
  }
}

const migrateCoverLetterTemplate = (value: unknown, fallback: CoverLetterTemplate): CoverLetterTemplate => {
  if (!isRecord(value) || !isRecord(value.data)) {
    return clone(fallback)
  }

  if (hasLegacyCoverLetterTemplateMarkers(value)) {
    return clone(fallback)
  }

  const data = value.data
  return {
    id: fallback.id,
    label: normalizeRoiText(asString(value.label, fallback.label)),
    description: normalizeRoiText(asString(value.description, fallback.description)),
    config: migrateCoverLetterConfig(isRecord(value.config) ? value.config : null, fallback.config),
    data: {
      companyName: normalizeRoiText(asString(data.companyName, fallback.data.companyName)),
      position: normalizeRoiText(asString(data.position, fallback.data.position)),
      hiringManager: normalizeRoiText(asString(data.hiringManager, fallback.data.hiringManager)),
      date: asString(data.date, fallback.data.date),
      yourName: asString(data.yourName, fallback.data.yourName),
      yourEmail: normalizeTylerContactIdentity(data.yourEmail, fallback.data.yourEmail),
      yourPhone: asString(data.yourPhone, fallback.data.yourPhone),
      yourWebsite: normalizeTylerContactIdentity(data.yourWebsite, fallback.data.yourWebsite),
      yourAddress: normalizeRoiText(asString(data.yourAddress, fallback.data.yourAddress)),
      companyAddress: normalizeRoiText(asString(data.companyAddress, fallback.data.companyAddress)),
      openingParagraph: normalizeRoiText(asString(data.openingParagraph, fallback.data.openingParagraph)),
      bodyParagraph1: normalizeRoiText(asString(data.bodyParagraph1, fallback.data.bodyParagraph1)),
      bodyParagraph2: normalizeRoiText(asString(data.bodyParagraph2, fallback.data.bodyParagraph2)),
      bodyParagraph3: normalizeRoiText(asString(data.bodyParagraph3, fallback.data.bodyParagraph3)),
      closingParagraph: normalizeRoiText(asString(data.closingParagraph, fallback.data.closingParagraph)),
      signoffLabel: normalizeRoiText(asString(data.signoffLabel, fallback.data.signoffLabel)),
    },
  }
}

const migrateSignatureTemplate = (value: unknown, fallback: EmailSignatureTemplate): EmailSignatureTemplate => {
  if (!isRecord(value) || !isRecord(value.data)) {
    return clone(fallback)
  }

  const data = value.data
  const rawExperienceLogos = asLogoAssetArray(data.experienceLogos)
  const rawEducationLogos = asLogoAssetArray(data.educationLogos)
  const rawCertificationLogos = asLogoAssetArray(data.certificationLogos)
  const rawLegacyLogos = asLogoAssetArray(data.logos)
  const rawRole = asString(data.role, fallback.data.role)
  const shouldResetLegacyLogos =
    rawLegacyLogos.length === 0 || matchesLegacySignatureLogos(fallback.id, rawLegacyLogos)
  const email = asString(data.email, fallback.data.email)
  const website = asString(data.website, fallback.data.website)
  const hasExperienceLogos = Array.isArray(data.experienceLogos)
  const hasEducationLogos = Array.isArray(data.educationLogos)
  const hasCertificationLogos = Array.isArray(data.certificationLogos)
  const hasAffiliationLines = Array.isArray(data.affiliationLines)
  const nextExperienceLogos = hasExperienceLogos
    ? rawExperienceLogos
    : rawLegacyLogos.length > 0 && !shouldResetLegacyLogos
      ? rawLegacyLogos
      : clone(fallback.data.experienceLogos)
  const nextEducationLogos = hasEducationLogos ? rawEducationLogos : clone(fallback.data.educationLogos)
  const nextCertificationLogos = hasCertificationLogos
    ? rawCertificationLogos
    : clone(fallback.data.certificationLogos)
  const shouldUseFallbackRole = shouldUseFallbackSignatureRole(fallback.id, rawRole, fallback.data.role)
  const shouldUseFallbackOrganization = shouldUseFallbackSignatureOrganization(
    fallback.id,
    asString(data.organization, fallback.data.organization ?? ''),
    fallback.data.organization ?? '',
  )
  const shouldUseFallbackAffiliationLineValues =
    hasAffiliationLines &&
    (
      hasLegacyQueensMfinAffiliation(
        fallback.id,
        normalizeRoiStringArray(asStringArray(data.affiliationLines)),
      ) ||
      hasLegacyMcgillMbaAffiliation(
        fallback.id,
        normalizeRoiStringArray(asStringArray(data.affiliationLines)),
      )
    )
  const shouldUseFallbackAffiliationLines =
    shouldUseFallbackAffiliationLineValues ||
    (!hasAffiliationLines && (shouldUseFallbackRole || shouldUseFallbackOrganization))
  const nextRole = shouldUseFallbackRole
    ? fallback.data.role
    : rawRole
  const nextOrganization = shouldUseFallbackOrganization
    ? fallback.data.organization ?? ''
    : asString(data.organization, fallback.data.organization ?? '')
  const nextAffiliationLines = hasAffiliationLines
    ? normalizeRoiStringArray(
        shouldUseFallbackAffiliationLineValues
          ? normalizeSignatureAffiliationLines(fallback.data)
          : normalizeSignatureAffiliationLines(data),
      )
    : normalizeRoiStringArray(
        shouldUseFallbackAffiliationLines
          ? normalizeSignatureAffiliationLines(fallback.data)
          : normalizeSignatureAffiliationLines({
              role: nextRole,
              organization: nextOrganization,
            }),
      )

  return {
    id: fallback.id,
    label: normalizeRoiText(asString(value.label, fallback.label)),
    description: normalizeRoiText(asString(value.description, fallback.description)),
    data: {
      name: asString(data.name, fallback.data.name),
      role: normalizeRoiText(nextRole),
      organization: normalizeRoiText(nextOrganization),
      affiliationLines: nextAffiliationLines,
      email: normalizeTylerContactIdentity(email, fallback.data.email),
      website: normalizeTylerContactIdentity(website, fallback.data.website),
      phone: asString(data.phone, fallback.data.phone),
      location: normalizeRoiText(asString(data.location, fallback.data.location ?? '')),
      profileSrc: resolveStudioAssetSrc(asString(data.profileSrc, fallback.data.profileSrc), fallback.data.profileSrc),
      profileAlt: normalizeRoiText(asString(data.profileAlt, fallback.data.profileAlt)),
      experienceLogos: normalizeSignatureLogos(nextExperienceLogos, SIGNATURE_EXPERIENCE_LOGO_VALUES),
      educationLogos: normalizeSignatureLogos(nextEducationLogos, getSignatureEducationLogoValues(fallback.id)),
      certificationLogos: normalizeSignatureLogos(nextCertificationLogos, SIGNATURE_CERTIFICATION_LOGO_VALUES),
      signoff: normalizeSignatureSignoff(data.signoff, fallback.data.signoff ?? CURRENT_SIGNATURE_SIGNOFF),
      logoTone: data.logoTone === 'monochrome' ? 'monochrome' : 'original',
    },
  }
}

export const migrateResumeState = (value: unknown): MigrationResult<StoredResumeState> => {
  const fallback = getDefaultResumeState()
  if (!isRecord(value)) return { state: fallback, migrated: false }

  const fallbackMap = new Map(fallback.templates.map((template) => [template.id, template]))
  const hasLegacyResumeMarkers = Array.isArray(value.templates)
    ? value.templates.some((template, index) => {
        if (!isRecord(template) || !isRecord(template.data)) return false
        const fallbackTemplate =
          fallback.templates.find((fallbackTemplate) => fallbackTemplate.id === asString(template.id)) ??
          fallback.templates[index] ??
          fallback.templates[0]
        const certifications = isRecord(template.data.certifications) ? template.data.certifications : {}
        return (
          'theme' in template ||
          Array.isArray(certifications.featured) ||
          Array.isArray(certifications.stats) ||
          !Array.isArray(certifications.areas) ||
          hasLegacyResumeTemplateMarkers(template) ||
          hasLegacyRoiMarker(template) ||
          hasResumeAssetDrift(template) ||
          hasResumeContactIdentityDrift(template, fallbackTemplate) ||
          hasMcgillEducationDateDrift(template) ||
          hasQueensEducationDateDrift(template)
        )
      })
    : false
  const templates = fallback.templates.map((template) => {
    const rawTemplate = Array.isArray(value.templates)
      ? value.templates.find((item) => isRecord(item) && item.id === template.id)
      : null
    return migrateResumeTemplate(rawTemplate, template)
  })

  const selectedId =
    typeof value.selectedId === 'string' && fallbackMap.has(value.selectedId as ResumeTemplate['id'])
      ? (value.selectedId as ResumeTemplate['id'])
      : fallback.selectedId

  return {
    state: { selectedId, templates },
    migrated: hasLegacyResumeMarkers,
  }
}

export const migrateCoverLetterState = (value: unknown): MigrationResult<StoredCoverLetterState> => {
  const fallback = getDefaultCoverLetterState()
  if (!isRecord(value)) return { state: fallback, migrated: false }

  const fallbackIds = new Set(fallback.templates.map((template) => template.id))
  const hasLegacyCoverLetterMarkers = Array.isArray(value.templates)
    ? value.templates.some((template, index) => {
        if (!isRecord(template) || !isRecord(template.config) || !isRecord(template.data)) return false
        const fallbackTemplate =
          fallback.templates.find((fallbackTemplate) => fallbackTemplate.id === asString(template.id)) ??
          fallback.templates[index] ??
          fallback.templates[0]
        return (
          'organization' in template.config ||
          'summary' in template.config ||
          !('presetLabel' in template.config) ||
          !('tagline' in template.config) ||
          !('credentialName' in template.config) ||
          !('credentialDetail' in template.config) ||
          !('credentialLogoSrc' in template.config) ||
          !('credentialLogoAlt' in template.config) ||
          !('signoffLabel' in template.data) ||
          hasLegacyRoiMarker(template) ||
          hasCoverLetterAssetDrift(template) ||
          hasCoverLetterTaglineDrift(template, fallbackTemplate) ||
          hasCoverLetterContextNoteDrift(template) ||
          hasCoverLetterCredentialDrift(template, fallbackTemplate) ||
          hasCoverLetterContactIdentityDrift(template, fallbackTemplate) ||
          hasLegacyCoverLetterTemplateMarkers(template)
        )
      })
    : false
  const templates = fallback.templates.map((template) => {
    const rawTemplate = Array.isArray(value.templates)
      ? value.templates.find((item) => isRecord(item) && item.id === template.id)
      : null
    return migrateCoverLetterTemplate(rawTemplate, template)
  })

  const selectedId =
    hasLegacyCoverLetterMarkers && asString(value.selectedId) === 'queens'
      ? fallback.selectedId
      : typeof value.selectedId === 'string' && fallbackIds.has(value.selectedId as CoverLetterTemplate['id'])
        ? (value.selectedId as CoverLetterTemplate['id'])
        : fallback.selectedId

  return {
    state: { selectedId, templates },
    migrated: hasLegacyCoverLetterMarkers,
  }
}

export const migrateSignatureState = (value: unknown): MigrationResult<StoredSignatureState> => {
  const fallback = getDefaultSignatureState()
  if (!isRecord(value)) return { state: fallback, migrated: false }

  const fallbackIds = new Set(fallback.templates.map((template) => template.id))
  const hasLegacySignatureMarkers = Array.isArray(value.templates)
    ? value.templates.some((template, index) => {
        if (!isRecord(template) || !isRecord(template.data)) return false
        const fallbackTemplate =
          fallback.templates.find((fallbackTemplate) => fallbackTemplate.id === asString(template.id)) ??
          fallback.templates[index] ??
          fallback.templates[0]
        const data = template.data
        const rawExperienceLogos = asLogoAssetArray(data.experienceLogos)
        const rawEducationLogos = asLogoAssetArray(data.educationLogos)
        const rawCertificationLogos = asLogoAssetArray(data.certificationLogos)
        const rawLegacyLogos = asLogoAssetArray(data.logos)
        return (
          !('logoTone' in data) ||
          !('signoff' in data) ||
          !Array.isArray(data.experienceLogos) ||
          !Array.isArray(data.educationLogos) ||
          !Array.isArray(data.certificationLogos) ||
          !Array.isArray(data.affiliationLines) ||
          RESETTABLE_SIGNATURE_ROLES.has(asString(data.role)) ||
          hasLegacyRoiMarker(template) ||
          matchesLegacySignatureLogos(
            (asString(template.id, '') || 'unb') as EmailSignatureTemplate['id'],
            rawLegacyLogos,
          ) ||
          hasSignatureLogoGroupDrift(template) ||
          hasSignatureAssetDrift(template) ||
          hasSignatureContactIdentityDrift(template, fallbackTemplate) ||
          hasSignatureSignoffDrift(template) ||
          hasSignatureAffiliationDrift(template) ||
          (asString(template.id) === 'queens' &&
            rawExperienceLogos.length === 0 &&
            rawEducationLogos.length === 0 &&
            rawCertificationLogos.length === 0 &&
            rawLegacyLogos.length > 0)
        )
      })
    : false
  const templates = fallback.templates.map((template) => {
    const rawTemplate = Array.isArray(value.templates)
      ? value.templates.find((item) => isRecord(item) && item.id === template.id)
      : null
    return migrateSignatureTemplate(rawTemplate, template)
  })

  const selectedId =
    typeof value.selectedId === 'string' && fallbackIds.has(value.selectedId as EmailSignatureTemplate['id'])
      ? (value.selectedId as EmailSignatureTemplate['id'])
      : fallback.selectedId

  return {
    state: { selectedId, templates },
    migrated: hasLegacySignatureMarkers,
  }
}
