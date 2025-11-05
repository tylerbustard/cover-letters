import { type CSSProperties } from 'react'
import { Mail, Phone, Globe, MapPin, type LucideIcon } from 'lucide-react'

import { type VariationConfig } from '@/config/variations'
import { getContactItems, getLetterParagraphs, getRecipientLines, getOpportunitySummary, type ContactItem } from '@/lib/letter'
import { cn } from '@/lib/utils'
import { type CoverLetterData, type VariationId } from '@/types'

const LETTER_BASE_STYLE: CSSProperties = {
  width: '100%',
  maxWidth: '21.59cm',
  minHeight: '27.94cm',
  padding: '1.5cm 1.27cm 2.54cm 1.27cm',
  margin: '0 auto',
  boxSizing: 'border-box',
}

const CONTACT_ICONS: Record<ContactItem['type'], LucideIcon> = {
  email: Mail,
  phone: Phone,
  website: Globe,
  address: MapPin,
}

interface LetterBodyProps {
  data: CoverLetterData
  paragraphsClassName?: string
  greetingColor?: string
  signatureColor?: string
  contentWrapperClassName?: string
}

const LetterBody = ({
  data,
  paragraphsClassName,
  greetingColor,
  signatureColor,
  contentWrapperClassName,
}: LetterBodyProps) => {
  const paragraphs = getLetterParagraphs(data)
  const recipientLines = getRecipientLines(data)
  const greetingName = data.hiringManager.trim() || 'Hiring Manager'

  return (
    <div className={cn('text-[15px] leading-relaxed text-gray-800', contentWrapperClassName)}>
      {data.date.trim().length > 0 && (
        <p className="text-sm text-gray-600 mb-6">{data.date}</p>
      )}

      {recipientLines.length > 0 && (
        <div className="text-sm text-gray-700 mb-6 space-y-1">
          {recipientLines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}

      <div
        className="text-base font-medium mb-5"
        style={greetingColor ? { color: greetingColor } : undefined}
      >
        Dear {greetingName},
      </div>

      <div className={cn('space-y-5 text-gray-800', paragraphsClassName)}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-8 text-gray-900">
        <p className="mb-2">Sincerely,</p>
        <p
          className="font-semibold text-gray-900"
          style={signatureColor ? { color: signatureColor } : undefined}
        >
          {data.yourName}
        </p>
      </div>
    </div>
  )
}

interface PreviewProps {
  data: CoverLetterData
  config: VariationConfig
}

const QueensPreview = ({ data, config }: PreviewProps) => {
  const contactItems = getContactItems(data)

  return (
    <div
      className="bg-white rounded-3xl shadow-xl border border-gray-200 print:shadow-none print:border-0"
      style={LETTER_BASE_STYLE}
    >
      <header className="mb-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={config.profileSrc}
              alt={config.profileAlt}
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg object-cover"
            />
            <div>
              <span className="text-xs uppercase tracking-[0.28em] text-gray-500 block mb-1">
                {config.organization}
              </span>
              <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
                {data.yourName}
              </h2>
              <p className="text-base font-semibold" style={{ color: config.accent }}>
                {config.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl border shadow-sm"
              style={{
                borderColor: `${config.accent}33`,
                backgroundColor: config.accentLight,
              }}
            >
              <img src={config.logoSrc} alt={config.logoAlt} className="max-w-10 max-h-10 object-contain" />
            </div>
            <div
              className="px-4 py-2 rounded-xl text-xs font-medium uppercase tracking-wide text-gray-600"
              style={{
                background: config.accentLight,
                border: `1px solid ${config.accent}1a`,
              }}
            >
              <span className="block text-gray-700">Queen&apos;s Profile</span>
              <span className="block text-gray-900">Cover Letter</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {contactItems.map((item) => {
            const Icon = CONTACT_ICONS[item.type]

            return (
              <div
                key={item.type}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white shadow-sm"
                style={{
                  borderColor: `${config.accent}1f`,
                  background: config.accentLight,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: config.accent }} />
                <span className="text-gray-700 font-medium">{item.value}</span>
              </div>
            )
          })}
        </div>

        <div
          className="mt-6 rounded-2xl border p-4"
          style={{
            borderColor: `${config.accent}1f`,
            background: `linear-gradient(135deg, ${config.accentLight}, #ffffff)`,
          }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Opportunity Focus
          </span>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900 block">{config.organization}</span>
            {getOpportunitySummary(data)}
          </p>
        </div>
      </header>

      <LetterBody data={data} greetingColor={config.accentDark} paragraphsClassName="tracking-[0.01em]" />
    </div>
  )
}

const UnbPreview = ({ data, config }: PreviewProps) => {
  const contactItems = getContactItems(data)

  return (
    <div
      className="bg-white rounded-3xl shadow-xl border border-gray-200 print:shadow-none print:border-0"
      style={LETTER_BASE_STYLE}
    >
      <header className="mb-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={config.profileSrc}
              alt={config.profileAlt}
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg object-cover"
            />
            <div>
              <span
                className="text-xs uppercase tracking-[0.32em] font-semibold"
                style={{ color: config.accent }}
              >
                {config.organization}
              </span>
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                {data.yourName}
              </h2>
              <p className="text-sm font-medium text-gray-600">{config.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl border shadow-sm"
              style={{
                borderColor: `${config.accent}33`,
                backgroundColor: config.accentLight,
              }}
            >
              <img src={config.logoSrc} alt={config.logoAlt} className="max-w-10 max-h-10 object-contain" />
            </div>
            <div
              className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${config.accent}26`,
                color: config.accent,
                boxShadow: '0 10px 30px rgba(163,6,26,0.08)',
              }}
            >
              UNB Cover Letter
            </div>
          </div>
        </div>

        <div className="mt-5 border-l-4" style={{ borderColor: config.accent }}>
          <div className="pl-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {contactItems.map((item) => {
              const Icon = CONTACT_ICONS[item.type]

              return (
                <div
                  key={item.type}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 bg-white"
                  style={{
                    borderColor: `${config.accent}26`,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: config.accent }} />
                  <span className="text-gray-700 font-medium">{item.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
          <span
            className="px-3 py-1 rounded-full font-semibold"
            style={{ backgroundColor: config.accentLight, color: config.accentDark }}
          >
            Opportunity
          </span>
          <span className="text-gray-600">
            <span className="font-semibold text-gray-700 mr-2">{config.organization}</span>
            {getOpportunitySummary(data)}
          </span>
        </div>
      </header>

      <div className="pl-5 border-l-2" style={{ borderColor: `${config.accentLight}` }}>
        <LetterBody data={data} greetingColor={config.accent} paragraphsClassName="tracking-normal" />
      </div>
    </div>
  )
}

const UoftPreview = ({ data, config }: PreviewProps) => {
  const contactItems = getContactItems(data)

  return (
    <div
      className="bg-white rounded-3xl shadow-xl border border-gray-200 print:shadow-none print:border-0"
      style={LETTER_BASE_STYLE}
    >
      <header className="mb-8 space-y-6">
        <div
          className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b-2"
          style={{ borderColor: config.accent }}
        >
          <div className="flex items-center gap-4">
            <img
              src={config.profileSrc}
              alt={config.profileAlt}
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg object-cover"
            />
            <div>
              <span className="text-xs uppercase tracking-[0.24em] text-gray-500 block mb-1">
                {config.organization}
              </span>
              <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
                {data.yourName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{config.tagline}</p>
            </div>
          </div>

          <div
            className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl border shadow-sm"
            style={{
              borderColor: `${config.accent}33`,
              backgroundColor: config.accentLight,
            }}
          >
            <img src={config.logoSrc} alt={config.logoAlt} className="max-w-12 max-h-12 object-contain" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
          {contactItems.map((item, index) => {
            const Icon = CONTACT_ICONS[item.type]

            return (
              <div key={item.type} className="inline-flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: config.accent }} />
                <span className="font-medium">{item.value}</span>
                {index < contactItems.length - 1 && <span className="text-gray-400">•</span>}
              </div>
            )
          })}
        </div>

        <div className="mt-4 text-xs uppercase tracking-[0.26em] text-gray-500">
          <span className="font-semibold text-gray-600 mr-2">{config.organization}</span>
          {getOpportunitySummary(data)}
        </div>
      </header>

      <LetterBody data={data} greetingColor={config.accentDark} paragraphsClassName="tracking-tight" />
    </div>
  )
}

const McgillPreview = ({ data, config }: PreviewProps) => {
  const contactItems = getContactItems(data)

  return (
    <div
      className="bg-white rounded-3xl shadow-xl border border-gray-200 print:shadow-none print:border-0"
      style={LETTER_BASE_STYLE}
    >
      <header className="mb-8 space-y-6">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: config.accent }}
        >
          <div className="px-6 py-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={config.profileSrc}
                  alt={config.profileAlt}
                  className="w-20 h-20 rounded-2xl border-2 border-white/70 object-cover"
                />
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/80 block mb-1">
                    {config.organization}
                  </span>
                  <h2 className="text-3xl font-semibold tracking-tight">{data.yourName}</h2>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/80 font-semibold mt-2">
                    {config.tagline}
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/30">
                <img src={config.logoSrc} alt={config.logoAlt} className="max-w-12 max-h-12 object-contain" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              {contactItems.map((item) => {
                const Icon = CONTACT_ICONS[item.type]

                return (
                  <div
                    key={item.type}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-white/10 backdrop-blur"
                  >
                    <Icon className="w-4 h-4 text-white" />
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
          <span
            className="px-3 py-1 rounded-full font-semibold"
            style={{ backgroundColor: config.accentLight, color: config.accentDark }}
          >
            Opportunity Spotlight
          </span>
          <span className="text-gray-600">
            <span className="font-semibold text-gray-700 mr-2">{config.organization}</span>
            {getOpportunitySummary(data)}
          </span>
        </div>
      </header>

      <LetterBody
        data={data}
        greetingColor={config.accent}
        signatureColor={config.accentDark}
        paragraphsClassName="tracking-normal"
      />
    </div>
  )
}

const PREVIEW_COMPONENTS: Record<VariationId, (props: PreviewProps) => JSX.Element> = {
  queens: QueensPreview,
  unb: UnbPreview,
  uoft: UoftPreview,
  mcgill: McgillPreview,
}

export interface CoverLetterPreviewProps {
  data: CoverLetterData
  config: VariationConfig
}

export const CoverLetterPreview = ({ data, config }: CoverLetterPreviewProps) => {
  const PreviewComponent = PREVIEW_COMPONENTS[config.id] ?? QueensPreview

  return <PreviewComponent data={data} config={config} />
}


