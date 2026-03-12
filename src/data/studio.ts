import { assets } from '@/data/assets'
import { COVER_LETTER_TEMPLATES } from '@/data/coverLetters'
import { RESUME_TEMPLATES } from '@/data/resumes'
import { SIGNATURE_TEMPLATES } from '@/data/signatures'
import type {
  CoverLetterDocument,
  CoverLetterId,
  DocumentHealth,
  DocumentRecordMeta,
  DocumentType,
  DocumentValidationIssue,
  PresentationSettings,
  PreviewMode,
  PersistenceEnvelope,
  ResolvedCoverLetterView,
  ResolvedResumeView,
  ResolvedSignatureView,
  ResumeDocument,
  ResumeId,
  SeedCoverLetterId,
  SeedResumeId,
  SeedSignatureId,
  SharedProfile,
  SignatureDocument,
  SignatureId,
  StudioState,
  StudioUIState,
  ThemePack,
  ThemePackId,
} from '@/types'

export const STUDIO_SCHEMA_VERSION = 3
export const STUDIO_STORAGE_KEY = 'career-document-studio'

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const DEFAULT_PRESENTATION: PresentationSettings = {
  density: 'comfortable',
  showAvatar: true,
  contactLayout: 'single-line',
}

const DEFAULT_UI: StudioUIState = {
  previewModeByType: {
    resume: 'screen',
    'cover-letter': 'screen',
    'email-signature': 'screen',
  },
  collapsedSections: [
    'resume-education',
    'resume-primary-experience',
    'resume-experience-groups',
    'resume-certifications',
    'resume-community-leadership',
    'cover-letter-body',
    'signature-logos',
    'assets-export',
  ],
  showArchivedVariants: false,
}

const PERSONAL_BRAND_PALETTE = {
  accent: '#0035A1',
  accentSoft: '#E8F0FF',
  accentDark: '#140C59',
} as const

const LEGACY_THEME_ACCENTS = new Set(['#a3061a', '#0f3d61', '#b5121b', '#1d4ed8', '#0f172a'])

const resumeThemePackMap: Record<SeedResumeId, ThemePackId> = {
  unb: 'unb',
  queens: 'queens',
  mcgill: 'mcgill',
  rotman: 'rotman',
}

const coverLetterThemePackMap: Record<SeedCoverLetterId, ThemePackId> = {
  unb: 'unb',
  queens: 'queens',
  mcgill: 'mcgill',
  uoft: 'rotman',
}

const coverLetterDocumentLabels: Record<SeedCoverLetterId, string> = {
  unb: 'UNB Cover Letter',
  queens: "Queen's Cover Letter",
  mcgill: 'McGill Cover Letter',
  uoft: 'Rotman Cover Letter',
}

const signatureThemePackMap: Record<SeedSignatureId, ThemePackId> = {
  unb: 'unb',
  queens: 'queens',
  mcgill: 'mcgill',
  rotman: 'rotman',
  strings: 'strings',
}

const nowIso = () => new Date().toISOString()

const createDocumentMeta = (
  overrides: Partial<DocumentRecordMeta> = {},
  timestamp = nowIso(),
): DocumentRecordMeta => ({
  createdAt: overrides.createdAt ?? timestamp,
  updatedAt: overrides.updatedAt ?? overrides.createdAt ?? timestamp,
  archived: overrides.archived ?? false,
})

const findResumeSeed = (id: SeedResumeId) => {
  const template = RESUME_TEMPLATES.find((item) => item.id === id)

  if (!template) {
    throw new Error(`Missing resume seed for ${id}`)
  }

  return template
}

const findCoverLetterSeed = (id: SeedCoverLetterId) => {
  const template = COVER_LETTER_TEMPLATES.find((item) => item.id === id)

  if (!template) {
    throw new Error(`Missing cover letter seed for ${id}`)
  }

  return template
}

const findSignatureSeed = (id: SeedSignatureId) => {
  const template = SIGNATURE_TEMPLATES.find((item) => item.id === id)

  if (!template) {
    throw new Error(`Missing signature seed for ${id}`)
  }

  return template
}

const normalizeLegacyCoverLetterLabel = (id: string, label: string) => {
  const seed = COVER_LETTER_TEMPLATES.find((item) => item.id === id)

  if (!seed) {
    return label
  }

  const mappedLabel = coverLetterDocumentLabels[id as SeedCoverLetterId]
  return mappedLabel && label === seed.label ? mappedLabel : label
}

