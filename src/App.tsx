import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Mail,
  MoveDown,
  MoveUp,
  Plus,
  Printer,
  RotateCcw,
  Upload,
} from 'lucide-react'

import { CoverLetterPreview } from '@/components/cover-letter-preview'
import { EmailSignaturePreview } from '@/components/email-signature-preview'
import { ResumePreview } from '@/components/resume-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { logoOptions, profileOptions, signatureOptions } from '@/data/assets'
import {
  createPersistenceEnvelope,
  createSeedStudioState,
  getThemePackForDocument,
  isPersistenceEnvelope,
  normalizeStudioState,
  resolveCoverLetterView,
  resolveResumeView,
  resolveSignatureView,
  STUDIO_STORAGE_KEY,
} from '@/data/studio'
import { RESUME_BALANCE_CANDIDATES, measureResumeExportMetrics } from '@/lib/resume-balance'
import { cn } from '@/lib/utils'
import type {
  CoverLetterDocument,
  CoverLetterId,
  DocumentHealth,
  ExportBalancePreset,
  ExportBreakAnchor,
  ExportMetrics,
  ExportRenderMode,
  ExportRequest,
  FieldScope,
  FieldSource,
  PreviewMode,
  PresentationContactLayout,
  PresentationDensity,
  PresentationSettings,
  ResumeCertificationItem,
  ResumeCertificationStat,
  ResumeDocument,
  ResumeEducationItem,
  ResumeExperienceGroup,
  ResumeExperienceItem,
  ResumeLeadershipGroup,
  ResumeLeadershipItem,
  ResumeExportTuning,
  ResumeId,
  SharedProfile,
  SignatureExportVariant,
  SignatureDocument,
  SignatureId,
  StudioState,
  ThemePack,
  ThemePackId,
} from '@/types'

declare global {
  interface Window {
    __resumeBalanceCandidates?: ExportMetrics[]
    __resumeBalanceResult?: ExportMetrics | null
    __exportMetrics?: ExportMetrics | null
  }
}

const selectClassName =
  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400'

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`
const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

const splitComma = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

const joinLines = (lines: string[]) => lines.join('\n')
const joinComma = (items: string[]) => items.join(', ')

const findLogoLabel = (src: string) => logoOptions.find((option) => option.value === src)?.label ?? 'Logo'

const normalizeOptionalString = (value: string) => (value.trim().length > 0 ? value : undefined)
const nowIso = () => new Date().toISOString()

type ScopeTarget = 'shared' | 'theme-pack' | 'document'

const formatEditedAt = (value: string) => {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.round(diff / 60000))

  if (minutes < 1) return 'Edited just now'
  if (minutes < 60) return `Edited ${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Edited ${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 7) return `Edited ${days}d ago`

  return `Edited ${new Date(value).toLocaleDateString('en-CA')}`
}

const getHealthTone = (health: DocumentHealth) => {
  if (health.status === 'Blocked') {
    return {
      icon: AlertTriangle,
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    }
  }

  if (health.status === 'Needs Attention') {
    return {
      icon: AlertTriangle,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
}

const getHealthSummary = (health: DocumentHealth) => {
  if (health.status === 'Ready') {
    return 'Ready'
  }

  return `${health.status} · ${health.issues.length} issue${health.issues.length === 1 ? '' : 's'}`
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const SIGNATURE_EXPORT_VARIANT_LABELS: Record<SignatureExportVariant, string> = {
  standard: 'Standard HTML',
  gmail: 'Gmail HTML',
  outlook: 'Outlook HTML',
}

const EXPORT_FILL_VARIANTS = [
  { fontScale: 1.45, spaceScale: 1 },
  { fontScale: 1.35, spaceScale: 1.05 },
  { fontScale: 1.3, spaceScale: 1.1 },
  { fontScale: 1.25, spaceScale: 1.1 },
  { fontScale: 1.2, spaceScale: 1.1 },
  { fontScale: 1.5, spaceScale: 1.45 },
  { fontScale: 1.45, spaceScale: 1.5 },
  { fontScale: 1.45, spaceScale: 1.45 },
  { fontScale: 1.4, spaceScale: 1.45 },
  { fontScale: 1.35, spaceScale: 1.45 },
  { fontScale: 1.35, spaceScale: 1.35 },
  { fontScale: 1.25, spaceScale: 1.35 },
  { fontScale: 1.25, spaceScale: 1.25 },
  { fontScale: 1.15, spaceScale: 1.15 },
  { fontScale: 1, spaceScale: 1 },
] as const
const DEFAULT_RESUME_EXPORT_TUNING: ResumeExportTuning = {
  preset: 'balanced',
  breakAnchor: 'co-op-and-professional-certifications',
  fontScale: 1.25,
  spaceScale: 1.1,
}

const isExportRenderMode = (value: string | null): value is ExportRenderMode =>
  value === 'review' || value === 'capture'

const isExportBalancePreset = (value: string | null): value is ExportBalancePreset =>
  value === 'relaxed' || value === 'balanced' || value === 'compact'

const isExportBreakAnchor = (value: string | null): value is ExportBreakAnchor =>
  value === 'none' ||
  value === 'co-op-experience' ||
  value === 'professional-certifications' ||
  value === 'co-op-and-professional-certifications'

const getTargetPageCountForBreakAnchor = (breakAnchor: ExportBreakAnchor) =>
  breakAnchor === 'co-op-and-professional-certifications' ? 3 : 2

const parseScaleParam = (value: string | null) => {
  if (!value) return undefined

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return undefined
  }

  return Number(numericValue.toFixed(3))
}

const waitForFrames = async (count = 2) => {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
  }
}

const buildResumeTuningCandidates = () =>
  RESUME_BALANCE_CANDIDATES.flatMap((candidate) =>
    EXPORT_FILL_VARIANTS.map(({ fontScale, spaceScale }) => ({
        preset: candidate.preset,
        breakAnchor: candidate.breakAnchor,
        fontScale,
        spaceScale,
      })),
  )

const compareExportMetrics = (left: ExportMetrics, right: ExportMetrics) => {
  const leftTargetPageCount = getTargetPageCountForBreakAnchor(left.tuning.breakAnchor)
  const rightTargetPageCount = getTargetPageCountForBreakAnchor(right.tuning.breakAnchor)
  const leftValid =
    left.pageCount === leftTargetPageCount &&
    !left.overflow &&
    !left.orphanedHeadings &&
    !left.splitGroups &&
    Number.isFinite(left.score)
  const rightValid =
    right.pageCount === rightTargetPageCount &&
    !right.overflow &&
    !right.orphanedHeadings &&
    !right.splitGroups &&
    Number.isFinite(right.score)

  if (leftValid !== rightValid) {
    return leftValid ? -1 : 1
  }

  const leftOrder = RESUME_BALANCE_CANDIDATES.findIndex(
    (candidate) =>
      candidate.preset === left.tuning.preset && candidate.breakAnchor === left.tuning.breakAnchor,
  )
  const rightOrder = RESUME_BALANCE_CANDIDATES.findIndex(
    (candidate) =>
      candidate.preset === right.tuning.preset && candidate.breakAnchor === right.tuning.breakAnchor,
  )

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder
  }

  if (leftValid && rightValid && left.score !== right.score) {
    return left.score - right.score
  }

  if (!leftValid && !rightValid && left.pageCount !== right.pageCount) {
    return Math.abs(left.pageCount - leftTargetPageCount) - Math.abs(right.pageCount - rightTargetPageCount)
  }

  const leftFill = left.tuning.fontScale + left.tuning.spaceScale
  const rightFill = right.tuning.fontScale + right.tuning.spaceScale

  return rightFill - leftFill
}

const buildFileStem = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document'

const isSignatureExportVariant = (value: string | null): value is SignatureExportVariant =>
  value === 'standard' || value === 'gmail' || value === 'outlook'

const readExportRequest = (): ExportRequest | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const searchParams = new URLSearchParams(window.location.search)
  const type = searchParams.get('export')
  const id = searchParams.get('id')?.trim()

  if (!id || (type !== 'resume' && type !== 'cover-letter' && type !== 'signature')) {
    return null
  }

  const density = searchParams.get('density')
  const contactLayout = searchParams.get('contactLayout')
  const avatar = searchParams.get('avatar')
  const variant = searchParams.get('variant')
  const render = searchParams.get('render')
  const balance = searchParams.get('balance')
  const preset = searchParams.get('preset')
  const breakAnchor = searchParams.get('breakAnchor')
  const fontScale = searchParams.get('fontScale')
  const spaceScale = searchParams.get('spaceScale')

  return {
    type,
    id,
    variant: type === 'signature' && isSignatureExportVariant(variant) ? variant : undefined,
    density: density === 'compact' || density === 'comfortable' ? density : undefined,
    contactLayout:
      contactLayout === 'single-line' || contactLayout === 'wrap' ? contactLayout : undefined,
    showAvatar:
      avatar === 'visible' ? true : avatar === 'hidden' ? false : undefined,
    render: isExportRenderMode(render) ? render : 'review',
    balance: balance === 'locked' ? 'locked' : 'auto',
    preset: isExportBalancePreset(preset) ? preset : undefined,
    breakAnchor: isExportBreakAnchor(breakAnchor) ? breakAnchor : undefined,
    fontScale: parseScaleParam(fontScale),
    spaceScale: parseScaleParam(spaceScale),
  }
}

const buildExportUrl = ({
  type,
  id,
  presentation,
  variant,
  render = 'review',
  balance = 'auto',
  tuning,
}: {
  type: ExportRequest['type']
  id: string
  presentation: PresentationSettings
  variant?: SignatureExportVariant
  render?: ExportRenderMode
  balance?: 'auto' | 'locked'
  tuning?: ResumeExportTuning
}) => {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('export', type)
  url.searchParams.set('id', id)
  url.searchParams.set('density', presentation.density)
  url.searchParams.set('contactLayout', presentation.contactLayout)
  url.searchParams.set('avatar', presentation.showAvatar ? 'visible' : 'hidden')
  url.searchParams.set('render', render)
  url.searchParams.set('balance', tuning ? 'locked' : balance)

  if (tuning) {
    url.searchParams.set('preset', tuning.preset)
    url.searchParams.set('breakAnchor', tuning.breakAnchor)
    url.searchParams.set('fontScale', `${tuning.fontScale}`)
    url.searchParams.set('spaceScale', `${tuning.spaceScale}`)
  }

  if (variant) {
    url.searchParams.set('variant', variant)
  }

  return url.toString()
}

const buildSignatureMarkup = (
  template: ReturnType<typeof resolveSignatureView>,
  presentation: PresentationSettings,
  variant: SignatureExportVariant = 'standard',
) => {
  const { data, accent, accentSoft, accentDark } = template
  const signatureFontStack =
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
  const densityStyles =
    presentation.density === 'compact'
      ? {
          nameSize: '16px',
          roleSize: '12px',
          metaSize: '11px',
          avatarSize: '54',
          chipPadding: '5px 8px',
          logoPadding: '4px 6px',
          logoWidth: '20px',
          logoHeight: '12px',
          gap: '6px',
        }
      : {
          nameSize: '18px',
          roleSize: '13px',
          metaSize: '12px',
          avatarSize: '60',
          chipPadding: '6px 10px',
          logoPadding: '5px 7px',
          logoWidth: '22px',
          logoHeight: '13px',
          gap: '7px',
        }
  const contactValues = [data.email, data.phone, data.website, data.location].filter(
    (value): value is string => Boolean(value),
  )

  const contactMarkup =
    variant === 'outlook'
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;border-collapse:separate;">
          <tr>
            ${contactValues
              .map(
                (value) =>
                  `<td style="padding:0 6px 6px 0;vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
                      <tr>
                        <td style="padding:${densityStyles.chipPadding};border:1px solid #d9e1ec;border-radius:999px;background:transparent;font-size:${densityStyles.metaSize};font-weight:500;line-height:1.15;color:#1f2937;white-space:nowrap;">
                          ${escapeHtml(value)}
                        </td>
                      </tr>
                    </table>
                  </td>`,
              )
              .join('')}
          </tr>
        </table>`
      : `<div style="margin-top:10px;font-size:0;white-space:${presentation.contactLayout === 'wrap' ? 'normal' : 'nowrap'};">
          ${contactValues
            .map(
              (value) =>
                `<span style="display:inline-block;margin:0 ${densityStyles.gap} 6px 0;padding:${densityStyles.chipPadding};border:1px solid #d9e1ec;border-radius:999px;background:transparent;font-size:${densityStyles.metaSize};font-weight:500;line-height:1.15;color:#1f2937;white-space:nowrap;">${escapeHtml(value)}</span>`,
            )
            .join('')}
        </div>`

  const logoMarkup =
    variant === 'outlook'
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;border-collapse:separate;">
          <tr>
            ${data.logos
              .map(
                (logo) =>
                  `<td style="padding:0 6px 0 0;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
                      <tr>
                        <td style="padding:${densityStyles.logoPadding};border:1px solid ${accentSoft};border-radius:8px;background:transparent;">
                          <img src="${logo.src}" alt="${escapeHtml(logo.alt)}" style="max-width:${densityStyles.logoWidth};max-height:${densityStyles.logoHeight};display:block;" />
                        </td>
                      </tr>
                    </table>
                  </td>`,
              )
              .join('')}
          </tr>
        </table>`
      : `<div style="margin-top:10px;padding-top:10px;border-top:1px solid ${accentSoft};font-size:0;">
          ${data.logos
            .map(
              (logo) =>
                `<span style="display:inline-flex;align-items:center;justify-content:center;margin:0 ${densityStyles.gap} 0 0;padding:${densityStyles.logoPadding};border:1px solid ${accentSoft};border-radius:10px;background:transparent;">
                  <img src="${logo.src}" alt="${escapeHtml(logo.alt)}" style="max-width:${densityStyles.logoWidth};max-height:${densityStyles.logoHeight};display:block;" />
                </span>`,
            )
            .join('')}
        </div>`

  const identityMarkup =
    variant === 'outlook'
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            ${
              presentation.showAvatar
                ? `<td style="padding:0 12px 0 0;vertical-align:top;">
                    <img src="${data.profileSrc}" alt="${escapeHtml(data.profileAlt)}" width="${densityStyles.avatarSize}" height="${densityStyles.avatarSize}" style="border-radius:16px;border:1px solid #d9e1ec;object-fit:cover;display:block;" />
                  </td>`
                : ''
            }
            <td style="vertical-align:top;">
              <div style="font-size:${densityStyles.nameSize};font-weight:700;letter-spacing:-0.02em;color:${accentDark};">${escapeHtml(data.name)}</div>
              <div style="margin-top:2px;font-size:${densityStyles.roleSize};font-weight:600;color:${accent};">${escapeHtml(data.role)}</div>
              ${data.organization ? `<div style="margin-top:2px;font-size:${densityStyles.roleSize};font-weight:600;color:#475569;">${escapeHtml(data.organization)}</div>` : ''}
              ${contactMarkup}
              ${logoMarkup}
            </td>
          </tr>
        </table>`
      : `<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:${signatureFontStack};color:#0f172a;border-collapse:separate;background:transparent;">
          <tr>
            ${
              presentation.showAvatar
                ? `<td style="padding:0 12px 0 0;vertical-align:top;">
                    <img src="${data.profileSrc}" alt="${escapeHtml(data.profileAlt)}" width="${densityStyles.avatarSize}" height="${densityStyles.avatarSize}" style="border-radius:16px;border:1px solid #d9e1ec;object-fit:cover;display:block;" />
                  </td>`
                : ''
            }
            <td style="vertical-align:top;">
              <div style="font-size:${densityStyles.nameSize};font-weight:700;letter-spacing:-0.02em;color:${accentDark};">${escapeHtml(data.name)}</div>
              <div style="margin-top:2px;font-size:${densityStyles.roleSize};font-weight:600;color:${accent};">${escapeHtml(data.role)}</div>
              ${data.organization ? `<div style="margin-top:2px;font-size:${densityStyles.roleSize};font-weight:600;color:#475569;">${escapeHtml(data.organization)}</div>` : ''}
              ${contactMarkup}
              ${logoMarkup}
            </td>
          </tr>
        </table>`

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:transparent;font-family:${signatureFontStack};color:#0f172a;">
${identityMarkup}
</body>
</html>`
}

