import profileImage from '@/assets/profile-tyler.png'
import signatureImage from '@/assets/signature-tyler.png'

import { CoverLetterData, VariationId } from '@/types'

export interface VariationConfig {
  id: VariationId
  label: string
  description: string
  contextLabel: string
  titleLabel: string
  defaults: Pick<
    CoverLetterData,
    'yourName' | 'yourEmail' | 'yourPhone' | 'yourWebsite' | 'yourAddress'
  >
  profileSrc: string
  profileAlt: string
  signatureSrc: string
  signatureAlt: string
}

export const COVER_LETTER_VARIATIONS: VariationConfig[] = [
  {
    id: 'queens',
    label: "Queen's University",
    description: "Queen's University styling preset",
    contextLabel: "Queen's University · Smith School of Business",
    titleLabel: 'Master of Finance Candidate, 2026-2027',
    profileSrc: profileImage,
    profileAlt: 'Tyler Bustard portrait',
    signatureSrc: signatureImage,
    signatureAlt: 'Handwritten signature of Tyler Bustard',
    defaults: {
      yourName: 'Tyler Bustard',
      yourEmail: 'tyler@tylerbustard.com',
      yourPhone: '+1 (613) 985-1223',
      yourWebsite: 'tylerbustard.com',
      yourAddress: 'Toronto, Ontario',
    },
  },
  {
    id: 'unb',
    label: 'University of New Brunswick',
    description: 'UNB finance and technology preset',
    contextLabel: 'University of New Brunswick · Bachelor of Business Administration in Finance; Class of 2020',
    titleLabel: 'Finance & Technology',
    profileSrc: profileImage,
    profileAlt: 'Tyler Bustard portrait',
    signatureSrc: signatureImage,
    signatureAlt: 'Handwritten signature of Tyler Bustard',
    defaults: {
      yourName: 'Tyler Bustard',
      yourEmail: 'tyler@tylerbustard.com',
      yourPhone: '+1 (613) 985-1223',
      yourWebsite: 'tylerbustard.com',
      yourAddress: 'Toronto, Ontario',
    },
  },
  {
    id: 'uoft',
    label: 'University of Toronto',
    description: 'Rotman School of Management preset',
    contextLabel: 'University of Toronto · Rotman School of Management',
    titleLabel: 'Finance & Technology',
    profileSrc: profileImage,
    profileAlt: 'Tyler Bustard portrait',
    signatureSrc: signatureImage,
    signatureAlt: 'Handwritten signature of Tyler Bustard',
    defaults: {
      yourName: 'Tyler Bustard',
      yourEmail: 'tyler@tylerbustard.info',
      yourPhone: '+1 (613) 985-1223',
      yourWebsite: 'tylerbustard.info',
      yourAddress: 'Toronto, Ontario',
    },
  },
  {
    id: 'mcgill',
    label: 'McGill University',
    description: 'McGill Desautels preset',
    contextLabel: 'McGill University · Desautels Faculty of Management',
    titleLabel: 'Finance & Technology',
    profileSrc: profileImage,
    profileAlt: 'Tyler Bustard portrait',
    signatureSrc: signatureImage,
    signatureAlt: 'Handwritten signature of Tyler Bustard',
    defaults: {
      yourName: 'Tyler Bustard',
      yourEmail: 'tyler@tylerbustard.com',
      yourPhone: '+1 (613) 985-1223',
      yourWebsite: 'tylerbustard.com',
      yourAddress: 'Toronto, Ontario',
    },
  },
]

export const VARIATION_MAP = COVER_LETTER_VARIATIONS.reduce<Record<VariationId, VariationConfig>>(
  (accumulator, variation) => {
    accumulator[variation.id] = variation
    return accumulator
  },
  {} as Record<VariationId, VariationConfig>,
)