const normalizeLegacyThemePackLabel = (id: ThemePackId, label: string) => {
  if (id === 'strings' && label === findSignatureSeed('strings').label) {
    return '73 Strings'
  }

  return label
}

const applyBrandPalette = (themePack: ThemePack): ThemePack =>
  LEGACY_THEME_ACCENTS.has(themePack.palette.accent.toLowerCase())
    ? {
        ...themePack,
        palette: { ...PERSONAL_BRAND_PALETTE },
      }
    : themePack

const createSharedProfile = (): SharedProfile => {
  const resumeSeed = findResumeSeed('unb')
  const coverLetterSeed = findCoverLetterSeed('unb')

  return {
    fullName: resumeSeed.data.header.name,
    phone: resumeSeed.data.header.contact.phone,
    location: resumeSeed.data.header.contact.location,
    professionalHeadline: resumeSeed.data.header.title,
    summary: resumeSeed.data.header.summary,
    profileSrc: resumeSeed.data.header.profileSrc,
    profileAlt: resumeSeed.data.header.profileAlt,
    signatureSrc: coverLetterSeed.config.signatureSrc,
    signatureAlt: coverLetterSeed.config.signatureAlt,
  }
}

const createThemePacks = (): ThemePack[] => {
  const unbLetter = findCoverLetterSeed('unb')
  const queensLetter = findCoverLetterSeed('queens')
  const mcgillLetter = findCoverLetterSeed('mcgill')
  const rotmanLetter = findCoverLetterSeed('uoft')

  const unbSignature = findSignatureSeed('unb')
  const queensSignature = findSignatureSeed('queens')
  const mcgillSignature = findSignatureSeed('mcgill')
  const rotmanSignature = findSignatureSeed('rotman')
  const stringsSignature = findSignatureSeed('strings')

  return [
    {
      id: 'unb',
      label: unbLetter.label,
      palette: { ...PERSONAL_BRAND_PALETTE },
      organization: unbLetter.config.organization,
      primaryLogoSrc: unbLetter.config.logoSrc,
      primaryLogoAlt: unbLetter.config.logoAlt,
      defaultEmail: unbSignature.data.email,
      defaultWebsite: unbSignature.data.website,
    },
    {
      id: 'queens',
      label: queensLetter.label,
      palette: { ...PERSONAL_BRAND_PALETTE },
      organization: queensLetter.config.organization,
      primaryLogoSrc: queensLetter.config.logoSrc,
      primaryLogoAlt: queensLetter.config.logoAlt,
      defaultEmail: queensSignature.data.email,
      defaultWebsite: queensSignature.data.website,
    },
    {
      id: 'mcgill',
      label: mcgillLetter.label,
      palette: { ...PERSONAL_BRAND_PALETTE },
      organization: mcgillLetter.config.organization,
      primaryLogoSrc: mcgillLetter.config.logoSrc,
      primaryLogoAlt: mcgillLetter.config.logoAlt,
      defaultEmail: mcgillSignature.data.email,
      defaultWebsite: mcgillSignature.data.website,
    },
    {
      id: 'rotman',
      label: rotmanLetter.label,
      palette: { ...PERSONAL_BRAND_PALETTE },
      organization: rotmanLetter.config.organization,
      primaryLogoSrc: rotmanLetter.config.logoSrc,
      primaryLogoAlt: rotmanLetter.config.logoAlt,
      defaultEmail: rotmanSignature.data.email,
      defaultWebsite: rotmanSignature.data.website,
    },
    {
      id: 'strings',
      label: '73 Strings',
      palette: { ...PERSONAL_BRAND_PALETTE },
      organization: stringsSignature.data.organization ?? '73 Strings',
      primaryLogoSrc: assets.logo73Strings,
      primaryLogoAlt: '73 Strings',
      defaultSubtitle: stringsSignature.data.role,
      defaultRoleTitle: stringsSignature.data.role,
      defaultEmail: stringsSignature.data.email,
      defaultWebsite: stringsSignature.data.website,
    },
  ]
}

const findThemePack = (themePacks: ThemePack[], id: ThemePackId) =>
  themePacks.find((pack) => pack.id === id) ?? themePacks[0]

