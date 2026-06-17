import type { DocumentType } from '@/types'

export const studioProductLabels = {
  workspaceKicker: 'FinChat Workspace',
  workspaceTitle: 'Financial Intelligence',
  productLine: 'Financial Intelligence OS',
}

export const studioModuleLabels: Record<
  DocumentType,
  {
    nav: string
    kicker: string
    outputLabel: string
    savedMessage: string
    pdfReadyMessage?: string
    pdfErrorMessage?: string
  }
> = {
  resume: {
    nav: 'Profile',
    kicker: 'Profile Intelligence',
    outputLabel: 'Controlled PDF',
    savedMessage: 'Profile saved.',
    pdfReadyMessage: 'Profile PDF ready to save.',
    pdfErrorMessage: 'Unable to prepare the profile PDF right now.',
  },
  'cover-letter': {
    nav: 'Narrative',
    kicker: 'Narrative Studio',
    outputLabel: 'Controlled PDF',
    savedMessage: 'Narrative saved.',
    pdfReadyMessage: 'Narrative PDF ready to save.',
    pdfErrorMessage: 'Unable to prepare the narrative PDF right now.',
  },
  'email-signature': {
    nav: 'Identity',
    kicker: 'Identity Channel',
    outputLabel: 'HTML identity block',
    savedMessage: 'Identity channel saved.',
  },
}
