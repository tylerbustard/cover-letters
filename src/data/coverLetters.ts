import { COVER_LETTER_VARIATIONS, type VariationConfig } from '@/config/variations'
import type { CoverLetterData, CoverLetterTemplate } from '@/types'

const createInitialData = (config: VariationConfig): CoverLetterData => ({
  companyName: '[Company Name]',
  position: '[Role Title]',
  hiringManager: 'Hiring Manager',
  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  yourName: config.defaults.yourName,
  yourEmail: config.defaults.yourEmail,
  yourPhone: config.defaults.yourPhone,
  yourWebsite: config.defaults.yourWebsite,
  yourAddress: config.defaults.yourAddress,
  companyAddress: '123 Example Street\nCity, Province Postal Code',
  openingParagraph:
    'I am writing to express my interest in the [Role Title] position at [Company Name]. I am energized by the opportunity to bring my blend of finance and technology experience to your team.',
  bodyParagraph1:
    'In my current role, I [add a quantifiable achievement that demonstrates how you deliver measurable impact aligned with the position].',
  bodyParagraph2:
    'I am especially drawn to [Company Name] because [share a reason that connects your values, industry focus, or recent initiatives].',
  bodyParagraph3:
    'Beyond my technical background, I bring [highlight a leadership, collaboration, or client-facing strength that differentiates you].',
  closingParagraph:
    'Thank you for considering my application. I would welcome the chance to discuss how I can support the [Role Title] mandate at [Company Name].',
})

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = COVER_LETTER_VARIATIONS.map((variation) => ({
  id: variation.id,
  label: variation.label,
  description: variation.description,
  config: {
    accent: variation.accent,
    accentLight: variation.accentLight,
    accentDark: variation.accentDark,
    tagline: variation.tagline,
    organization: variation.organization,
    summary: variation.summary,
    logoSrc: variation.logoSrc,
    logoAlt: variation.logoAlt,
    profileSrc: variation.profileSrc,
    profileAlt: variation.profileAlt,
    signatureSrc: variation.signatureSrc,
    signatureAlt: variation.signatureAlt,
  },
  data: createInitialData(variation),
}))
