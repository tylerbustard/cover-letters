import profileImage from '@/assets/profile-tyler.png'
import queensLogo from '@/assets/queens-logo.png'
import unbLogo from '@/assets/unb-logo.png'
import uoftLogo from '@/assets/uoft-logo.png'
import mcgillLogo from '@/assets/mcgill-logo.png'

import { CoverLetterData, VariationId } from '@/types'

export interface VariationConfig {
  id: VariationId
  label: string
  description: string
  accent: string
  accentLight: string
  accentDark: string
  tagline: string
  organization: string
  logoSrc: string
  logoAlt: string
  profileSrc: string
  profileAlt: string
  defaults: Pick<CoverLetterData, 'yourName' | 'yourEmail' | 'yourPhone' | 'yourWebsite' | 'yourAddress'>
}

export const COVER_LETTER_VARIATIONS: VariationConfig[] = [
  {
    id: 'queens',
    label: "Queen's University",
    description: "Queen's Smith School of Business styling",
    accent: '#0f3d61',
    accentLight: '#e5efff',
    accentDark: '#0a2740',
    tagline: 'Finance & Technology Professional',
    organization: "Queen's University",
    logoSrc: queensLogo,
    logoAlt: "Queen's University crest",
    profileSrc: profileImage,
    profileAlt: 'Tyler Bustard portrait',
    defaults: {
      yourName: 'Tyler Bustard',
      yourEmail: 'tyler@tylerbustard.net',
      yourPhone: '+1 (613) 985-1223',
      yourWebsite: 'tylerbustard.net',
      yourAddress: 'Toronto, Ontario',
    },
  },
  {
    id: 'unb',
    label: 'University of New Brunswick',
    description: 'UNB finance & technology presentation',
    accent: '#a3061a',
    accentLight: '#fde2e4',
    accentDark: '#7a0212',
    tagline: 'Finance & Technology Professional',
    organization: 'University of New Brunswick',
    logoSrc: unbLogo,
    logoAlt: 'University of New Brunswick crest',
    profileSrc: profileImage,
    profileAlt: 'Tyler Bustard portrait',
    defaults: {
      yourName: 'Tyler Bustard',
      yourEmail: 'tyler@tylerbustard.ca',
      yourPhone: '+1 (613) 985-1223',
      yourWebsite: 'tylerbustard.ca',
      yourAddress: 'Toronto, Ontario',
    },
  },
  {
    id: 'uoft',
    label: 'University of Toronto',
    description: 'Rotman School professional aesthetic',
    accent: '#1d4ed8',
    accentLight: '#dbeafe',
    accentDark: '#12397a',
    tagline: 'Finance & Technology Professional',
    organization: 'Rotman School of Management',
    logoSrc: uoftLogo,
    logoAlt: 'Rotman School of Management crest',
    profileSrc: profileImage,
    profileAlt: 'Tyler Bustard portrait',
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
    description: 'Desautels finance leadership look',
    accent: '#b5121b',
    accentLight: '#fde4e6',
    accentDark: '#7f0d14',
    tagline: 'Finance & Technology Professional',
    organization: 'McGill University',
    logoSrc: mcgillLogo,
    logoAlt: 'McGill University crest',
    profileSrc: profileImage,
    profileAlt: 'Tyler Bustard portrait',
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