const createResumeDocuments = (themePacks: ThemePack[], sharedProfile: SharedProfile): ResumeDocument[] =>
  RESUME_TEMPLATES.map((template) => {
    const themePackId = resumeThemePackMap[template.id as SeedResumeId]
    const themePack = findThemePack(themePacks, themePackId)
    const timestamp = nowIso()

    return {
      id: template.id,
      label: template.label,
      themePackId,
      meta: createDocumentMeta({}, timestamp),
      content: {
        education: deepClone(template.data.education),
        experience: deepClone(template.data.experience),
        certifications: deepClone(template.data.certifications),
        leadership: deepClone(template.data.leadership),
      },
      overrides: {
        roleTitle:
          template.data.header.title !== themePack.defaultRoleTitle &&
          template.data.header.title !== sharedProfile.professionalHeadline
            ? template.data.header.title
            : undefined,
        email: template.data.header.contact.email !== themePack.defaultEmail ? template.data.header.contact.email : undefined,
        website:
          template.data.header.contact.website !== themePack.defaultWebsite
            ? template.data.header.contact.website
            : undefined,
      },
    }
  })

const createCoverLetterDocuments = (
  themePacks: ThemePack[],
  sharedProfile: SharedProfile,
): CoverLetterDocument[] =>
  COVER_LETTER_TEMPLATES.map((template) => {
    const themePackId = coverLetterThemePackMap[template.id as SeedCoverLetterId]
    const themePack = findThemePack(themePacks, themePackId)
    const timestamp = nowIso()

    return {
      id: template.id,
      label: coverLetterDocumentLabels[template.id as SeedCoverLetterId],
      themePackId,
      meta: createDocumentMeta({}, timestamp),
      content: {
        companyName: template.data.companyName,
        position: template.data.position,
        hiringManager: template.data.hiringManager,
        date: template.data.date,
        companyAddress: template.data.companyAddress,
        openingParagraph: template.data.openingParagraph,
        bodyParagraph1: template.data.bodyParagraph1,
        bodyParagraph2: template.data.bodyParagraph2,
        bodyParagraph3: template.data.bodyParagraph3,
        closingParagraph: template.data.closingParagraph,
      },
      overrides: {
        tagline:
          template.config.tagline !== (themePack.defaultSubtitle ?? sharedProfile.professionalHeadline)
            ? template.config.tagline
            : undefined,
        organization: template.config.organization !== themePack.organization ? template.config.organization : undefined,
        email: template.data.yourEmail !== themePack.defaultEmail ? template.data.yourEmail : undefined,
        website: template.data.yourWebsite !== themePack.defaultWebsite ? template.data.yourWebsite : undefined,
      },
    }
  })

const createSignatureDocuments = (themePacks: ThemePack[], sharedProfile: SharedProfile): SignatureDocument[] =>
  SIGNATURE_TEMPLATES.map((template) => {
    const themePackId = signatureThemePackMap[template.id as SeedSignatureId]
    const themePack = findThemePack(themePacks, themePackId)
    const timestamp = nowIso()

    return {
      id: template.id,
      label: template.label,
      themePackId,
      meta: createDocumentMeta({}, timestamp),
      content: {
        logos: deepClone(template.data.logos),
      },
      overrides: {
        roleTitle:
          template.data.role !== themePack.defaultRoleTitle &&
          template.data.role !== sharedProfile.professionalHeadline
            ? template.data.role
            : undefined,
        organization: template.data.organization !== themePack.organization ? template.data.organization : undefined,
        email: template.data.email !== themePack.defaultEmail ? template.data.email : undefined,
        website: template.data.website !== themePack.defaultWebsite ? template.data.website : undefined,
      },
    }
  })

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isDocumentType = (value: unknown): value is DocumentType =>
  value === 'resume' || value === 'cover-letter' || value === 'email-signature'

const isPreviewMode = (value: unknown): value is PreviewMode => value === 'screen' || value === 'print'

const normalizeDocumentMeta = (meta: unknown): DocumentRecordMeta => {
  const rawMeta = isObject(meta) ? meta : {}
  return createDocumentMeta({
    createdAt: typeof rawMeta.createdAt === 'string' ? rawMeta.createdAt : undefined,
    updatedAt: typeof rawMeta.updatedAt === 'string' ? rawMeta.updatedAt : undefined,
    archived: typeof rawMeta.archived === 'boolean' ? rawMeta.archived : undefined,
  })
}

