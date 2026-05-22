export type DocumentType = 'resume' | 'cover-letter' | 'email-signature'

export type CoverLetterId = 'queens' | 'unb' | 'uoft' | 'mcgill'
export type VariationId = CoverLetterId
export type ResumeId = 'unb' | 'queens' | 'mcgill' | 'rotman'
export type SignatureId = 'unb' | 'queens' | 'mcgill' | 'rotman' | 'strings'

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
  data: EmailSignatureData
}
