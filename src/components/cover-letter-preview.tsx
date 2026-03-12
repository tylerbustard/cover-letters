import { type CSSProperties } from 'react'
import { Mail, Phone, Globe, MapPin, type LucideIcon } from 'lucide-react'

import {
  createDocumentVisualStyle,
  DocumentHeader,
} from '@/components/document-primitives'
import type {
  CoverLetterTemplate,
  DocumentLayoutMode,
  PresentationContactLayout,
  PresentationDensity,
} from '@/types'
import { getContactItems, getLetterParagraphs, getRecipientLines, type ContactItem } from '@/lib/letter'
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
    <div className={cn('cover-letter-body', contentWrapperClassName)}>
      {recipientLines.length > 0 && (
        <div className="cover-letter-recipient">
          {recipientLines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}

      <div
        className="cover-letter-greeting"
        style={greetingColor ? { color: greetingColor } : undefined}
      >
        Dear {greetingName},
      </div>

      <div className={cn('cover-letter-paragraphs', paragraphsClassName)}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="cover-letter-signoff">
        <p className="cover-letter-signoff-label">Sincerely,</p>
        {signatureSrc && (
          <div className="cover-letter-signature-image">
            <img
              src={signatureSrc}
              alt={signatureAlt ?? `${data.yourName} signature`}
              className="h-14 w-auto object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        )}
        <p
          className="cover-letter-signoff-name"
          style={signatureColor ? { color: signatureColor } : undefined}
        >
          {data.yourName}
        </p>
      </div>
    </div>
  )
}

type CoverLetterPreviewConfig = CoverLetterTemplate['config']

interface PreviewProps {
  data: CoverLetterData
  config: CoverLetterPreviewConfig
  showAvatar: boolean
}

const CoverLetterHeader = ({ data, config, showAvatar }: PreviewProps) => {
  const contactItems = getContactItems(data)
  const title = config.tagline.trim().length > 0 ? config.tagline : config.organization

  return (
    <DocumentHeader
      name={data.yourName}
      title={title}
      profileSrc={config.profileSrc}
      profileAlt={config.profileAlt}
      contactItems={contactItems.map((item) => ({
        key: item.type,
        icon: CONTACT_ICONS[item.type],
        value: item.value,
      }))}
      summary={config.summary}
      className="cover-letter-header"
      showAvatar={showAvatar}
    />
  )
}

export interface CoverLetterPreviewProps {
  data: CoverLetterData
  config: CoverLetterPreviewConfig
  density: PresentationDensity
  showAvatar: boolean
  contactLayout: PresentationContactLayout
  layoutMode?: DocumentLayoutMode
}

export const CoverLetterPreview = ({
  data,
  config,
  density,
  showAvatar,
  contactLayout,
  layoutMode = 'screen',
}: CoverLetterPreviewProps) => {
  const styleVars: CSSProperties = {
    ...LETTER_BASE_STYLE,
    ...createDocumentVisualStyle({
      accent: config.accent,
      accentSoft: config.accentLight,
      accentDark: config.accentDark,
    }),
  } as CSSProperties

  return (
    <div
      className="cover-letter-preview print:shadow-none print:border-0"
      style={styleVars}
      data-density={density}
      data-contact-layout={contactLayout}
      data-avatar={showAvatar ? 'visible' : 'hidden'}
      data-layout-mode={layoutMode}
    >
      <CoverLetterHeader data={data} config={config} showAvatar={showAvatar} />
      <LetterBody
        data={data}
        greetingColor={config.accentDark}
        signatureColor={config.accentDark}
        signatureSrc={config.signatureSrc}
        signatureAlt={config.signatureAlt}
      />
    </div>
  )
}
