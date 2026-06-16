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
  monoSrc?: string
  publicSrc?: string
  publicMonoSrc?: string
  patterns: string[]
}

const legacyRoiSlug = ['fis', 'cal-ai'].join('')
const legacyRoiUnderscore = ['fis', 'cal_ai'].join('')
const legacyRoiDomain = ['fis', 'cal.ai'].join('')
const legacyRoiAsset = ['fis', 'cal_ai_logo'].join('')

const studioAssetRegistry: AssetRegistryEntry[] = [
  { src: profileTylerAlt, publicSrc: '/ai-assets/profile-tyler-alt.png', patterns: ['profile-tyler-alt'] },
  { src: profileTyler, publicSrc: '/ai-assets/profile-tyler.png', patterns: ['profile-tyler'] },
  { src: signatureTyler, publicSrc: '/ai-assets/signature-tyler.png', patterns: ['signature-tyler'] },
  { src: logoMcgillAlt, monoSrc: monoLogoMcgillAlt, publicSrc: '/ai-assets/logos/mcgill-alt.png', publicMonoSrc: '/ai-assets/logos/mono/mcgill-alt.png', patterns: ['mcgill-alt'] },
  { src: logoMcgill, monoSrc: monoLogoMcgill, publicSrc: '/ai-assets/logos/mcgill.png', publicMonoSrc: '/ai-assets/logos/mono/mcgill.png', patterns: ['mcgill'] },
  { src: logoQueensAlt, monoSrc: monoLogoQueensAlt, publicSrc: '/ai-assets/logos/queens-alt.png', publicMonoSrc: '/ai-assets/logos/mono/queens-alt.png', patterns: ['queens-alt'] },
  { src: logoQueens, monoSrc: monoLogoQueens, publicSrc: '/ai-assets/logos/queens.png', publicMonoSrc: '/ai-assets/logos/mono/queens.png', patterns: ['queens'] },
  { src: logoUnbFull, monoSrc: monoLogoUnbFull, publicSrc: '/ai-assets/logos/unb-full.png', publicMonoSrc: '/ai-assets/logos/mono/unb-full.png', patterns: ['unb-full'] },
  { src: logoUnb, monoSrc: monoLogoUnb, publicSrc: '/ai-assets/logos/unb.png', publicMonoSrc: '/ai-assets/logos/mono/unb.png', patterns: ['unb'] },
  { src: logoNcc, monoSrc: monoLogoNcc, publicSrc: '/ai-assets/logos/ncc.png', publicMonoSrc: '/ai-assets/logos/mono/ncc.png', patterns: ['ncc', 'northeast-christian-college', 'northeast_christian_college'] },
  { src: logoUoft, monoSrc: monoLogoUoft, publicSrc: '/ai-assets/logos/uoft.png', publicMonoSrc: '/ai-assets/logos/mono/uoft.png', patterns: ['uoft'] },
  { src: logoRotman, monoSrc: monoLogoRotman, publicSrc: '/ai-assets/logos/rotman.png', publicMonoSrc: '/ai-assets/logos/mono/rotman.png', patterns: ['rotman'] },
  { src: logo73Strings, monoSrc: monoLogo73Strings, publicSrc: '/ai-assets/logos/73strings.png', publicMonoSrc: '/ai-assets/logos/mono/73strings.png', patterns: ['73strings', '73-strings'] },
  { src: logoBmo, monoSrc: monoLogoBmo, publicSrc: '/ai-assets/logos/bmo.png', publicMonoSrc: '/ai-assets/logos/mono/bmo.png', patterns: ['bmo'] },
  { src: logoTd, monoSrc: monoLogoTd, publicSrc: '/ai-assets/logos/td.png', publicMonoSrc: '/ai-assets/logos/mono/td.png', patterns: ['td'] },
  { src: logoRbc, monoSrc: monoLogoRbc, publicSrc: '/ai-assets/logos/rbc.png', publicMonoSrc: '/ai-assets/logos/mono/rbc.png', patterns: ['rbc'] },
  { src: logoIrving, monoSrc: monoLogoIrving, publicSrc: '/ai-assets/logos/irving.png', publicMonoSrc: '/ai-assets/logos/mono/irving.png', patterns: ['irving'] },
  { src: logoUnitedWay, monoSrc: monoLogoUnitedWay, publicSrc: '/ai-assets/logos/united-way.png', publicMonoSrc: '/ai-assets/logos/mono/united-way.png', patterns: ['united-way'] },
  { src: logoGrantThornton, monoSrc: monoLogoGrantThornton, publicSrc: '/ai-assets/logos/grant-thornton.png', publicMonoSrc: '/ai-assets/logos/mono/grant-thornton.png', patterns: ['grant-thornton'] },
  { src: logoCfa, monoSrc: monoLogoCfa, publicSrc: '/ai-assets/logos/cfa.png', publicMonoSrc: '/ai-assets/logos/mono/cfa.png', patterns: ['cfa'] },
  { src: logoTrainingTheStreet, monoSrc: monoLogoTrainingTheStreet, publicSrc: '/ai-assets/logos/training-the-street.png', publicMonoSrc: '/ai-assets/logos/mono/training-the-street.png', patterns: ['training-the-street'] },
  { src: logoCsi, monoSrc: monoLogoCsi, publicSrc: '/ai-assets/logos/csi.png', publicMonoSrc: '/ai-assets/logos/mono/csi.png', patterns: ['csi'] },
  { src: logoEts, monoSrc: monoLogoEts, publicSrc: '/ai-assets/logos/ets.png', publicMonoSrc: '/ai-assets/logos/mono/ets.png', patterns: ['ets'] },
  { src: logoBloomberg, monoSrc: monoLogoBloomberg, publicSrc: '/ai-assets/logos/bloomberg.png', publicMonoSrc: '/ai-assets/logos/mono/bloomberg.png', patterns: ['bloomberg'] },
  { src: logoWallStreetPrep, monoSrc: monoLogoWallStreetPrep, publicSrc: '/ai-assets/logos/wall-street-prep.png', publicMonoSrc: '/ai-assets/logos/mono/wall-street-prep.png', patterns: ['wall-street-prep'] },
  { src: logoCoursera, monoSrc: monoLogoCoursera, publicSrc: '/ai-assets/logos/coursera.png', publicMonoSrc: '/ai-assets/logos/mono/coursera.png', patterns: ['coursera'] },
  { src: logoRoi, monoSrc: monoLogoRoi, publicSrc: '/ai-assets/logos/roi.png', publicMonoSrc: '/ai-assets/logos/mono/roi.png', patterns: ['roi', legacyRoiSlug, legacyRoiUnderscore, legacyRoiDomain, legacyRoiAsset] },
]

