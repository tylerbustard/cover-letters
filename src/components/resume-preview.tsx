import { type CSSProperties } from 'react'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'

import type {
  ResumeCertificationItem,
  ResumeCertificationStat,
  ResumeEducationItem,
  ResumeExperienceGroup,
  ResumeExperienceItem,
  ResumeLeadershipGroup,
  ResumeTemplate,
} from '@/types'
import { cn } from '@/lib/utils'

interface ResumePreviewProps {
  template: ResumeTemplate
}

const ContactChip = ({ icon: Icon, value }: { icon: typeof Mail; value: string }) => (
  <div className="resume-contact-chip">
    <Icon className="resume-contact-icon" />
    <span>{value}</span>
  </div>
)

const SectionHeading = ({ title }: { title: string }) => (
  <div className="resume-section-heading">
    <h3>{title}</h3>
  </div>
)

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
}) => (
  <div className="resume-card">
    <div className="resume-card-header">
      <div className={`resume-logo ${logoAlt === 'Northeast Christian College' ? 'resume-logo-dark' : ''}`}>
        <img src={logoSrc} alt={logoAlt} />
      </div>
      <div className="resume-card-body">
        <div className="resume-card-title-row">
          <div>
            <h4>{title}</h4>
            {subtitle && <p className="resume-card-subtitle">{subtitle}</p>}
            {organization && <p className="resume-card-org">{organization}</p>}
            {location && <p className="resume-card-location">{location}</p>}
          </div>
          {date && <span className="resume-card-date">{date}</span>}
        </div>
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
      <div key={group.id} className="resume-group">
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
              <div key={`${item.id}-${index}`} className="resume-stat-logo">
                <img src={logo.src} alt={logo.alt} />
              </div>
            ))}
          </div>
          <span className="resume-card-date">{item.count}</span>
        </div>
        <p>{item.label}</p>
      </div>
    ))}
  </div>
)

const LeadershipGroups = ({ groups }: { groups: ResumeLeadershipGroup[] }) => (
  <div className="resume-stack">
    {groups.map((group) => (
      <div key={group.id} className="resume-group">
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

export const ResumePreview = ({ template }: ResumePreviewProps) => {
  const { theme, data } = template
  const styleVars: CSSProperties = {
    '--accent': theme.accent,
    '--accent-soft': theme.accentSoft,
    '--accent-dark': theme.accentDark,
  } as CSSProperties

  return (
    <div className="resume-preview" style={styleVars}>
      <div className="resume-header">
        <div className="resume-header-main">
          <img src={data.header.profileSrc} alt={data.header.profileAlt} className="resume-avatar" />
          <div>
            <h1>{data.header.name}</h1>
            <h2>{data.header.title}</h2>
          </div>
        </div>
        <div className="resume-contact-grid">
          <ContactChip icon={Mail} value={data.header.contact.email} />
          <ContactChip icon={Phone} value={data.header.contact.phone} />
          <ContactChip icon={Globe} value={data.header.contact.website} />
          <ContactChip icon={MapPin} value={data.header.contact.location} />
        </div>
        <p className="resume-summary">{data.header.summary}</p>
      </div>

      <SectionHeading title="Education" />
      <EducationList items={data.education} />

      <SectionHeading title="Professional Experience" />
      <ExperienceStack items={data.experience.primary} />
      <ExperienceGroups groups={data.experience.groups} />

      <SectionHeading title="Professional Certifications" />
      <CertificationCards items={data.certifications.featured} />
      <CertificationStats items={data.certifications.stats} />

      <SectionHeading title="Community Leadership" />
      <LeadershipGroups groups={data.leadership} />
    </div>
  )
}
