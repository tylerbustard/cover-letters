import { assets } from './assets'
import type { EmailSignatureTemplate, LogoAsset } from '@/types'

const baseSignature = {
  name: 'Tyler Bustard',
  role: '',
  phone: '+1 (613) 985-1223',
  location: 'Toronto, Ontario',
  profileSrc: assets.profileTyler,
  profileAlt: 'Tyler Bustard portrait',
  signoff: 'Best regards,',
  logoTone: 'original' as const,
}

const buildExperienceLogos = (): LogoAsset[] => [
  { src: assets.logo73Strings, alt: '73 Strings' },
  { src: assets.logoRoi, alt: 'ROI' },
  { src: assets.logoBmo, alt: 'BMO' },
  { src: assets.logoTd, alt: 'TD Bank' },
  { src: assets.logoRbc, alt: 'Royal Bank of Canada' },
  { src: assets.logoIrving, alt: 'Irving Oil' },
  { src: assets.logoGrantThornton, alt: 'Grant Thornton' },
]

const buildEducationLogos = (institutionLogo: string, institutionAlt: string): LogoAsset[] => {
  const logos: LogoAsset[] = [
    { src: institutionLogo, alt: institutionAlt },
    { src: assets.logoUnbFull, alt: 'University of New Brunswick' },
  ]

  const seen = new Set<string>()
  return logos.filter((logo) => {
    if (seen.has(logo.src)) return false
    seen.add(logo.src)
    return true
  })
}

const createSignatureData = (
  organization: string,
  email: string,
  website: string,
  educationLogos: LogoAsset[],
  role = '',
  affiliationLines: string[] = [organization, role].filter(Boolean),
) => ({
  ...baseSignature,
  role,
  organization,
  affiliationLines,
  email,
  website,
  experienceLogos: buildExperienceLogos(),
  educationLogos,
  certificationLogos: [],
})

export const SIGNATURE_EXPERIENCE_LOGOS = buildExperienceLogos()
export const SIGNATURE_EDUCATION_LOGOS = {
  unb: buildEducationLogos(assets.logoUnbFull, 'University of New Brunswick'),
  mcgill: buildEducationLogos(assets.logoMcgillAlt, 'McGill University'),
  queens: buildEducationLogos(assets.logoQueensAlt, "Queen's University"),
  rotman: buildEducationLogos(assets.logoRotman, 'Rotman School of Management'),
  strings: buildEducationLogos(assets.logoUnbFull, 'University of New Brunswick'),
} as const

export const SIGNATURE_TEMPLATES: EmailSignatureTemplate[] = [
  {
    id: 'unb',
    label: 'UNB Signature',
    description: 'UNB contact preset in the unified TylerBustard.com signature style.',
    data: createSignatureData(
      'University of New Brunswick',
      'tyler@tylerbustard.com',
      'tylerbustard.com',
      SIGNATURE_EDUCATION_LOGOS.unb,
      'Finance Graduate, 2020',
      ['University of New Brunswick', 'Bachelor of Business Administration in Finance; Class of 2020'],
    ),
  },
  {
    id: 'mcgill',
    label: 'McGill Signature',
    description: 'McGill contact preset in the unified TylerBustard.com signature style.',
    data: createSignatureData(
      'McGill University · Desautels Faculty of Management',
      'tyler@tylerbustard.com',
      'tylerbustard.com',
      SIGNATURE_EDUCATION_LOGOS.mcgill,
      '',
      ['McGill University - Desautels Faculty of Management', 'Master of Management in Finance Candidate, 2027'],
    ),
  },
  {
    id: 'queens',
    label: "Queen's Signature",
    description: "Queen's contact preset in the unified TylerBustard.com signature style.",
    data: createSignatureData(
      "Queen's University · Smith School of Business",
      'tyler@tylerbustard.com',
      'tylerbustard.com',
      SIGNATURE_EDUCATION_LOGOS.queens,
      'Master of Finance Candidate, 2026-2027',
      ["Queen's University - Smith School of Business", 'Master of Finance Candidate, 2026-2027'],
    ),
  },
  {
    id: 'rotman',
    label: 'Rotman Signature',
    description: 'Rotman contact preset in the unified TylerBustard.com signature style.',
    data: createSignatureData(
      'University of Toronto · Rotman School of Management',
      'tyler@tylerbustard.info',
      'tylerbustard.info',
      SIGNATURE_EDUCATION_LOGOS.rotman,
      '',
      ['University of Toronto - Rotman School of Management', 'Master of Business Administration Candidate, 2026'],
    ),
  },
  {
    id: 'strings',
    label: '73 Strings Reference Signature',
    description: 'Past 73 Strings role preset using TylerBustard.com contact details.',
    data: createSignatureData(
      '73 Strings (ended May 2026)',
      'tyler@tylerbustard.com',
      'tylerbustard.com',
      SIGNATURE_EDUCATION_LOGOS.strings,
      'Former Senior Associate, Portfolio Monitoring',
      ['73 Strings', 'Former Senior Associate, Portfolio Monitoring; Ended May 2026'],
    ),
  },
]
