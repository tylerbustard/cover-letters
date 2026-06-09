import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import { Fragment, type ReactElement } from 'react'

import { assets, resolveStudioAssetSrc } from '@/data/assets'
import { SIGNATURE_TEMPLATES } from '@/data/signatures'
import { getLetterParagraphs, getRecipientLines } from '@/lib/letter'
import { getSignatureAffiliationDisplayRows } from '@/lib/signature-identity'
import type { CoverLetterData, CoverLetterTemplate } from '@/types'

// The cover-letter education block reuses the EXACT rows the matching email signature
// renders (institution[ - school], then degree/role), so the two documents can never
// drift apart. Keyed by a substring of the header context note.
type InstitutionCredentialSource = { matches: string[]; logoSrc: string; signatureId: string }

const INSTITUTION_CREDENTIAL_SOURCES: InstitutionCredentialSource[] = [
  { matches: ['new brunswick', 'unb'], logoSrc: assets.logoUnbFull, signatureId: 'unb' },
  { matches: ['queen'], logoSrc: assets.logoQueensAlt, signatureId: 'queens' },
  { matches: ['toronto', 'rotman'], logoSrc: assets.logoUoft, signatureId: 'rotman' },
  { matches: ['mcgill'], logoSrc: assets.logoMcgillAlt, signatureId: 'mcgill' },
]

type InstitutionCredential = { logoSrc: string; rows: string[] }

const resolveInstitutionCredential = (contextNote: string): InstitutionCredential | null => {
  const haystack = contextNote.toLowerCase()
  const source = INSTITUTION_CREDENTIAL_SOURCES.find((entry) =>
    entry.matches.some((match) => haystack.includes(match)),
  )
  if (!source) return null
  const signature = SIGNATURE_TEMPLATES.find((template) => template.id === source.signatureId)
  const rows = signature ? getSignatureAffiliationDisplayRows(signature.data) : []
  return rows.length > 0 ? { logoSrc: source.logoSrc, rows } : null
}

interface CoverLetterPreviewProps {
  data: CoverLetterData
  config: CoverLetterTemplate['config']
}

type HeaderContactItem = {
  key: string
  value: string
  icon: ReactElement
  href?: string
  ariaLabel?: string
  external?: boolean
}

