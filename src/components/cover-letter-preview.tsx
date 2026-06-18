import { DOCUMENT_HEADER_PRINT_CSS, DocumentHeader } from '@/components/document-header'
import { resolveStudioAssetSrc } from '@/data/assets'
import { getLetterParagraphs, getRecipientLines } from '@/lib/letter'
import type { CoverLetterData, CoverLetterTemplate } from '@/types'

interface CoverLetterPreviewProps {
  data: CoverLetterData
  config: CoverLetterTemplate['config']
}

export const CoverLetterPreview = ({ data, config }: CoverLetterPreviewProps) => {
  const paragraphs = getLetterParagraphs(data)
  const recipientLines = getRecipientLines(data)
  const greetingName = data.hiringManager.trim()
  const signoffLabel = data.signoffLabel.trim()
  const dateLabel = data.date.trim()
  const credentialName = config.credentialName.trim()
  const credentialDetail = config.credentialDetail.trim()
  const credentialLogoSrc = config.credentialLogoSrc.trim()
  const hasCredential = credentialName.length > 0 || credentialDetail.length > 0

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="resume-page bg-white px-10 py-9 md:px-11 md:py-10 print:shadow-none print:px-0 print:py-0">
          <article className="cover-letter-document cover-letter-sheet">
            <DocumentHeader
              name={data.yourName}
              role={config.tagline}
              profileSrc={config.profileSrc}
              profileAlt={config.profileAlt}
              email={data.yourEmail}
              phone={data.yourPhone}
              website={data.yourWebsite}
              location={data.yourAddress}
              variant="cover-letter"
            />

            {hasCredential ? (
              <>
                <section className="cover-letter-credential" aria-label="Education">
                  {credentialLogoSrc ? (
                    <span className="cover-letter-credential-logo-shell">
                      <img
                        src={resolveStudioAssetSrc(credentialLogoSrc, credentialLogoSrc)}
                        alt={config.credentialLogoAlt}
                        className="cover-letter-credential-logo"
                      />
                    </span>
                  ) : null}
                  <span className="cover-letter-credential-copy">
                    {credentialName ? (
                      <span className="cover-letter-credential-name">{credentialName}</span>
                    ) : null}
                    {credentialDetail ? (
                      <span className="cover-letter-credential-detail">{credentialDetail}</span>
                    ) : null}
                  </span>
                </section>
                <hr className="cover-letter-document-section-divider" />
              </>
            ) : null}

            <section className="cover-letter-document-section">
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

          ${DOCUMENT_HEADER_PRINT_CSS}

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
            font-size: 8.6pt !important;
            line-height: 1.34 !important;
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
            letter-spacing: 0 !important;
            color: #1e293b !important;
            line-height: 1.18 !important;
          }

          .cover-letter-credential-detail {
            font-size: 7.6pt !important;
            font-weight: 400 !important;
            letter-spacing: 0 !important;
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