const normalizeStudioUi = (value: unknown): StudioUIState => {
  const rawUi = isObject(value) ? value : {}
  const rawPreview = isObject(rawUi.previewModeByType) ? rawUi.previewModeByType : {}

  return {
    previewModeByType: {
      resume: isPreviewMode(rawPreview.resume) ? rawPreview.resume : DEFAULT_UI.previewModeByType.resume,
      'cover-letter': isPreviewMode(rawPreview['cover-letter'])
        ? rawPreview['cover-letter']
        : DEFAULT_UI.previewModeByType['cover-letter'],
      'email-signature': 'screen',
    },
    collapsedSections: Array.isArray(rawUi.collapsedSections)
      ? rawUi.collapsedSections.filter((item): item is string => typeof item === 'string')
      : [...DEFAULT_UI.collapsedSections],
    showArchivedVariants:
      typeof rawUi.showArchivedVariants === 'boolean'
        ? rawUi.showArchivedVariants
        : DEFAULT_UI.showArchivedVariants,
  }
}

const getAvailableDocuments = <T extends { meta: DocumentRecordMeta }>(documents: T[]) => {
  const activeDocuments = documents.filter((document) => !document.meta.archived)
  return activeDocuments.length > 0 ? activeDocuments : documents
}

const pickSelectedDocumentId = <T extends { id: string; meta: DocumentRecordMeta }>(
  documents: T[],
  candidateId: unknown,
  fallbackId: string,
) => {
  const availableDocuments = getAvailableDocuments(documents)
  const selected = availableDocuments.find((document) => document.id === candidateId)
  return selected?.id ?? availableDocuments[0]?.id ?? fallbackId
}

const hasValue = (value: string | undefined | null) => Boolean(value && value.trim().length > 0)

const createIssue = (
  id: string,
  severity: DocumentValidationIssue['severity'],
  label: string,
  detail: string,
): DocumentValidationIssue => ({
  id,
  severity,
  label,
  detail,
})

const finalizeHealth = (issues: DocumentValidationIssue[]): DocumentHealth => {
  if (issues.some((issue) => issue.severity === 'blocked')) {
    return { status: 'Blocked', issues }
  }

  if (issues.length > 0) {
    return { status: 'Needs Attention', issues }
  }

  return { status: 'Ready', issues: [] }
}

const getContactRisk = (
  values: string[],
  documentType: 'resume' | 'cover-letter' | 'email-signature',
  contactLayout: PresentationSettings['contactLayout'],
) => {
  if (contactLayout === 'wrap') {
    return null
  }

  const totalLength = values.reduce((sum, value) => sum + value.length, 0)
  const longestValue = values.reduce((max, value) => Math.max(max, value.length), 0)
  const thresholds =
    documentType === 'email-signature'
      ? { attention: 72, blocked: 86, long: 28 }
      : { attention: 84, blocked: 98, long: 34 }

  if (totalLength > thresholds.blocked || longestValue > thresholds.long + 10) {
    return createIssue(
      `${documentType}-contact-blocked`,
      'blocked',
      'Contact row will likely overflow',
      'Switch to Balanced Wrap or shorten long contact values before export.',
    )
  }

  if (totalLength > thresholds.attention || longestValue > thresholds.long) {
    return createIssue(
      `${documentType}-contact-attention`,
      'attention',
      'Contact row is getting tight',
      'Long contact values may truncate in single-line mode on screen or in print.',
    )
  }

  return null
}

const estimateResumeLines = (view: ResolvedResumeView) => {
  const { data } = view
  const educationLines = data.education.reduce(
    (sum, item) => sum + 4 + item.bullets.reduce((bulletSum, bullet) => bulletSum + Math.ceil(bullet.length / 88), 0),
    0,
  )
  const primaryExperienceLines = data.experience.primary.reduce(
    (sum, item) =>
      sum +
      5 +
      item.bullets.reduce((bulletSum, bullet) => bulletSum + Math.ceil(bullet.length / 88), 0) +
      (item.skills.length > 0 ? 1 : 0),
    0,
  )
  const groupedExperienceLines = data.experience.groups.reduce(
    (sum, group) =>
      sum +
      (group.title ? 1 : 0) +
      group.items.reduce(
        (itemSum, item) =>
          itemSum +
          4 +
          item.bullets.reduce((bulletSum, bullet) => bulletSum + Math.ceil(bullet.length / 88), 0) +
          (item.skills.length > 0 ? 1 : 0),
        0,
      ),
    0,
  )
  const certificationLines =
    data.certifications.featured.length * 4 +
    data.certifications.stats.length * 2 +
    data.certifications.stats.reduce((sum, item) => sum + Math.ceil(item.label.length / 32), 0)
  const leadershipLines = data.leadership.reduce(
    (sum, group) => sum + (group.title ? 1 : 0) + group.items.length * 3,
    0,
  )

  return 11 + Math.ceil(data.header.summary.length / 88) + educationLines + primaryExperienceLines + groupedExperienceLines + certificationLines + leadershipLines
}

