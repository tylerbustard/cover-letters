import { COVER_LETTER_VARIATIONS, type VariationConfig } from '@/config/variations'
import type { CoverLetterData, CoverLetterTemplate } from '@/types'

const createInitialData = (config: VariationConfig): CoverLetterData => ({
  companyName: 'Hiring Committee',
  position: 'Finance & Technology Opportunity',
  hiringManager: 'Hiring Manager',
  date: new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  yourName: config.defaults.yourName,
  yourEmail: config.defaults.yourEmail,
  yourPhone: config.defaults.yourPhone,
  yourWebsite: config.defaults.yourWebsite,
  yourAddress: config.defaults.yourAddress,
  companyAddress: 'Toronto, Ontario',
  openingParagraph:
    'I am writing to express my interest in opportunities where rigorous finance, strong communication, and hands-on analytics can create measurable impact. With experience spanning portfolio monitoring, investment analysis, and client-facing operations, I am excited by the opportunity to contribute to a high-performing team.',
  bodyParagraph1:
    'In my recent roles, I have supported portfolio and operating teams through disciplined analysis, clear execution, and thoughtful cross-functional communication. From validating fund cash flows and holdings across multiple portfolios to producing investment research and recommendation memos, I have built a track record of turning detail-heavy work into dependable outcomes.',
  bodyParagraph2:
    'What differentiates my approach is the combination of financial training and operating fluency. I am comfortable moving between valuation, markets, reporting, and workflow improvement, and I bring the judgment required to communicate clearly with stakeholders while maintaining a high standard of accuracy.',
  bodyParagraph3:
    'Alongside technical capability, I bring a collaborative working style, strong client orientation, and a bias toward follow-through. I am motivated by environments where analytical rigor, accountability, and thoughtful decision-making are valued.',
  closingParagraph:
    'Thank you for considering my application. I would welcome the opportunity to discuss how my background in finance, technology, and execution-focused analysis can support your team.',
})

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = COVER_LETTER_VARIATIONS.map(
  (variation) => ({
    id: variation.id,
    label: variation.label,
    description: variation.description,
    config: {
      presetLabel: variation.label,
      tagline: 'Finance & Technology',
      contextNote: variation.contextLabel,
      profileSrc: variation.profileSrc,
      profileAlt: variation.profileAlt,
      signatureSrc: variation.signatureSrc,
      signatureAlt: variation.signatureAlt,
    },
    data: createInitialData(variation),
  }),
)
