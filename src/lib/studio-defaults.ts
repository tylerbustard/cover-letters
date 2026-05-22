import { COVER_LETTER_TEMPLATES } from '@/data/coverLetters'
import { RESUME_TEMPLATES } from '@/data/resumes'
import { SIGNATURE_TEMPLATES } from '@/data/signatures'
import type {
  StoredCoverLetterState,
  StoredResumeState,
  StoredSignatureState,
} from '@/types'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const getDefaultResumeState = (): StoredResumeState => ({
  selectedId: RESUME_TEMPLATES[0].id,
  templates: clone(RESUME_TEMPLATES),
})

export const getDefaultCoverLetterState = (): StoredCoverLetterState => ({
  selectedId: COVER_LETTER_TEMPLATES.find((template) => template.id === 'unb')?.id ?? COVER_LETTER_TEMPLATES[0].id,
  templates: clone(COVER_LETTER_TEMPLATES),
})

export const getDefaultSignatureState = (): StoredSignatureState => ({
  selectedId: SIGNATURE_TEMPLATES[0].id,
  templates: clone(SIGNATURE_TEMPLATES),
})