const getResumeHealth = (view: ResolvedResumeView, presentation: PresentationSettings): DocumentHealth => {
  const issues: DocumentValidationIssue[] = []
  const contactIssue = getContactRisk(
    [
      view.data.header.contact.email,
      view.data.header.contact.phone,
      view.data.header.contact.website,
      view.data.header.contact.location,
    ],
    'resume',
    presentation.contactLayout,
  )

  if (contactIssue) {
    issues.push(contactIssue)
  }

  if (
    !hasValue(view.data.header.name) ||
    !hasValue(view.data.header.title) ||
    !hasValue(view.data.header.contact.email) ||
    !hasValue(view.data.header.contact.phone) ||
    !hasValue(view.data.header.contact.website)
  ) {
    issues.push(
      createIssue(
        'resume-missing-header',
        'blocked',
        'Resume header is incomplete',
        'Name, title, email, phone, and website are required for a clean export.',
      ),
    )
  }

  if (view.data.experience.primary.length === 0) {
    issues.push(
      createIssue(
        'resume-missing-experience',
        'blocked',
        'Primary experience is empty',
        'Add at least one primary experience card before exporting the resume.',
      ),
    )
  }

  const hasLongText =
    view.data.header.summary.length > 240 ||
    view.data.education.some((item) => item.degree.length > 48 || item.school.length > 48 || item.bullets.some((bullet) => bullet.length > 150)) ||
    view.data.experience.primary.some(
      (item) => item.role.length > 48 || item.company.length > 44 || item.bullets.some((bullet) => bullet.length > 150),
    ) ||
    view.data.experience.groups.some((group) =>
      group.items.some(
        (item) => item.role.length > 48 || item.company.length > 44 || item.bullets.some((bullet) => bullet.length > 150),
      ),
    )

  if (hasLongText) {
    issues.push(
      createIssue(
        'resume-long-text',
        'attention',
        'Some resume content is verbose',
        'Long bullets or labels may wrap awkwardly and reduce visual consistency.',
      ),
    )
  }

  const estimatedLines = estimateResumeLines(view)
  if (estimatedLines > 74) {
    issues.push(
      createIssue(
        'resume-print-fit-blocked',
        'blocked',
        'Resume is likely to exceed one page',
        'Reduce bullet volume or switch to Compact density before exporting the PDF.',
      ),
    )
  } else if (estimatedLines > 64) {
    issues.push(
      createIssue(
        'resume-print-fit-attention',
        'attention',
        'Resume is approaching the one-page limit',
        'Check print preview before exporting to PDF.',
      ),
    )
  }

  return finalizeHealth(issues)
}

const estimateCoverLetterLines = (view: ResolvedCoverLetterView) => {
  const paragraphs = [
    view.data.openingParagraph,
    view.data.bodyParagraph1,
    view.data.bodyParagraph2,
    view.data.bodyParagraph3,
    view.data.closingParagraph,
  ]

  return (
    16 +
    paragraphs.reduce((sum, paragraph) => sum + Math.ceil(paragraph.length / 92), 0) +
    Math.ceil(view.config.summary.length / 88) +
    Math.ceil(view.data.companyAddress.length / 44)
  )
}