const toDataUrl = async (src: string) => {
  const absoluteUrl = new URL(src, window.location.href).toString()

  try {
    const response = await fetch(absoluteUrl)

    if (!response.ok) {
      return absoluteUrl
    }

    const blob = await response.blob()

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error(`Failed to encode asset: ${absoluteUrl}`))
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : absoluteUrl)
      reader.readAsDataURL(blob)
    })
  } catch {
    return absoluteUrl
  }
}

const FIELD_SCOPE_REGISTRY = {
  sharedProfile: {
    fullName: 'shared only',
    phone: 'shared only',
    location: 'shared only',
    professionalHeadline: 'shared only',
    summary: 'shared only',
    profileImage: 'shared only',
    signatureImage: 'shared only',
  },
  presentation: {
    density: 'shared only',
    showAvatar: 'shared only',
    contactLayout: 'shared only',
  },
  themePack: {
    label: 'theme pack or document',
    organization: 'theme pack or document',
    primaryLogo: 'theme pack or document',
    defaultRoleTitle: 'theme pack or document',
    defaultSubtitle: 'theme pack or document',
    email: 'theme pack or document',
    website: 'theme pack or document',
    accent: 'theme pack or document',
    accentSoft: 'theme pack or document',
    accentDark: 'theme pack or document',
  },
  resume: {
    roleTitle: 'theme pack or document',
    email: 'theme pack or document',
    website: 'theme pack or document',
    sections: 'document only',
  },
  coverLetter: {
    tagline: 'theme pack or document',
    organization: 'theme pack or document',
    email: 'theme pack or document',
    website: 'theme pack or document',
    content: 'document only',
  },
  signature: {
    roleTitle: 'theme pack or document',
    organization: 'theme pack or document',
    email: 'theme pack or document',
    website: 'theme pack or document',
    logos: 'document only',
  },
} as const satisfies Record<string, Record<string, FieldScope>>

const readInitialStudioState = (): StudioState => {
  if (typeof window === 'undefined') {
    return createSeedStudioState()
  }

  try {
    const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY)

    if (!raw) {
      return createSeedStudioState()
    }

    const parsed = JSON.parse(raw) as unknown

    if (!isPersistenceEnvelope(parsed)) {
      return createSeedStudioState()
    }

    return normalizeStudioState(parsed.state)
  } catch {
    return createSeedStudioState()
  }
}

const getInheritedSource = (
  documentValue: string | undefined,
  themeValue?: string,
): FieldSource => {
  if (documentValue !== undefined) {
    return 'This Document'
  }

  if (themeValue !== undefined) {
    return 'Theme Pack'
  }

  return 'Shared'
}

const getInheritedTarget = (
  documentValue: string | undefined,
  themeValue?: string,
): 'document' | 'theme-pack' | 'shared' => {
  if (documentValue !== undefined) {
    return 'document'
  }

  if (themeValue !== undefined) {
    return 'theme-pack'
  }

  return 'shared'
}

const omitOverrideKey = <T extends object, K extends keyof T>(value: T, key: K): T => {
  const { [key]: _removed, ...rest } = value
  return rest as T
}

const EditorSection = ({
  sectionKey,
  title,
  description,
  meta,
  isOpen,
  onToggle,
  children,
}: {
  sectionKey: string
  title: string
  description?: string
  meta?: string
  isOpen: boolean
  onToggle: (sectionKey: string) => void
  children: React.ReactNode
}) => (
  <section className="studio-section rounded-[26px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur">
    <button
      type="button"
      onClick={() => onToggle(sectionKey)}
      className="flex w-full items-start justify-between gap-3 text-left"
      aria-expanded={isOpen}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
          {meta && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {meta}
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>}
      </div>
      <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-slate-300 hover:text-slate-700">
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </span>
    </button>
    {isOpen && <div className="mt-4 space-y-3">{children}</div>}
  </section>
)

const SourceBadge = ({ source }: { source: FieldSource }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]',
      source === 'Shared' && 'bg-emerald-50 text-emerald-700',
      source === 'Theme Pack' && 'bg-sky-50 text-sky-700',
      source === 'This Document' && 'bg-amber-50 text-amber-700',
    )}
  >
    {source}
  </span>
)

const ScopeBadge = ({ scope }: { scope: FieldScope }) => (
  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
    {scope}
  </span>
)

const ScopeSelector = ({
  value,
  options,
  onChange,
}: {
  value: ScopeTarget
  options: ScopeTarget[]
  onChange: (next: ScopeTarget) => void
}) => (
  <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
    {options.map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={cn(
          'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition',
          value === option
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-500 hover:bg-white hover:text-slate-700',
        )}
      >
        {option === 'theme-pack' ? 'Theme Pack' : option === 'document' ? 'This Document' : 'Shared'}
      </button>
    ))}
  </div>
)

const HealthBadge = ({ health }: { health: DocumentHealth }) => {
  const tone = getHealthTone(health)
  const Icon = tone.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
        tone.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {getHealthSummary(health)}
    </span>
  )
}

const moveArrayItem = <T,>(items: T[], fromIndex: number, direction: -1 | 1) => {
  const toIndex = fromIndex + direction
  if (toIndex < 0 || toIndex >= items.length) {
    return items
  }

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, movedItem)
  return nextItems
}

const FieldActionButton = ({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
  >
    {label}
  </button>
)

const ValidationIssueRow = ({
  title,
  body,
  severity,
}: {
  title: string
  body: string
  severity: 'attention' | 'blocked'
}) => (
  <div
    className={cn(
      'rounded-2xl border px-3 py-2',
      severity === 'blocked' ? 'border-rose-200 bg-rose-50/80 text-rose-800' : 'border-amber-200 bg-amber-50/80 text-amber-800',
    )}
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{title}</p>
    <p className="mt-1 text-xs leading-5">{body}</p>
  </div>
)

const Field = ({
  label,
  scope,
  source,
  actions,
  children,
  description,
}: {
  label: string
  scope: FieldScope
  source?: FieldSource
  actions?: React.ReactNode
  children: React.ReactNode
  description?: string
}) => (
  <div className="space-y-1.5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</Label>
        <ScopeBadge scope={scope} />
        {source && <SourceBadge source={source} />}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
    {description && <p className="text-xs text-slate-400">{description}</p>}
    {children}
  </div>
)

const ColorField = ({
  label,
  value,
  onChange,
  scope,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  scope: FieldScope
}) => (
  <Field label={label} scope={scope} source="Theme Pack">
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-12 rounded-md border border-slate-200 bg-white"
      />
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  </Field>
)

const LogoMultiSelect = ({
  selected,
  onChange,
}: {
  selected: { src: string; alt: string }[]
  onChange: (next: { src: string; alt: string }[]) => void
}) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {logoOptions.map((option) => {
      const checked = selected.some((logo) => logo.src === option.value)
      return (
        <label key={option.value} className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              if (event.target.checked) {
                onChange([...selected, { src: option.value, alt: option.label }])
              } else {
                onChange(selected.filter((logo) => logo.src !== option.value))
              }
            }}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />
          <span>{option.label}</span>
        </label>
      )
    })}
  </div>
)

