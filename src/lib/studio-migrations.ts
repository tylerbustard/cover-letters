import { getDefaultCoverLetterState, getDefaultResumeState, getDefaultSignatureState } from '@/lib/studio-defaults'
import { resolveStudioAssetSrc } from '@/data/assets'
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

const QUEENS_EDUCATION_YEAR = '2027'

const isQueensLegacyIdentity = (value: string) =>
  value.includes('tylerbustard.net') || value.includes('tylerbustard.ca')

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
        const isQueensEntry = item.id === 'education-queens' || item.school === "Queen's University"
        if (!isQueensEntry) return item
        if (
          item.date === '2026-2027' ||
          item.date === '2026 - 2027' ||
          item.date === '2026' ||
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

  return {
    id: asString(value.id, fallback?.id ?? `experience-group-${Date.now()}`),
    title: asString(value.title, fallback?.title ?? ''),
    layout: value.layout === 'grid' ? 'grid' : 'stack',
    columns:
      typeof value.columns === 'number'
        ? value.columns
        : typeof fallback?.columns === 'number'
          ? fallback.columns
          : undefined,
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

  return {
    id: asString(value.id, fallback?.id ?? `community-group-${Date.now()}`),
    title: asString(value.title, fallback?.title ?? ''),
    layout: value.layout === 'grid' ? 'grid' : 'stack',
    columns:
      typeof value.columns === 'number'
        ? value.columns
        : typeof fallback?.columns === 'number'
          ? fallback.columns
          : undefined,
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
        'summaryValue' in area),
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

  return (
    asString(header.title) === 'Finance & Technology Professional' ||
    hasImportedCertificationAreas ||
    hasLegacyEducation ||
    hasLegacyExperienceGrouping ||
    isOutdatedUnbBaseline
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
    hasAssetDrift(asString(value.config.signatureSrc))
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
  const legacyLogos = Array.isArray(value.data.logos) ? value.data.logos : []
  return (
    hasAssetDrift(asString(value.data.profileSrc)) ||
    experienceLogos.some((logo) => isRecord(logo) && hasAssetDrift(asString(logo.src))) ||
    educationLogos.some((logo) => isRecord(logo) && hasAssetDrift(asString(logo.src))) ||
    legacyLogos.some((logo) => isRecord(logo) && hasAssetDrift(asString(logo.src)))
  )
}

const hasQueensSignatureIdentityDrift = (value: unknown) => {
  if (!isRecord(value) || asString(value.id) !== 'queens' || !isRecord(value.data)) return false
  return isQueensLegacyIdentity(asString(value.data.email)) || isQueensLegacyIdentity(asString(value.data.website))
}

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
      (asString(item.id) === 'education-queens' || asString(item.school) === "Queen's University") &&
      ['2026-2027', '2026 - 2027', '2026', '2027 - 2026', '2027-2026'].includes(asString(item.date)),
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
          email: asString(headerContact.email, fallback.data.header.contact.email),
          phone: asString(headerContact.phone, fallback.data.header.contact.phone),
          website: asString(headerContact.website, fallback.data.header.contact.website),
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

  return {
    presetLabel: normalizeRoiText(asString(value.presetLabel, asString(value.organization, fallback.presetLabel))),
    tagline: normalizeRoiText(asString(value.tagline, fallback.tagline)),
    contextNote: normalizeRoiText(asString(value.contextNote, asString(value.summary, fallback.contextNote))),
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
      yourEmail: asString(data.yourEmail, fallback.data.yourEmail),
      yourPhone: asString(data.yourPhone, fallback.data.yourPhone),
      yourWebsite: asString(data.yourWebsite, fallback.data.yourWebsite),
      yourAddress: normalizeRoiText(asString(data.yourAddress, fallback.data.yourAddress)),
      companyAddress: normalizeRoiText(asString(data.companyAddress, fallback.data.companyAddress)),
      openingParagraph: normalizeRoiText(asString(data.openingParagraph, fallback.data.openingParagraph)),
      bodyParagraph1: normalizeRoiText(asString(data.bodyParagraph1, fallback.data.bodyParagraph1)),
      bodyParagraph2: normalizeRoiText(asString(data.bodyParagraph2, fallback.data.bodyParagraph2)),
      bodyParagraph3: normalizeRoiText(asString(data.bodyParagraph3, fallback.data.bodyParagraph3)),
      closingParagraph: normalizeRoiText(asString(data.closingParagraph, fallback.data.closingParagraph)),
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
  const rawLegacyLogos = asLogoAssetArray(data.logos)
  const rawRole = asString(data.role, fallback.data.role)
  const shouldResetLegacyLogos =
    rawLegacyLogos.length === 0 || matchesLegacySignatureLogos(fallback.id, rawLegacyLogos)
  const isQueensTemplate = fallback.id === 'queens'
  const email = asString(data.email, fallback.data.email)
  const website = asString(data.website, fallback.data.website)

  return {
    id: fallback.id,
    label: normalizeRoiText(asString(value.label, fallback.label)),
    description: normalizeRoiText(asString(value.description, fallback.description)),
    data: {
      name: asString(data.name, fallback.data.name),
      role: normalizeRoiText(RESETTABLE_SIGNATURE_ROLES.has(rawRole) ? fallback.data.role : rawRole),
      organization: normalizeRoiText(asString(data.organization, fallback.data.organization ?? '')),
      email:
        isQueensTemplate && isQueensLegacyIdentity(email)
          ? fallback.data.email
          : email || fallback.data.email,
      website:
        isQueensTemplate && isQueensLegacyIdentity(website)
          ? fallback.data.website
          : website || fallback.data.website,
      phone: asString(data.phone, fallback.data.phone),
      location: normalizeRoiText(asString(data.location, fallback.data.location ?? '')),
      profileSrc: resolveStudioAssetSrc(asString(data.profileSrc, fallback.data.profileSrc), fallback.data.profileSrc),
      profileAlt: normalizeRoiText(asString(data.profileAlt, fallback.data.profileAlt)),
      experienceLogos:
        isQueensTemplate
          ? clone(fallback.data.experienceLogos)
          : rawExperienceLogos.length > 0
            ? rawExperienceLogos
            : rawLegacyLogos.length > 0 && !shouldResetLegacyLogos
              ? rawLegacyLogos
              : clone(fallback.data.experienceLogos),
      educationLogos:
        isQueensTemplate
          ? clone(fallback.data.educationLogos)
          : rawEducationLogos.length > 0
            ? rawEducationLogos
            : clone(fallback.data.educationLogos),
      signoff: normalizeRoiText(asString(data.signoff, fallback.data.signoff ?? 'Best regards,')),
      logoTone: data.logoTone === 'original' ? 'original' : 'monochrome',
    },
  }
}

export const migrateResumeState = (value: unknown): MigrationResult<StoredResumeState> => {
  const fallback = getDefaultResumeState()
  if (!isRecord(value)) return { state: fallback, migrated: false }

  const fallbackMap = new Map(fallback.templates.map((template) => [template.id, template]))
  const hasLegacyResumeMarkers = Array.isArray(value.templates)
    ? value.templates.some((template) => {
        if (!isRecord(template) || !isRecord(template.data)) return false
        const certifications = isRecord(template.data.certifications) ? template.data.certifications : {}
        return (
          'theme' in template ||
          Array.isArray(certifications.featured) ||
          Array.isArray(certifications.stats) ||
          !Array.isArray(certifications.areas) ||
          hasLegacyResumeTemplateMarkers(template) ||
          hasLegacyRoiMarker(template) ||
          hasResumeAssetDrift(template) ||
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
    ? value.templates.some((template) => {
        if (!isRecord(template) || !isRecord(template.config)) return false
        return (
          'organization' in template.config ||
          'summary' in template.config ||
          !('presetLabel' in template.config) ||
          hasLegacyRoiMarker(template) ||
          hasCoverLetterAssetDrift(template) ||
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
    ? value.templates.some((template) => {
        if (!isRecord(template) || !isRecord(template.data)) return false
        const data = template.data
        const rawExperienceLogos = asLogoAssetArray(data.experienceLogos)
        const rawEducationLogos = asLogoAssetArray(data.educationLogos)
        const rawLegacyLogos = asLogoAssetArray(data.logos)
        return (
          !('logoTone' in data) ||
          !('signoff' in data) ||
          !Array.isArray(data.experienceLogos) ||
          !Array.isArray(data.educationLogos) ||
          RESETTABLE_SIGNATURE_ROLES.has(asString(data.role)) ||
          hasLegacyRoiMarker(template) ||
          matchesLegacySignatureLogos(
            (asString(template.id, '') || 'unb') as EmailSignatureTemplate['id'],
            rawLegacyLogos,
          ) ||
          hasSignatureAssetDrift(template) ||
          hasQueensSignatureIdentityDrift(template) ||
          (asString(template.id) === 'queens' &&
            rawExperienceLogos.length === 0 &&
            rawEducationLogos.length === 0 &&
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
