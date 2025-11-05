import { CoverLetterData } from '@/types'

const hasValue = (value: string) => value.trim().length > 0

export const sanitizeFilenamePart = (value: string, fallback: string) => {
  const slug = value
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)

  return slug || fallback
}

export const getOpeningParagraph = (data: CoverLetterData) => {
  if (hasValue(data.openingParagraph)) {
    return data.openingParagraph.trim()
  }

  const trimmedPosition = data.position.trim()
  const trimmedCompany = data.companyName.trim()

  const roleSegment = trimmedPosition ? `the ${trimmedPosition} position` : 'this opportunity'
  const companySegment = trimmedCompany ? ` at ${trimmedCompany}` : ''

  return `I am writing to express my strong interest in ${roleSegment}${companySegment}. With my background in finance and technology, I am excited about the opportunity to contribute to your team.`
}

export const getClosingParagraph = (data: CoverLetterData) => {
  if (hasValue(data.closingParagraph)) {
    return data.closingParagraph.trim()
  }

  const trimmedCompany = data.companyName.trim()
  const companySegment = trimmedCompany ? ` to ${trimmedCompany}` : ''

  return `I am eager to bring my skills and passion${companySegment} and would welcome the opportunity to discuss how my experience aligns with your needs. Thank you for considering my application.`
}

export const getBodyParagraphs = (data: CoverLetterData) =>
  [data.bodyParagraph1, data.bodyParagraph2, data.bodyParagraph3]
    .map((paragraph) => paragraph.trim())
    .filter((paragraph): paragraph is string => paragraph.length > 0)

export const getLetterParagraphs = (data: CoverLetterData) => [
  getOpeningParagraph(data),
  ...getBodyParagraphs(data),
  getClosingParagraph(data),
]

export const getRecipientLines = (data: CoverLetterData) => {
  const lines: string[] = []

  if (hasValue(data.companyName)) {
    lines.push(data.companyName.trim())
  }

  if (hasValue(data.companyAddress)) {
    lines.push(
      ...data.companyAddress
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    )
  }

  return lines
}

export type ContactItemType = 'email' | 'phone' | 'website' | 'address'

export interface ContactItem {
  type: ContactItemType
  label: string
  value: string
}

export const getContactItems = (data: CoverLetterData): ContactItem[] => {
  const items: ContactItem[] = [
    { type: 'email', label: 'Email', value: data.yourEmail },
    { type: 'phone', label: 'Phone', value: data.yourPhone },
    { type: 'website', label: 'Website', value: data.yourWebsite },
    { type: 'address', label: 'Location', value: data.yourAddress },
  ]

  return items.filter((item) => hasValue(item.value))
}

export const getOpportunitySummary = (data: CoverLetterData) => {
  const position = data.position.trim()
  const company = data.companyName.trim()

  if (position && company) {
    return `${position} at ${company}`
  }

  if (position) {
    return `${position} role`
  }

  if (company) {
    return `Opportunities with ${company}`
  }

  return 'Opportunities in finance and technology'
}