export default function App() {
  const exportRequest = useMemo(() => readExportRequest(), [])
  const [studio, setStudio] = useState<StudioState>(() => readInitialStudioState())
  const [signatureExportVariant, setSignatureExportVariant] = useState<SignatureExportVariant>('standard')
  const [statusMessage, setStatusMessage] = useState('')
  const [resumeExportTuning, setResumeExportTuning] = useState<ResumeExportTuning>(DEFAULT_RESUME_EXPORT_TUNING)
  const [resumeExportMetrics, setResumeExportMetrics] = useState<ExportMetrics | null>(null)
  const statusTimeoutRef = useRef<number | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const resumePreviewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(createPersistenceEnvelope(studio)))
    } catch {
      // Ignore storage failures and keep the session functional.
    }
  }, [studio])

  useEffect(
    () => () => {
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current)
      }
    },
    [],
  )

  const pushStatus = (message: string, duration = 2400) => {
    setStatusMessage(message)

    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current)
    }

    statusTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage('')
    }, duration)
  }

  const updateUi = (updater: (ui: StudioState['ui']) => StudioState['ui']) => {
    setStudio((current) => ({
      ...current,
      ui: updater(current.ui),
    }))
  }

  const toggleSection = (sectionKey: string) => {
    updateUi((ui) => ({
      ...ui,
      collapsedSections: ui.collapsedSections.includes(sectionKey)
        ? ui.collapsedSections.filter((item) => item !== sectionKey)
        : [...ui.collapsedSections, sectionKey],
    }))
  }

  const isSectionOpen = (sectionKey: string) => !studio.ui.collapsedSections.includes(sectionKey)

  const setPreviewModeForType = (type: 'resume' | 'cover-letter', mode: PreviewMode) => {
    updateUi((ui) => ({
      ...ui,
      previewModeByType: {
        ...ui.previewModeByType,
        [type]: mode,
      },
    }))
  }

  const resumeResolutionId =
    exportRequest?.type === 'resume' ? exportRequest.id : studio.selection.activeResumeId
  const coverLetterResolutionId =
    exportRequest?.type === 'cover-letter' ? exportRequest.id : studio.selection.activeCoverLetterId
  const signatureResolutionId =
    exportRequest?.type === 'signature' ? exportRequest.id : studio.selection.activeSignatureId

  const selectedResumeDocument =
    studio.resumeDocuments.find((document) => document.id === resumeResolutionId) ??
    studio.resumeDocuments[0]
  const selectedCoverLetterDocument =
    studio.coverLetterDocuments.find((document) => document.id === coverLetterResolutionId) ??
    studio.coverLetterDocuments[0]
  const selectedSignatureDocument =
    studio.signatureDocuments.find((document) => document.id === signatureResolutionId) ??
    studio.signatureDocuments[0]

  const documentType = exportRequest
    ? exportRequest.type === 'signature'
      ? 'email-signature'
      : exportRequest.type
    : studio.selection.documentType
  const activePreviewMode = exportRequest
    ? documentType === 'email-signature'
      ? 'screen'
      : 'print'
    : documentType === 'email-signature'
      ? 'screen'
      : studio.ui.previewModeByType[documentType]
  const activeThemePackId =
    documentType === 'resume'
      ? selectedResumeDocument.themePackId
      : documentType === 'cover-letter'
        ? selectedCoverLetterDocument.themePackId
        : selectedSignatureDocument.themePackId
  const activeThemePack = getThemePackForDocument(studio.themePacks, activeThemePackId)

  const resolvedResume = useMemo(
    () => resolveResumeView(studio, selectedResumeDocument.id),
    [studio, selectedResumeDocument.id],
  )
  const resolvedCoverLetter = useMemo(
    () => resolveCoverLetterView(studio, selectedCoverLetterDocument.id),
    [studio, selectedCoverLetterDocument.id],
  )
  const resolvedSignature = useMemo(
    () => resolveSignatureView(studio, selectedSignatureDocument.id),
    [studio, selectedSignatureDocument.id],
  )
  const activePresentation = useMemo<PresentationSettings>(
    () => ({
      density: exportRequest?.density ?? studio.presentation.density,
      showAvatar: exportRequest?.showAvatar ?? studio.presentation.showAvatar,
      contactLayout: exportRequest?.contactLayout ?? studio.presentation.contactLayout,
    }),
    [exportRequest, studio.presentation],
  )
  const activeSignatureExportVariant = exportRequest?.variant ?? signatureExportVariant
  const signatureHtml = useMemo(
    () => buildSignatureMarkup(resolvedSignature, activePresentation, activeSignatureExportVariant),
    [resolvedSignature, activePresentation, activeSignatureExportVariant],
  )
  const densityLabels: Record<PresentationDensity, string> = {
    comfortable: 'Comfortable',
    compact: 'Compact',
  }
  const contactLayoutLabels: Record<PresentationContactLayout, string> = {
    'single-line': 'Single Line',
    wrap: 'Balanced Wrap',
  }
  const activeDocumentLabel =
    documentType === 'resume'
      ? selectedResumeDocument.label
      : documentType === 'cover-letter'
        ? selectedCoverLetterDocument.label
        : selectedSignatureDocument.label
  const activeDocumentCount =
    documentType === 'resume'
      ? studio.resumeDocuments.filter((document) => !document.meta.archived).length
      : documentType === 'cover-letter'
        ? studio.coverLetterDocuments.filter((document) => !document.meta.archived).length
        : studio.signatureDocuments.filter((document) => !document.meta.archived).length
  const activeHealth =
    documentType === 'resume'
      ? resolvedResume.health
      : documentType === 'cover-letter'
        ? resolvedCoverLetter.health
        : resolvedSignature.health
  const activeLayoutMode =
    documentType === 'email-signature' ? 'screen' : activePreviewMode === 'print' ? 'print' : 'screen'
  const lockedResumeTuning = useMemo(
    () =>
      exportRequest?.type === 'resume' &&
      exportRequest.balance === 'locked' &&
      exportRequest.preset &&
      exportRequest.breakAnchor &&
      exportRequest.fontScale !== undefined &&
      exportRequest.spaceScale !== undefined
        ? {
            preset: exportRequest.preset,
            breakAnchor: exportRequest.breakAnchor,
            fontScale: exportRequest.fontScale,
            spaceScale: exportRequest.spaceScale,
          }
        : null,
    [exportRequest],
  )
  const resumeNeedsBalancedLayout =
    documentType === 'resume' && (Boolean(exportRequest) || activePreviewMode === 'print')

  useEffect(() => {
    if (!exportRequest || typeof document === 'undefined') {
      return
    }

    const pageStyle = document.createElement('style')
    pageStyle.setAttribute('data-export-page-style', exportRequest.type)
    pageStyle.textContent = `@media print { @page { size: letter; margin: ${
      exportRequest.type === 'resume' ? '0.35in 0.42in' : exportRequest.type === 'cover-letter' ? '0.7in' : '0.5in'
    }; } }`
    document.head.appendChild(pageStyle)

    return () => {
      pageStyle.remove()
    }
  }, [exportRequest])

  useEffect(() => {
    if (!exportRequest || typeof document === 'undefined') {
      return
    }

    const label =
      exportRequest.type === 'resume'
        ? resolvedResume.documentLabel
        : exportRequest.type === 'cover-letter'
          ? resolvedCoverLetter.documentLabel
          : `${resolvedSignature.documentLabel} · ${SIGNATURE_EXPORT_VARIANT_LABELS[activeSignatureExportVariant]}`

    document.title = `${label} Export`
  }, [exportRequest, resolvedResume.documentLabel, resolvedCoverLetter.documentLabel, resolvedSignature.documentLabel, activeSignatureExportVariant])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!resumeNeedsBalancedLayout) {
      setResumeExportMetrics(null)
      window.__resumeBalanceCandidates = undefined
      window.__resumeBalanceResult = null
      window.__exportMetrics = null
      return
    }

    let cancelled = false

    const runBalanceLoop = async () => {
      const candidates = lockedResumeTuning ? [lockedResumeTuning] : buildResumeTuningCandidates()
      const candidateMetrics: ExportMetrics[] = []

      for (const candidate of candidates) {
        if (cancelled) {
          return
        }

        setResumeExportTuning(candidate)
        await waitForFrames(3)

        const root = resumePreviewRef.current
        if (!root) {
          return
        }

        const metrics = measureResumeExportMetrics(root, candidate)
        if (metrics) {
          candidateMetrics.push(metrics)
        }
      }

      if (cancelled) {
        return
      }

      const rankedCandidates = [...candidateMetrics].sort(compareExportMetrics)
      const winner = rankedCandidates[0] ?? null

      if (winner) {
        setResumeExportTuning(winner.tuning)
        await waitForFrames(2)
      }

      if (cancelled) {
        return
      }

      setResumeExportMetrics(winner)
      window.__resumeBalanceCandidates = candidateMetrics
      window.__resumeBalanceResult = winner
      window.__exportMetrics = winner
    }

    runBalanceLoop()

    return () => {
      cancelled = true
    }
  }, [
    exportRequest,
    lockedResumeTuning,
    resumeNeedsBalancedLayout,
    selectedResumeDocument.id,
    activePresentation.contactLayout,
    activePresentation.density,
    activePresentation.showAvatar,
  ])

  const updateSelection = (patch: Partial<StudioState['selection']>) => {
    setStudio((current) => ({
      ...current,
      selection: {
        ...current.selection,
        ...patch,
      },
    }))
  }

  const updateSharedProfile = (patch: Partial<SharedProfile>) => {
    setStudio((current) => ({
      ...current,
      sharedProfile: {
        ...current.sharedProfile,
        ...patch,
      },
    }))
  }

  const updatePresentation = (patch: Partial<PresentationSettings>) => {
    setStudio((current) => ({
      ...current,
      presentation: {
        ...current.presentation,
        ...patch,
      },
    }))
  }

  const updateThemePack = (id: ThemePackId, updater: (themePack: ThemePack) => ThemePack) => {
    setStudio((current) => ({
      ...current,
      themePacks: current.themePacks.map((themePack) => (themePack.id === id ? updater(themePack) : themePack)),
    }))
  }

  const updateResumeDocument = (id: ResumeId, updater: (document: ResumeDocument) => ResumeDocument) => {
    setStudio((current) => ({
      ...current,
      resumeDocuments: current.resumeDocuments.map((document) => {
        if (document.id !== id) return document

        const nextDocument = updater(document)
        return {
          ...nextDocument,
          meta: {
            ...nextDocument.meta,
            updatedAt: nowIso(),
          },
        }
      }),
    }))
  }

  const updateCoverLetterDocument = (
    id: CoverLetterId,
    updater: (document: CoverLetterDocument) => CoverLetterDocument,
  ) => {
    setStudio((current) => ({
      ...current,
      coverLetterDocuments: current.coverLetterDocuments.map((document) => {
        if (document.id !== id) return document

        const nextDocument = updater(document)
        return {
          ...nextDocument,
          meta: {
            ...nextDocument.meta,
            updatedAt: nowIso(),
          },
        }
      }),
    }))
  }

  const updateSignatureDocument = (
    id: SignatureId,
    updater: (document: SignatureDocument) => SignatureDocument,
  ) => {
    setStudio((current) => ({
      ...current,
      signatureDocuments: current.signatureDocuments.map((document) => {
        if (document.id !== id) return document

        const nextDocument = updater(document)
        return {
          ...nextDocument,
          meta: {
            ...nextDocument.meta,
            updatedAt: nowIso(),
          },
        }
      }),
    }))
  }

  const updateActiveThemePalette = (patch: Partial<ThemePack['palette']>) => {
    updateThemePack(activeThemePack.id, (themePack) => ({
      ...themePack,
      palette: {
        ...themePack.palette,
        ...patch,
      },
    }))
  }

  const updateResumeContent = (updater: (content: ResumeDocument['content']) => ResumeDocument['content']) => {
    updateResumeDocument(selectedResumeDocument.id, (document) => ({
      ...document,
      content: updater(document.content),
    }))
  }

  const updateResumeOverrides = (patch: Partial<ResumeDocument['overrides']>) => {
    updateResumeDocument(selectedResumeDocument.id, (document) => ({
      ...document,
      overrides: {
        ...document.overrides,
        ...patch,
      },
    }))
  }

  const clearResumeOverride = (key: keyof ResumeDocument['overrides']) => {
    updateResumeDocument(selectedResumeDocument.id, (document) => ({
      ...document,
      overrides: omitOverrideKey(document.overrides, key),
    }))
  }

  const updateCoverLetterContent = (
    patch: Partial<CoverLetterDocument['content']>,
  ) => {
    updateCoverLetterDocument(selectedCoverLetterDocument.id, (document) => ({
      ...document,
      content: {
        ...document.content,
        ...patch,
      },
    }))
  }

  const updateCoverLetterOverrides = (patch: Partial<CoverLetterDocument['overrides']>) => {
    updateCoverLetterDocument(selectedCoverLetterDocument.id, (document) => ({
      ...document,
      overrides: {
        ...document.overrides,
        ...patch,
      },
    }))
  }

  const clearCoverLetterOverride = (key: keyof CoverLetterDocument['overrides']) => {
    updateCoverLetterDocument(selectedCoverLetterDocument.id, (document) => ({
      ...document,
      overrides: omitOverrideKey(document.overrides, key),
    }))
  }

  const updateSignatureContent = (patch: Partial<SignatureDocument['content']>) => {
    updateSignatureDocument(selectedSignatureDocument.id, (document) => ({
      ...document,
      content: {
        ...document.content,
        ...patch,
      },
    }))
  }

  const updateSignatureOverrides = (patch: Partial<SignatureDocument['overrides']>) => {
    updateSignatureDocument(selectedSignatureDocument.id, (document) => ({
      ...document,
      overrides: {
        ...document.overrides,
        ...patch,
      },
    }))
  }

  const clearSignatureOverride = (key: keyof SignatureDocument['overrides']) => {
    updateSignatureDocument(selectedSignatureDocument.id, (document) => ({
      ...document,
      overrides: omitOverrideKey(document.overrides, key),
    }))
  }

  const updateActiveDocumentLabel = (label: string) => {
    if (documentType === 'resume') {
      updateResumeDocument(selectedResumeDocument.id, (document) => ({ ...document, label }))
      return
    }

    if (documentType === 'cover-letter') {
      updateCoverLetterDocument(selectedCoverLetterDocument.id, (document) => ({ ...document, label }))
      return
    }

    updateSignatureDocument(selectedSignatureDocument.id, (document) => ({ ...document, label }))
  }

  const updateActiveDocumentThemePack = (themePackId: ThemePackId) => {
    if (documentType === 'resume') {
      updateResumeDocument(selectedResumeDocument.id, (document) => ({ ...document, themePackId }))
      return
    }

    if (documentType === 'cover-letter') {
      updateCoverLetterDocument(selectedCoverLetterDocument.id, (document) => ({ ...document, themePackId }))
      return
    }

    updateSignatureDocument(selectedSignatureDocument.id, (document) => ({ ...document, themePackId }))
  }

  const createUniqueDocumentLabel = (existingLabels: string[], baseLabel: string) => {
    if (!existingLabels.includes(baseLabel)) {
      return baseLabel
    }

    let index = 2
    while (existingLabels.includes(`${baseLabel} ${index}`)) {
      index += 1
    }

    return `${baseLabel} ${index}`
  }

  const createVariantFromCurrent = () => {
    const timestamp = nowIso()

    if (documentType === 'resume') {
      const nextId = makeId('resume')
      const nextLabel = createUniqueDocumentLabel(
        studio.resumeDocuments.map((document) => document.label),
        `${selectedResumeDocument.label} Variant`,
      )
      const nextDocument: ResumeDocument = {
        ...cloneValue(selectedResumeDocument),
        id: nextId,
        label: nextLabel,
        overrides: {},
        meta: {
          createdAt: timestamp,
          updatedAt: timestamp,
          archived: false,
        },
      }

      setStudio((current) => ({
        ...current,
        resumeDocuments: [nextDocument, ...current.resumeDocuments],
        selection: {
          ...current.selection,
          activeResumeId: nextId,
        },
      }))
      pushStatus('New resume variant created from the current document.')
      return
    }

    if (documentType === 'cover-letter') {
      const nextId = makeId('cover-letter')
      const nextLabel = createUniqueDocumentLabel(
        studio.coverLetterDocuments.map((document) => document.label),
        `${selectedCoverLetterDocument.label} Variant`,
      )
      const nextDocument: CoverLetterDocument = {
        ...cloneValue(selectedCoverLetterDocument),
        id: nextId,
        label: nextLabel,
        overrides: {},
        meta: {
          createdAt: timestamp,
          updatedAt: timestamp,
          archived: false,
        },
      }

      setStudio((current) => ({
        ...current,
        coverLetterDocuments: [nextDocument, ...current.coverLetterDocuments],
        selection: {
          ...current.selection,
          activeCoverLetterId: nextId,
        },
      }))
      pushStatus('New cover-letter variant created from the current document.')
      return
    }

    const nextId = makeId('signature')
    const nextLabel = createUniqueDocumentLabel(
      studio.signatureDocuments.map((document) => document.label),
      `${selectedSignatureDocument.label} Variant`,
    )
    const nextDocument: SignatureDocument = {
      ...cloneValue(selectedSignatureDocument),
      id: nextId,
      label: nextLabel,
      overrides: {},
      meta: {
        createdAt: timestamp,
        updatedAt: timestamp,
        archived: false,
      },
    }

    setStudio((current) => ({
      ...current,
      signatureDocuments: [nextDocument, ...current.signatureDocuments],
      selection: {
        ...current.selection,
        activeSignatureId: nextId,
      },
    }))
    pushStatus('New signature variant created from the current document.')
  }

  const duplicateActiveVariant = () => {
    const timestamp = nowIso()

    if (documentType === 'resume') {
      const nextId = makeId('resume')
      const nextLabel = createUniqueDocumentLabel(
        studio.resumeDocuments.map((document) => document.label),
        `${selectedResumeDocument.label} Copy`,
      )
      const nextDocument: ResumeDocument = {
        ...cloneValue(selectedResumeDocument),
        id: nextId,
        label: nextLabel,
        meta: {
          createdAt: timestamp,
          updatedAt: timestamp,
          archived: false,
        },
      }

      setStudio((current) => ({
        ...current,
        resumeDocuments: [nextDocument, ...current.resumeDocuments],
        selection: {
          ...current.selection,
          activeResumeId: nextId,
        },
      }))
      pushStatus('Resume duplicated.')
      return
    }

    if (documentType === 'cover-letter') {
      const nextId = makeId('cover-letter')
      const nextLabel = createUniqueDocumentLabel(
        studio.coverLetterDocuments.map((document) => document.label),
        `${selectedCoverLetterDocument.label} Copy`,
      )
      const nextDocument: CoverLetterDocument = {
        ...cloneValue(selectedCoverLetterDocument),
        id: nextId,
        label: nextLabel,
        meta: {
          createdAt: timestamp,
          updatedAt: timestamp,
          archived: false,
        },
      }

      setStudio((current) => ({
        ...current,
        coverLetterDocuments: [nextDocument, ...current.coverLetterDocuments],
        selection: {
          ...current.selection,
          activeCoverLetterId: nextId,
        },
      }))
      pushStatus('Cover letter duplicated.')
      return
    }

    const nextId = makeId('signature')
    const nextLabel = createUniqueDocumentLabel(
      studio.signatureDocuments.map((document) => document.label),
      `${selectedSignatureDocument.label} Copy`,
    )
    const nextDocument: SignatureDocument = {
      ...cloneValue(selectedSignatureDocument),
      id: nextId,
      label: nextLabel,
      meta: {
        createdAt: timestamp,
        updatedAt: timestamp,
        archived: false,
      },
    }

    setStudio((current) => ({
      ...current,
      signatureDocuments: [nextDocument, ...current.signatureDocuments],
      selection: {
        ...current.selection,
        activeSignatureId: nextId,
      },
    }))
    pushStatus('Signature duplicated.')
  }

  const setActiveVariant = (id: string) => {
    if (documentType === 'resume') {
      updateSelection({ activeResumeId: id })
      return
    }

    if (documentType === 'cover-letter') {
      updateSelection({ activeCoverLetterId: id })
      return
    }

    updateSelection({ activeSignatureId: id })
  }

  const toggleArchiveVariant = (id: string) => {
    if (documentType === 'resume') {
      const target = studio.resumeDocuments.find((document) => document.id === id)
      if (!target) return

      if (!target.meta.archived && studio.resumeDocuments.filter((document) => !document.meta.archived).length === 1) {
        pushStatus('At least one active resume variant must remain available.', 3200)
        return
      }

      const nextArchived = !target.meta.archived
      const availableDocuments = studio.resumeDocuments.filter(
        (document) => document.id !== id && !document.meta.archived,
      )

      setStudio((current) => ({
        ...current,
        resumeDocuments: current.resumeDocuments.map((document) =>
          document.id === id
            ? {
                ...document,
                meta: {
                  ...document.meta,
                  archived: nextArchived,
                  updatedAt: nowIso(),
                },
              }
            : document,
        ),
        selection: {
          ...current.selection,
          activeResumeId:
            nextArchived && current.selection.activeResumeId === id
              ? availableDocuments[0]?.id ?? current.selection.activeResumeId
              : current.selection.activeResumeId,
        },
      }))
      pushStatus(nextArchived ? 'Resume variant archived.' : 'Resume variant restored.')
      return
    }

    if (documentType === 'cover-letter') {
      const target = studio.coverLetterDocuments.find((document) => document.id === id)
      if (!target) return

      if (
        !target.meta.archived &&
        studio.coverLetterDocuments.filter((document) => !document.meta.archived).length === 1
      ) {
        pushStatus('At least one active cover-letter variant must remain available.', 3200)
        return
      }

      const nextArchived = !target.meta.archived
      const availableDocuments = studio.coverLetterDocuments.filter(
        (document) => document.id !== id && !document.meta.archived,
      )

      setStudio((current) => ({
        ...current,
        coverLetterDocuments: current.coverLetterDocuments.map((document) =>
          document.id === id
            ? {
                ...document,
                meta: {
                  ...document.meta,
                  archived: nextArchived,
                  updatedAt: nowIso(),
                },
              }
            : document,
        ),
        selection: {
          ...current.selection,
          activeCoverLetterId:
            nextArchived && current.selection.activeCoverLetterId === id
              ? availableDocuments[0]?.id ?? current.selection.activeCoverLetterId
              : current.selection.activeCoverLetterId,
        },
      }))
      pushStatus(nextArchived ? 'Cover-letter variant archived.' : 'Cover-letter variant restored.')
      return
    }

    const target = studio.signatureDocuments.find((document) => document.id === id)
    if (!target) return

    if (!target.meta.archived && studio.signatureDocuments.filter((document) => !document.meta.archived).length === 1) {
      pushStatus('At least one active signature variant must remain available.', 3200)
      return
    }

    const nextArchived = !target.meta.archived
    const availableDocuments = studio.signatureDocuments.filter((document) => document.id !== id && !document.meta.archived)

    setStudio((current) => ({
      ...current,
      signatureDocuments: current.signatureDocuments.map((document) =>
        document.id === id
          ? {
              ...document,
              meta: {
                ...document.meta,
                archived: nextArchived,
                updatedAt: nowIso(),
              },
            }
          : document,
      ),
      selection: {
        ...current.selection,
        activeSignatureId:
          nextArchived && current.selection.activeSignatureId === id
            ? availableDocuments[0]?.id ?? current.selection.activeSignatureId
            : current.selection.activeSignatureId,
      },
    }))
    pushStatus(nextArchived ? 'Signature variant archived.' : 'Signature variant restored.')
  }

  const updateEducationItem = (index: number, patch: Partial<ResumeEducationItem>) => {
    updateResumeContent((content) => ({
      ...content,
      education: content.education.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  const addEducationItem = () => {
    updateResumeContent((content) => ({
      ...content,
      education: [
        ...content.education,
        {
          id: makeId('education'),
          degree: 'New Degree',
          program: 'Program',
          school: 'Institution',
          date: 'Year',
          bullets: [],
          logoSrc: logoOptions[0].value,
          logoAlt: logoOptions[0].label,
        },
      ],
    }))
  }

  const removeEducationItem = (index: number) => {
    updateResumeContent((content) => ({
      ...content,
      education: content.education.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const updateExperiencePrimaryItem = (index: number, patch: Partial<ResumeExperienceItem>) => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        primary: content.experience.primary.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      },
    }))
  }

  const addExperiencePrimaryItem = () => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        primary: [
          ...content.experience.primary,
          {
            id: makeId('experience-primary'),
            role: 'New Role',
            company: 'Organization',
            location: 'Location',
            date: 'Year',
            bullets: [],
            skills: [],
            logoSrc: logoOptions[0].value,
            logoAlt: logoOptions[0].label,
          },
        ],
      },
    }))
  }

  const removeExperiencePrimaryItem = (index: number) => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        primary: content.experience.primary.filter((_, itemIndex) => itemIndex !== index),
      },
    }))
  }

  const updateExperienceGroup = (groupIndex: number, patch: Partial<ResumeExperienceGroup>) => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        groups: content.experience.groups.map((group, itemIndex) =>
          itemIndex === groupIndex ? { ...group, ...patch } : group,
        ),
      },
    }))
  }

  const updateExperienceGroupItem = (
    groupIndex: number,
    itemIndex: number,
    patch: Partial<ResumeExperienceItem>,
  ) => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        groups: content.experience.groups.map((group, currentGroupIndex) => {
          if (currentGroupIndex !== groupIndex) return group
          return {
            ...group,
            items: group.items.map((item, currentItemIndex) =>
              currentItemIndex === itemIndex ? { ...item, ...patch } : item,
            ),
          }
        }),
      },
    }))
  }

  const addExperienceGroupItem = (groupIndex: number) => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        groups: content.experience.groups.map((group, currentGroupIndex) => {
          if (currentGroupIndex !== groupIndex) return group
          return {
            ...group,
            items: [
              ...group.items,
              {
                id: makeId('experience-group'),
                role: 'New Role',
                company: 'Organization',
                location: 'Location',
                date: 'Year',
                bullets: [],
                skills: [],
                logoSrc: logoOptions[0].value,
                logoAlt: logoOptions[0].label,
              },
            ],
          }
        }),
      },
    }))
  }

  const removeExperienceGroupItem = (groupIndex: number, itemIndex: number) => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        groups: content.experience.groups.map((group, currentGroupIndex) => {
          if (currentGroupIndex !== groupIndex) return group
          return {
            ...group,
            items: group.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex),
          }
        }),
      },
    }))
  }

  const updateCertificationItem = (index: number, patch: Partial<ResumeCertificationItem>) => {
    updateResumeContent((content) => ({
      ...content,
      certifications: {
        ...content.certifications,
        featured: content.certifications.featured.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      },
    }))
  }

  const addCertificationItem = () => {
    updateResumeContent((content) => ({
      ...content,
      certifications: {
        ...content.certifications,
        featured: [
          ...content.certifications.featured,
          {
            id: makeId('certification'),
            title: 'New Certification',
            organization: 'Organization',
            detail: 'Details',
            date: 'Year',
            logoSrc: logoOptions[0].value,
            logoAlt: logoOptions[0].label,
          },
        ],
      },
    }))
  }

  const removeCertificationItem = (index: number) => {
    updateResumeContent((content) => ({
      ...content,
      certifications: {
        ...content.certifications,
        featured: content.certifications.featured.filter((_, itemIndex) => itemIndex !== index),
      },
    }))
  }

  const updateCertificationStat = (index: number, patch: Partial<ResumeCertificationStat>) => {
    updateResumeContent((content) => ({
      ...content,
      certifications: {
        ...content.certifications,
        stats: content.certifications.stats.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      },
    }))
  }

  const addCertificationStat = () => {
    updateResumeContent((content) => ({
      ...content,
      certifications: {
        ...content.certifications,
        stats: [
          ...content.certifications.stats,
          {
            id: makeId('certification-stat'),
            label: 'Certification Group',
            count: '0',
            logos: [],
          },
        ],
      },
    }))
  }

  const removeCertificationStat = (index: number) => {
    updateResumeContent((content) => ({
      ...content,
      certifications: {
        ...content.certifications,
        stats: content.certifications.stats.filter((_, itemIndex) => itemIndex !== index),
      },
    }))
  }

  const updateLeadershipGroup = (groupIndex: number, patch: Partial<ResumeLeadershipGroup>) => {
    updateResumeContent((content) => ({
      ...content,
      leadership: content.leadership.map((group, itemIndex) =>
        itemIndex === groupIndex ? { ...group, ...patch } : group,
      ),
    }))
  }

  const updateLeadershipGroupItem = (
    groupIndex: number,
    itemIndex: number,
    patch: Partial<ResumeLeadershipItem>,
  ) => {
    updateResumeContent((content) => ({
      ...content,
      leadership: content.leadership.map((group, currentGroupIndex) => {
        if (currentGroupIndex !== groupIndex) return group
        return {
          ...group,
          items: group.items.map((item, currentItemIndex) =>
            currentItemIndex === itemIndex ? { ...item, ...patch } : item,
          ),
        }
      }),
    }))
  }

  const addLeadershipGroupItem = (groupIndex: number) => {
    updateResumeContent((content) => ({
      ...content,
      leadership: content.leadership.map((group, currentGroupIndex) => {
        if (currentGroupIndex !== groupIndex) return group
        return {
          ...group,
          items: [
            ...group.items,
            {
              id: makeId('leadership'),
              role: 'New Role',
              organization: 'Organization',
              location: 'Location',
              date: 'Year',
              logoSrc: logoOptions[0].value,
              logoAlt: logoOptions[0].label,
            },
          ],
        }
      }),
    }))
  }

  const removeLeadershipGroupItem = (groupIndex: number, itemIndex: number) => {
    updateResumeContent((content) => ({
      ...content,
      leadership: content.leadership.map((group, currentGroupIndex) => {
        if (currentGroupIndex !== groupIndex) return group
        return {
          ...group,
          items: group.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex),
        }
      }),
    }))
  }

  const movePrimaryExperienceItem = (index: number, direction: -1 | 1) => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        primary: moveArrayItem(content.experience.primary, index, direction),
      },
    }))
  }

  const moveExperienceGroupItem = (groupIndex: number, itemIndex: number, direction: -1 | 1) => {
    updateResumeContent((content) => ({
      ...content,
      experience: {
        ...content.experience,
        groups: content.experience.groups.map((group, currentGroupIndex) => {
          if (currentGroupIndex !== groupIndex) return group
          return {
            ...group,
            items: moveArrayItem(group.items, itemIndex, direction),
          }
        }),
      },
    }))
  }

  const moveLeadershipItem = (groupIndex: number, itemIndex: number, direction: -1 | 1) => {
    updateResumeContent((content) => ({
      ...content,
      leadership: content.leadership.map((group, currentGroupIndex) => {
        if (currentGroupIndex !== groupIndex) return group
        return {
          ...group,
          items: moveArrayItem(group.items, itemIndex, direction),
        }
      }),
    }))
  }

  const moveSignatureLogo = (index: number, direction: -1 | 1) => {
    updateSignatureContent({
      logos: moveArrayItem(selectedSignatureDocument.content.logos, index, direction),
    })
  }

  const buildPortableSignatureHtml = async () => {
    const embeddedProfileSrc = await toDataUrl(resolvedSignature.data.profileSrc)
    const embeddedLogos = await Promise.all(
      resolvedSignature.data.logos.map(async (logo) => ({
        ...logo,
        src: await toDataUrl(logo.src),
      })),
    )

    return buildSignatureMarkup(
      {
        ...resolvedSignature,
        data: {
          ...resolvedSignature.data,
          profileSrc: embeddedProfileSrc,
          logos: embeddedLogos,
        },
      },
      activePresentation,
      activeSignatureExportVariant,
    )
  }

  const handleExportPdf = () => {
    const exportUrl = buildExportUrl({
      type: documentType === 'resume' ? 'resume' : 'cover-letter',
      id: documentType === 'resume' ? selectedResumeDocument.id : selectedCoverLetterDocument.id,
      presentation: activePresentation,
      render: 'review',
      balance: 'auto',
    })
    const exportWindow = window.open(exportUrl, '_blank', 'noopener')

    if (!exportWindow) {
      pushStatus('Unable to open the export review window. Please allow pop-ups and try again.', 3600)
    }
  }

  const handleCopySignatureHtml = async () => {
    try {
      const portableSignatureHtml = await buildPortableSignatureHtml()
      await navigator.clipboard.writeText(portableSignatureHtml)
      pushStatus(`${SIGNATURE_EXPORT_VARIANT_LABELS[activeSignatureExportVariant]} copied to clipboard.`)
    } catch {
      pushStatus('Unable to copy signature HTML. Please copy manually.', 3200)
    }
  }

  const handleDownloadSignatureHtml = async () => {
    try {
      const portableSignatureHtml = await buildPortableSignatureHtml()
      const blob = new Blob([portableSignatureHtml], { type: 'text/html;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${buildFileStem(resolvedSignature.documentLabel)}-${activeSignatureExportVariant}.html`
      anchor.click()
      window.URL.revokeObjectURL(url)
      pushStatus(`${SIGNATURE_EXPORT_VARIANT_LABELS[activeSignatureExportVariant]} downloaded.`)
    } catch {
      pushStatus('Unable to generate the signature HTML download.', 3200)
    }
  }

  const handleExportStudioJson = () => {
    const payload = JSON.stringify(createPersistenceEnvelope(studio), null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `career-document-studio-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    window.URL.revokeObjectURL(url)
    pushStatus('Studio state exported.')
  }

  const handleImportStudioJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown

      if (!isPersistenceEnvelope(parsed)) {
        throw new Error('Invalid studio payload')
      }

      setStudio(normalizeStudioState(parsed.state))
      pushStatus('Studio state imported.')
    } catch {
      pushStatus('Import failed. Use a previously exported studio JSON file.', 3600)
    } finally {
      event.target.value = ''
    }
  }

  const handleResetStudio = () => {
    if (!window.confirm('Reset the studio to the original seeded documents?')) {
      return
    }

    setStudio(createSeedStudioState())
    pushStatus('Studio reset to seeded defaults.')
  }

  const renderDocumentLibrary = () => {
    const activeDocumentId =
      documentType === 'resume'
        ? selectedResumeDocument.id
        : documentType === 'cover-letter'
          ? selectedCoverLetterDocument.id
          : selectedSignatureDocument.id
    const variantDocuments =
      documentType === 'resume'
        ? studio.resumeDocuments
        : documentType === 'cover-letter'
          ? studio.coverLetterDocuments
          : studio.signatureDocuments
    const visibleDocuments = studio.ui.showArchivedVariants
      ? variantDocuments
      : variantDocuments.filter((document) => !document.meta.archived)
    const archiveCount = variantDocuments.filter((document) => document.meta.archived).length

    return (
      <EditorSection
        sectionKey="document-library"
        isOpen={isSectionOpen('document-library')}
        onToggle={toggleSection}
        title="Document Library"
        description="Branch safe variants, switch the active record, and keep archived drafts out of the way until you need them."
        meta={`${activeDocumentCount} active${archiveCount ? ` · ${archiveCount} archived` : ''}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={createVariantFromCurrent}>
            <Plus className="h-4 w-4" /> New From Current
          </Button>
          <Button variant="outline" onClick={duplicateActiveVariant}>
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={studio.ui.showArchivedVariants}
            onChange={(event) =>
              updateUi((ui) => ({
                ...ui,
                showArchivedVariants: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />
          <span>Show archived variants</span>
        </label>

        <div className="space-y-2">
          {visibleDocuments.map((document) => {
            const themePack = getThemePackForDocument(studio.themePacks, document.themePackId)
            const isActive = document.id === activeDocumentId

            return (
              <div
                key={document.id}
                className={cn(
                  'rounded-2xl border px-3 py-3 transition',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-[0_18px_38px_rgba(15,23,42,0.2)]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  document.meta.archived && 'opacity-80',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => setActiveVariant(document.id)}>
                    <p className="truncate text-sm font-semibold">{document.label}</p>
                    <p className={cn('mt-1 text-xs', isActive ? 'text-slate-200' : 'text-slate-500')}>
                      {themePack.label} · {formatEditedAt(document.meta.updatedAt)}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    {document.meta.archived && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                          isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        Archived
                      </span>
                    )}
                    {!isActive && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveVariant(document.id)}>
                        Set Active
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => toggleArchiveVariant(document.id)}>
                      {document.meta.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      {document.meta.archived ? 'Restore' : 'Archive'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Field label="Theme Pack" scope={FIELD_SCOPE_REGISTRY.themePack.label} source="Theme Pack">
          <select
            value={activeThemePack.id}
            onChange={(event) => updateActiveDocumentThemePack(event.target.value as ThemePackId)}
            className={selectClassName}
          >
            {studio.themePacks.map((themePack) => (
              <option key={themePack.id} value={themePack.id}>
                {themePack.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Document Label" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
          <Input value={activeDocumentLabel} onChange={(event) => updateActiveDocumentLabel(event.target.value)} />
        </Field>
      </EditorSection>
    )
  }

  const renderSharedProfile = () => (
    <EditorSection
      sectionKey="shared-profile"
      isOpen={isSectionOpen('shared-profile')}
      onToggle={toggleSection}
      title="Shared Profile"
      description="These fields sync across every resume, cover letter, and email signature immediately."
      meta="Global"
    >
      <Field
        label="Full Name"
        scope={FIELD_SCOPE_REGISTRY.sharedProfile.fullName}
        source="Shared"
      >
        <Input
          value={studio.sharedProfile.fullName}
          onChange={(event) => updateSharedProfile({ fullName: event.target.value })}
        />
      </Field>

      <Field
        label="Phone"
        scope={FIELD_SCOPE_REGISTRY.sharedProfile.phone}
        source="Shared"
      >
        <Input value={studio.sharedProfile.phone} onChange={(event) => updateSharedProfile({ phone: event.target.value })} />
      </Field>

      <Field
        label="Location"
        scope={FIELD_SCOPE_REGISTRY.sharedProfile.location}
        source="Shared"
      >
        <Input
          value={studio.sharedProfile.location}
          onChange={(event) => updateSharedProfile({ location: event.target.value })}
        />
      </Field>

      <Field
        label="Base Professional Headline"
        scope={FIELD_SCOPE_REGISTRY.sharedProfile.professionalHeadline}
        source="Shared"
        description="Theme packs inherit this until you give them a pack-specific title."
      >
        <Input
          value={studio.sharedProfile.professionalHeadline}
          onChange={(event) => updateSharedProfile({ professionalHeadline: event.target.value })}
        />
      </Field>

      <Field
        label="Base Summary"
        scope={FIELD_SCOPE_REGISTRY.sharedProfile.summary}
        source="Shared"
      >
        <Textarea value={studio.sharedProfile.summary} onChange={(event) => updateSharedProfile({ summary: event.target.value })} />
      </Field>

      <Field
        label="Profile Image"
        scope={FIELD_SCOPE_REGISTRY.sharedProfile.profileImage}
        source="Shared"
      >
        <select
          value={studio.sharedProfile.profileSrc}
          onChange={(event) =>
            updateSharedProfile({
              profileSrc: event.target.value,
              profileAlt:
                profileOptions.find((option) => option.value === event.target.value)?.label ??
                studio.sharedProfile.profileAlt,
            })
          }
          className={selectClassName}
        >
          {profileOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Signature Image"
        scope={FIELD_SCOPE_REGISTRY.sharedProfile.signatureImage}
        source="Shared"
      >
        <select
          value={studio.sharedProfile.signatureSrc}
          onChange={(event) =>
            updateSharedProfile({
              signatureSrc: event.target.value,
              signatureAlt:
                signatureOptions.find((option) => option.value === event.target.value)?.label ??
                studio.sharedProfile.signatureAlt,
            })
          }
          className={selectClassName}
        >
          {signatureOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    </EditorSection>
  )

  const renderPresentation = () => {
    return (
      <EditorSection
        sectionKey="presentation"
        isOpen={isSectionOpen('presentation')}
        onToggle={toggleSection}
        title="Presentation"
        description="Shared layout controls that keep resume, cover letter, signature, and exports visually aligned."
        meta={`${densityLabels[studio.presentation.density]} layout`}
      >
        <Field
          label="Density"
          scope={FIELD_SCOPE_REGISTRY.presentation.density}
          source="Shared"
          description="Compact reduces spacing and type slightly across all outputs."
        >
          <select
            value={studio.presentation.density}
            onChange={(event) => updatePresentation({ density: event.target.value as PresentationDensity })}
            className={selectClassName}
          >
            {Object.entries(densityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Profile Avatar"
          scope={FIELD_SCOPE_REGISTRY.presentation.showAvatar}
          source="Shared"
          description="Hide or show the avatar consistently in resume, cover letter, signature, and copied signature HTML."
        >
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={studio.presentation.showAvatar}
              onChange={(event) => updatePresentation({ showAvatar: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            <span>Show avatar in all document headers</span>
          </label>
        </Field>

        <Field
          label="Contact Row"
          scope={FIELD_SCOPE_REGISTRY.presentation.contactLayout}
          source="Shared"
          description="Single line keeps the contact strip tight. Balanced wrap gives long values more room."
        >
          <select
            value={studio.presentation.contactLayout}
            onChange={(event) =>
              updatePresentation({ contactLayout: event.target.value as PresentationContactLayout })
            }
            className={selectClassName}
          >
            {Object.entries(contactLayoutLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </EditorSection>
    )
  }

  const renderThemePack = () => (
    <EditorSection
      sectionKey="theme-pack"
      isOpen={isSectionOpen('theme-pack')}
      onToggle={toggleSection}
      title="Theme Pack"
      description="Reusable organization branding. Changes here update every document using this pack."
      meta={activeThemePack.label}
    >
      <Field label="Theme Pack Name" scope={FIELD_SCOPE_REGISTRY.themePack.label} source="Theme Pack">
        <Input
          value={activeThemePack.label}
          onChange={(event) => updateThemePack(activeThemePack.id, (themePack) => ({ ...themePack, label: event.target.value }))}
        />
      </Field>

      <Field label="Organization" scope={FIELD_SCOPE_REGISTRY.themePack.organization} source="Theme Pack">
        <Input
          value={activeThemePack.organization}
          onChange={(event) =>
            updateThemePack(activeThemePack.id, (themePack) => ({ ...themePack, organization: event.target.value }))
          }
        />
      </Field>

      <Field
        label="Pack Role / Title"
        scope={FIELD_SCOPE_REGISTRY.themePack.defaultRoleTitle}
        source={activeThemePack.defaultRoleTitle !== undefined ? 'Theme Pack' : 'Shared'}
        description="Leave blank to inherit the shared professional headline."
      >
        <Input
          value={activeThemePack.defaultRoleTitle ?? ''}
          placeholder={studio.sharedProfile.professionalHeadline}
          onChange={(event) =>
            updateThemePack(activeThemePack.id, (themePack) => ({
              ...themePack,
              defaultRoleTitle: normalizeOptionalString(event.target.value),
            }))
          }
        />
      </Field>

      <Field
        label="Pack Subtitle / Tagline"
        scope={FIELD_SCOPE_REGISTRY.themePack.defaultSubtitle}
        source={activeThemePack.defaultSubtitle !== undefined ? 'Theme Pack' : 'Shared'}
        description="Used by cover letters. Leave blank to inherit the shared or pack role title."
      >
        <Input
          value={activeThemePack.defaultSubtitle ?? ''}
          placeholder={studio.sharedProfile.professionalHeadline}
          onChange={(event) =>
            updateThemePack(activeThemePack.id, (themePack) => ({
              ...themePack,
              defaultSubtitle: normalizeOptionalString(event.target.value),
            }))
          }
        />
      </Field>

      <Field label="Default Email" scope={FIELD_SCOPE_REGISTRY.themePack.email} source="Theme Pack">
        <Input
          value={activeThemePack.defaultEmail}
          onChange={(event) =>
            updateThemePack(activeThemePack.id, (themePack) => ({ ...themePack, defaultEmail: event.target.value }))
          }
        />
      </Field>

      <Field label="Default Website" scope={FIELD_SCOPE_REGISTRY.themePack.website} source="Theme Pack">
        <Input
          value={activeThemePack.defaultWebsite}
          onChange={(event) =>
            updateThemePack(activeThemePack.id, (themePack) => ({ ...themePack, defaultWebsite: event.target.value }))
          }
        />
      </Field>

      <Field label="Primary Logo" scope={FIELD_SCOPE_REGISTRY.themePack.primaryLogo} source="Theme Pack">
        <select
          value={activeThemePack.primaryLogoSrc}
          onChange={(event) =>
            updateThemePack(activeThemePack.id, (themePack) => ({
              ...themePack,
              primaryLogoSrc: event.target.value,
              primaryLogoAlt: findLogoLabel(event.target.value),
            }))
          }
          className={selectClassName}
        >
          {logoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <ColorField
        label="Accent Color"
        value={activeThemePack.palette.accent}
        onChange={(value) => updateActiveThemePalette({ accent: value })}
        scope={FIELD_SCOPE_REGISTRY.themePack.accent}
      />
      <ColorField
        label="Accent Soft"
        value={activeThemePack.palette.accentSoft}
        onChange={(value) => updateActiveThemePalette({ accentSoft: value })}
        scope={FIELD_SCOPE_REGISTRY.themePack.accentSoft}
      />
      <ColorField
        label="Accent Dark"
        value={activeThemePack.palette.accentDark}
        onChange={(value) => updateActiveThemePalette({ accentDark: value })}
        scope={FIELD_SCOPE_REGISTRY.themePack.accentDark}
      />
    </EditorSection>
  )

  const renderResumeContent = () => {
    const roleValue =
      selectedResumeDocument.overrides.roleTitle ??
      activeThemePack.defaultRoleTitle ??
      studio.sharedProfile.professionalHeadline
    const roleSource = getInheritedSource(
      selectedResumeDocument.overrides.roleTitle,
      activeThemePack.defaultRoleTitle,
    )
    const emailValue = selectedResumeDocument.overrides.email ?? activeThemePack.defaultEmail
    const emailSource = getInheritedSource(selectedResumeDocument.overrides.email, activeThemePack.defaultEmail)
    const websiteValue = selectedResumeDocument.overrides.website ?? activeThemePack.defaultWebsite
    const websiteSource = getInheritedSource(
      selectedResumeDocument.overrides.website,
      activeThemePack.defaultWebsite,
    )
    const roleTarget = getInheritedTarget(
      selectedResumeDocument.overrides.roleTitle,
      activeThemePack.defaultRoleTitle,
    )
    const emailTarget = getInheritedTarget(
      selectedResumeDocument.overrides.email,
      activeThemePack.defaultEmail,
    )
    const websiteTarget = getInheritedTarget(
      selectedResumeDocument.overrides.website,
      activeThemePack.defaultWebsite,
    )

    const handleRoleChange = (value: string) => {
      if (roleTarget === 'document') {
        updateResumeOverrides({ roleTitle: value })
        return
      }

      if (roleTarget === 'theme-pack') {
        updateThemePack(activeThemePack.id, (themePack) => ({
          ...themePack,
          defaultRoleTitle: normalizeOptionalString(value),
        }))
        return
      }

      updateSharedProfile({ professionalHeadline: value })
    }

    const handleEmailChange = (value: string) => {
      if (emailTarget === 'document') {
        updateResumeOverrides({ email: value })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultEmail: value,
      }))
    }

    const handleWebsiteChange = (value: string) => {
      if (websiteTarget === 'document') {
        updateResumeOverrides({ website: value })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultWebsite: value,
      }))
    }

    const handleRoleScopeChange = (target: ScopeTarget) => {
      if (target === 'document') {
        updateResumeOverrides({ roleTitle: roleValue })
        return
      }

      clearResumeOverride('roleTitle')

      if (target === 'theme-pack') {
        updateThemePack(activeThemePack.id, (themePack) => ({
          ...themePack,
          defaultRoleTitle: normalizeOptionalString(roleValue),
        }))
        return
      }

      updateSharedProfile({ professionalHeadline: roleValue })
      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultRoleTitle: undefined,
      }))
    }

    const handleEmailScopeChange = (target: ScopeTarget) => {
      clearResumeOverride('email')

      if (target === 'document') {
        updateResumeOverrides({ email: emailValue })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultEmail: emailValue,
      }))
    }

    const handleWebsiteScopeChange = (target: ScopeTarget) => {
      clearResumeOverride('website')

      if (target === 'document') {
        updateResumeOverrides({ website: websiteValue })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultWebsite: websiteValue,
      }))
    }

    return (
      <>
        <EditorSection
          sectionKey="resume-content"
          isOpen={isSectionOpen('resume-content')}
          onToggle={toggleSection}
          title="Resume Content"
          description="Titles, emails, and websites can inherit from the theme pack or become document-specific."
          meta="Inheritance aware"
        >
          <Field
            label="Resume Title"
            scope={FIELD_SCOPE_REGISTRY.resume.roleTitle}
            source={roleSource}
            actions={
              <>
                <ScopeSelector
                  value={roleTarget}
                  options={['shared', 'theme-pack', 'document']}
                  onChange={handleRoleScopeChange}
                />
                {selectedResumeDocument.overrides.roleTitle !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearResumeOverride('roleTitle')} />
                ) : null}
              </>
            }
          >
            <Input value={roleValue} onChange={(event) => handleRoleChange(event.target.value)} />
          </Field>

          <Field
            label="Resume Email"
            scope={FIELD_SCOPE_REGISTRY.resume.email}
            source={emailSource}
            actions={
              <>
                <ScopeSelector
                  value={emailTarget}
                  options={['theme-pack', 'document']}
                  onChange={handleEmailScopeChange}
                />
                {selectedResumeDocument.overrides.email !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearResumeOverride('email')} />
                ) : null}
              </>
            }
          >
            <Input value={emailValue} onChange={(event) => handleEmailChange(event.target.value)} />
          </Field>

          <Field
            label="Resume Website"
            scope={FIELD_SCOPE_REGISTRY.resume.website}
            source={websiteSource}
            actions={
              <>
                <ScopeSelector
                  value={websiteTarget}
                  options={['theme-pack', 'document']}
                  onChange={handleWebsiteScopeChange}
                />
                {selectedResumeDocument.overrides.website !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearResumeOverride('website')} />
                ) : null}
              </>
            }
          >
            <Input value={websiteValue} onChange={(event) => handleWebsiteChange(event.target.value)} />
          </Field>
        </EditorSection>

        <EditorSection
          sectionKey="resume-education"
          isOpen={isSectionOpen('resume-education')}
          onToggle={toggleSection}
          title="Education"
          description="Manage degrees, schools, and supporting highlights."
          meta={`${selectedResumeDocument.content.education.length} entries`}
        >
          {selectedResumeDocument.content.education.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No education items yet. Add a degree to populate the resume education section.
            </div>
          )}
          {selectedResumeDocument.content.education.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{item.degree}</p>
                <Button variant="ghost" size="sm" onClick={() => removeEducationItem(index)}>
                  Remove
                </Button>
              </div>

              <Field label="Degree" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.degree} onChange={(event) => updateEducationItem(index, { degree: event.target.value })} />
              </Field>
              <Field label="Program" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.program} onChange={(event) => updateEducationItem(index, { program: event.target.value })} />
              </Field>
              <Field label="School" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.school} onChange={(event) => updateEducationItem(index, { school: event.target.value })} />
              </Field>
              <Field label="Dates" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.date} onChange={(event) => updateEducationItem(index, { date: event.target.value })} />
              </Field>
              <Field label="Logo" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <select
                  value={item.logoSrc}
                  onChange={(event) =>
                    updateEducationItem(index, { logoSrc: event.target.value, logoAlt: findLogoLabel(event.target.value) })
                  }
                  className={selectClassName}
                >
                  {logoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Highlights" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Textarea
                  value={joinLines(item.bullets)}
                  onChange={(event) => updateEducationItem(index, { bullets: splitLines(event.target.value) })}
                />
              </Field>
            </div>
          ))}

          <Button variant="outline" onClick={addEducationItem}>
            Add Education
          </Button>
        </EditorSection>

        <EditorSection
          sectionKey="resume-primary-experience"
          isOpen={isSectionOpen('resume-primary-experience')}
          onToggle={toggleSection}
          title="Primary Experience"
          description="Edit the core professional timeline for this resume."
          meta={`${selectedResumeDocument.content.experience.primary.length} roles`}
        >
          {selectedResumeDocument.content.experience.primary.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No primary roles yet. Add a role to define the main experience block.
            </div>
          )}
          {selectedResumeDocument.content.experience.primary.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{item.role}</p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => movePrimaryExperienceItem(index, -1)} disabled={index === 0}>
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => movePrimaryExperienceItem(index, 1)}
                    disabled={index === selectedResumeDocument.content.experience.primary.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeExperiencePrimaryItem(index)}>
                    Remove
                  </Button>
                </div>
              </div>

              <Field label="Role" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.role} onChange={(event) => updateExperiencePrimaryItem(index, { role: event.target.value })} />
              </Field>
              <Field label="Company" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.company} onChange={(event) => updateExperiencePrimaryItem(index, { company: event.target.value })} />
              </Field>
              <Field label="Location" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.location} onChange={(event) => updateExperiencePrimaryItem(index, { location: event.target.value })} />
              </Field>
              <Field label="Dates" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.date} onChange={(event) => updateExperiencePrimaryItem(index, { date: event.target.value })} />
              </Field>
              <Field label="Logo" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <select
                  value={item.logoSrc}
                  onChange={(event) =>
                    updateExperiencePrimaryItem(index, { logoSrc: event.target.value, logoAlt: findLogoLabel(event.target.value) })
                  }
                  className={selectClassName}
                >
                  {logoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bullets" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Textarea
                  value={joinLines(item.bullets)}
                  onChange={(event) => updateExperiencePrimaryItem(index, { bullets: splitLines(event.target.value) })}
                />
              </Field>
              <Field label="Skills" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input
                  value={joinComma(item.skills)}
                  onChange={(event) => updateExperiencePrimaryItem(index, { skills: splitComma(event.target.value) })}
                />
              </Field>
            </div>
          ))}

          <Button variant="outline" onClick={addExperiencePrimaryItem}>
            Add Primary Role
          </Button>
        </EditorSection>

        <EditorSection
          sectionKey="resume-experience-groups"
          isOpen={isSectionOpen('resume-experience-groups')}
          onToggle={toggleSection}
          title="Experience Groups"
          description="Manage grouped early-career and co-op sections."
          meta={`${selectedResumeDocument.content.experience.groups.length} groups`}
        >
          {selectedResumeDocument.content.experience.groups.map((group, groupIndex) => (
            <div key={group.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Field label="Group Title" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={group.title ?? ''} onChange={(event) => updateExperienceGroup(groupIndex, { title: event.target.value })} />
              </Field>
              <Field label="Layout" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <select
                  value={group.layout}
                  onChange={(event) =>
                    updateExperienceGroup(groupIndex, { layout: event.target.value as ResumeExperienceGroup['layout'] })
                  }
                  className={selectClassName}
                >
                  <option value="stack">Stack</option>
                  <option value="grid">Grid</option>
                </select>
              </Field>
              {group.layout === 'grid' && (
                <Field label="Columns" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                  <Input
                    type="number"
                    min={1}
                    max={3}
                    value={group.columns ?? 2}
                    onChange={(event) => updateExperienceGroup(groupIndex, { columns: Number(event.target.value) })}
                  />
                </Field>
              )}

              {group.items.map((item, itemIndex) => (
                <div key={item.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{item.role}</p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => moveExperienceGroupItem(groupIndex, itemIndex, -1)} disabled={itemIndex === 0}>
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveExperienceGroupItem(groupIndex, itemIndex, 1)}
                        disabled={itemIndex === group.items.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeExperienceGroupItem(groupIndex, itemIndex)}>
                        Remove
                      </Button>
                    </div>
                  </div>

                  <Field label="Role" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={item.role}
                      onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { role: event.target.value })}
                    />
                  </Field>
                  <Field label="Company" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={item.company}
                      onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { company: event.target.value })}
                    />
                  </Field>
                  <Field label="Location" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={item.location}
                      onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { location: event.target.value })}
                    />
                  </Field>
                  <Field label="Dates" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={item.date}
                      onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { date: event.target.value })}
                    />
                  </Field>
                  <Field label="Logo" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <select
                      value={item.logoSrc}
                      onChange={(event) =>
                        updateExperienceGroupItem(groupIndex, itemIndex, {
                          logoSrc: event.target.value,
                          logoAlt: findLogoLabel(event.target.value),
                        })
                      }
                      className={selectClassName}
                    >
                      {logoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Bullets" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Textarea
                      value={joinLines(item.bullets)}
                      onChange={(event) =>
                        updateExperienceGroupItem(groupIndex, itemIndex, { bullets: splitLines(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Skills" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={joinComma(item.skills)}
                      onChange={(event) =>
                        updateExperienceGroupItem(groupIndex, itemIndex, { skills: splitComma(event.target.value) })
                      }
                    />
                  </Field>
                </div>
              ))}

              <Button variant="outline" onClick={() => addExperienceGroupItem(groupIndex)}>
                Add Item
              </Button>
            </div>
          ))}
        </EditorSection>

        <EditorSection
          sectionKey="resume-certifications"
          isOpen={isSectionOpen('resume-certifications')}
          onToggle={toggleSection}
          title="Certifications"
          description="Control featured credentials and summary counts."
          meta={`${selectedResumeDocument.content.certifications.featured.length + selectedResumeDocument.content.certifications.stats.length} blocks`}
        >
          {selectedResumeDocument.content.certifications.featured.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                <Button variant="ghost" size="sm" onClick={() => removeCertificationItem(index)}>
                  Remove
                </Button>
              </div>

              <Field label="Title" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.title} onChange={(event) => updateCertificationItem(index, { title: event.target.value })} />
              </Field>
              <Field label="Organization" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input
                  value={item.organization}
                  onChange={(event) => updateCertificationItem(index, { organization: event.target.value })}
                />
              </Field>
              <Field label="Detail" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.detail} onChange={(event) => updateCertificationItem(index, { detail: event.target.value })} />
              </Field>
              <Field label="Year" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.date} onChange={(event) => updateCertificationItem(index, { date: event.target.value })} />
              </Field>
              <Field label="Logo" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <select
                  value={item.logoSrc}
                  onChange={(event) =>
                    updateCertificationItem(index, { logoSrc: event.target.value, logoAlt: findLogoLabel(event.target.value) })
                  }
                  className={selectClassName}
                >
                  {logoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ))}

          <Button variant="outline" onClick={addCertificationItem}>
            Add Certification
          </Button>

          <div className="h-px bg-slate-200" />

          {selectedResumeDocument.content.certifications.stats.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                <Button variant="ghost" size="sm" onClick={() => removeCertificationStat(index)}>
                  Remove
                </Button>
              </div>

              <Field label="Label" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.label} onChange={(event) => updateCertificationStat(index, { label: event.target.value })} />
              </Field>
              <Field label="Count" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={item.count} onChange={(event) => updateCertificationStat(index, { count: event.target.value })} />
              </Field>
              <Field label="Logos" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <LogoMultiSelect
                  selected={item.logos}
                  onChange={(logos) => updateCertificationStat(index, { logos })}
                />
              </Field>
            </div>
          ))}

          <Button variant="outline" onClick={addCertificationStat}>
            Add Certification Group
          </Button>
        </EditorSection>

        <EditorSection
          sectionKey="resume-community-leadership"
          isOpen={isSectionOpen('resume-community-leadership')}
          onToggle={toggleSection}
          title="Community Leadership"
          description="Edit grouped leadership entries and associated logos."
          meta={`${selectedResumeDocument.content.leadership.length} groups`}
        >
          {selectedResumeDocument.content.leadership.map((group, groupIndex) => (
            <div key={group.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Field label="Group Title" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <Input value={group.title ?? ''} onChange={(event) => updateLeadershipGroup(groupIndex, { title: event.target.value })} />
              </Field>
              <Field label="Layout" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                <select
                  value={group.layout}
                  onChange={(event) =>
                    updateLeadershipGroup(groupIndex, { layout: event.target.value as ResumeLeadershipGroup['layout'] })
                  }
                  className={selectClassName}
                >
                  <option value="stack">Stack</option>
                  <option value="grid">Grid</option>
                </select>
              </Field>
              {group.layout === 'grid' && (
                <Field label="Columns" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                  <Input
                    type="number"
                    min={1}
                    max={3}
                    value={group.columns ?? 2}
                    onChange={(event) => updateLeadershipGroup(groupIndex, { columns: Number(event.target.value) })}
                  />
                </Field>
              )}

              {group.items.map((item, itemIndex) => (
                <div key={item.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{item.role}</p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => moveLeadershipItem(groupIndex, itemIndex, -1)} disabled={itemIndex === 0}>
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveLeadershipItem(groupIndex, itemIndex, 1)}
                        disabled={itemIndex === group.items.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeLeadershipGroupItem(groupIndex, itemIndex)}>
                        Remove
                      </Button>
                    </div>
                  </div>

                  <Field label="Role" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={item.role}
                      onChange={(event) => updateLeadershipGroupItem(groupIndex, itemIndex, { role: event.target.value })}
                    />
                  </Field>
                  <Field label="Organization" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={item.organization}
                      onChange={(event) => updateLeadershipGroupItem(groupIndex, itemIndex, { organization: event.target.value })}
                    />
                  </Field>
                  <Field label="Location" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={item.location}
                      onChange={(event) => updateLeadershipGroupItem(groupIndex, itemIndex, { location: event.target.value })}
                    />
                  </Field>
                  <Field label="Dates" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <Input
                      value={item.date}
                      onChange={(event) => updateLeadershipGroupItem(groupIndex, itemIndex, { date: event.target.value })}
                    />
                  </Field>
                  <Field label="Logo" scope={FIELD_SCOPE_REGISTRY.resume.sections}>
                    <select
                      value={item.logoSrc}
                      onChange={(event) =>
                        updateLeadershipGroupItem(groupIndex, itemIndex, {
                          logoSrc: event.target.value,
                          logoAlt: findLogoLabel(event.target.value),
                        })
                      }
                      className={selectClassName}
                    >
                      {logoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              ))}

              <Button variant="outline" onClick={() => addLeadershipGroupItem(groupIndex)}>
                Add Leadership Item
              </Button>
            </div>
          ))}
        </EditorSection>
      </>
    )
  }

  const renderCoverLetterContent = () => {
    const taglineValue =
      selectedCoverLetterDocument.overrides.tagline ??
      activeThemePack.defaultSubtitle ??
      activeThemePack.defaultRoleTitle ??
      studio.sharedProfile.professionalHeadline
    const taglineSource = getInheritedSource(
      selectedCoverLetterDocument.overrides.tagline,
      activeThemePack.defaultSubtitle ?? activeThemePack.defaultRoleTitle,
    )
    const organizationValue = selectedCoverLetterDocument.overrides.organization ?? activeThemePack.organization
    const organizationSource = getInheritedSource(
      selectedCoverLetterDocument.overrides.organization,
      activeThemePack.organization,
    )
    const emailValue = selectedCoverLetterDocument.overrides.email ?? activeThemePack.defaultEmail
    const emailSource = getInheritedSource(
      selectedCoverLetterDocument.overrides.email,
      activeThemePack.defaultEmail,
    )
    const websiteValue = selectedCoverLetterDocument.overrides.website ?? activeThemePack.defaultWebsite
    const websiteSource = getInheritedSource(
      selectedCoverLetterDocument.overrides.website,
      activeThemePack.defaultWebsite,
    )
    const taglineThemeValue = activeThemePack.defaultSubtitle ?? activeThemePack.defaultRoleTitle
    const taglineTarget = getInheritedTarget(
      selectedCoverLetterDocument.overrides.tagline,
      taglineThemeValue,
    )
    const organizationTarget = getInheritedTarget(
      selectedCoverLetterDocument.overrides.organization,
      activeThemePack.organization,
    )
    const emailTarget = getInheritedTarget(
      selectedCoverLetterDocument.overrides.email,
      activeThemePack.defaultEmail,
    )
    const websiteTarget = getInheritedTarget(
      selectedCoverLetterDocument.overrides.website,
      activeThemePack.defaultWebsite,
    )

    const handleTaglineChange = (value: string) => {
      if (taglineTarget === 'document') {
        updateCoverLetterOverrides({ tagline: value })
        return
      }

      if (activeThemePack.defaultSubtitle !== undefined) {
        updateThemePack(activeThemePack.id, (themePack) => ({
          ...themePack,
          defaultSubtitle: normalizeOptionalString(value),
        }))
        return
      }

      if (activeThemePack.defaultRoleTitle !== undefined) {
        updateThemePack(activeThemePack.id, (themePack) => ({
          ...themePack,
          defaultRoleTitle: normalizeOptionalString(value),
        }))
        return
      }

      updateSharedProfile({ professionalHeadline: value })
    }

    const handleOrganizationChange = (value: string) => {
      if (organizationTarget === 'document') {
        updateCoverLetterOverrides({ organization: value })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        organization: value,
      }))
    }

    const handleEmailChange = (value: string) => {
      if (emailTarget === 'document') {
        updateCoverLetterOverrides({ email: value })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultEmail: value,
      }))
    }

    const handleWebsiteChange = (value: string) => {
      if (websiteTarget === 'document') {
        updateCoverLetterOverrides({ website: value })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultWebsite: value,
      }))
    }

    const handleTaglineScopeChange = (target: ScopeTarget) => {
      if (target === 'document') {
        updateCoverLetterOverrides({ tagline: taglineValue })
        return
      }

      clearCoverLetterOverride('tagline')

      if (target === 'theme-pack') {
        updateThemePack(activeThemePack.id, (themePack) => ({
          ...themePack,
          defaultSubtitle: normalizeOptionalString(taglineValue),
        }))
        return
      }

      updateSharedProfile({ professionalHeadline: taglineValue })
      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultSubtitle: undefined,
        ...(themePack.defaultSubtitle === undefined ? { defaultRoleTitle: undefined } : {}),
      }))
    }

    const handleOrganizationScopeChange = (target: ScopeTarget) => {
      clearCoverLetterOverride('organization')

      if (target === 'document') {
        updateCoverLetterOverrides({ organization: organizationValue })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        organization: organizationValue,
      }))
    }

    const handleEmailScopeChange = (target: ScopeTarget) => {
      clearCoverLetterOverride('email')

      if (target === 'document') {
        updateCoverLetterOverrides({ email: emailValue })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultEmail: emailValue,
      }))
    }

    const handleWebsiteScopeChange = (target: ScopeTarget) => {
      clearCoverLetterOverride('website')

      if (target === 'document') {
        updateCoverLetterOverrides({ website: websiteValue })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultWebsite: websiteValue,
      }))
    }

    return (
      <>
        <EditorSection
          sectionKey="cover-letter-branding"
          isOpen={isSectionOpen('cover-letter-branding')}
          onToggle={toggleSection}
          title="Cover Letter Branding"
          description="These fields can inherit from the current theme pack or become letter-specific."
          meta="Inheritance aware"
        >
          <Field
            label="Tagline"
            scope={FIELD_SCOPE_REGISTRY.coverLetter.tagline}
            source={taglineSource}
            actions={
              <>
                <ScopeSelector
                  value={taglineTarget}
                  options={['shared', 'theme-pack', 'document']}
                  onChange={handleTaglineScopeChange}
                />
                {selectedCoverLetterDocument.overrides.tagline !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearCoverLetterOverride('tagline')} />
                ) : null}
              </>
            }
          >
            <Input
              value={taglineValue}
              onChange={(event) => handleTaglineChange(event.target.value)}
            />
          </Field>

          <Field
            label="Organization"
            scope={FIELD_SCOPE_REGISTRY.coverLetter.organization}
            source={organizationSource}
            actions={
              <>
                <ScopeSelector
                  value={organizationTarget}
                  options={['theme-pack', 'document']}
                  onChange={handleOrganizationScopeChange}
                />
                {selectedCoverLetterDocument.overrides.organization !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearCoverLetterOverride('organization')} />
                ) : null}
              </>
            }
          >
            <Input
              value={organizationValue}
              onChange={(event) => handleOrganizationChange(event.target.value)}
            />
          </Field>

          <Field
            label="Email"
            scope={FIELD_SCOPE_REGISTRY.coverLetter.email}
            source={emailSource}
            actions={
              <>
                <ScopeSelector
                  value={emailTarget}
                  options={['theme-pack', 'document']}
                  onChange={handleEmailScopeChange}
                />
                {selectedCoverLetterDocument.overrides.email !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearCoverLetterOverride('email')} />
                ) : null}
              </>
            }
          >
            <Input value={emailValue} onChange={(event) => handleEmailChange(event.target.value)} />
          </Field>

          <Field
            label="Website"
            scope={FIELD_SCOPE_REGISTRY.coverLetter.website}
            source={websiteSource}
            actions={
              <>
                <ScopeSelector
                  value={websiteTarget}
                  options={['theme-pack', 'document']}
                  onChange={handleWebsiteScopeChange}
                />
                {selectedCoverLetterDocument.overrides.website !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearCoverLetterOverride('website')} />
                ) : null}
              </>
            }
          >
            <Input value={websiteValue} onChange={(event) => handleWebsiteChange(event.target.value)} />
          </Field>
        </EditorSection>

        <EditorSection
          sectionKey="cover-letter-body"
          isOpen={isSectionOpen('cover-letter-body')}
          onToggle={toggleSection}
          title="Cover Letter Body"
          description="Company details and paragraph content stay specific to this letter."
          meta="Letter specific"
        >
          <Field label="Company Name" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Input
              value={selectedCoverLetterDocument.content.companyName}
              onChange={(event) => updateCoverLetterContent({ companyName: event.target.value })}
            />
          </Field>
          <Field label="Position" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Input
              value={selectedCoverLetterDocument.content.position}
              onChange={(event) => updateCoverLetterContent({ position: event.target.value })}
            />
          </Field>
          <Field label="Hiring Manager" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Input
              value={selectedCoverLetterDocument.content.hiringManager}
              onChange={(event) => updateCoverLetterContent({ hiringManager: event.target.value })}
            />
          </Field>
          <Field label="Date" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Input value={selectedCoverLetterDocument.content.date} onChange={(event) => updateCoverLetterContent({ date: event.target.value })} />
          </Field>
          <Field label="Company Address" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Textarea
              value={selectedCoverLetterDocument.content.companyAddress}
              onChange={(event) => updateCoverLetterContent({ companyAddress: event.target.value })}
            />
          </Field>
          <Field label="Opening Paragraph" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Textarea
              value={selectedCoverLetterDocument.content.openingParagraph}
              onChange={(event) => updateCoverLetterContent({ openingParagraph: event.target.value })}
            />
          </Field>
          <Field label="Body Paragraph 1" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Textarea
              value={selectedCoverLetterDocument.content.bodyParagraph1}
              onChange={(event) => updateCoverLetterContent({ bodyParagraph1: event.target.value })}
            />
          </Field>
          <Field label="Body Paragraph 2" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Textarea
              value={selectedCoverLetterDocument.content.bodyParagraph2}
              onChange={(event) => updateCoverLetterContent({ bodyParagraph2: event.target.value })}
            />
          </Field>
          <Field label="Body Paragraph 3" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Textarea
              value={selectedCoverLetterDocument.content.bodyParagraph3}
              onChange={(event) => updateCoverLetterContent({ bodyParagraph3: event.target.value })}
            />
          </Field>
          <Field label="Closing Paragraph" scope={FIELD_SCOPE_REGISTRY.coverLetter.content}>
            <Textarea
              value={selectedCoverLetterDocument.content.closingParagraph}
              onChange={(event) => updateCoverLetterContent({ closingParagraph: event.target.value })}
            />
          </Field>
        </EditorSection>
      </>
    )
  }

  const renderSignatureContent = () => {
    const roleValue =
      selectedSignatureDocument.overrides.roleTitle ??
      activeThemePack.defaultRoleTitle ??
      studio.sharedProfile.professionalHeadline
    const roleSource = getInheritedSource(
      selectedSignatureDocument.overrides.roleTitle,
      activeThemePack.defaultRoleTitle,
    )
    const organizationValue = selectedSignatureDocument.overrides.organization ?? activeThemePack.organization
    const organizationSource = getInheritedSource(
      selectedSignatureDocument.overrides.organization,
      activeThemePack.organization,
    )
    const emailValue = selectedSignatureDocument.overrides.email ?? activeThemePack.defaultEmail
    const emailSource = getInheritedSource(selectedSignatureDocument.overrides.email, activeThemePack.defaultEmail)
    const websiteValue = selectedSignatureDocument.overrides.website ?? activeThemePack.defaultWebsite
    const websiteSource = getInheritedSource(
      selectedSignatureDocument.overrides.website,
      activeThemePack.defaultWebsite,
    )
    const roleTarget = getInheritedTarget(
      selectedSignatureDocument.overrides.roleTitle,
      activeThemePack.defaultRoleTitle,
    )
    const organizationTarget = getInheritedTarget(
      selectedSignatureDocument.overrides.organization,
      activeThemePack.organization,
    )
    const emailTarget = getInheritedTarget(
      selectedSignatureDocument.overrides.email,
      activeThemePack.defaultEmail,
    )
    const websiteTarget = getInheritedTarget(
      selectedSignatureDocument.overrides.website,
      activeThemePack.defaultWebsite,
    )

    const handleRoleChange = (value: string) => {
      if (roleTarget === 'document') {
        updateSignatureOverrides({ roleTitle: value })
        return
      }

      if (roleTarget === 'theme-pack') {
        updateThemePack(activeThemePack.id, (themePack) => ({
          ...themePack,
          defaultRoleTitle: normalizeOptionalString(value),
        }))
        return
      }

      updateSharedProfile({ professionalHeadline: value })
    }

    const handleOrganizationChange = (value: string) => {
      if (organizationTarget === 'document') {
        updateSignatureOverrides({ organization: value })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        organization: value,
      }))
    }

    const handleEmailChange = (value: string) => {
      if (emailTarget === 'document') {
        updateSignatureOverrides({ email: value })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultEmail: value,
      }))
    }

    const handleWebsiteChange = (value: string) => {
      if (websiteTarget === 'document') {
        updateSignatureOverrides({ website: value })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultWebsite: value,
      }))
    }

    const handleRoleScopeChange = (target: ScopeTarget) => {
      if (target === 'document') {
        updateSignatureOverrides({ roleTitle: roleValue })
        return
      }

      clearSignatureOverride('roleTitle')

      if (target === 'theme-pack') {
        updateThemePack(activeThemePack.id, (themePack) => ({
          ...themePack,
          defaultRoleTitle: normalizeOptionalString(roleValue),
        }))
        return
      }

      updateSharedProfile({ professionalHeadline: roleValue })
      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultRoleTitle: undefined,
      }))
    }

    const handleOrganizationScopeChange = (target: ScopeTarget) => {
      clearSignatureOverride('organization')

      if (target === 'document') {
        updateSignatureOverrides({ organization: organizationValue })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        organization: organizationValue,
      }))
    }

    const handleEmailScopeChange = (target: ScopeTarget) => {
      clearSignatureOverride('email')

      if (target === 'document') {
        updateSignatureOverrides({ email: emailValue })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultEmail: emailValue,
      }))
    }

    const handleWebsiteScopeChange = (target: ScopeTarget) => {
      clearSignatureOverride('website')

      if (target === 'document') {
        updateSignatureOverrides({ website: websiteValue })
        return
      }

      updateThemePack(activeThemePack.id, (themePack) => ({
        ...themePack,
        defaultWebsite: websiteValue,
      }))
    }

    return (
      <>
        <EditorSection
          sectionKey="signature-content"
          isOpen={isSectionOpen('signature-content')}
          onToggle={toggleSection}
          title="Signature Content"
          description="Role, organization, email, and website can inherit from the theme pack or be unique here."
          meta="Inheritance aware"
        >
          <Field
            label="Role"
            scope={FIELD_SCOPE_REGISTRY.signature.roleTitle}
            source={roleSource}
            actions={
              <>
                <ScopeSelector
                  value={roleTarget}
                  options={['shared', 'theme-pack', 'document']}
                  onChange={handleRoleScopeChange}
                />
                {selectedSignatureDocument.overrides.roleTitle !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearSignatureOverride('roleTitle')} />
                ) : null}
              </>
            }
          >
            <Input value={roleValue} onChange={(event) => handleRoleChange(event.target.value)} />
          </Field>

          <Field
            label="Organization"
            scope={FIELD_SCOPE_REGISTRY.signature.organization}
            source={organizationSource}
            actions={
              <>
                <ScopeSelector
                  value={organizationTarget}
                  options={['theme-pack', 'document']}
                  onChange={handleOrganizationScopeChange}
                />
                {selectedSignatureDocument.overrides.organization !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearSignatureOverride('organization')} />
                ) : null}
              </>
            }
          >
            <Input
              value={organizationValue}
              onChange={(event) => handleOrganizationChange(event.target.value)}
            />
          </Field>

          <Field
            label="Email"
            scope={FIELD_SCOPE_REGISTRY.signature.email}
            source={emailSource}
            actions={
              <>
                <ScopeSelector
                  value={emailTarget}
                  options={['theme-pack', 'document']}
                  onChange={handleEmailScopeChange}
                />
                {selectedSignatureDocument.overrides.email !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearSignatureOverride('email')} />
                ) : null}
              </>
            }
          >
            <Input value={emailValue} onChange={(event) => handleEmailChange(event.target.value)} />
          </Field>

          <Field
            label="Website"
            scope={FIELD_SCOPE_REGISTRY.signature.website}
            source={websiteSource}
            actions={
              <>
                <ScopeSelector
                  value={websiteTarget}
                  options={['theme-pack', 'document']}
                  onChange={handleWebsiteScopeChange}
                />
                {selectedSignatureDocument.overrides.website !== undefined ? (
                  <FieldActionButton label="Reset" onClick={() => clearSignatureOverride('website')} />
                ) : null}
              </>
            }
          >
            <Input value={websiteValue} onChange={(event) => handleWebsiteChange(event.target.value)} />
          </Field>
        </EditorSection>

        <EditorSection
          sectionKey="signature-logos"
          isOpen={isSectionOpen('signature-logos')}
          onToggle={toggleSection}
          title="Signature Logos"
          description="These remain specific to the current signature and control the final logo strip."
          meta={`${selectedSignatureDocument.content.logos.length} logos`}
        >
          <Field label="Logo Set" scope={FIELD_SCOPE_REGISTRY.signature.logos}>
            <div className="space-y-3">
              <LogoMultiSelect
                selected={selectedSignatureDocument.content.logos}
                onChange={(logos) => updateSignatureContent({ logos })}
              />
              {selectedSignatureDocument.content.logos.length > 0 ? (
                <div className="space-y-2">
                  {selectedSignatureDocument.content.logos.map((logo, index) => (
                    <div key={`${logo.src}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-700">{logo.alt}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => moveSignatureLogo(index, -1)} disabled={index === 0}>
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSignatureLogo(index, 1)}
                          disabled={index === selectedSignatureDocument.content.logos.length - 1}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No signature logos selected yet. Choose logos above to build the strip.
                </div>
              )}
            </div>
          </Field>
        </EditorSection>
      </>
    )
  }

  const renderAssetsAndExport = () => (
    <EditorSection
      sectionKey="assets-export"
      isOpen={isSectionOpen('assets-export')}
      onToggle={toggleSection}
      title="Assets & Export"
      description="Export or restore the full studio state, then generate PDFs or signature HTML."
      meta={documentType === 'email-signature' ? 'HTML output' : 'PDF output'}
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Export Readiness</p>
            <p className="mt-1 text-sm text-slate-600">
              {activeHealth.status === 'Ready'
                ? 'This document is ready to export.'
                : activeHealth.status === 'Blocked'
                  ? 'Resolve the blocked issues before exporting.'
                  : 'Export is available, but this document still needs attention.'}
            </p>
          </div>
          <HealthBadge health={activeHealth} />
        </div>
        {activeHealth.issues.length > 0 && (
          <div className="mt-3 space-y-2">
            {activeHealth.issues.map((issue, index) => (
              <ValidationIssueRow
                key={`${issue.label}-${index}`}
                title={issue.label}
                body={issue.detail}
                severity={issue.severity}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Button variant="outline" onClick={handleExportStudioJson}>
          <Download /> Export Studio JSON
        </Button>
        <Button variant="outline" onClick={() => importInputRef.current?.click()}>
          <Upload /> Import Studio JSON
        </Button>
        <Button variant="outline" onClick={handleResetStudio}>
          <RotateCcw /> Reset to Seed Data
        </Button>
        {documentType !== 'email-signature' ? (
          <Button onClick={handleExportPdf}>
            <Download /> Export PDF
          </Button>
        ) : (
          <Button variant="outline" onClick={handleCopySignatureHtml}>
            <Mail /> Copy {SIGNATURE_EXPORT_VARIANT_LABELS[signatureExportVariant]}
          </Button>
        )}
      </div>

      {documentType === 'email-signature' && (
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Signature Variant</p>
            <p className="mt-1 text-sm text-slate-600">
              Export a transparent-canvas signature tuned for your target email client.
            </p>
          </div>
          <select
            className={selectClassName}
            value={signatureExportVariant}
            onChange={(event) => setSignatureExportVariant(event.target.value as SignatureExportVariant)}
          >
            <option value="standard">{SIGNATURE_EXPORT_VARIANT_LABELS.standard}</option>
            <option value="gmail">{SIGNATURE_EXPORT_VARIANT_LABELS.gmail}</option>
            <option value="outlook">{SIGNATURE_EXPORT_VARIANT_LABELS.outlook}</option>
          </select>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={handleCopySignatureHtml}>
              <Mail /> Copy {SIGNATURE_EXPORT_VARIANT_LABELS[signatureExportVariant]}
            </Button>
            <Button variant="outline" onClick={handleDownloadSignatureHtml}>
              <Download /> Download HTML
            </Button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {statusMessage}
        </div>
      )}

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportStudioJson}
      />
    </EditorSection>
  )

  if (exportRequest) {
    return (
      <div
        className="document-export-root"
        data-export-type={exportRequest.type}
        data-render-mode={exportRequest.render ?? 'review'}
      >
        {exportRequest.type === 'resume' && (
          <ResumePreview
            ref={resumePreviewRef}
            template={resolvedResume}
            density={activePresentation.density}
            showAvatar={activePresentation.showAvatar}
            contactLayout={activePresentation.contactLayout}
            layoutMode="print"
            balancePreset={resumeExportTuning.preset}
            breakAnchor={resumeExportTuning.breakAnchor}
            fontScale={resumeExportTuning.fontScale}
            spaceScale={resumeExportTuning.spaceScale}
          />
        )}

        {exportRequest.type === 'cover-letter' && (
          <CoverLetterPreview
            data={resolvedCoverLetter.data}
            config={resolvedCoverLetter.config}
            density={activePresentation.density}
            showAvatar={activePresentation.showAvatar}
            contactLayout={activePresentation.contactLayout}
            layoutMode="print"
          />
        )}

        {exportRequest.type === 'signature' && (
          <div className="signature-export-shell">
            <iframe
              key={activeSignatureExportVariant}
              title={`${resolvedSignature.documentLabel} ${activeSignatureExportVariant} export preview`}
              srcDoc={signatureHtml}
              className="signature-export-iframe"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur no-print">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
              TB
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Career Document Studio</h1>
              <p className="text-xs text-slate-500">
                Shared profile + reusable theme packs + document-level overrides
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'resume', label: 'Resume' },
                { id: 'cover-letter', label: 'Cover Letter' },
                { id: 'email-signature', label: 'Email Signature' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => updateSelection({ documentType: tab.id })}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
                  documentType === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {documentType !== 'email-signature' ? (
              <Button onClick={handleExportPdf}>
                <Download /> Export PDF
              </Button>
            ) : (
              <Button variant="outline" onClick={handleCopySignatureHtml}>
                <Mail /> Copy {SIGNATURE_EXPORT_VARIANT_LABELS[signatureExportVariant]}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="studio-main mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[380px_1fr]">
        <aside className="studio-editor-rail max-h-[calc(100vh-160px)] space-y-4 overflow-y-auto pr-2 no-print">
          {renderDocumentLibrary()}
          {renderSharedProfile()}
          {renderPresentation()}
          {renderThemePack()}
          {documentType === 'resume' && renderResumeContent()}
          {documentType === 'cover-letter' && renderCoverLetterContent()}
          {documentType === 'email-signature' && renderSignatureContent()}
          {renderAssetsAndExport()}
        </aside>

        <section className="studio-preview-pane print-area min-w-0">
          <div className="studio-preview-shell">
            <div className="studio-preview-toolbar no-print">
              <div className="studio-preview-toolbar-copy">
                <p className="studio-preview-eyebrow">Preview Workspace</p>
                <h2>{activeDocumentLabel}</h2>
                <p>
                  {activeThemePack.label} theme pack · {densityLabels[studio.presentation.density]} density ·{' '}
                  {contactLayoutLabels[studio.presentation.contactLayout]}
                </p>
              </div>

              <div className="studio-preview-toolbar-actions">
                <div className="studio-preview-status-row">
                  <span className="studio-preview-pill">Live shared sync</span>
                  <span className="studio-preview-pill">
                    {documentType === 'email-signature' ? 'HTML export' : activePreviewMode === 'print' ? 'Print preview' : 'Screen preview'}
                  </span>
                  {documentType === 'resume' && activePreviewMode === 'print' && resumeExportMetrics ? (
                    <span className="studio-preview-pill">
                      {resumeExportMetrics.tuning.preset} · {resumeExportMetrics.tuning.breakAnchor} · {resumeExportMetrics.tuning.fontScale.toFixed(3)}x
                    </span>
                  ) : null}
                  <HealthBadge health={activeHealth} />
                </div>

                {documentType !== 'email-signature' && (
                  <div className="studio-preview-mode-switch" role="tablist" aria-label="Preview mode">
                    <button
                      type="button"
                      onClick={() => setPreviewModeForType(documentType, 'screen')}
                      className={cn(activePreviewMode === 'screen' && 'is-active')}
                      aria-pressed={activePreviewMode === 'screen'}
                    >
                      <Eye className="h-4 w-4" /> Screen
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewModeForType(documentType, 'print')}
                      className={cn(activePreviewMode === 'print' && 'is-active')}
                      aria-pressed={activePreviewMode === 'print'}
                    >
                      <Printer className="h-4 w-4" /> Print
                    </button>
                  </div>
                )}
              </div>
            </div>

            {activeHealth.issues.length > 0 && (
              <div className="grid gap-2 no-print">
                {activeHealth.issues.map((issue, index) => (
                  <ValidationIssueRow
                    key={`${issue.label}-${index}`}
                    title={issue.label}
                    body={issue.detail}
                    severity={issue.severity}
                  />
                ))}
              </div>
            )}

            <div
              className="studio-preview-canvas"
              data-preview-mode={documentType === 'email-signature' ? 'screen' : activePreviewMode}
              data-document-type={documentType}
            >
              {documentType === 'resume' && (
                <ResumePreview
                  ref={resumePreviewRef}
                  template={resolvedResume}
                  density={studio.presentation.density}
                  showAvatar={studio.presentation.showAvatar}
                  contactLayout={studio.presentation.contactLayout}
                  layoutMode={activeLayoutMode}
                  balancePreset={resumeExportTuning.preset}
                  breakAnchor={resumeExportTuning.breakAnchor}
                  fontScale={resumeNeedsBalancedLayout ? resumeExportTuning.fontScale : 1}
                  spaceScale={resumeNeedsBalancedLayout ? resumeExportTuning.spaceScale : 1}
                />
              )}
              {documentType === 'cover-letter' && (
                <CoverLetterPreview
                  data={resolvedCoverLetter.data}
                  config={resolvedCoverLetter.config}
                  density={studio.presentation.density}
                  showAvatar={studio.presentation.showAvatar}
                  contactLayout={studio.presentation.contactLayout}
                  layoutMode={activeLayoutMode}
                />
              )}
              {documentType === 'email-signature' && (
                <EmailSignaturePreview
                  template={resolvedSignature}
                  density={studio.presentation.density}
                  showAvatar={studio.presentation.showAvatar}
                  contactLayout={studio.presentation.contactLayout}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
