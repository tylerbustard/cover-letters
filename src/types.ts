export type DocumentType = 'resume' | 'cover-letter' | 'email-signature'
export type ExportDocumentType = 'resume' | 'cover-letter' | 'signature'

export type SeedCoverLetterId = 'queens' | 'unb' | 'uoft' | 'mcgill'
export type SeedResumeId = 'unb' | 'queens' | 'mcgill' | 'rotman'
export type SeedSignatureId = 'unb' | 'queens' | 'mcgill' | 'rotman' | 'strings'
export type VariationId = SeedCoverLetterId
export type CoverLetterId = string
export type ResumeId = string
export type SignatureId = string
export type ThemePackId = 'unb' | 'queens' | 'mcgill' | 'rotman' | 'strings'
export type FieldScope = 'shared only' | 'theme pack or document' | 'document only'
export type FieldSource = 'Shared' | 'Theme Pack' | 'This Document'
export type PresentationDensity = 'comfortable' | 'compact'
export type PresentationContactLayout = 'single-line' | 'wrap'
export type PreviewMode = 'screen' | 'print'
export type SignatureExportVariant = 'standard' | 'gmail' | 'outlook'
export type DocumentHealthStatus = 'Ready' | 'Needs Attention' | 'Blocked'
export type DocumentValidationSeverity = 'attention' | 'blocked'
export type DocumentLayoutMode = 'screen' | 'print'
export type ExportBalancePreset = 'relaxed' | 'balanced' | 'compact'
export type ExportBreakAnchor =
  | 'none'
  | 'co-op-experience'
  | 'professional-certifications'
  | 'co-op-and-professional-certifications'
export type ExportRenderMode = 'review' | 'capture'
export type ExportBalanceMode = 'auto' | 'locked'

export interface CoverLetterData {
  companyName: string
  position: string
  hiringManager: string
  date: string
  yourName: string
  yourEmail: string
  yourPhone: string
  yourWebsite: string
  yourAddress: string
  companyAddress: string
  openingParagraph: string
  bodyParagraph1: string
  bodyParagraph2: string
  bodyParagraph3: string
  closingParagraph: string
}

export interface CoverLetterTemplate {
  id: CoverLetterId
  label: string
  description: string
  config: {
    accent: string
    accentLight: string
    accentDark: string
    tagline: string
    organization: string
    summary: string
    logoSrc: string
    logoAlt: string
    profileSrc: string
    profileAlt: string
    signatureSrc: string
    signatureAlt: string
  }
  data: CoverLetterData
}

export interface ResumeContact {
  email: string
  phone: string
  website: string
  location: string
}

export interface ResumeHeader {
  name: string
  title: string
  summary: string
  profileSrc: string
  profileAlt: string
  contact: ResumeContact
}

export interface ResumeEducationItem {
  id: string
  degree: string
  program: string
  school: string
  date: string
  bullets: string[]
  logoSrc: string
  logoAlt: string
}

export interface ResumeExperienceItem {
  id: string
  role: string
  company: string
  location: string
  date: string
  bullets: string[]
  skills: string[]
  logoSrc: string
  logoAlt: string
}

export interface ResumeExperienceGroup {
  id: string
  title?: string
  layout: 'stack' | 'grid'
  columns?: number
  items: ResumeExperienceItem[]
}

export interface ResumeCertificationItem {
  id: string
  title: string
  organization: string
  detail: string
  date: string
  logoSrc: string
  logoAlt: string
}

export interface ResumeCertificationStat {
  id: string
  label: string
  count: string
  logos: { src: string; alt: string }[]
}

export interface ResumeLeadershipItem {
  id: string
  role: string
  organization: string
  location: string
  date: string
  logoSrc: string
  logoAlt: string
}

export interface ResumeLeadershipGroup {
  id: string
  title?: string
  layout: 'stack' | 'grid'
  columns?: number
  items: ResumeLeadershipItem[]
}

export interface ResumeData {
  header: ResumeHeader
  education: ResumeEducationItem[]
  experience: {
    primary: ResumeExperienceItem[]
    groups: ResumeExperienceGroup[]
  }
  certifications: {
    featured: ResumeCertificationItem[]
    stats: ResumeCertificationStat[]
  }
  leadership: ResumeLeadershipGroup[]
}

export interface ResumeTheme {
  accent: string
  accentSoft: string
  accentDark: string
}

export interface ResumeTemplate {
  id: ResumeId
  label: string
  description: string
  theme: ResumeTheme
  data: ResumeData
}

export interface EmailSignatureData {
  name: string
  role: string
  organization?: string
  email: string
  website: string
  phone: string
  location?: string
  profileSrc: string
  profileAlt: string
  logos: { src: string; alt: string }[]
}

export interface EmailSignatureTemplate {
  id: SignatureId
  label: string
  accent: string
  accentSoft: string
  accentDark: string
  data: EmailSignatureData
}

