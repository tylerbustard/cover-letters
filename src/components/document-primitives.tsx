import { Fragment, type CSSProperties, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface DocumentContactItem {
  key: string
  icon: LucideIcon
  value: string
}

export interface DocumentMetaItem {
  key: string
  label: string
  value: string
}

export const createDocumentVisualStyle = ({
  accent,
  accentSoft,
  accentDark,
}: {
  accent: string
  accentSoft: string
  accentDark: string
}): CSSProperties =>
  ({
    '--accent': accent,
    '--accent-soft': accentSoft,
    '--accent-dark': accentDark,
    '--document-page-radius': '24px',
    '--document-card-radius': '16px',
    '--document-chip-radius': '999px',
    '--document-section-gap': '1.15rem',
    '--document-card-shadow': '0 10px 24px rgba(15, 23, 42, 0.035)',
    '--document-card-bg': 'linear-gradient(180deg, rgba(255,255,255,0.985), #ffffff)',
    '--document-rule': `linear-gradient(90deg, ${accentSoft}, rgba(255,255,255,0))`,
  }) as CSSProperties

export const DocumentContactChip = ({
  contactKey,
  icon: Icon,
  value,
  className,
}: {
  contactKey: string
  icon: LucideIcon
  value: string
  className?: string
}) => (
  <div className={cn('document-chip', className)} data-contact-key={contactKey}>
    <Icon className="document-chip-icon" />
    <span className="document-chip-value">{value}</span>
  </div>
)

export const DocumentDatePill = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => <span className={cn('document-date-pill', className)}>{children}</span>

export const DocumentMetaPill = ({
  label,
  value,
}: {
  label: string
  value: string
}) => (
  <div className="document-meta-pill">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)

export const DocumentInlineMeta = ({
  items,
  className,
}: {
  items: string[]
  className?: string
}) => {
  const values = items.map((item) => item.trim()).filter(Boolean)

  if (values.length === 0) {
    return null
  }

  return (
    <div className={cn('document-inline-meta', className)}>
      {values.map((item, index) => (
        <Fragment key={`${item}-${index}`}>
          {index > 0 ? <span className="document-inline-meta-separator">·</span> : null}
          <span className="document-inline-meta-item">{item}</span>
        </Fragment>
      ))}
    </div>
  )
}

export const DocumentLogoBadge = ({
  src,
  alt,
  className,
  imageClassName,
}: {
  src: string
  alt: string
  className?: string
  imageClassName?: string
}) => (
  <div className={cn('document-logo-badge', className)}>
    <img src={src} alt={alt} className={cn('document-logo-image', imageClassName)} />
  </div>
)

export const DocumentSectionHeading = ({ title }: { title: string }) => (
  <div className="document-section-heading">
    <h3>{title}</h3>
    <div className="document-section-heading-rule" />
  </div>
)

export const DocumentHeader = ({
  name,
  title,
  profileSrc,
  profileAlt,
  logoSrc,
  logoAlt,
  contactItems,
  summary,
  metaItems = [],
  className,
  showAvatar = true,
}: {
  name: string
  title: string
  profileSrc: string
  profileAlt: string
  logoSrc?: string
  logoAlt?: string
  contactItems: DocumentContactItem[]
  summary: string
  metaItems?: DocumentMetaItem[]
  className?: string
  showAvatar?: boolean
}) => (
  <header className={cn('document-header', className)}>
    <div className="document-header-top">
      <div className="document-header-main">
        {showAvatar ? <img src={profileSrc} alt={profileAlt} className="document-avatar" /> : null}
        <div className="document-title-stack">
          <h1>{name}</h1>
          <h2>{title}</h2>
        </div>
      </div>
      {logoSrc && logoAlt ? <DocumentLogoBadge src={logoSrc} alt={logoAlt} /> : null}
    </div>

    <div className="document-contact-grid">
      {contactItems.map((item) => (
        <DocumentContactChip key={item.key} contactKey={item.key} icon={item.icon} value={item.value} />
      ))}
    </div>

    <p className="document-summary">{summary}</p>

    {metaItems.length > 0 ? (
      <div className="document-meta-row">
        {metaItems.map((item) => (
          <DocumentMetaPill key={item.key} label={item.label} value={item.value} />
        ))}
      </div>
    ) : null}
  </header>
)
