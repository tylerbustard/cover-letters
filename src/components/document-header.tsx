import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import { Fragment, type ReactElement } from 'react'

import { resolveStudioAssetSrc } from '@/data/assets'

// Single source of truth for the document masthead shared by the resume and the
// cover letter. Both documents render this exact component and print with
// DOCUMENT_HEADER_PRINT_CSS, so the headings can never drift apart again.

type HeaderContactItem = {
  key: string
  value: string
  icon: ReactElement
  href?: string
  ariaLabel?: string
  external?: boolean
}

export interface DocumentHeaderProps {
  name: string
  role?: string
  profileSrc: string
  profileAlt: string
  email?: string
  phone?: string
  website?: string
  location?: string
  /** Optional id for the contact rail (the resume anchors #contact). */
  contactId?: string
  /** 'cover-letter' appends the cover-letter layout classes. */
  variant?: 'resume' | 'cover-letter'
}

export const buildHeaderContactItems = ({
  name,
  email,
  phone,
  website,
  location,
}: Pick<DocumentHeaderProps, 'name' | 'email' | 'phone' | 'website' | 'location'>) => {
  const contactName = name.trim() || 'contact'
  const contactEmail = (email ?? '').trim()
  const contactPhone = (phone ?? '').trim()
  const rawWebsite = (website ?? '').trim()
  const websiteLabel = rawWebsite.replace(/^https?:\/\//u, '')
  const websiteHref = rawWebsite.startsWith('http') ? rawWebsite : `https://${websiteLabel}`
  const contactLocation = (location ?? '').trim()

  const rawContactItems: Array<HeaderContactItem | null> = [
    contactEmail
      ? {
          key: 'email',
          value: contactEmail,
          href: `mailto:${contactEmail}`,
          ariaLabel: `Email ${contactName}`,
          icon: <Mail size={13} />,
        }
      : null,
    contactPhone
      ? {
          key: 'phone',
          value: contactPhone,
          href: `tel:${contactPhone.replace(/[^+\d]/gu, '')}`,
          ariaLabel: `Call ${contactName}`,
          icon: <Phone size={13} />,
        }
      : null,
    websiteLabel
      ? {
          key: 'website',
          value: websiteLabel,
          href: websiteHref,
          ariaLabel: `Visit ${contactName} website`,
          external: true,
          icon: <Globe size={13} />,
        }
      : null,
    contactLocation
      ? {
          key: 'location',
          value: contactLocation,
          icon: <MapPin size={13} />,
        }
      : null,
  ]

  return rawContactItems.filter((item): item is HeaderContactItem => Boolean(item))
}

export const DocumentHeader = ({
  name,
  role,
  profileSrc,
  profileAlt,
  email,
  phone,
  website,
  location,
  contactId,
  variant = 'resume',
}: DocumentHeaderProps) => {
  const contactItems = buildHeaderContactItems({ name, email, phone, website, location })
  const isCoverLetter = variant === 'cover-letter'
  const roleLabel = (role ?? '').trim()

  return (
    <header className={`resume-header${isCoverLetter ? ' cover-letter-document-header' : ''}`}>
      <div className={`resume-header-top${isCoverLetter ? ' cover-letter-document-header-top' : ''}`}>
        <div className="resume-header-portrait-shell">
          <div className="resume-header-portrait-frame">
            <img
              src={resolveStudioAssetSrc(profileSrc, profileSrc)}
              alt={profileAlt}
              className="resume-header-portrait-image"
            />
          </div>
        </div>
        <div className="resume-header-copy">
          <h1 className="resume-header-name">{name}</h1>
          {roleLabel ? <p className="resume-header-role">{roleLabel}</p> : null}
        </div>
      </div>
      {contactItems.length > 0 ? (
        <div
          id={contactId}
          className={`resume-header-contact${isCoverLetter ? ' cover-letter-document-contact-rail' : ''}`}
        >
          {contactItems.map((item, index) => (
            <Fragment key={item.key}>
              {item.href ? (
                <a
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className="resume-header-contact-link"
                  aria-label={item.ariaLabel}
                >
                  {item.icon}
                  {item.value}
                </a>
              ) : (
                <span className="resume-header-contact-item">
                  {item.icon}
                  {item.value}
                </span>
              )}
              {index < contactItems.length - 1 ? (
                <span className="resume-contact-separator" aria-hidden="true" />
              ) : null}
            </Fragment>
          ))}
        </div>
      ) : null}
      <hr className="resume-header-divider" />
    </header>
  )
}

// Canonical print styling for the shared masthead. Literal pt values on purpose:
// these rules must produce the identical heading on every document regardless of
// each document's own print variables or page margins.
export const DOCUMENT_HEADER_PRINT_CSS = `
          .resume-header {
            margin-bottom: 0 !important;
          }

          .resume-header-top {
            display: grid !important;
            grid-template-columns: 56px 1fr !important;
            align-items: center !important;
            column-gap: 12pt !important;
          }

          .resume-header-portrait-frame {
            width: 56px !important;
            height: 56px !important;
            border-radius: 9999px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .resume-header-portrait-image {
            width: 56px !important;
            height: 56px !important;
            aspect-ratio: 1 / 1 !important;
            object-fit: cover !important;
            object-position: center 12% !important;
          }

          .resume-header-name {
            font-family: var(--font-display) !important;
            font-size: 20pt !important;
            line-height: 1 !important;
            letter-spacing: 0 !important;
            font-weight: 700 !important;
            color: #0f172a !important;
            font-feature-settings: 'kern' 1 !important;
            text-rendering: optimizeLegibility !important;
            margin: 0 !important;
          }

          .resume-header-role {
            font-size: 10.2pt !important;
            line-height: 1.15 !important;
            letter-spacing: 0 !important;
            text-transform: none !important;
            font-weight: 400 !important;
            margin: 4pt 0 0 !important;
            color: #64748b !important;
          }

          .resume-header-contact {
            margin-top: 6pt !important;
            gap: 2pt 6pt !important;
            font-size: 8.2pt !important;
            justify-content: flex-start !important;
          }

          .resume-header-contact a,
          .resume-header-contact span {
            font-size: 8.2pt !important;
          }

          .resume-contact-separator {
            display: inline-block !important;
            height: 8pt !important;
          }

          .resume-header-divider {
            margin-top: 6pt !important;
            border-top: 1px solid #cbd5e1 !important;
          }
`
