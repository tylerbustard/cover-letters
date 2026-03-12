import { forwardRef, type CSSProperties } from 'react'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'

import {
  createDocumentVisualStyle,
  DocumentDatePill,
  DocumentHeader,
  DocumentInlineMeta,
  DocumentLogoBadge,
  DocumentSectionHeading,
} from '@/components/document-primitives'
import type {
  DocumentLayoutMode,
  ExportBalancePreset,
  ExportBreakAnchor,
  PresentationContactLayout,
  PresentationDensity,
  ResumeCertificationItem,
  ResumeCertificationStat,
  ResumeEducationItem,
  ResumeExperienceGroup,
  ResumeExperienceItem,
  ResumeLeadershipGroup,
  ResumeTemplate,
} from '@/types'
import { cn } from '@/lib/utils'

const toClassSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

interface ResumePreviewProps {
  template: ResumeTemplate
  density: PresentationDensity
  showAvatar: boolean
  contactLayout: PresentationContactLayout
  layoutMode?: DocumentLayoutMode
  balancePreset?: ExportBalancePreset
  breakAnchor?: ExportBreakAnchor
  fontScale?: number
  spaceScale?: number
  previewPage1Whitespace?: number
}

const ResumeCard = ({
  title,
  subtitle,
  organization,
  date,
  location,
  logoSrc,
  logoAlt,
  bullets,
  skills,
}: {
  title: string
  subtitle?: string
  organization?: string
  date?: string
  location?: string
  logoSrc: string
  logoAlt: string
  bullets?: string[]
  skills?: string[]
}) => {
  const headerMeta = [subtitle, location, date].filter((value): value is string => Boolean(value?.trim()))

  return (
    <div className="resume-card">
      <div className="resume-card-header">
        <DocumentLogoBadge
          src={logoSrc}
          alt={logoAlt}
          className="resume-logo-badge"
          imageClassName="resume-logo-image"
        />
        <div className="resume-card-body">
          <h4>{title}</h4>
          <DocumentInlineMeta items={headerMeta} className="resume-card-meta" />
          {organization ? <p className="resume-card-detail">{organization}</p> : null}
        </div>
      </div>
      {bullets && bullets.length > 0 && (
        <ul className="resume-bullets">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {skills && skills.length > 0 && (
        <div className="resume-skills">
          {skills.map((skill) => (
            <span key={skill} className="resume-skill">
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const EducationList = ({ items }: { items: ResumeEducationItem[] }) => (
  <div className="resume-stack">
    {items.map((item) => (
      <ResumeCard
        key={item.id}
        title={item.degree}
        subtitle={item.school}
        organization={item.program}
        date={item.date}
        logoSrc={item.logoSrc}
        logoAlt={item.logoAlt}
        bullets={item.bullets}
      />
    ))}
  </div>
)

const ExperienceStack = ({ items }: { items: ResumeExperienceItem[] }) => (
  <div className="resume-stack">
    {items.map((item) => (
      <ResumeCard
        key={item.id}
        title={item.role}
        subtitle={item.company}
        location={item.location}
        date={item.date}
        logoSrc={item.logoSrc}
        logoAlt={item.logoAlt}
        bullets={item.bullets}
        skills={item.skills}
      />
    ))}
  </div>
)

const ExperienceGroups = ({ groups }: { groups: ResumeExperienceGroup[] }) => (
  <div className="resume-stack">
    {groups.map((group) => (
      <div
        key={group.id}
        className={cn('resume-group', group.title ? `resume-group-${toClassSlug(group.title)}` : undefined)}
      >
        {group.title && <p className="resume-group-title">{group.title}</p>}
        <div
          className={cn(
            'resume-stack',
            group.layout === 'grid' && `resume-grid resume-grid-${group.columns ?? 2}`,
          )}
        >
          {group.items.map((item) => (
            <ResumeCard
              key={item.id}
              title={item.role}
              subtitle={item.company}
              location={item.location}
              date={item.date}
              logoSrc={item.logoSrc}
              logoAlt={item.logoAlt}
              bullets={item.bullets}
              skills={item.skills}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)

const CertificationCards = ({ items }: { items: ResumeCertificationItem[] }) => (
  <div className="resume-grid resume-grid-2">
    {items.map((item) => (
      <ResumeCard
        key={item.id}
        title={item.title}
        subtitle={item.organization}
        organization={item.detail}
        date={item.date}
        logoSrc={item.logoSrc}
        logoAlt={item.logoAlt}
      />
    ))}
  </div>
)

const CertificationStats = ({ items }: { items: ResumeCertificationStat[] }) => (
  <div className="resume-grid resume-grid-3">
    {items.map((item) => (
      <div key={item.id} className="resume-stat">
        <div className="resume-stat-row">
          <div className="resume-stat-logos">
            {item.logos.map((logo, index) => (
              <DocumentLogoBadge
                key={`${item.id}-${index}`}
                src={logo.src}
                alt={logo.alt}
                className="resume-stat-logo-badge"
                imageClassName="resume-stat-logo-image"
              />
            ))}
          </div>
          <DocumentDatePill>{item.count}</DocumentDatePill>
        </div>
        <p>{item.label}</p>
      </div>
    ))}
  </div>
)

const LeadershipGroups = ({ groups }: { groups: ResumeLeadershipGroup[] }) => (
  <div className="resume-stack">
    {groups.map((group) => (
      <div
        key={group.id}
        className={cn('resume-group', group.title ? `resume-group-${toClassSlug(group.title)}` : undefined)}
      >
        {group.title && <p className="resume-group-title">{group.title}</p>}
        <div
          className={cn(
            'resume-stack',
            group.layout === 'grid' && `resume-grid resume-grid-${group.columns ?? 2}`,
          )}
        >
          {group.items.map((item) => (
            <ResumeCard
              key={item.id}
              title={item.role}
              subtitle={item.organization}
              location={item.location}
              date={item.date}
              logoSrc={item.logoSrc}
              logoAlt={item.logoAlt}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)

export const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  (
    {
      template,
      density,
      showAvatar,
      contactLayout,
      layoutMode = 'screen',
      balancePreset = 'balanced',
      breakAnchor = 'none',
      fontScale = 1,
      spaceScale = 1,
      previewPage1Whitespace,
    },
    ref,
  ) => {
  const { theme, data } = template
  const styleVars = {
    ...createDocumentVisualStyle(theme),
    '--resume-font-scale': `${fontScale}`,
    '--resume-space-scale': `${spaceScale}`,
    ...(typeof previewPage1Whitespace === 'number'
      ? { '--resume-preview-page-1-whitespace': `${previewPage1Whitespace}in` }
      : {}),
  } as CSSProperties

  return (
    <div
      ref={ref}
      className="resume-preview"
      style={styleVars}
      data-density={density}
      data-contact-layout={contactLayout}
      data-avatar={showAvatar ? 'visible' : 'hidden'}
      data-layout-mode={layoutMode}
      data-balance-preset={balancePreset}
      data-break-anchor={breakAnchor}
    >
      <DocumentHeader
        name={data.header.name}
        title={data.header.title}
        profileSrc={data.header.profileSrc}
        profileAlt={data.header.profileAlt}
        contactItems={[
          { key: 'email', icon: Mail, value: data.header.contact.email },
          { key: 'phone', icon: Phone, value: data.header.contact.phone },
          { key: 'website', icon: Globe, value: data.header.contact.website },
          { key: 'location', icon: MapPin, value: data.header.contact.location },
        ]}
        summary={data.header.summary}
        showAvatar={showAvatar}
      />

      <section className="resume-section resume-section-education">
        <DocumentSectionHeading title="Education" />
        <EducationList items={data.education} />
      </section>

      <section className="resume-section resume-section-professional-experience">
        <DocumentSectionHeading title="Professional Experience" />
        <ExperienceStack items={data.experience.primary} />
        <ExperienceGroups groups={data.experience.groups} />
      </section>

      <section className="resume-section resume-section-professional-certifications">
        <DocumentSectionHeading title="Professional Certifications" />
        <CertificationCards items={data.certifications.featured} />
        <CertificationStats items={data.certifications.stats} />
      </section>

      <section className="resume-section resume-section-community-leadership">
        <DocumentSectionHeading title="Community Leadership" />
        <LeadershipGroups groups={data.leadership} />
      </section>
    </div>
  )
  },
)

ResumePreview.displayName = 'ResumePreview'
