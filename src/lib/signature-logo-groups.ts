import { assets, logoOptions, resolveStudioAssetSrc } from '@/data/assets'
import type { LogoAsset, SignatureId } from '@/types'

export const SIGNATURE_EXPERIENCE_LOGO_VALUES = new Set([
  assets.logo73Strings,
  assets.logoRoi,
  assets.logoBmo,
  assets.logoTd,
  assets.logoRbc,
  assets.logoGrantThornton,
  assets.logoIrving,
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
  unb: new Set([assets.logoUnb, assets.logoUnbFull]),
  mcgill: new Set([assets.logoMcgillAlt, assets.logoUnb, assets.logoUnbFull]),
  queens: new Set([assets.logoQueensAlt, assets.logoUnb, assets.logoUnbFull]),
  rotman: new Set([assets.logoRotman, assets.logoUnb, assets.logoUnbFull]),
  strings: new Set([assets.logoUnb, assets.logoUnbFull]),
}

const logoLabelByValue = new Map(logoOptions.map((option) => [option.value, option.label]))
const logoOptionByValue = new Map(logoOptions.map((option) => [option.value, option]))

export const canonicalizeSignatureLogoSrc = (src: string) => resolveStudioAssetSrc(src, src)

export const getSignatureEducationLogoValues = (signatureId: SignatureId) =>
  SIGNATURE_EDUCATION_LOGO_VALUES[signatureId] ?? SIGNATURE_EDUCATION_LOGO_VALUES.unb

const getLogoOptionsByValues = (values: Set<string>) =>
  [...values]
    .map((value) => logoOptionByValue.get(value))
    .filter((option): option is (typeof logoOptions)[number] => Boolean(option))

export const getSignatureExperienceLogoOptions = () =>
  getLogoOptionsByValues(SIGNATURE_EXPERIENCE_LOGO_VALUES)

export const getSignatureEducationLogoOptions = (signatureId: SignatureId) =>
  getLogoOptionsByValues(getSignatureEducationLogoValues(signatureId))

export const getSignatureCertificationLogoOptions = () =>
  getLogoOptionsByValues(SIGNATURE_CERTIFICATION_LOGO_VALUES)

export const normalizeSignatureLogos = (
  selected: LogoAsset[] = [],
  allowedValues: Set<string>,
): LogoAsset[] => {
  const seen = new Set<string>()
  const normalized: LogoAsset[] = []
  const order = new Map([...allowedValues].map((value, index) => [value, index]))

  for (const logo of selected) {
    const src = canonicalizeSignatureLogoSrc(logo.src)
    if (!allowedValues.has(src) || seen.has(src)) continue
    seen.add(src)
    normalized.push({
      src,
      alt: logoLabelByValue.get(src) ?? logo.alt,
    })
  }

  return normalized.sort((a, b) => (order.get(a.src) ?? 0) - (order.get(b.src) ?? 0))
}
