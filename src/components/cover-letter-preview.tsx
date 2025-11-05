import { type CSSProperties } from 'react'
import { Mail, Phone, Globe, MapPin, type LucideIcon } from 'lucide-react'

import { type VariationConfig } from '@/config/variations'
import { getContactItems, getLetterParagraphs, getRecipientLines, getOpportunitySummary, type ContactItem } from '@/lib/letter'
import { cn } from '@/lib/utils'
import { type CoverLetterData } from '@/types'

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
  signatureSrc?: string
  signatureAlt?: string
  contentWrapperClassName?: string
}

const LetterBody = ({
  data,
  paragraphsClassName,
  greetingColor,
  signatureColor,
  signatureSrc,
  signatureAlt,
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
        {signatureSrc && (
          <div className="mb-2">
            <img
              src={signatureSrc}
              alt={signatureAlt ?? `${data.yourName} signature`}
              className="h-14 w-auto object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        )}
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

const CoverLetterHeader = ({ data, config }: PreviewProps) => {
  const contactItems = getContactItems(data)

  return (
    <header className="mb-10 space-y-6">
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

        <div
          className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl border shadow-sm"
          style={{
            borderColor: `${config.accent}26`,
            backgroundColor: config.accentLight,
          }}
        >
          <img src={config.logoSrc} alt={config.logoAlt} className="max-w-10 max-h-10 object-contain" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {contactItems.map((item) => {
          const Icon = CONTACT_ICONS[item.type]

          return (
            <div
              key={item.type}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 shadow-sm"
            >
              <Icon className="w-4 h-4" style={{ color: config.accent }} />
              <span className="font-medium">{item.value}</span>
            </div>
          )
        })}
      </div>

      <p className="text-sm text-gray-700 leading-relaxed border-t border-gray-200 pt-4">
        {config.summary}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
        <span className="font-semibold text-gray-700">Opportunity:</span>
        <span className="text-gray-600">{getOpportunitySummary(data)}</span>
      </div>
    </header>
  )
}

export interface CoverLetterPreviewProps {
  data: CoverLetterData
  config: VariationConfig
}

export const CoverLetterPreview = ({ data, config }: CoverLetterPreviewProps) => (
  <div
    className="bg-white rounded-3xl shadow-xl border border-gray-200 print:shadow-none print:border-0"
    style={LETTER_BASE_STYLE}
  >
    <CoverLetterHeader data={data} config={config} />
    <LetterBody
      data={data}
      greetingColor={config.accentDark}
      signatureColor={config.accentDark}
      signatureSrc={config.signatureSrc}
      signatureAlt={config.signatureAlt}
    />
  </div>
)


