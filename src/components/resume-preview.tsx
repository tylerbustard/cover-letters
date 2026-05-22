import { Globe, Mail, MapPin, Phone } from 'lucide-react'

import { resolveStudioAssetSrc } from '@/data/assets'
import type { ResumeCertificationArea, ResumeTemplate } from '@/types'

interface ResumePreviewProps {
  template: ResumeTemplate
}

type ResumeEntry = {
  id: string
  role: string
  period: string
  organization: string
  location: string
  logo: string
  logoClassName?: string
  bullets: string[]
  skills?: string
}

type ResumeCertification = {
  name: string
  issuer: string
  year: string
  logo: string
  emphasis?: boolean
  detail?: string
}

type ResumeCertificationBlock = {
  title: string
  caption: string
  certifications: ResumeCertification[]
}

const normalizePeriod = (value: string) =>
  value.replace(/^(\d{4})-(\d{4}|Present)$/u, '$1 - $2')

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/gu, '-')
    .replace(/^-+/u, '')
    .replace(/-+$/u, '')

const renderResumeEntry = (entry: ResumeEntry, options?: { showSkills?: boolean }) => (
  <article key={entry.id} id={entry.id} className="resume-entry">
    <div className="resume-entry-header">
      <h4 className="resume-entry-title">{entry.role}</h4>
      <span className="resume-entry-date">{entry.period}</span>
    </div>
    <div className="resume-entry-meta">
      <img
        src={entry.logo}
        alt={entry.organization}
        className={`resume-entry-logo ${entry.logoClassName ?? ''}`}
      />
      <span className="resume-entry-organization">{entry.organization}</span>
      <span className="resume-entry-meta-separator" aria-hidden="true">
        |
      </span>
      <span className="resume-entry-location">{entry.location}</span>
    </div>
    <ul className="resume-entry-bullets">
      {entry.bullets.map((bullet) => (
        <li key={bullet} className="resume-entry-bullet-line">
          {bullet}
        </li>
      ))}
    </ul>
    {options?.showSkills && entry.skills ? (
      <p className="resume-entry-skills resume-entry-skills-animated">
        <span className="resume-entry-skills-label">Skills:</span> {entry.skills}
      </p>
    ) : null}
  </article>
)