export const CoverLetterPreview = ({ data, config }: CoverLetterPreviewProps) => {
  const paragraphs = getLetterParagraphs(data)
  const recipientLines = getRecipientLines(data)
  const greetingName = data.hiringManager.trim()
  const contactName = data.yourName.trim() || 'contact'
  const contactEmail = data.yourEmail.trim()
  const contactPhone = data.yourPhone.trim()
  const rawWebsite = data.yourWebsite.trim()
  const websiteLabel = rawWebsite.replace(/^https?:\/\//u, '')
  const websiteHref = rawWebsite.startsWith('http') ? rawWebsite : `https://${websiteLabel}`
  const contactLocation = data.yourAddress.trim()
  const tagline = config.tagline.trim()
  const identitySummary = config.contextNote.trim()
  const institutionCredential = resolveInstitutionCredential(identitySummary)
  const signoffLabel = data.signoffLabel.trim()
  const dateLabel = data.date.trim()
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
  const contactItems = rawContactItems.filter((item): item is HeaderContactItem => Boolean(item))

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="resume-page bg-white px-10 py-9 md:px-11 md:py-10 print:shadow-none print:px-0 print:py-0">
          <article className="cover-letter-document cover-letter-sheet">
            <header className="resume-header cover-letter-document-header">
              <div className="resume-header-top cover-letter-document-header-top">
                <div className="resume-header-portrait-shell">
                  <div className="resume-header-portrait-frame">
                    <img
                      src={resolveStudioAssetSrc(config.profileSrc, config.profileSrc)}
                      alt={config.profileAlt}
                      className="resume-header-portrait-image"
                    />
                  </div>
                </div>
                <div className="resume-header-copy">
                  <h1 className="resume-header-name">{data.yourName}</h1>
                  {tagline ? <p className="resume-header-role">{tagline}</p> : null}
                </div>
              </div>
              {contactItems.length > 0 ? (
                <div className="resume-header-contact cover-letter-document-contact-rail">
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

            {identitySummary ? (
              <section className="resume-summary-section cover-letter-document-summary-section">
                {institutionCredential ? (
                  <div className="cover-letter-credential">
                    <span className="cover-letter-credential-logo-shell">
                      <img
                        src={resolveStudioAssetSrc(
                          institutionCredential.logoSrc,
                          institutionCredential.logoSrc,
                        )}
                        alt={institutionCredential.rows[0]}
                        className="cover-letter-credential-logo"
                      />
                    </span>
                    <span className="cover-letter-credential-copy">
                      {institutionCredential.rows.map((row, index) => (
                        <span
                          key={`${row}-${index}`}
                          className={
                            index === 0
                              ? 'cover-letter-credential-name'
                              : 'cover-letter-credential-detail'
                          }
                        >
                          {row}
                        </span>
                      ))}
                    </span>
                  </div>
                ) : (
                  <p className="resume-summary-text">{identitySummary}</p>
                )}
              </section>
            ) : null}

            <section className="cover-letter-document-section">
              <hr className="cover-letter-document-section-divider" />
              <div className="cover-letter-document-copy">
                {dateLabel ? <p className="cover-letter-document-date">{dateLabel}</p> : null}

                {recipientLines.length > 0 ? (
                  <div className="cover-letter-document-recipient">
                    {recipientLines.map((line) => (
                      <p key={line} className="cover-letter-document-recipient-line">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div className="cover-letter-document-body">
                  {greetingName ? (
                    <p className="cover-letter-document-greeting">Dear {greetingName},</p>
                  ) : null}
                  {paragraphs.length > 0 ? (
                    <div className="cover-letter-document-paragraphs">
                      {paragraphs.map((paragraph) => (
                        <p key={paragraph} className="whitespace-pre-line">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <div className="cover-letter-document-signoff">
                    {signoffLabel ? (
                      <p className="cover-letter-document-signoff-label">{signoffLabel}</p>
                    ) : null}
                    <img
                      src={resolveStudioAssetSrc(config.signatureSrc, config.signatureSrc)}
                      alt={config.signatureAlt}
                      className="cover-letter-document-signature"
                    />
                    <p className="cover-letter-document-signature-name">{data.yourName}</p>
                  </div>
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.5in 0.6in;
          }

          :root {
            --pdf-density: 1;
            --pdf-page-margin-top-bottom: 0.50in;
            --pdf-page-margin-left-right: 0.60in;
            --pdf-space-1: calc(2pt * var(--pdf-density));
            --pdf-space-2: calc(4pt * var(--pdf-density));
            --pdf-space-3: calc(6pt * var(--pdf-density));
            --pdf-space-4: calc(8pt * var(--pdf-density));
            --pdf-space-5: calc(12pt * var(--pdf-density));
            --pdf-space-6: calc(16pt * var(--pdf-density));
            --pdf-column-gap: calc(12pt * var(--pdf-density));
            --pdf-heading-size: calc(9.3pt * var(--pdf-density));
          }

          *,
          *::before,
          *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body,
          html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 9.5pt !important;
            line-height: 1.46 !important;
          }

          nav,
          footer,
          button,
          .glass-panel,
          .glass-navbar,
          .print\\:hidden,
          .no-print,
          .studio-shell-header,
          .studio-editor-rail,
          .studio-preview-header {
            display: none !important;
          }

          .min-h-screen {
            background: white !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          .max-w-4xl {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .studio-shell,
          .studio-workspace,
          .print-area,
          .studio-preview-shell,
          .studio-preview-stage {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            max-width: 100% !important;
            border: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }

          .resume-page {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            min-height: auto !important;
          }

          .cover-letter-document {
            display: flex !important;
            flex-direction: column !important;
            gap: var(--pdf-space-4) !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .resume-header {
            margin-bottom: 0 !important;
          }

          .resume-header-top {
            display: grid !important;
            grid-template-columns: 50px 1fr !important;
            align-items: center !important;
            column-gap: var(--pdf-column-gap) !important;
          }

          .resume-header-portrait-frame {
            width: 50px !important;
            height: 50px !important;
            border-radius: 9999px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .resume-header-portrait-image {
            width: 50px !important;
            height: 50px !important;
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
            font-feature-settings: 'kern' 1 !important;
            text-rendering: optimizeLegibility !important;
            margin: 0 !important;
          }

          .resume-header-role {
            font-size: 7.4pt !important;
            line-height: 1.2 !important;
            margin-top: 4pt !important;
            text-transform: uppercase !important;
            letter-spacing: 1.4pt !important;
            font-weight: 600 !important;
            color: #475569 !important;
          }

          .resume-header-contact {
            margin-top: var(--pdf-space-2) !important;
            gap: 1pt var(--pdf-space-2) !important;
            font-size: 7.7pt !important;
            justify-content: flex-start !important;
          }

          .resume-header-contact a,
          .resume-header-contact span {
            font-size: 7.7pt !important;
          }

          .resume-contact-separator {
            display: inline-block !important;
            height: var(--pdf-space-4) !important;
          }

          .resume-header-divider {
            margin-top: var(--pdf-space-2) !important;
            border-top: 1px solid #cbd5e1 !important;
          }

          .resume-summary-section {
            margin-bottom: 0 !important;
          }

          p,
          li,
          span,
          a,
          .cover-letter-document-recipient-line,
          .cover-letter-document-date,
          .cover-letter-document-greeting,
          .cover-letter-document-paragraphs p,
          .cover-letter-document-signoff-label,
          .cover-letter-document-signature-name {
            font-size: 9.5pt !important;
            line-height: 1.46 !important;
          }

          a {
            color: inherit !important;
            text-decoration: none !important;
          }

          .resume-summary-text {
            font-size: 7.2pt !important;
            line-height: 1.3 !important;
            text-transform: uppercase !important;
            letter-spacing: 1.2pt !important;
            font-weight: 600 !important;
            color: #64748b !important;
          }

          .cover-letter-credential {
            display: flex !important;
            align-items: center !important;
            gap: 7pt !important;
          }

          .cover-letter-credential-logo-shell {
            display: inline-flex !important;
            align-items: center !important;
            flex: 0 0 auto !important;
          }

          .cover-letter-credential-logo {
            height: 16pt !important;
            width: auto !important;
            max-width: 32pt !important;
            object-fit: contain !important;
            display: block !important;
          }

          .cover-letter-credential-copy {
            display: flex !important;
            flex-direction: column !important;
          }

          .cover-letter-credential-name {
            font-size: 8.6pt !important;
            font-weight: 600 !important;
            letter-spacing: 0.2pt !important;
            color: #1e293b !important;
            line-height: 1.18 !important;
          }

          .cover-letter-credential-detail {
            font-size: 7.6pt !important;
            font-weight: 400 !important;
            letter-spacing: 0.2pt !important;
            color: #64748b !important;
            line-height: 1.22 !important;
            margin-top: 1pt !important;
          }

          .resume-header,
          .resume-summary-section,
          .resume-page section {
            margin: 0 !important;
          }

          .resume-page section {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .cover-letter-document-section-divider {
            display: none !important;
          }

          .cover-letter-document-copy {
            gap: 0 !important;
            max-width: none !important;
          }

          .cover-letter-document-date {
            margin: 0 0 var(--pdf-space-3) !important;
          }

          .cover-letter-document-recipient {
            margin: 0 0 var(--pdf-space-3) !important;
            gap: 1pt !important;
          }

          .cover-letter-document-body {
            margin-top: 0 !important;
          }

          .cover-letter-document-greeting {
            margin: 0 0 var(--pdf-space-3) !important;
          }

          .cover-letter-document-paragraphs {
            margin-top: var(--pdf-space-3) !important;
            gap: 8pt !important;
          }

          .cover-letter-document-signoff {
            margin-top: 13pt !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .cover-letter-document-signature {
            margin-top: var(--pdf-space-3) !important;
            height: 22pt !important;
          }

          .cover-letter-document-signature-name {
            margin-top: var(--pdf-space-2) !important;
          }
        }
      `}</style>
    </>
  )
}