const getCoverLetterHealth = (view: ResolvedCoverLetterView, presentation: PresentationSettings): DocumentHealth => {
  const issues: DocumentValidationIssue[] = []
  const contactIssue = getContactRisk(
    [view.data.yourEmail, view.data.yourPhone, view.data.yourWebsite, view.data.yourAddress],
    'cover-letter',
    presentation.contactLayout,
  )

  if (contactIssue) {
    issues.push(contactIssue)
  }

  if (
    !hasValue(view.data.companyName) ||
    !hasValue(view.data.position) ||
    !hasValue(view.data.openingParagraph) ||
    !hasValue(view.data.closingParagraph)
  ) {
    issues.push(
      createIssue(
        'cover-letter-missing-critical',
        'blocked',
        'Cover letter is missing key content',
        'Company name, role title, opening paragraph, and closing paragraph must be completed.',
      ),
    )
  }

  const paragraphs = [
    view.data.openingParagraph,
    view.data.bodyParagraph1,
    view.data.bodyParagraph2,
    view.data.bodyParagraph3,
    view.data.closingParagraph,
  ]
  if (paragraphs.some((paragraph) => paragraph.length > 540)) {
    issues.push(
      createIssue(
        'cover-letter-long-paragraph',
        'attention',
        'One or more paragraphs are very long',
        'Long paragraphs may create uneven spacing or page overflow in PDF output.',
      ),
    )
  }

  const estimatedLines = estimateCoverLetterLines(view)
  if (estimatedLines > 66) {
    issues.push(
      createIssue(
        'cover-letter-print-fit-blocked',
        'blocked',
        'Cover letter is likely to exceed one page',
        'Shorten the body or switch to Compact density before exporting to PDF.',
      ),
    )
  } else if (estimatedLines > 56) {
    issues.push(
      createIssue(
        'cover-letter-print-fit-attention',
        'attention',
        'Cover letter is close to the page limit',
        'Check print preview before exporting to PDF.',
      ),
    )
  }

  return finalizeHealth(issues)
}

const getSignatureHealth = (view: ResolvedSignatureView, presentation: PresentationSettings): DocumentHealth => {
  const issues: DocumentValidationIssue[] = []
  const contactIssue = getContactRisk(
    [view.data.email, view.data.phone, view.data.website, view.data.location ?? ''],
    'email-signature',
    presentation.contactLayout,
  )

  if (contactIssue) {
    issues.push(contactIssue)
  }

  if (
    !hasValue(view.data.name) ||
    !hasValue(view.data.role) ||
    !hasValue(view.data.email) ||
    !hasValue(view.data.phone) ||
    !hasValue(view.data.website)
  ) {
    issues.push(
      createIssue(
        'signature-missing-critical',
        'blocked',
        'Signature is missing critical contact fields',
        'Name, role, email, phone, and website are required for copy-ready signature HTML.',
      ),
    )
  }

  if (view.data.logos.length > 10) {
    issues.push(
      createIssue(
        'signature-logo-blocked',
        'blocked',
        'Signature logo strip is overcrowded',
        'Reduce the logo count to avoid broken layouts across email clients.',
      ),
    )
  } else if (view.data.logos.length > 8) {
    issues.push(
      createIssue(
        'signature-logo-attention',
        'attention',
        'Signature logo strip is dense',
        'Too many logos can wrap or compress in tighter email clients.',
      ),
    )
  }

  if ((view.data.role?.length ?? 0) > 48 || (view.data.organization?.length ?? 0) > 44) {
    issues.push(
      createIssue(
        'signature-long-title',
        'attention',
        'Signature title stack is long',
        'Long role or organization labels may force the signature header to wrap.',
      ),
    )
  }

  return finalizeHealth(issues)
}

export const createSeedStudioState = (): StudioState => {
  const sharedProfile = createSharedProfile()
  const themePacks = createThemePacks()
  const resumeDocuments = createResumeDocuments(themePacks, sharedProfile)
  const coverLetterDocuments = createCoverLetterDocuments(themePacks, sharedProfile)
  const signatureDocuments = createSignatureDocuments(themePacks, sharedProfile)

  return {
    sharedProfile,
    presentation: { ...DEFAULT_PRESENTATION },
    ui: deepClone(DEFAULT_UI),
    themePacks,
    resumeDocuments,
    coverLetterDocuments,
    signatureDocuments,
    selection: {
      documentType: 'resume',
      activeResumeId: resumeDocuments[0].id,
      activeCoverLetterId: coverLetterDocuments[0].id,
      activeSignatureId: signatureDocuments[0].id,
    },
  }
}

export const createPersistenceEnvelope = (state: StudioState): PersistenceEnvelope => ({
  version: STUDIO_SCHEMA_VERSION,
  state,
})