export const ResumePreview = ({ template }: ResumePreviewProps) => {
  const { data } = template

  const experienceEntries: ResumeEntry[] = [
    ...data.experience.primary,
    ...data.experience.groups.flatMap((group) => group.items),
  ].map((entry) => ({
    id: `experience-${slugify(entry.company)}-${slugify(entry.role)}`,
    role: entry.role,
    period: normalizePeriod(entry.date),
    organization: entry.company,
    location: entry.location,
    logo: resolveStudioAssetSrc(entry.logoSrc, entry.logoSrc),
    bullets: entry.bullets,
    skills: entry.skills.join(' · '),
  }))

  const educationEntries: ResumeEntry[] = data.education.map((entry) => {
    const isNccEntry = entry.id === 'education-northeast-christian-college' || entry.school === 'Northeast Christian College'

    return {
      id: entry.id,
      role: entry.degree,
      period: normalizePeriod(entry.date),
      organization: entry.school,
      location: entry.program,
      logo: resolveStudioAssetSrc(entry.logoSrc, entry.logoSrc),
      logoClassName: isNccEntry ? 'resume-entry-logo--ncc' : undefined,
      bullets: entry.bullets,
    }
  })

  const communityEntries: ResumeEntry[] = data.leadership.flatMap((group) =>
    group.items.map((entry) => ({
      id: `community-${slugify(entry.organization)}`,
      role: entry.role,
      period: normalizePeriod(entry.date),
      organization: entry.organization,
      location: entry.location,
      logo: resolveStudioAssetSrc(entry.logoSrc, entry.logoSrc),
      bullets: entry.bullets,
    })),
  )

  const certificationAreas: ResumeCertificationBlock[] = data.certifications.areas.map((area: ResumeCertificationArea) => ({
    title: area.title,
    caption: area.caption,
    certifications: [...area.items]
      .sort((left, right) => Number.parseInt(right.year, 10) - Number.parseInt(left.year, 10))
      .map((item) => ({
        name: item.name,
        issuer: item.issuer,
        year: item.year,
        logo: resolveStudioAssetSrc(item.logoSrc, item.logoSrc),
        emphasis: item.emphasis,
        detail: item.detail,
      })),
  }))

  const leftColumnCertificationTitles = new Set([
    'Investment & Markets',
    'Data & Business Intelligence',
    'Graduate Admissions',
  ])

  const certificationAreaColumns = [
    certificationAreas.filter((area) => leftColumnCertificationTitles.has(area.title)),
    certificationAreas.filter((area) => !leftColumnCertificationTitles.has(area.title)),
  ]

  const websiteLabel = data.header.contact.website.replace(/^https?:\/\//u, '')
  const websiteHref = `https://${websiteLabel}`
  const phoneHref = `tel:${data.header.contact.phone.replace(/[^+\d]/gu, '')}`

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="resume-page bg-white px-10 py-9 md:px-11 md:py-10 print:shadow-none print:px-0 print:py-0">
          <div className="resume-print-page-one-flow">
            <header className="resume-header">
              <div className="resume-header-top">
                <div className="resume-header-portrait-shell">
                  <div className="resume-header-portrait-frame">
                    <img
                      src={resolveStudioAssetSrc(data.header.profileSrc, data.header.profileSrc)}
                      alt={data.header.profileAlt}
                      className="resume-header-portrait-image"
                    />
                  </div>
                </div>
                <div className="resume-header-copy">
                  <h1 className="resume-header-name">{data.header.name}</h1>
                </div>
              </div>
              <div id="contact" className="resume-header-contact">
                <a
                  href={`mailto:${data.header.contact.email}`}
                  className="resume-header-contact-link"
                  aria-label="Email Tyler Bustard"
                >
                  <Mail size={13} />
                  {data.header.contact.email}
                </a>
                <span className="resume-contact-separator" aria-hidden="true" />
                <a
                  href={phoneHref}
                  className="resume-header-contact-link"
                  aria-label="Call Tyler Bustard"
                >
                  <Phone size={13} />
                  {data.header.contact.phone}
                </a>
                <span className="resume-contact-separator" aria-hidden="true" />
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resume-header-contact-link"
                  aria-label="Visit Tyler Bustard website"
                >
                  <Globe size={13} />
                  {websiteLabel}
                </a>
                <span className="resume-contact-separator" aria-hidden="true" />
                <span className="resume-header-contact-item">
                  <MapPin size={13} />
                  {data.header.contact.location}
                </span>
              </div>
              <hr className="resume-header-divider" />
            </header>

            <section className="resume-summary-section">
              <p className="resume-summary-text">{data.header.summary}</p>
            </section>

            <section id="experience" className="resume-section">
              <h3 className="resume-section-heading">Experience</h3>
              <div className="resume-section-body resume-section-body-stack">
                {experienceEntries.map((entry) => renderResumeEntry(entry, { showSkills: true }))}
              </div>
            </section>
          </div>

          <div className="resume-print-page-two-flow">
            <section id="education" className="resume-section">
              <h3 className="resume-section-heading">Education</h3>
              <div className="resume-section-body resume-section-body-stack">
                {educationEntries.map((entry) => renderResumeEntry(entry))}
              </div>
            </section>

            <section id="certifications" className="resume-section">
              <h3 className="resume-section-heading">Certifications</h3>

              <div className="resume-section-body resume-certification-columns">
                {certificationAreaColumns.map((column, columnIndex) => (
                  <div
                    key={`certification-column-${columnIndex}`}
                    className={`resume-certification-column${columnIndex === 0 ? ' resume-certification-column-left' : ' resume-certification-column-right'}`}
                  >
                    {column.map((area) => (
                      <article key={area.title} className="resume-certification-area">
                        <div className="resume-certification-area-header">
                          <h4 className="resume-certification-area-title">{area.title}</h4>
                          <p className="resume-certification-area-caption">{area.caption}</p>
                        </div>

                        <div className="resume-certification-cards">
                          {area.certifications.map((certification) => (
                            <div key={`${area.title}-${certification.name}`} className="resume-certification-card">
                              <div className="resume-certification-card-brand">
                                <span className="resume-certification-card-logo-shell" aria-hidden="true">
                                  <img
                                    src={certification.logo}
                                    alt={certification.issuer}
                                    className="resume-certification-card-logo"
                                  />
                                </span>
                                <div className="resume-certification-card-copy">
                                  <p
                                    className={`resume-certification-card-title${
                                      certification.emphasis ? ' resume-certification-card-title-emphasis' : ''
                                    }`}
                                  >
                                    {certification.name}
                                  </p>
                                  <p className="resume-certification-card-issuer">{certification.issuer}</p>
                                </div>
                              </div>
                              <div className="resume-certification-card-meta">
                                <span className="resume-certification-card-year">{certification.year}</span>
                                {certification.detail ? (
                                  <span className="resume-certification-card-detail">{certification.detail}</span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section id="community" className="resume-section">
              <h3 className="resume-section-heading">Community</h3>
              <div className="resume-section-body resume-section-body-stack">
                {communityEntries.map((entry) => renderResumeEntry(entry))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.35in 0.46in;
          }

          :root {
            --pdf-density: 0.94;
            --pdf-page-margin-top-bottom: 0.35in;
            --pdf-page-margin-left-right: 0.46in;
            --pdf-space-1: calc(2pt * var(--pdf-density));
            --pdf-space-2: calc(4pt * var(--pdf-density));
            --pdf-space-3: calc(6pt * var(--pdf-density));
            --pdf-space-4: calc(8pt * var(--pdf-density));
            --pdf-space-5: calc(12pt * var(--pdf-density));
            --pdf-space-6: calc(16pt * var(--pdf-density));
            --pdf-column-gap: calc(12pt * var(--pdf-density));
            --pdf-heading-size: calc(9.3pt * var(--pdf-density));
            --pdf-entry-title-size: calc(8.8pt * var(--pdf-density));
            --pdf-entry-date-size: calc(7pt * var(--pdf-density));
            --pdf-meta-size: calc(7.2pt * var(--pdf-density));
            --pdf-bullet-size: calc(8.15pt * var(--pdf-density));
            --pdf-skills-size: calc(6.9pt * var(--pdf-density));
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

          .pb-12,
          .pt-24 {
            padding: 0 !important;
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
          }

          .resume-print-page-one-flow,
          .resume-print-page-two-flow {
            display: flex !important;
            flex-direction: column !important;
            gap: calc(10pt * var(--pdf-density)) !important;
          }

          .resume-print-page-two-flow {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0 !important;
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

          .resume-header-role {
            font-size: 11pt !important;
            line-height: 1.15 !important;
            margin-top: var(--pdf-space-2) !important;
            color: #64748b !important;
          }

          .resume-header-contact {
            margin-top: var(--pdf-space-3) !important;
            gap: var(--pdf-space-1) var(--pdf-space-3) !important;
            font-size: 8.2pt !important;
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
          a {
            font-size: 8.2pt !important;
            line-height: 1.36 !important;
          }

          .text-xs {
            font-size: 7.15pt !important;
          }

          a {
            color: inherit !important;
            text-decoration: none !important;
          }

          .text-primary {
            color: #1e40af !important;
          }

          .text-slate-900 {
            color: #0f172a !important;
          }

          .text-slate-700 {
            color: #334155 !important;
          }

          .text-slate-600 {
            color: #475569 !important;
          }

          .text-slate-500 {
            color: #64748b !important;
          }

          .text-slate-400 {
            color: #94a3b8 !important;
          }

          .text-slate-300 {
            color: #cbd5e1 !important;
          }

          .border-slate-300 {
            border-color: #cbd5e1 !important;
          }

          img {
            max-width: 100% !important;
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

          .resume-section-heading {
            margin: 0 0 var(--pdf-space-3) !important;
            padding: 0 0 var(--pdf-space-2) !important;
            border-bottom: 1px solid #cbd5e1 !important;
            color: #0f172a !important;
            font-size: var(--pdf-heading-size) !important;
            line-height: 1.1 !important;
            letter-spacing: 0.16em !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
          }

          .resume-section-body {
            display: flex !important;
            flex-direction: column !important;
          }

          .resume-section-body-stack {
            gap: calc(9pt * var(--pdf-density)) !important;
          }

          .resume-summary-text {
            font-size: 8.55pt !important;
            line-height: 1.44 !important;
          }

          #experience,
          #certifications,
          #community,
          #education {
            margin-bottom: 0 !important;
          }

          .resume-entry,
          .resume-certification-area {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .resume-entry-header {
            display: flex !important;
            align-items: baseline !important;
            justify-content: space-between !important;
            gap: var(--pdf-space-3) !important;
          }

          .resume-entry-title {
            margin: 0 !important;
            color: #0f172a !important;
            font-size: var(--pdf-entry-title-size) !important;
            line-height: 1.18 !important;
            letter-spacing: -0.018em !important;
            font-weight: 700 !important;
          }

          .resume-entry-date {
            flex: 0 0 auto !important;
            margin-left: auto !important;
            color: #94a3b8 !important;
            font-size: var(--pdf-entry-date-size) !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
          }

          .resume-entry-meta {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: var(--pdf-space-1) var(--pdf-space-2) !important;
            margin-top: var(--pdf-space-1) !important;
            color: #64748b !important;
            font-size: var(--pdf-meta-size) !important;
            line-height: 1.25 !important;
          }

          .resume-entry-logo {
            width: 11pt !important;
            height: 11pt !important;
            flex: 0 0 11pt !important;
            object-fit: contain !important;
          }

          .resume-entry-logo--ncc {
            width: 17pt !important;
            height: 7.4pt !important;
            flex-basis: 17pt !important;
            filter: grayscale(1) invert(1) !important;
          }

          .resume-entry-bullets {
            margin: var(--pdf-space-2) 0 0 !important;
            padding-left: 11pt !important;
            display: grid !important;
            gap: var(--pdf-space-1) !important;
            color: #334155 !important;
            font-size: var(--pdf-bullet-size) !important;
            line-height: 1.34 !important;
          }

          .resume-entry-bullets li {
            margin: 0 !important;
            font-size: var(--pdf-bullet-size) !important;
            line-height: 1.36 !important;
          }

          #experience .resume-section-body-stack {
            gap: calc(10.75pt * var(--pdf-density)) !important;
          }

          .resume-entry-skills {
            display: block !important;
            margin: var(--pdf-space-1) 0 0 !important;
            padding-left: 11pt !important;
            color: #64748b !important;
            font-size: var(--pdf-skills-size) !important;
            line-height: 1.24 !important;
            letter-spacing: -0.01em !important;
          }

          .resume-entry-skills-label {
            color: #475569 !important;
            font-weight: 600 !important;
          }

          .resume-certification-columns {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            column-gap: var(--pdf-column-gap) !important;
            align-items: start !important;
          }

          .resume-certification-column {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            gap: calc(7pt * var(--pdf-density)) !important;
          }

          .resume-certification-area {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 0 !important;
            border-top: 1px solid #dbe3ee !important;
            border-radius: 0 !important;
            padding: var(--pdf-space-2) 0 0 !important;
            background: transparent !important;
          }

          .resume-certification-area-header {
            margin-bottom: calc(4.5pt * var(--pdf-density)) !important;
          }

          .resume-certification-area-title {
            margin: 0 !important;
            font-size: 7.6pt !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            color: #475569 !important;
          }

          .resume-certification-area-caption {
            margin: var(--pdf-space-1) 0 0 !important;
            font-size: 7.15pt !important;
            line-height: 1.32 !important;
            color: #64748b !important;
          }

          .resume-certification-cards {
            display: block !important;
          }

          .resume-certification-card {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: var(--pdf-space-2) !important;
            padding-top: 0 !important;
            border-top: none !important;
          }

          .resume-certification-card + .resume-certification-card {
            margin-top: calc(2.4pt * var(--pdf-density)) !important;
            padding-top: calc(2.4pt * var(--pdf-density)) !important;
            border-top: 1px solid #edf2f7 !important;
          }

          #community .resume-section-body-stack {
            gap: var(--pdf-space-3) !important;
          }

          .resume-certification-card-brand {
            display: flex !important;
            align-items: center !important;
            gap: var(--pdf-space-2) !important;
            min-width: 0 !important;
          }

          .resume-certification-card-logo-shell {
            width: 11pt !important;
            height: 11pt !important;
            flex: 0 0 11pt !important;
            display: grid !important;
            place-items: center !important;
            align-self: center !important;
          }

          .resume-certification-card-logo {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
            object-position: center !important;
            border-radius: 0 !important;
            border: 0 !important;
            background: transparent !important;
            padding: 0 !important;
          }

          .resume-certification-card-copy {
            min-width: 0 !important;
          }

          .resume-certification-card-title {
            margin: 0 !important;
            font-size: 7.82pt !important;
            line-height: 1.22 !important;
            letter-spacing: -0.01em !important;
            color: #0f172a !important;
            font-weight: 600 !important;
          }

          .resume-certification-card-title-emphasis {
            font-weight: 700 !important;
          }

          .resume-certification-card-issuer {
            margin: var(--pdf-space-1) 0 0 !important;
            font-size: 6.92pt !important;
            line-height: 1.24 !important;
            color: #64748b !important;
          }

          .resume-certification-card-meta {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            gap: 1pt !important;
            flex: 0 0 auto !important;
          }

          .resume-certification-card-year {
            font-size: 6.95pt !important;
            line-height: 1.2 !important;
            color: #94a3b8 !important;
            white-space: nowrap !important;
          }

          .resume-certification-card-detail {
            font-size: 6.55pt !important;
            line-height: 1.2 !important;
            color: #475569 !important;
            font-weight: 600 !important;
          }

          .resume-section,
          .resume-entry,
          .resume-certification-area {
            margin-bottom: 0 !important;
          }

          .resume-summary-text.scroll-slide-up,
          .resume-section-heading.scroll-slide-up,
          .resume-entry-header.scroll-slide-up,
          .resume-entry-meta.scroll-slide-up,
          .resume-entry-bullet-line.scroll-slide-up,
          .resume-entry-skills-animated.scroll-slide-up,
          .resume-certification-area-header.scroll-slide-up,
          .resume-certification-card.scroll-slide-up {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </>
  )
}