// Match patterns against the basename only (no directories, no extension).
// Matching the full path lets short patterns collide with path segments —
// e.g. 'ets' matches the "/assets/" directory and hijacks every legacy logo
// whose registry entry sits after the ETS entry. Mirrors getAssetNeedle in
// netlify/functions/_ai-utils.mjs.
const getAssetNeedle = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const toBasenameNeedle = (input: string) => {
    const fileName = input.slice(input.lastIndexOf('/') + 1)
    const dotIndex = fileName.lastIndexOf('.')
    const stem = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
    return decodeURIComponent(stem).toLowerCase()
  }

  try {
    const url = new URL(trimmed, 'https://studio.local')
    return toBasenameNeedle(url.pathname)
  } catch {
    return toBasenameNeedle(trimmed)
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

const getPublicAssetSrc = (
  entry: AssetRegistryEntry,
  logoTone: 'original' | 'monochrome',
) => (logoTone === 'monochrome' && entry.publicMonoSrc ? entry.publicMonoSrc : entry.publicSrc)

export const resolveStudioAssetPublicSrc = (
  value: string,
  fallback = '',
  logoTone: 'original' | 'monochrome' = 'original',
) => {
  const trimmed = value.trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed

  const currentEntry = studioAssetRegistry.find((entry) => entry.src === trimmed || entry.monoSrc === trimmed)
  if (currentEntry) {
    const currentTone = currentEntry.monoSrc === trimmed ? 'monochrome' : logoTone
    const publicSrc = getPublicAssetSrc(currentEntry, currentTone)
    if (publicSrc) return publicSrc
  }

  const needle = getAssetNeedle(trimmed)
  if (needle) {
    const match = studioAssetRegistry.find((entry) =>
      entry.patterns.some((pattern) => needle.includes(pattern)),
    )
    const publicSrc = match ? getPublicAssetSrc(match, logoTone) : undefined
    if (publicSrc) return publicSrc
  }

  return resolveStudioAssetSrc(trimmed, fallback || trimmed)
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
  { label: 'Bloomberg', value: assets.logoBloomberg },
  { label: 'CFA Institute', value: assets.logoCfa },
  { label: 'Coursera', value: assets.logoCoursera },
  { label: 'CSI', value: assets.logoCsi },
  { label: 'ETS', value: assets.logoEts },
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
  { label: 'Training The Street', value: assets.logoTrainingTheStreet },
  { label: 'UNB', value: assets.logoUnb },
  { label: 'UNB Full', value: assets.logoUnbFull },
  { label: 'Northeast Christian College', value: assets.logoNcc },
  { label: 'UofT', value: assets.logoUoft },
  { label: 'Wall Street Prep', value: assets.logoWallStreetPrep },
]

export const profileOptions = [
  { label: 'Profile (Default)', value: assets.profileTyler },
  { label: 'Profile (Alt)', value: assets.profileTylerAlt },
]

export const signatureOptions = [{ label: 'Tyler Signature', value: assets.signatureTyler }]
