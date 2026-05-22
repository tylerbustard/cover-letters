export type DocumentType = 'resume' | 'cover-letter' | 'email-signature'

export type CoverLetterId = 'queens' | 'unb' | 'uoft' | 'mcgill'
export type VariationId = CoverLetterId
export type ResumeId = 'unb' | 'queens' | 'mcgill' | 'rotman'
export type SignatureId = 'unb' | 'queens' | 'mcgill' | 'rotman' | 'strings'

export interface LogoAsset {
  src: string
  alt: string
}

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

export interface CoverLetterConfig {
  presetLabel: string
  tagline: string
  contextNote: string
  profileSrc: string
  profileAlt: string
  signatureSrc: string
  signatureAlt: string
}

export interface CoverLetterTemplate {
  id: CoverLetterId
  label: string
  description: string
  config: CoverLetterConfig
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
  name: string
  issuer: string
  year: string
  logoSrc: string
  logoAlt: string
  detail?: string
  emphasis?: boolean
}

export interface ResumeCertificationArea {
  id: string
  title: string
  caption: string
  column?: 'left' | 'right'
  items: ResumeCertificationItem[]
  summaryValue?: string
  summaryLogos?: LogoAsset[]
}

export interface ResumeLeadershipItem {
  id: string
  role: string
  organization: string
  location: string
  date: string
  bullets: string[]
  skills: string[]
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
    areas: ResumeCertificationArea[]
  }
  leadership: ResumeLeadershipGroup[]
}

export interface ResumeTemplate {
  id: ResumeId
  label: string
  description: string
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
  experienceLogos: LogoAsset[]
  educationLogos: LogoAsset[]
  signoff?: string
  logoTone?: 'monochrome' | 'original'
}

export interface EmailSignatureTemplate {
  id: SignatureId
  label: string
  description: string
  data: EmailSignatureData
}

export interface StudioSession {
  username: string
}

export interface StoredResumeState {
  selectedId: ResumeId
  templates: ResumeTemplate[]
}

export interface StoredCoverLetterState {
  selectedId: CoverLetterId
  templates: CoverLetterTemplate[]
}

export interface StoredSignatureState {
  selectedId: SignatureId
  templates: EmailSignatureTemplate[]
}

export type AiScope =
  | 'schema:read'
  | 'documents:read'
  | 'drafts:write'
  | 'drafts:read'
  | 'drafts:apply'
  | 'exports:write'

export type EditableValueType =
  | 'string'
  | 'text'
  | 'date'
  | 'asset'
  | 'assetList'
  | 'stringList'
  | 'metadata'

export type AiOperationType =
  | 'replaceField'
  | 'addListItem'
  | 'removeListItem'
  | 'createEntry'
  | 'deleteEntry'

export interface EditableFieldDescriptor {
  documentType: DocumentType
  templateSection: string
  sectionLabel: string
  fieldLabel: string
  fieldId: string
  jsonPath: string
  valueType: EditableValueType
  allowedOps: AiOperationType[]
  affectsOutput: boolean
  locked: boolean
  currentValue: unknown
  assetSource?: 'portraits' | 'signatures' | 'logos'
  assetOptions?: Array<{ label: string; value: string }>
}

export interface EditableCollectionDescriptor {
  documentType: DocumentType
  templateSection: string
  sectionLabel: string
  collectionId: string
  jsonPath: string
  entryType: string
  allowedOps: Extract<AiOperationType, 'createEntry' | 'deleteEntry'>[]
  itemIds: string[]
}

export interface StudioEditSchemaFieldTemplate {
  key: string
  fieldLabel: string
  valueType: EditableValueType
  allowedOps: AiOperationType[]
  affectsOutput: boolean
  assetSource?: 'portraits' | 'signatures' | 'logos'
}

export interface StudioEditSchemaSection {
  id: string
  label: string
  description: string
}

export interface StudioEditSchemaCollectionTemplate {
  id: string
  sectionId: string
  sectionLabel: string
  entryType: string
  allowedOps: Extract<AiOperationType, 'createEntry' | 'deleteEntry'>[]
}

export interface StudioEditSchemaDocument {
  displayName: string
  sections: StudioEditSchemaSection[]
  lockedRules: string[]
  fieldTemplates: Record<string, StudioEditSchemaFieldTemplate[]>
  collectionTemplates: StudioEditSchemaCollectionTemplate[]
}

export interface StudioEditSchema {
  schemaVersion: string
  assetOptions: {
    portraits: Array<{ label: string; value: string }>
    signatures: Array<{ label: string; value: string }>
    logos: Array<{ label: string; value: string }>
  }
  documents: Record<DocumentType, StudioEditSchemaDocument>
}

export type AiOperation =
  | {
      op: 'replaceField'
      fieldId: string
      value: unknown
    }
  | {
      op: 'addListItem'
      fieldId: string
      value: string
    }
  | {
      op: 'removeListItem'
      fieldId: string
      value?: string
      index?: number
    }
  | {
      op: 'createEntry'
      collectionId: string
      value: Record<string, unknown>
    }
  | {
      op: 'deleteEntry'
      collectionId: string
      entryId: string
    }

export interface AiDocumentSnapshot {
  documentType: DocumentType
  templateId: string
  templateLabel: string
  schemaVersion: string
  baseHash: string
  snapshot: Record<string, unknown>
  fields: EditableFieldDescriptor[]
  collections: EditableCollectionDescriptor[]
  lockedRules: string[]
}

export interface AiDraftDiffItem {
  op: AiOperationType
  fieldId?: string
  collectionId?: string
  fieldLabel: string
  jsonPath: string
  before: unknown
  after: unknown
}

export interface AiJobMetadata {
  jobId?: string
  jobUrl?: string
  company?: string
  role?: string
  packageId?: string
}

export interface AiDraft {
  id: string
  documentType: DocumentType
  templateId: string
  templateLabel: string
  baseHash: string
  projectedHash?: string
  createdAt: string
  createdBy: string
  status: 'pending' | 'applied' | 'rejected'
  jobContext?: string
  notes?: string
  jobMetadata?: AiJobMetadata
  operations: AiOperation[]
  diff: AiDraftDiffItem[]
  fieldsTouched: string[]
  appliedAt?: string
  appliedBy?: string
  rejectedAt?: string
  rejectedBy?: string
}

export interface AiDraftReviewState {
  documentType: DocumentType
  templateId: string
  pendingDrafts: AiDraft[]
  latestAppliedAudit: {
    draftId: string
    appliedAt: string
    appliedBy: string
    fieldsTouched: string[]
    jobContext?: string
    notes?: string
    jobMetadata?: AiJobMetadata
  } | null
}

export interface AiServiceTokenClaims {
  iss: string
  aud: string
  sub: string
  scope: AiScope[]
  iat: number
  exp: number
}

export interface AiExportArtifact {
  artifactId: string
  documentType: DocumentType
  templateId: string
  contentType: string
  downloadUrl: string
  sha256: string
  renderMode: 'canonical-file' | 'signature-html' | 'dynamic-print-route'
  fileName?: string
  printUrl?: string
  jobMetadata?: AiJobMetadata
}
