import profileTyler from '@/assets/profile-tyler.png'
import profileTylerAlt from '@/assets/profile-tyler-alt.png'
import signatureTyler from '@/assets/signature-tyler.png'

import logoMcgill from '@/assets/logos/mcgill.png'
import logoMcgillAlt from '@/assets/logos/mcgill-alt.png'
import logoQueens from '@/assets/logos/queens.png'
import logoQueensAlt from '@/assets/logos/queens-alt.png'
import logoUnb from '@/assets/logos/unb.png'
import logoUnbFull from '@/assets/logos/unb-full.png'
import logoNcc from '@/assets/logos/ncc.png'
import logoUoft from '@/assets/logos/uoft.png'
import logoRotman from '@/assets/logos/rotman.png'
import logo73Strings from '@/assets/logos/73strings.webp'
import logoBmo from '@/assets/logos/bmo.png'
import logoTd from '@/assets/logos/td.png'
import logoRbc from '@/assets/logos/rbc.png'
import logoIrving from '@/assets/logos/irving.png'
import logoUnitedWay from '@/assets/logos/united-way.png'
import logoGrantThornton from '@/assets/logos/grant-thornton.png'
import logoCfa from '@/assets/logos/cfa.png'
import logoTrainingTheStreet from '@/assets/logos/training-the-street.png'
import logoCsi from '@/assets/logos/csi.png'
import logoEts from '@/assets/logos/ets.png'
import logoBloomberg from '@/assets/logos/bloomberg.png'
import logoWallStreetPrep from '@/assets/logos/wall-street-prep.png'
import logoCoursera from '@/assets/logos/coursera.png'
import logoRoi from '@/assets/logos/roi.png'

import monoLogoMcgill from '@/assets/logos/mono/mcgill.png'
import monoLogoMcgillAlt from '@/assets/logos/mono/mcgill-alt.png'
import monoLogoQueens from '@/assets/logos/mono/queens.png'
import monoLogoQueensAlt from '@/assets/logos/mono/queens-alt.png'
import monoLogoUnb from '@/assets/logos/mono/unb.png'
import monoLogoUnbFull from '@/assets/logos/mono/unb-full.png'
import monoLogoNcc from '@/assets/logos/mono/ncc.png'
import monoLogoUoft from '@/assets/logos/mono/uoft.png'
import monoLogoRotman from '@/assets/logos/mono/rotman.png'
import monoLogo73Strings from '@/assets/logos/mono/73strings.png'
import monoLogoBmo from '@/assets/logos/mono/bmo.png'
import monoLogoTd from '@/assets/logos/mono/td.png'
import monoLogoRbc from '@/assets/logos/mono/rbc.png'
import monoLogoIrving from '@/assets/logos/mono/irving.png'
import monoLogoUnitedWay from '@/assets/logos/mono/united-way.png'
import monoLogoGrantThornton from '@/assets/logos/mono/grant-thornton.png'
import monoLogoCfa from '@/assets/logos/mono/cfa.png'
import monoLogoTrainingTheStreet from '@/assets/logos/mono/training-the-street.png'
import monoLogoCsi from '@/assets/logos/mono/csi.png'
import monoLogoEts from '@/assets/logos/mono/ets.png'
import monoLogoBloomberg from '@/assets/logos/mono/bloomberg.png'
import monoLogoWallStreetPrep from '@/assets/logos/mono/wall-street-prep.png'
import monoLogoCoursera from '@/assets/logos/mono/coursera.png'
import monoLogoRoi from '@/assets/logos/mono/roi.png'

export const assets = {
  profileTyler,
  profileTylerAlt,
  signatureTyler,
  logoMcgill,
  logoMcgillAlt,
  logoQueens,
  logoQueensAlt,
  logoUnb,
  logoUnbFull,
  logoNcc,
  logoUoft,
  logoRotman,
  logo73Strings,
  logoBmo,
  logoTd,
  logoRbc,
  logoIrving,
  logoUnitedWay,
  logoGrantThornton,
  logoCfa,
  logoTrainingTheStreet,
  logoCsi,
  logoEts,
  logoBloomberg,
  logoWallStreetPrep,
  logoCoursera,
  logoRoi,
}

type AssetRegistryEntry = {
  src: string
  patterns: string[]
}

const legacyRoiSlug = ['fis', 'cal-ai'].join('')
const legacyRoiUnderscore = ['fis', 'cal_ai'].join('')
const legacyRoiDomain = ['fis', 'cal.ai'].join('')
const legacyRoiAsset = ['fis', 'cal_ai_logo'].join('')