export interface SharedProfile {
  fullName: string
  phone: string
  location: string
  professionalHeadline: string
  summary: string
  profileSrc: string
  profileAlt: string
  signatureSrc: string
  signatureAlt: string
}

export interface AccentPalette {
  accent: string
  accentSoft: string
  accentDark: string
}

export interface ThemePack {
  id: ThemePackId
  label: string
  palette: AccentPalette
  organization: string
  primaryLogoSrc: string
  primaryLogoAlt: string
  defaultSubtitle?: string
  defaultRoleTitle?: string
  defaultEmail: string
  defaultWebsite: string
}

export interface ResumeDocumentOverrides {
  roleTitle?: string
  email?: string
  website?: string
}

export interface ResumeDocumentContent {
  education: ResumeEducationItem[]
  experience: ResumeData['experience']
  certifications: ResumeData['certifications']
  leadership: ResumeLeadershipGroup[]
}

export interface ResumeDocument {
  id: ResumeId
  label: string
  themePackId: ThemePackId
  meta: DocumentRecordMeta
  content: ResumeDocumentContent
  overrides: ResumeDocumentOverrides
}

export interface CoverLetterDocumentOverrides {
  tagline?: string
  organization?: string
  email?: string
  website?: string
}

export interface CoverLetterDocumentContent {
  companyName: string
  position: string
  hiringManager: string
  date: string
  companyAddress: string
  openingParagraph: string
  bodyParagraph1: string
  bodyParagraph2: string
  bodyParagraph3: string
  closingParagraph: string
}

export interface CoverLetterDocument {
  id: CoverLetterId
  label: string
  themePackId: ThemePackId
  meta: DocumentRecordMeta
  content: CoverLetterDocumentContent
  overrides: CoverLetterDocumentOverrides
}

export interface SignatureDocumentOverrides {
  roleTitle?: string
  organization?: string
  email?: string
  website?: string
}

export interface SignatureDocumentContent {
  logos: { src: string; alt: string }[]
}

export interface SignatureDocument {
  id: SignatureId
  label: string
  themePackId: ThemePackId
  meta: DocumentRecordMeta
  content: SignatureDocumentContent
  overrides: SignatureDocumentOverrides
}

export interface DocumentRecordMeta {
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface StudioSelection {
  documentType: DocumentType
  activeResumeId: ResumeId
  activeCoverLetterId: CoverLetterId
  activeSignatureId: SignatureId
}

export interface PresentationSettings {
  density: PresentationDensity
  showAvatar: boolean
  contactLayout: PresentationContactLayout
}

export interface StudioUIState {
  previewModeByType: Record<DocumentType, PreviewMode>
  collapsedSections: string[]
  showArchivedVariants: boolean
}

export interface ExportRequest {
  type: ExportDocumentType
  id: string
  variant?: SignatureExportVariant
  density?: PresentationDensity
  contactLayout?: PresentationContactLayout
  showAvatar?: boolean
  render?: ExportRenderMode
  balance?: ExportBalanceMode
  preset?: ExportBalancePreset
  breakAnchor?: ExportBreakAnchor
  fontScale?: number
  spaceScale?: number
}

export interface ResumeExportTuning {
  preset: ExportBalancePreset
  breakAnchor: ExportBreakAnchor
  fontScale: number
  spaceScale: number
}

export interface ExportBalanceResult {
  preset: ExportBalancePreset
  breakAnchor: ExportBreakAnchor
  pageCount: number
  page1Whitespace: number
  page2Whitespace: number
  page3Whitespace?: number
  score: number
}

export interface ExportMetrics {
  tuning: ResumeExportTuning
  pageCount: number
  pageWhitespace: number[]
  overflow: boolean
  orphanedHeadings: boolean
  splitGroups: boolean
  internalGapScore: number
  score: number
}

export interface DocumentValidationIssue {
  id: string
  severity: DocumentValidationSeverity
  label: string
  detail: string
}

export interface DocumentHealth {
  status: DocumentHealthStatus
  issues: DocumentValidationIssue[]
}

export interface StudioState {
  sharedProfile: SharedProfile
  presentation: PresentationSettings
  ui: StudioUIState
  themePacks: ThemePack[]
  resumeDocuments: ResumeDocument[]
  coverLetterDocuments: CoverLetterDocument[]
  signatureDocuments: SignatureDocument[]
  selection: StudioSelection
}

export interface PersistenceEnvelope {
  version: number
  state: StudioState
}

export interface ResolvedResumeView extends ResumeTemplate {
  themePackId: ThemePackId
  documentLabel: string
  health: DocumentHealth
}

export interface ResolvedCoverLetterView extends CoverLetterTemplate {
  themePackId: ThemePackId
  documentLabel: string
  health: DocumentHealth
}

export interface ResolvedSignatureView extends EmailSignatureTemplate {
  themePackId: ThemePackId
  documentLabel: string
  health: DocumentHealth
}
