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
    'I am interested in finance and technology roles where careful analysis, clean execution, and practical judgment have to come together. My background spans portfolio monitoring, investment research, client-facing banking, and data-driven reporting, which gives me a useful mix of technical finance work and operating discipline. I am strongest in roles where the work is detail-heavy, deadlines matter, and the final output needs to be clear enough for portfolio, client, or leadership decisions. That is the kind of work I want to keep doing, especially in teams that value accuracy, pace, and accountability.',
  bodyParagraph1:
    'At 73 Strings, I worked as a Senior Associate in portfolio monitoring, reviewing NAV inputs, holdings, cash flows, and reconciliation items across multiple portfolios. That work required accuracy under daily pressure, comfort with fund data, and steady communication with operations, risk, and portfolio stakeholders. I learned how to investigate exceptions without losing sight of the broader workflow, and how to turn messy source information into dependable reporting that other teams could use. It also sharpened the habits that matter in finance roles: documenting assumptions, checking source data, escalating issues early, and staying calm when timelines are tight.',
  bodyParagraph2:
    'Before that, I built investment and client-service experience across ROI, BMO Private Wealth, TD, and RBC. At ROI, I analyzed public company financial statements and supported AI-driven product features, combining finance judgment with data and product thinking. At BMO and in banking roles, I supported portfolio preparation, client communication, needs-based advising, and product discussions. Those experiences helped me build a practical view of finance: the numbers matter, but so does the way the analysis is explained and acted on. I am comfortable translating technical work into plain language for people who need to make decisions quickly.',
  bodyParagraph3:
    'My University of New Brunswick finance background, investment fund experience, Bloomberg Market Concepts certificate, and valuation coursework give me a strong base for analytical work. I am comfortable moving between Excel, SQL, Python, reporting tools, valuation concepts, and client-ready writing. I also bring a record of following through in environments where small errors can create larger downstream issues, which is why I care about process, documentation, and direct communication. Across each role, I have tried to be the person who makes the work more reliable, not just the person who completes the next task.',
  closingParagraph:
    'I would welcome the opportunity to discuss how my background in portfolio monitoring, financial analysis, and technology enabled reporting could support your team. I bring a steady work style, a high standard for accuracy, and the judgment to keep improving the work while still getting it done. Thank you for considering my application; I would be glad to discuss where my experience can be most useful in the role and on the team right away.',
  signoffLabel: 'Sincerely,',
})

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = COVER_LETTER_VARIATIONS.map(
  (variation) => ({
    id: variation.id,
    label: variation.label,
    description: variation.description,
    config: {
      presetLabel: variation.label,
      tagline: variation.titleLabel,
      contextNote: variation.contextLabel,
      credentialName: variation.credentialName,
      credentialDetail: variation.credentialDetail,
      credentialLogoSrc: variation.credentialLogoSrc,
      credentialLogoAlt: variation.credentialLogoAlt,
      profileSrc: variation.profileSrc,
      profileAlt: variation.profileAlt,
      signatureSrc: variation.signatureSrc,
      signatureAlt: variation.signatureAlt,
    },
    data: createInitialData(variation),
  }),
)