const studioAssetRegistry: AssetRegistryEntry[] = [
  { src: profileTylerAlt, patterns: ['profile-tyler-alt'] },
  { src: profileTyler, patterns: ['profile-tyler'] },
  { src: signatureTyler, patterns: ['signature-tyler'] },
  { src: logoMcgillAlt, patterns: ['mcgill-alt'] },
  { src: logoMcgill, patterns: ['mcgill'] },
  { src: logoQueensAlt, patterns: ['queens-alt'] },
  { src: logoQueens, patterns: ['queens'] },
  { src: logoUnbFull, patterns: ['unb-full'] },
  { src: logoUnb, patterns: ['unb'] },
  { src: logoNcc, patterns: ['ncc', 'northeast-christian-college', 'northeast_christian_college'] },
  { src: logoUoft, patterns: ['uoft'] },
  { src: logoRotman, patterns: ['rotman'] },
  { src: logo73Strings, patterns: ['73strings', '73-strings'] },
  { src: logoBmo, patterns: ['bmo'] },
  { src: logoTd, patterns: ['td'] },
  { src: logoRbc, patterns: ['rbc'] },
  { src: logoIrving, patterns: ['irving'] },
  { src: logoUnitedWay, patterns: ['united-way'] },
  { src: logoGrantThornton, patterns: ['grant-thornton'] },
  { src: logoCfa, patterns: ['cfa'] },
  { src: logoTrainingTheStreet, patterns: ['training-the-street'] },
  { src: logoCsi, patterns: ['csi'] },
  { src: logoEts, patterns: ['ets'] },
  { src: logoBloomberg, patterns: ['bloomberg'] },
  { src: logoWallStreetPrep, patterns: ['wall-street-prep'] },
  { src: logoCoursera, patterns: ['coursera'] },
  { src: logoRoi, patterns: ['roi', legacyRoiSlug, legacyRoiUnderscore, legacyRoiDomain, legacyRoiAsset] },
]

const getAssetNeedle = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed, 'https://studio.local')
    return decodeURIComponent(url.pathname).toLowerCase()
  } catch {
    return decodeURIComponent(trimmed).toLowerCase()
  }
}

export const resolveStudioAssetSrc = (value: string, fallback = '') => {
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed

  const currentEntry = studioAssetRegistry.find((entry) => entry.src === trimmed)
  if (currentEntry) return currentEntry.src

  const needle = getAssetNeedle(trimmed)
  if (!needle) return fallback || trimmed

  const match = studioAssetRegistry.find((entry) =>
    entry.patterns.some((pattern) => needle.includes(pattern)),
  )

  return match?.src ?? (fallback || trimmed)
}

const monochromeLogoMap = new Map<string, string>([
  [logoMcgill, monoLogoMcgill],
  [logoMcgillAlt, monoLogoMcgillAlt],
  [logoQueens, monoLogoQueens],
  [logoQueensAlt, monoLogoQueensAlt],
  [logoUnb, monoLogoUnb],
  [logoUnbFull, monoLogoUnbFull],
  [logoNcc, monoLogoNcc],
  [logoUoft, monoLogoUoft],
  [logoRotman, monoLogoRotman],
  [logo73Strings, monoLogo73Strings],
  [logoBmo, monoLogoBmo],
  [logoTd, monoLogoTd],
  [logoRbc, monoLogoRbc],
  [logoIrving, monoLogoIrving],
  [logoUnitedWay, monoLogoUnitedWay],
  [logoGrantThornton, monoLogoGrantThornton],
  [logoCfa, monoLogoCfa],
  [logoTrainingTheStreet, monoLogoTrainingTheStreet],
  [logoCsi, monoLogoCsi],
  [logoEts, monoLogoEts],
  [logoBloomberg, monoLogoBloomberg],
  [logoWallStreetPrep, monoLogoWallStreetPrep],
  [logoCoursera, monoLogoCoursera],
  [logoRoi, monoLogoRoi],
])

export const getMonochromeLogoSrc = (src: string) => {
  const resolvedSrc = resolveStudioAssetSrc(src, src)
  return monochromeLogoMap.get(resolvedSrc) ?? resolvedSrc
}

export const logoOptions = [
  { label: '73 Strings', value: assets.logo73Strings },
  { label: 'BMO', value: assets.logoBmo },
  { label: 'ROI', value: assets.logoRoi },
  { label: 'Grant Thornton', value: assets.logoGrantThornton },
  { label: 'Irving Oil', value: assets.logoIrving },
  { label: 'McGill', value: assets.logoMcgill },
  { label: 'McGill Alt', value: assets.logoMcgillAlt },
  { label: "Queen's", value: assets.logoQueens },
  { label: "Queen's Alt", value: assets.logoQueensAlt },
  { label: 'RBC', value: assets.logoRbc },
  { label: 'Rotman', value: assets.logoRotman },
  { label: 'TD', value: assets.logoTd },
  { label: 'UNB', value: assets.logoUnb },
  { label: 'UNB Full', value: assets.logoUnbFull },
  { label: 'Northeast Christian College', value: assets.logoNcc },
  { label: 'UofT', value: assets.logoUoft },
]

export const profileOptions = [
  { label: 'Profile (Default)', value: assets.profileTyler },
  { label: 'Profile (Alt)', value: assets.profileTylerAlt },
]

export const signatureOptions = [{ label: 'Tyler Signature', value: assets.signatureTyler }]
