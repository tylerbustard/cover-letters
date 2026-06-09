import { assets, logoOptions, resolveStudioAssetSrc } from '@/data/assets'
import type { LogoAsset, SignatureId } from '@/types'

export const SIGNATURE_EXPERIENCE_LOGO_VALUES = new Set([
  assets.logo73Strings,
  assets.logoRoi,
  assets.logoBmo,
  assets.logoTd,
  assets.logoRbc,
  assets.logoIrving,
  assets.logoGrantThornton,
])

export const SIGNATURE_CERTIFICATION_LOGO_VALUES = new Set([
  assets.logoBloomberg,
  assets.logoCfa,
  assets.logoCoursera,
  assets.logoCsi,
  assets.logoEts,
  assets.logoTrainingTheStreet,
  assets.logoWallStreetPrep,
])

export const SIGNATURE_EDUCATION_LOGO_VALUES: Record<SignatureId, Set<string>> = {
  unb: new Set([assets.logoUnbFull]),
  mcgill: new Set([assets.logoMcgillAlt, assets.logoUnbFull]),
  queens: new Set([assets.logoQueensAlt, assets.logoUnbFull]),
  rotman: new Set([assets.logoRotman, assets.logoUnbFull]),
  strings: new Set([assets.logoUnbFull]),
}

const logoLabelByValue = new Map(logoOptions.map((option) => [option.value, option.label]))

export const canonicalizeSignatureLogoSrc = (src: string) => resolveStudioAssetSrc(src, src)

export const getSignatureEducationLogoValues = (signatureId: SignatureId) =>
  SIGNATURE_EDUCATION_LOGO_VALUES[signatureId] ?? SIGNATURE_EDUCATION_LOGO_VALUES.unb

export const getSignatureExperienceLogoOptions = () =>
  logoOptions.filter((option) => SIGNATURE_EXPERIENCE_LOGO_VALUES.has(option.value))

export const getSignatureEducationLogoOptions = (signatureId: SignatureId) =>
  logoOptions.filter((option) => getSignatureEducationLogoValues(signatureId).has(option.value))

export const getSignatureCertificationLogoOptions = () =>
  logoOptions.filter((option) => SIGNATURE_CERTIFICATION_LOGO_VALUES.has(option.value))

export const normalizeSignatureLogos = (
  selected: LogoAsset[] = [],
  allowedValues: Set<string>,
): LogoAsset[] => {
  const seen = new Set<string>()
  const normalized: LogoAsset[] = []

  for (const logo of selected) {
    const src = canonicalizeSignatureLogoSrc(logo.src)
    if (!allowedValues.has(src) || seen.has(src)) continue
    seen.add(src)
    normalized.push({
      src,
      alt: logoLabelByValue.get(src) ?? logo.alt,
    })
  }

  return normalized
}