export const isPersistenceEnvelope = (value: unknown): value is PersistenceEnvelope => {
  if (!isObject(value) || typeof value.version !== 'number' || value.version > STUDIO_SCHEMA_VERSION || !isObject(value.state)) {
    return false
  }

  const state = value.state

  return (
    isObject(state.sharedProfile) &&
    Array.isArray(state.themePacks) &&
    Array.isArray(state.resumeDocuments) &&
    Array.isArray(state.coverLetterDocuments) &&
    Array.isArray(state.signatureDocuments) &&
    isObject(state.selection) &&
    isDocumentType(state.selection.documentType)
  )
}

export const normalizeStudioState = (state: StudioState): StudioState => {
  const fallback = createSeedStudioState()
  const themePacks =
    (state.themePacks.length > 0 ? state.themePacks : fallback.themePacks).map((pack) =>
      applyBrandPalette({
        ...pack,
        label: normalizeLegacyThemePackLabel(pack.id, pack.label),
      }),
    )
  const themePackIds = new Set(themePacks.map((pack) => pack.id))
  const rawState = state as unknown as Record<string, unknown>
  const rawPresentation = isObject(rawState.presentation) ? rawState.presentation : null

  const resumeDocuments = (state.resumeDocuments.length > 0 ? state.resumeDocuments : fallback.resumeDocuments).map((document) => ({
    ...document,
    meta: normalizeDocumentMeta((document as unknown as Record<string, unknown>).meta),
    themePackId: themePackIds.has(document.themePackId) ? document.themePackId : fallback.themePacks[0].id,
  }))
  const coverLetterDocuments = (
    state.coverLetterDocuments.length > 0 ? state.coverLetterDocuments : fallback.coverLetterDocuments
  ).map((document) => ({
    ...document,
    label: normalizeLegacyCoverLetterLabel(document.id, document.label),
    meta: normalizeDocumentMeta((document as unknown as Record<string, unknown>).meta),
    themePackId: themePackIds.has(document.themePackId) ? document.themePackId : fallback.themePacks[0].id,
  }))
  const signatureDocuments = (
    state.signatureDocuments.length > 0 ? state.signatureDocuments : fallback.signatureDocuments
  ).map((document) => ({
    ...document,
    meta: normalizeDocumentMeta((document as unknown as Record<string, unknown>).meta),
    themePackId: themePackIds.has(document.themePackId) ? document.themePackId : fallback.themePacks[0].id,
  }))

  return {
    sharedProfile: state.sharedProfile,
    presentation: {
      density: rawPresentation?.density === 'compact' ? 'compact' : fallback.presentation.density,
      showAvatar:
        typeof rawPresentation?.showAvatar === 'boolean'
          ? rawPresentation.showAvatar
          : fallback.presentation.showAvatar,
      contactLayout: rawPresentation?.contactLayout === 'wrap' ? 'wrap' : fallback.presentation.contactLayout,
    },
    ui: normalizeStudioUi((rawState as Record<string, unknown>).ui),
    themePacks,
    resumeDocuments,
    coverLetterDocuments,
    signatureDocuments,
    selection: {
      documentType: isDocumentType(state.selection.documentType)
        ? state.selection.documentType
        : fallback.selection.documentType,
      activeResumeId: pickSelectedDocumentId(resumeDocuments, state.selection.activeResumeId, fallback.selection.activeResumeId),
      activeCoverLetterId: pickSelectedDocumentId(
        coverLetterDocuments,
        state.selection.activeCoverLetterId,
        fallback.selection.activeCoverLetterId,
      ),
      activeSignatureId: pickSelectedDocumentId(
        signatureDocuments,
        state.selection.activeSignatureId,
        fallback.selection.activeSignatureId,
      ),
    },
  }
}

export const resolveResumeView = (state: StudioState, id: ResumeId): ResolvedResumeView => {
  const availableDocuments = getAvailableDocuments(state.resumeDocuments)
  const document = availableDocuments.find((item) => item.id === id) ?? availableDocuments[0]
  const themePack = findThemePack(state.themePacks, document.themePackId)

  const view: ResolvedResumeView = {
    id: document.id,
    label: document.label,
    description: `Uses ${themePack.label}`,
    themePackId: themePack.id,
    documentLabel: document.label,
    theme: {
      accent: themePack.palette.accent,
      accentSoft: themePack.palette.accentSoft,
      accentDark: themePack.palette.accentDark,
    },
    data: {
      header: {
        name: state.sharedProfile.fullName,
        title:
          document.overrides.roleTitle ??
          themePack.defaultRoleTitle ??
          state.sharedProfile.professionalHeadline,
        summary: state.sharedProfile.summary,
        profileSrc: state.sharedProfile.profileSrc,
        profileAlt: state.sharedProfile.profileAlt,
        contact: {
          email: document.overrides.email ?? themePack.defaultEmail,
          phone: state.sharedProfile.phone,
          website: document.overrides.website ?? themePack.defaultWebsite,
          location: state.sharedProfile.location,
        },
      },
      education: document.content.education,
      experience: document.content.experience,
      certifications: document.content.certifications,
      leadership: document.content.leadership,
    },
    health: { status: 'Ready', issues: [] },
  }

  return {
    ...view,
    health: getResumeHealth(view, state.presentation),
  }
}

