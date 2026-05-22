import { Globe, Mail, MapPin, Phone } from 'lucide-react'

import { resolveStudioAssetSrc } from '@/data/assets'
import { getLetterParagraphs, getRecipientLines } from '@/lib/letter'
import type { CoverLetterData, CoverLetterTemplate } from '@/types'

interface CoverLetterPreviewProps {
  data: CoverLetterData
  config: CoverLetterTemplate['config']
}

const SHARED_IDENTITY_SUMMARY =
  'Driving innovation at the intersection of finance and technology while delivering exceptional results through analytical expertise, strategic thinking, and client-focused solutions.'

export const CoverLetterPreview = ({ data, config }: CoverLetterPreviewProps) => {
  const paragraphs = getLetterParagraphs(data)
  const recipientLines = getRecipientLines(data)
  const greetingName = data.hiringManager.trim() || 'Hiring Manager'
  const websiteLabel = data.yourWebsite.replace(/^https?:\/\//u, '')
  const websiteHref = `https://${websiteLabel}`
  const phoneHref = `tel:${data.yourPhone.replace(/[^+\d]/gu, '')}`

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
                </div>
              </div>
              <div className="resume-header-contact cover-letter-document-contact-rail">
                <a href={`mailto:${data.yourEmail}`} className="resume-header-contact-link" aria-label="Email Tyler Bustard">
                  <Mail size={13} />
                  {data.yourEmail}
                </a>
                <span className="resume-contact-separator" aria-hidden="true" />
                <a href={phoneHref} className="resume-header-contact-link" aria-label="Call Tyler Bustard">
                  <Phone size={13} />
                  {data.yourPhone}
                </a>
                <span className="resume-contact-separator" aria-hidden="true" />
                <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="resume-header-contact-link" aria-label="Visit Tyler Bustard website">
                  <Globe size={13} />
                  {websiteLabel}
                </a>
                <span className="resume-contact-separator" aria-hidden="true" />
                <span className="resume-header-contact-item">
                  <MapPin size={13} />
                  {data.yourAddress}
                </span>
              </div>
              <hr className="resume-header-divider" />
            </header>

            <section className="resume-summary-section cover-letter-document-summary-section">
              <p className="resume-summary-text">{SHARED_IDENTITY_SUMMARY}</p>
            </section>

            <section className="cover-letter-document-section">
              <hr className="cover-letter-document-section-divider" />
              <div className="cover-letter-document-copy">
                <p className="cover-letter-document-date">{data.date}</p>

                <div className="cover-letter-document-recipient">
                  {recipientLines.length > 0 ? (
                    recipientLines.map((line) => (
                      <p key={line} className="cover-letter-document-recipient-line">
                        {line}
                      </p>
                    ))
                  ) : (
                    <p className="cover-letter-document-recipient-line">Recipient details</p>
                  )}
                </div>

                <div className="cover-letter-document-body">
                  <p className="cover-letter-document-greeting">Dear {greetingName},</p>
                  <div className="cover-letter-document-paragraphs">
                    {paragraphs.map((paragraph) => (
                      <p key={paragraph} className="whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  <div className="cover-letter-document-signoff">
                    <p className="cover-letter-document-signoff-label">Sincerely,</p>
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
            margin: 0.4in 0.5in;
          }

          :root {
            --pdf-density: 0.97;
            --pdf-page-margin-top-bottom: 0.40in;
            --pdf-page-margin-left-right: 0.50in;
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
            font-size: 8.35pt !important;
            line-height: 1.34 !important;
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
            gap: var(--pdf-space-5) !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .resume-header {
            margin-bottom: 0 !important;
          }

          .resume-header-top {
            display: grid !important;
            grid-template-columns: 56px 1fr !important;
            align-items: center !important;
            column-gap: var(--pdf-column-gap) !important;
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
            font-size: 22pt !important;
            line-height: 0.96 !important;
            letter-spacing: -0.04em !important;
            font-weight: 700 !important;
            font-feature-settings: 'kern' 1 !important;
            text-rendering: optimizeLegibility !important;
            margin: 0 !important;
          }

          .resume-header-contact {
            margin-top: var(--pdf-space-3) !important;
            gap: var(--pdf-space-1) var(--pdf-space-3) !important;
            font-size: 8.2pt !important;
            justify-content: flex-start !important;
          }

          .resume-header-contact a,
          .resume-header-contact span {
            font-size: 8.2pt !important;
          }

          .resume-contact-separator {
            display: inline-block !important;
            height: var(--pdf-space-4) !important;
          }

          .resume-header-divider {
            margin-top: var(--pdf-space-3) !important;
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
            font-size: 8.2pt !important;
            line-height: 1.34 !important;
          }

          a {
            color: inherit !important;
            text-decoration: none !important;
          }

          .resume-summary-text {
            font-size: 8.5pt !important;
            line-height: 1.42 !important;
          }

          .resume-header,
          .resume-summary-section,
          .resume-page section {
            margin: 0 !important;
          }

          .resume-page section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .cover-letter-document-section-divider {
            margin: 0 0 var(--pdf-space-4) !important;
            border: 0 !important;
            border-top: 1px solid #cbd5e1 !important;
          }

          .cover-letter-document-copy {
            gap: 0 !important;
            max-width: none !important;
          }

          .cover-letter-document-date {
            margin: 0 0 var(--pdf-space-3) !important;
          }

          .cover-letter-document-recipient {
            margin: 0 0 var(--pdf-space-4) !important;
            gap: 0.5pt !important;
          }

          .cover-letter-document-body {
            margin-top: 0 !important;
          }

          .cover-letter-document-greeting {
            margin: 0 !important;
          }

          .cover-letter-document-paragraphs {
            margin-top: var(--pdf-space-4) !important;
            gap: var(--pdf-space-4) !important;
          }

          .cover-letter-document-signoff {
            margin-top: var(--pdf-space-5) !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .cover-letter-document-signature {
            margin-top: var(--pdf-space-2) !important;
            height: 24pt !important;
          }

          .cover-letter-document-signature-name {
            margin-top: var(--pdf-space-1) !important;
          }
        }
      `}</style>
    </>
  )
}
