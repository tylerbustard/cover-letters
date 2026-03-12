import { assets } from './assets'
import type { EmailSignatureTemplate } from '@/types'

const baseSignature = {
  name: 'Tyler Bustard',
  role: 'Finance & Technology Professional',
  phone: '+1 (613) 985-1223',
  location: 'Toronto, Ontario',
  profileSrc: assets.profileTyler,
  profileAlt: 'Tyler Bustard portrait',
}

const baseLogos = [
  { src: assets.logoUnb, alt: 'University of New Brunswick' },
  { src: assets.logoIrving, alt: 'Irving Oil' },
  { src: assets.logoRbc, alt: 'Royal Bank of Canada' },
  { src: assets.logoTd, alt: 'TD Bank' },
  { src: assets.logoBmo, alt: 'BMO' },
  { src: assets.logoFiscalAi, alt: 'Fiscal.ai' },
  { src: assets.logo73Strings, alt: '73 Strings' },
]

export const SIGNATURE_TEMPLATES: EmailSignatureTemplate[] = [
  {
    id: 'unb',
    label: 'UNB Signature',
    accent: '#a3061a',
    accentSoft: '#fde2e4',
    accentDark: '#7a0212',
    data: {
      ...baseSignature,
      organization: 'University of New Brunswick',
      email: 'tyler@tylerbustard.ca',
      website: 'tylerbustard.ca',
      logos: [{ src: assets.logoUnbFull, alt: 'University of New Brunswick' }, ...baseLogos],
    },
  },
  {
    id: 'mcgill',
    label: 'McGill Signature',
    accent: '#b5121b',
    accentSoft: '#fde4e6',
    accentDark: '#7f0d14',
    data: {
      ...baseSignature,
      organization: 'McGill University',
      email: 'tyler@tylerbustard.com',
      website: 'tylerbustard.com',
      logos: [{ src: assets.logoMcgillAlt, alt: 'McGill University' }, ...baseLogos],
    },
  },
  {
    id: 'queens',
    label: "Queen's Signature",
    accent: '#0f3d61',
    accentSoft: '#e5efff',
    accentDark: '#0a2740',
    data: {
      ...baseSignature,
      organization: "Queen's University",
      email: 'tyler@tylerbustard.net',
      website: 'tylerbustard.net',
      logos: [{ src: assets.logoQueensAlt, alt: "Queen's University" }, ...baseLogos],
    },
  },
  {
    id: 'rotman',
    label: 'Rotman Signature',
    accent: '#1d4ed8',
    accentSoft: '#dbeafe',
    accentDark: '#12397a',
    data: {
      ...baseSignature,
      organization: 'Rotman School of Management',
      email: 'tyler@tylerbustard.info',
      website: 'tylerbustard.info',
      logos: [{ src: assets.logoRotman, alt: 'Rotman School of Management' }, ...baseLogos],
    },
  },
  {
    id: 'strings',
    label: '73 Strings Signature',
    accent: '#0f172a',
    accentSoft: '#e8f0ff',
    accentDark: '#140c59',
    data: {
      ...baseSignature,
      role: 'Senior Associate, Portfolio Monitoring',
      organization: '73 Strings',
      email: 'tyler.bustard@73strings.com',
      website: '73strings.com',
      logos: [
        { src: assets.logo73Strings, alt: '73 Strings' },
        { src: assets.logoFiscalAi, alt: 'Fiscal.ai' },
        { src: assets.logoRbc, alt: 'RBC' },
      ],
    },
  },
]