export const resolveCoverLetterView = (state: StudioState, id: CoverLetterId): ResolvedCoverLetterView => {
  const availableDocuments = getAvailableDocuments(state.coverLetterDocuments)
  const document = availableDocuments.find((item) => item.id === id) ?? availableDocuments[0]
  const themePack = findThemePack(state.themePacks, document.themePackId)

  const view: ResolvedCoverLetterView = {
    id: document.id,
    label: document.label,
    description: `Uses ${themePack.label}`,
    themePackId: themePack.id,
    documentLabel: document.label,
    config: {
      accent: themePack.palette.accent,
      accentLight: themePack.palette.accentSoft,
      accentDark: themePack.palette.accentDark,
      tagline:
        document.overrides.tagline ??
        themePack.defaultSubtitle ??
        themePack.defaultRoleTitle ??
        state.sharedProfile.professionalHeadline,
      organization: document.overrides.organization ?? themePack.organization,
      summary: state.sharedProfile.summary,
      logoSrc: themePack.primaryLogoSrc,
      logoAlt: themePack.primaryLogoAlt,
      profileSrc: state.sharedProfile.profileSrc,
      profileAlt: state.sharedProfile.profileAlt,
      signatureSrc: state.sharedProfile.signatureSrc,
      signatureAlt: state.sharedProfile.signatureAlt,
    },
    data: {
      companyName: document.content.companyName,
      position: document.content.position,
      hiringManager: document.content.hiringManager,
      date: document.content.date,
      yourName: state.sharedProfile.fullName,
      yourEmail: document.overrides.email ?? themePack.defaultEmail,
      yourPhone: state.sharedProfile.phone,
      yourWebsite: document.overrides.website ?? themePack.defaultWebsite,
      yourAddress: state.sharedProfile.location,
      companyAddress: document.content.companyAddress,
      openingParagraph: document.content.openingParagraph,
      bodyParagraph1: document.content.bodyParagraph1,
      bodyParagraph2: document.content.bodyParagraph2,
      bodyParagraph3: document.content.bodyParagraph3,
      closingParagraph: document.content.closingParagraph,
    },
    health: { status: 'Ready', issues: [] },
  }

  return {
    ...view,
    health: getCoverLetterHealth(view, state.presentation),
  }
}

export const resolveSignatureView = (state: StudioState, id: SignatureId): ResolvedSignatureView => {
  const availableDocuments = getAvailableDocuments(state.signatureDocuments)
  const document = availableDocuments.find((item) => item.id === id) ?? availableDocuments[0]
  const themePack = findThemePack(state.themePacks, document.themePackId)

  const view: ResolvedSignatureView = {
    id: document.id,
    label: document.label,
    themePackId: themePack.id,
    documentLabel: document.label,
    accent: themePack.palette.accent,
    accentSoft: themePack.palette.accentSoft,
    accentDark: themePack.palette.accentDark,
    data: {
      name: state.sharedProfile.fullName,
      role:
        document.overrides.roleTitle ??
        themePack.defaultRoleTitle ??
        state.sharedProfile.professionalHeadline,
      organization: document.overrides.organization ?? themePack.organization,
      email: document.overrides.email ?? themePack.defaultEmail,
      website: document.overrides.website ?? themePack.defaultWebsite,
      phone: state.sharedProfile.phone,
      location: state.sharedProfile.location,
      profileSrc: state.sharedProfile.profileSrc,
      profileAlt: state.sharedProfile.profileAlt,
      logos: document.content.logos,
    },
    health: { status: 'Ready', issues: [] },
  }

  return {
    ...view,
    health: getSignatureHealth(view, state.presentation),
  }
}

export const getThemePackForDocument = (themePacks: ThemePack[], themePackId: ThemePackId) =>
  findThemePack(themePacks, themePackId)
