
import { useMemo, useState } from 'react'
import { Download, Mail } from 'lucide-react'

import { CoverLetterPreview } from '@/components/cover-letter-preview'
import { ResumePreview } from '@/components/resume-preview'
import { EmailSignaturePreview } from '@/components/email-signature-preview'
import { COVER_LETTER_TEMPLATES } from '@/data/coverLetters'
import { RESUME_TEMPLATES } from '@/data/resumes'
import { SIGNATURE_TEMPLATES } from '@/data/signatures'
import { logoOptions, profileOptions, signatureOptions } from '@/data/assets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  CoverLetterId,
  CoverLetterTemplate,
  DocumentType,
  EmailSignatureTemplate,
  ResumeCertificationItem,
  ResumeCertificationStat,
  ResumeEducationItem,
  ResumeExperienceGroup,
  ResumeExperienceItem,
  ResumeId,
  ResumeLeadershipGroup,
  ResumeLeadershipItem,
  ResumeTemplate,
  SignatureId,
} from '@/types'
import { cn } from '@/lib/utils'

const selectClassName =
  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400'

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

const splitComma = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

const joinLines = (lines: string[]) => lines.join('\n')
const joinComma = (items: string[]) => items.join(', ')

const findLogoLabel = (src: string) => logoOptions.find((option) => option.value === src)?.label ?? 'Logo'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildSignatureHtml = (template: EmailSignatureTemplate) => {
  const { data, accent } = template
  const logoHtml = data.logos
    .map(
      (logo) =>
        `<span style="display:inline-block;margin-right:6px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;">` +
        `<img src="${logo.src}" alt="${escapeHtml(logo.alt)}" style="max-width:32px;max-height:18px;display:block;" />` +
        `</span>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<body>
<table cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',sans-serif;color:#0f172a;">
  <tr>
    <td style="padding:0 12px 0 0;vertical-align:top;">
      <img src="${data.profileSrc}" alt="${escapeHtml(data.profileAlt)}" width="64" height="64" style="border-radius:14px;border:1px solid #e2e8f0;object-fit:cover;" />
    </td>
    <td style="vertical-align:top;">
      <div style="font-size:18px;font-weight:700;">${escapeHtml(data.name)}</div>
      <div style="font-size:13px;font-weight:600;color:${accent};">${escapeHtml(data.role)}</div>
      ${data.organization ? `<div style="font-size:13px;color:#475569;">${escapeHtml(data.organization)}</div>` : ''}
      <div style="margin-top:10px;font-size:12px;color:#1f2937;">
        ${escapeHtml(data.phone)} | ${escapeHtml(data.email)} | ${escapeHtml(data.website)}
        ${data.location ? ` | ${escapeHtml(data.location)}` : ''}
      </div>
      <div style="margin-top:12px;">${logoHtml}</div>
    </td>
  </tr>
</table>
</body>
</html>`
}

const EditorSection = ({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
    <div className="mb-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
    </div>
    <div className="space-y-3">{children}</div>
  </section>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</Label>
    {children}
  </div>
)

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) => (
  <div className="space-y-1">
    <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-12 rounded-md border border-slate-200 bg-white"
      />
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  </div>
)

const LogoMultiSelect = ({
  selected,
  onChange,
}: {
  selected: { src: string; alt: string }[]
  onChange: (next: { src: string; alt: string }[]) => void
}) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {logoOptions.map((option) => {
      const checked = selected.some((logo) => logo.src === option.value)
      return (
        <label key={option.value} className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              if (event.target.checked) {
                onChange([...selected, { src: option.value, alt: option.label }])
              } else {
                onChange(selected.filter((logo) => logo.src !== option.value))
              }
            }}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />
          <span>{option.label}</span>
        </label>
      )
    })}
  </div>
)

export default function App() {
  const [documentType, setDocumentType] = useState<DocumentType>('resume')
  const [resumeTemplates, setResumeTemplates] = useState<ResumeTemplate[]>(() => RESUME_TEMPLATES)
  const [resumeId, setResumeId] = useState<ResumeId>(RESUME_TEMPLATES[0].id)
  const [coverLetters, setCoverLetters] = useState<CoverLetterTemplate[]>(() => COVER_LETTER_TEMPLATES)
  const [coverLetterId, setCoverLetterId] = useState<CoverLetterId>(COVER_LETTER_TEMPLATES[0].id)
  const [signatureTemplates, setSignatureTemplates] = useState<EmailSignatureTemplate[]>(() => SIGNATURE_TEMPLATES)
  const [signatureId, setSignatureId] = useState<SignatureId>(SIGNATURE_TEMPLATES[0].id)
  const [statusMessage, setStatusMessage] = useState('')

  const selectedResume = resumeTemplates.find((template) => template.id === resumeId) ?? resumeTemplates[0]
  const selectedCoverLetter = coverLetters.find((template) => template.id === coverLetterId) ?? coverLetters[0]
  const selectedSignature =
    signatureTemplates.find((template) => template.id === signatureId) ?? signatureTemplates[0]

  const signatureHtml = useMemo(() => buildSignatureHtml(selectedSignature), [selectedSignature])

  const updateResumeTemplate = (id: string, updater: (template: ResumeTemplate) => ResumeTemplate) => {
    setResumeTemplates((prev) => prev.map((template) => (template.id === id ? updater(template) : template)))
  }

  const updateResumeHeader = (patch: Partial<ResumeTemplate['data']['header']>) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        header: {
          ...template.data.header,
          ...patch,
        },
      },
    }))
  }

  const updateResumeContact = (patch: Partial<ResumeTemplate['data']['header']['contact']>) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        header: {
          ...template.data.header,
          contact: {
            ...template.data.header.contact,
            ...patch,
          },
        },
      },
    }))
  }

  const updateResumeTheme = (patch: Partial<ResumeTemplate['theme']>) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      theme: {
        ...template.theme,
        ...patch,
      },
    }))
  }

  const updateEducationItem = (index: number, patch: Partial<ResumeEducationItem>) => {
    updateResumeTemplate(resumeId, (template) => {
      const education = template.data.education.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item,
      )
      return { ...template, data: { ...template.data, education } }
    })
  }

  const addEducationItem = () => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        education: [
          ...template.data.education,
          {
            id: makeId('education'),
            degree: 'New Degree',
            program: 'Program',
            school: 'Institution',
            date: 'Year',
            bullets: [],
            logoSrc: logoOptions[0].value,
            logoAlt: logoOptions[0].label,
          },
        ],
      },
    }))
  }

  const removeEducationItem = (index: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        education: template.data.education.filter((_, idx) => idx !== index),
      },
    }))
  }

  const updateExperiencePrimaryItem = (index: number, patch: Partial<ResumeExperienceItem>) => {
    updateResumeTemplate(resumeId, (template) => {
      const primary = template.data.experience.primary.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item,
      )
      return { ...template, data: { ...template.data, experience: { ...template.data.experience, primary } } }
    })
  }

  const addExperiencePrimaryItem = () => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        experience: {
          ...template.data.experience,
          primary: [
            ...template.data.experience.primary,
            {
              id: makeId('experience-primary'),
              role: 'New Role',
              company: 'Organization',
              location: 'Location',
              date: 'Year',
              bullets: [],
              skills: [],
              logoSrc: logoOptions[0].value,
              logoAlt: logoOptions[0].label,
            },
          ],
        },
      },
    }))
  }

  const removeExperiencePrimaryItem = (index: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        experience: {
          ...template.data.experience,
          primary: template.data.experience.primary.filter((_, idx) => idx !== index),
        },
      },
    }))
  }

  const updateExperienceGroup = (groupIndex: number, patch: Partial<ResumeExperienceGroup>) => {
    updateResumeTemplate(resumeId, (template) => {
      const groups = template.data.experience.groups.map((group, idx) =>
        idx === groupIndex ? { ...group, ...patch } : group,
      )
      return { ...template, data: { ...template.data, experience: { ...template.data.experience, groups } } }
    })
  }

  const updateExperienceGroupItem = (
    groupIndex: number,
    itemIndex: number,
    patch: Partial<ResumeExperienceItem>,
  ) => {
    updateResumeTemplate(resumeId, (template) => {
      const groups = template.data.experience.groups.map((group, idx) => {
        if (idx !== groupIndex) return group
        const items = group.items.map((item, itemIdx) =>
          itemIdx === itemIndex ? { ...item, ...patch } : item,
        )
        return { ...group, items }
      })
      return { ...template, data: { ...template.data, experience: { ...template.data.experience, groups } } }
    })
  }

  const addExperienceGroupItem = (groupIndex: number) => {
    updateResumeTemplate(resumeId, (template) => {
      const groups = template.data.experience.groups.map((group, idx) => {
        if (idx !== groupIndex) return group
        return {
          ...group,
          items: [
            ...group.items,
            {
              id: makeId('experience-group'),
              role: 'New Role',
              company: 'Organization',
              location: 'Location',
              date: 'Year',
              bullets: [],
              skills: [],
              logoSrc: logoOptions[0].value,
              logoAlt: logoOptions[0].label,
            },
          ],
        }
      })
      return { ...template, data: { ...template.data, experience: { ...template.data.experience, groups } } }
    })
  }

  const removeExperienceGroupItem = (groupIndex: number, itemIndex: number) => {
    updateResumeTemplate(resumeId, (template) => {
      const groups = template.data.experience.groups.map((group, idx) => {
        if (idx !== groupIndex) return group
        return { ...group, items: group.items.filter((_, i) => i !== itemIndex) }
      })
      return { ...template, data: { ...template.data, experience: { ...template.data.experience, groups } } }
    })
  }

  const updateCertificationItem = (index: number, patch: Partial<ResumeCertificationItem>) => {
    updateResumeTemplate(resumeId, (template) => {
      const featured = template.data.certifications.featured.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item,
      )
      return {
        ...template,
        data: {
          ...template.data,
          certifications: { ...template.data.certifications, featured },
        },
      }
    })
  }

  const addCertificationItem = () => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          ...template.data.certifications,
          featured: [
            ...template.data.certifications.featured,
            {
              id: makeId('cert'),
              title: 'New Certification',
              organization: 'Organization',
              detail: 'Details',
              date: 'Year',
              logoSrc: logoOptions[0].value,
              logoAlt: logoOptions[0].label,
            },
          ],
        },
      },
    }))
  }

  const removeCertificationItem = (index: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          ...template.data.certifications,
          featured: template.data.certifications.featured.filter((_, idx) => idx !== index),
        },
      },
    }))
  }

  const updateCertificationStat = (index: number, patch: Partial<ResumeCertificationStat>) => {
    updateResumeTemplate(resumeId, (template) => {
      const stats = template.data.certifications.stats.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item,
      )
      return {
        ...template,
        data: {
          ...template.data,
          certifications: { ...template.data.certifications, stats },
        },
      }
    })
  }

  const addCertificationStat = () => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          ...template.data.certifications,
          stats: [
            ...template.data.certifications.stats,
            {
              id: makeId('cert-stat'),
              label: 'Certification Group',
              count: '0',
              logos: [],
            },
          ],
        },
      },
    }))
  }

  const removeCertificationStat = (index: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          ...template.data.certifications,
          stats: template.data.certifications.stats.filter((_, idx) => idx !== index),
        },
      },
    }))
  }

  const updateLeadershipGroup = (groupIndex: number, patch: Partial<ResumeLeadershipGroup>) => {
    updateResumeTemplate(resumeId, (template) => {
      const leadership = template.data.leadership.map((group, idx) =>
        idx === groupIndex ? { ...group, ...patch } : group,
      )
      return { ...template, data: { ...template.data, leadership } }
    })
  }

  const updateLeadershipGroupItem = (
    groupIndex: number,
    itemIndex: number,
    patch: Partial<ResumeLeadershipItem>,
  ) => {
    updateResumeTemplate(resumeId, (template) => {
      const leadership = template.data.leadership.map((group, idx) => {
        if (idx !== groupIndex) return group
        const items = group.items.map((item, itemIdx) =>
          itemIdx === itemIndex ? { ...item, ...patch } : item,
        )
        return { ...group, items }
      })
      return { ...template, data: { ...template.data, leadership } }
    })
  }

  const addLeadershipGroupItem = (groupIndex: number) => {
    updateResumeTemplate(resumeId, (template) => {
      const leadership = template.data.leadership.map((group, idx) => {
        if (idx !== groupIndex) return group
        return {
          ...group,
          items: [
            ...group.items,
            {
              id: makeId('leadership'),
              role: 'New Role',
              organization: 'Organization',
              location: 'Location',
              date: 'Year',
              logoSrc: logoOptions[0].value,
              logoAlt: logoOptions[0].label,
            },
          ],
        }
      })
      return { ...template, data: { ...template.data, leadership } }
    })
  }

  const removeLeadershipGroupItem = (groupIndex: number, itemIndex: number) => {
    updateResumeTemplate(resumeId, (template) => {
      const leadership = template.data.leadership.map((group, idx) => {
        if (idx !== groupIndex) return group
        return { ...group, items: group.items.filter((_, i) => i !== itemIndex) }
      })
      return { ...template, data: { ...template.data, leadership } }
    })
  }

  const updateCoverLetterTemplate = (
    id: string,
    updater: (template: CoverLetterTemplate) => CoverLetterTemplate,
  ) => {
    setCoverLetters((prev) => prev.map((template) => (template.id === id ? updater(template) : template)))
  }

  const updateCoverLetterConfig = (patch: Partial<CoverLetterTemplate['config']>) => {
    updateCoverLetterTemplate(coverLetterId, (template) => ({
      ...template,
      config: {
        ...template.config,
        ...patch,
      },
    }))
  }

  const updateCoverLetterData = (patch: Partial<CoverLetterTemplate['data']>) => {
    updateCoverLetterTemplate(coverLetterId, (template) => ({
      ...template,
      data: {
        ...template.data,
        ...patch,
      },
    }))
  }

  const updateSignatureTemplate = (
    id: string,
    updater: (template: EmailSignatureTemplate) => EmailSignatureTemplate,
  ) => {
    setSignatureTemplates((prev) => prev.map((template) => (template.id === id ? updater(template) : template)))
  }

  const updateSignatureData = (patch: Partial<EmailSignatureTemplate['data']>) => {
    updateSignatureTemplate(signatureId, (template) => ({
      ...template,
      data: {
        ...template.data,
        ...patch,
      },
    }))
  }

  const updateSignatureAccent = (accent: string) => {
    updateSignatureTemplate(signatureId, (template) => ({ ...template, accent }))
  }

  const handleExportPdf = () => {
    const previousTitle = document.title
    const label =
      documentType === 'resume'
        ? selectedResume.label
        : documentType === 'cover-letter'
          ? selectedCoverLetter.label
          : selectedSignature.label
    document.title = `${label} - ${documentType}`
    window.print()
    setTimeout(() => {
      document.title = previousTitle
    }, 500)
  }

  const handleCopySignatureHtml = async () => {
    try {
      await navigator.clipboard.writeText(signatureHtml)
      setStatusMessage('Signature HTML copied to clipboard.')
      setTimeout(() => setStatusMessage(''), 2000)
    } catch (error) {
      setStatusMessage('Unable to copy signature HTML. Please copy manually.')
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white text-sm font-bold">
              TB
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Career Document Studio</h1>
              <p className="text-xs text-slate-500">Unified editor for resumes, cover letters, and signatures</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'resume', label: 'Resume' },
                { id: 'cover-letter', label: 'Cover Letter' },
                { id: 'email-signature', label: 'Email Signature' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDocumentType(tab.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
                  documentType === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExportPdf} variant="default">
              <Download /> Export PDF
            </Button>
            {documentType === 'email-signature' && (
              <Button onClick={handleCopySignatureHtml} variant="outline">
                <Mail /> Copy HTML
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="no-print space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto pr-2">
          {documentType === 'resume' && (
            <>
              <EditorSection title="Template" description="Select a resume version and tune the theme.">
                <Field label="Resume Template">
                  <select
                    value={resumeId}
                    onChange={(event) => setResumeId(event.target.value as ResumeId)}
                    className={selectClassName}
                  >
                    {resumeTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <ColorField
                  label="Accent Color"
                  value={selectedResume.theme.accent}
                  onChange={(value) => updateResumeTheme({ accent: value })}
                />
                <ColorField
                  label="Accent Soft"
                  value={selectedResume.theme.accentSoft}
                  onChange={(value) => updateResumeTheme({ accentSoft: value })}
                />
                <ColorField
                  label="Accent Dark"
                  value={selectedResume.theme.accentDark}
                  onChange={(value) => updateResumeTheme({ accentDark: value })}
                />
              </EditorSection>

              <EditorSection title="Header" description="Update the resume header, profile image, and summary.">
                <Field label="Name">
                  <Input
                    value={selectedResume.data.header.name}
                    onChange={(event) => updateResumeHeader({ name: event.target.value })}
                  />
                </Field>
                <Field label="Title">
                  <Input
                    value={selectedResume.data.header.title}
                    onChange={(event) => updateResumeHeader({ title: event.target.value })}
                  />
                </Field>
                <Field label="Profile Image">
                  <select
                    value={selectedResume.data.header.profileSrc}
                    onChange={(event) =>
                      updateResumeHeader({
                        profileSrc: event.target.value,
                        profileAlt: profileOptions.find((option) => option.value === event.target.value)?.label ??
                          selectedResume.data.header.profileAlt,
                      })
                    }
                    className={selectClassName}
                  >
                    {profileOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Summary">
                  <Textarea
                    value={selectedResume.data.header.summary}
                    onChange={(event) => updateResumeHeader({ summary: event.target.value })}
                  />
                </Field>
              </EditorSection>

              <EditorSection title="Contact" description="Control the contact chips shown on the resume.">
                <Field label="Email">
                  <Input
                    value={selectedResume.data.header.contact.email}
                    onChange={(event) => updateResumeContact({ email: event.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={selectedResume.data.header.contact.phone}
                    onChange={(event) => updateResumeContact({ phone: event.target.value })}
                  />
                </Field>
                <Field label="Website">
                  <Input
                    value={selectedResume.data.header.contact.website}
                    onChange={(event) => updateResumeContact({ website: event.target.value })}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={selectedResume.data.header.contact.location}
                    onChange={(event) => updateResumeContact({ location: event.target.value })}
                  />
                </Field>
              </EditorSection>

              <EditorSection title="Education" description="Manage degrees, institutions, and bullet highlights.">
                {selectedResume.data.education.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">{item.degree}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducationItem(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <Field label="Degree">
                      <Input value={item.degree} onChange={(event) => updateEducationItem(index, { degree: event.target.value })} />
                    </Field>
                    <Field label="Program">
                      <Input value={item.program} onChange={(event) => updateEducationItem(index, { program: event.target.value })} />
                    </Field>
                    <Field label="School">
                      <Input value={item.school} onChange={(event) => updateEducationItem(index, { school: event.target.value })} />
                    </Field>
                    <Field label="Dates">
                      <Input value={item.date} onChange={(event) => updateEducationItem(index, { date: event.target.value })} />
                    </Field>
                    <Field label="Logo">
                      <select
                        value={item.logoSrc}
                        onChange={(event) =>
                          updateEducationItem(index, {
                            logoSrc: event.target.value,
                            logoAlt: findLogoLabel(event.target.value),
                          })
                        }
                        className={selectClassName}
                      >
                        {logoOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Highlights">
                      <Textarea
                        value={joinLines(item.bullets)}
                        onChange={(event) => updateEducationItem(index, { bullets: splitLines(event.target.value) })}
                      />
                    </Field>
                  </div>
                ))}
                <Button variant="outline" onClick={addEducationItem}>
                  Add Education
                </Button>
              </EditorSection>

              <EditorSection title="Primary Experience" description="Edit the main experience timeline.">
                {selectedResume.data.experience.primary.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">{item.role}</p>
                      <Button variant="ghost" size="sm" onClick={() => removeExperiencePrimaryItem(index)}>
                        Remove
                      </Button>
                    </div>
                    <Field label="Role">
                      <Input value={item.role} onChange={(event) => updateExperiencePrimaryItem(index, { role: event.target.value })} />
                    </Field>
                    <Field label="Company">
                      <Input value={item.company} onChange={(event) => updateExperiencePrimaryItem(index, { company: event.target.value })} />
                    </Field>
                    <Field label="Location">
                      <Input value={item.location} onChange={(event) => updateExperiencePrimaryItem(index, { location: event.target.value })} />
                    </Field>
                    <Field label="Dates">
                      <Input value={item.date} onChange={(event) => updateExperiencePrimaryItem(index, { date: event.target.value })} />
                    </Field>
                    <Field label="Logo">
                      <select
                        value={item.logoSrc}
                        onChange={(event) =>
                          updateExperiencePrimaryItem(index, {
                            logoSrc: event.target.value,
                            logoAlt: findLogoLabel(event.target.value),
                          })
                        }
                        className={selectClassName}
                      >
                        {logoOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Bullets">
                      <Textarea
                        value={joinLines(item.bullets)}
                        onChange={(event) => updateExperiencePrimaryItem(index, { bullets: splitLines(event.target.value) })}
                      />
                    </Field>
                    <Field label="Skills">
                      <Input
                        value={joinComma(item.skills)}
                        onChange={(event) => updateExperiencePrimaryItem(index, { skills: splitComma(event.target.value) })}
                      />
                    </Field>
                  </div>
                ))}
                <Button variant="outline" onClick={addExperiencePrimaryItem}>
                  Add Primary Role
                </Button>
              </EditorSection>

              <EditorSection title="Experience Groups" description="Control early career and co-op blocks.">
                {selectedResume.data.experience.groups.map((group, groupIndex) => (
                  <div key={group.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <Field label="Group Title">
                      <Input
                        value={group.title ?? ''}
                        onChange={(event) => updateExperienceGroup(groupIndex, { title: event.target.value })}
                      />
                    </Field>
                    <Field label="Layout">
                      <select
                        value={group.layout}
                        onChange={(event) =>
                          updateExperienceGroup(groupIndex, {
                            layout: event.target.value as ResumeExperienceGroup['layout'],
                          })
                        }
                        className={selectClassName}
                      >
                        <option value="stack">Stack</option>
                        <option value="grid">Grid</option>
                      </select>
                    </Field>
                    {group.layout === 'grid' && (
                      <Field label="Columns">
                        <Input
                          type="number"
                          min={1}
                          max={3}
                          value={group.columns ?? 2}
                          onChange={(event) => updateExperienceGroup(groupIndex, { columns: Number(event.target.value) })}
                        />
                      </Field>
                    )}
                    {group.items.map((item, itemIndex) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">{item.role}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExperienceGroupItem(groupIndex, itemIndex)}
                          >
                            Remove
                          </Button>
                        </div>
                        <Field label="Role">
                          <Input
                            value={item.role}
                            onChange={(event) =>
                              updateExperienceGroupItem(groupIndex, itemIndex, { role: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Company">
                          <Input
                            value={item.company}
                            onChange={(event) =>
                              updateExperienceGroupItem(groupIndex, itemIndex, { company: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Location">
                          <Input
                            value={item.location}
                            onChange={(event) =>
                              updateExperienceGroupItem(groupIndex, itemIndex, { location: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Dates">
                          <Input
                            value={item.date}
                            onChange={(event) =>
                              updateExperienceGroupItem(groupIndex, itemIndex, { date: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Logo">
                          <select
                            value={item.logoSrc}
                            onChange={(event) =>
                              updateExperienceGroupItem(groupIndex, itemIndex, {
                                logoSrc: event.target.value,
                                logoAlt: findLogoLabel(event.target.value),
                              })
                            }
                            className={selectClassName}
                          >
                            {logoOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Bullets">
                          <Textarea
                            value={joinLines(item.bullets)}
                            onChange={(event) =>
                              updateExperienceGroupItem(groupIndex, itemIndex, { bullets: splitLines(event.target.value) })
                            }
                          />
                        </Field>
                        <Field label="Skills">
                          <Input
                            value={joinComma(item.skills)}
                            onChange={(event) =>
                              updateExperienceGroupItem(groupIndex, itemIndex, { skills: splitComma(event.target.value) })
                            }
                          />
                        </Field>
                      </div>
                    ))}
                    <Button variant="outline" onClick={() => addExperienceGroupItem(groupIndex)}>
                      Add Item
                    </Button>
                  </div>
                ))}
              </EditorSection>

              <EditorSection title="Certifications" description="Edit certifications and counts.">
                {selectedResume.data.certifications.featured.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                      <Button variant="ghost" size="sm" onClick={() => removeCertificationItem(index)}>
                        Remove
                      </Button>
                    </div>
                    <Field label="Title">
                      <Input value={item.title} onChange={(event) => updateCertificationItem(index, { title: event.target.value })} />
                    </Field>
                    <Field label="Organization">
                      <Input
                        value={item.organization}
                        onChange={(event) => updateCertificationItem(index, { organization: event.target.value })}
                      />
                    </Field>
                    <Field label="Detail">
                      <Input value={item.detail} onChange={(event) => updateCertificationItem(index, { detail: event.target.value })} />
                    </Field>
                    <Field label="Year">
                      <Input value={item.date} onChange={(event) => updateCertificationItem(index, { date: event.target.value })} />
                    </Field>
                    <Field label="Logo">
                      <select
                        value={item.logoSrc}
                        onChange={(event) =>
                          updateCertificationItem(index, {
                            logoSrc: event.target.value,
                            logoAlt: findLogoLabel(event.target.value),
                          })
                        }
                        className={selectClassName}
                      >
                        {logoOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                ))}
                <Button variant="outline" onClick={addCertificationItem}>
                  Add Certification
                </Button>

                <div className="h-px bg-slate-200" />

                {selectedResume.data.certifications.stats.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                      <Button variant="ghost" size="sm" onClick={() => removeCertificationStat(index)}>
                        Remove
                      </Button>
                    </div>
                    <Field label="Label">
                      <Input value={item.label} onChange={(event) => updateCertificationStat(index, { label: event.target.value })} />
                    </Field>
                    <Field label="Count">
                      <Input value={item.count} onChange={(event) => updateCertificationStat(index, { count: event.target.value })} />
                    </Field>
                    <Field label="Logos">
                      <LogoMultiSelect
                        selected={item.logos}
                        onChange={(next) => updateCertificationStat(index, { logos: next })}
                      />
                    </Field>
                  </div>
                ))}
                <Button variant="outline" onClick={addCertificationStat}>
                  Add Certification Group
                </Button>
              </EditorSection>

              <EditorSection title="Community Leadership" description="Control leadership entries and grouping.">
                {selectedResume.data.leadership.map((group, groupIndex) => (
                  <div key={group.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <Field label="Group Title">
                      <Input
                        value={group.title ?? ''}
                        onChange={(event) => updateLeadershipGroup(groupIndex, { title: event.target.value })}
                      />
                    </Field>
                    <Field label="Layout">
                      <select
                        value={group.layout}
                        onChange={(event) =>
                          updateLeadershipGroup(groupIndex, { layout: event.target.value as ResumeLeadershipGroup['layout'] })
                        }
                        className={selectClassName}
                      >
                        <option value="stack">Stack</option>
                        <option value="grid">Grid</option>
                      </select>
                    </Field>
                    {group.layout === 'grid' && (
                      <Field label="Columns">
                        <Input
                          type="number"
                          min={1}
                          max={3}
                          value={group.columns ?? 2}
                          onChange={(event) => updateLeadershipGroup(groupIndex, { columns: Number(event.target.value) })}
                        />
                      </Field>
                    )}
                    {group.items.map((item, itemIndex) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">{item.role}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLeadershipGroupItem(groupIndex, itemIndex)}
                          >
                            Remove
                          </Button>
                        </div>
                        <Field label="Role">
                          <Input
                            value={item.role}
                            onChange={(event) =>
                              updateLeadershipGroupItem(groupIndex, itemIndex, { role: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Organization">
                          <Input
                            value={item.organization}
                            onChange={(event) =>
                              updateLeadershipGroupItem(groupIndex, itemIndex, { organization: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Location">
                          <Input
                            value={item.location}
                            onChange={(event) =>
                              updateLeadershipGroupItem(groupIndex, itemIndex, { location: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Dates">
                          <Input
                            value={item.date}
                            onChange={(event) =>
                              updateLeadershipGroupItem(groupIndex, itemIndex, { date: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Logo">
                          <select
                            value={item.logoSrc}
                            onChange={(event) =>
                              updateLeadershipGroupItem(groupIndex, itemIndex, {
                                logoSrc: event.target.value,
                                logoAlt: findLogoLabel(event.target.value),
                              })
                            }
                            className={selectClassName}
                          >
                            {logoOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    ))}
                    <Button variant="outline" onClick={() => addLeadershipGroupItem(groupIndex)}>
                      Add Leadership Item
                    </Button>
                  </div>
                ))}
              </EditorSection>
            </>
          )}

          {documentType === 'cover-letter' && (
            <>
              <EditorSection title="Template" description="Select a cover letter template and theme.">
                <Field label="Cover Letter Template">
                  <select
                    value={coverLetterId}
                    onChange={(event) => setCoverLetterId(event.target.value as CoverLetterId)}
                    className={selectClassName}
                  >
                    {coverLetters.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <ColorField
                  label="Accent Color"
                  value={selectedCoverLetter.config.accent}
                  onChange={(value) => updateCoverLetterConfig({ accent: value })}
                />
                <ColorField
                  label="Accent Light"
                  value={selectedCoverLetter.config.accentLight}
                  onChange={(value) => updateCoverLetterConfig({ accentLight: value })}
                />
                <ColorField
                  label="Accent Dark"
                  value={selectedCoverLetter.config.accentDark}
                  onChange={(value) => updateCoverLetterConfig({ accentDark: value })}
                />
                <Field label="Tagline">
                  <Input
                    value={selectedCoverLetter.config.tagline}
                    onChange={(event) => updateCoverLetterConfig({ tagline: event.target.value })}
                  />
                </Field>
                <Field label="Organization">
                  <Input
                    value={selectedCoverLetter.config.organization}
                    onChange={(event) => updateCoverLetterConfig({ organization: event.target.value })}
                  />
                </Field>
                <Field label="Summary">
                  <Textarea
                    value={selectedCoverLetter.config.summary}
                    onChange={(event) => updateCoverLetterConfig({ summary: event.target.value })}
                  />
                </Field>
                <Field label="Profile Image">
                  <select
                    value={selectedCoverLetter.config.profileSrc}
                    onChange={(event) =>
                      updateCoverLetterConfig({
                        profileSrc: event.target.value,
                        profileAlt: profileOptions.find((option) => option.value === event.target.value)?.label ??
                          selectedCoverLetter.config.profileAlt,
                      })
                    }
                    className={selectClassName}
                  >
                    {profileOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Logo">
                  <select
                    value={selectedCoverLetter.config.logoSrc}
                    onChange={(event) =>
                      updateCoverLetterConfig({
                        logoSrc: event.target.value,
                        logoAlt: findLogoLabel(event.target.value),
                      })
                    }
                    className={selectClassName}
                  >
                    {logoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Signature">
                  <select
                    value={selectedCoverLetter.config.signatureSrc}
                    onChange={(event) =>
                      updateCoverLetterConfig({
                        signatureSrc: event.target.value,
                        signatureAlt:
                          signatureOptions.find((option) => option.value === event.target.value)?.label ??
                          selectedCoverLetter.config.signatureAlt,
                      })
                    }
                    className={selectClassName}
                  >
                    {signatureOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </EditorSection>

              <EditorSection title="Sender" description="Update your contact details.">
                <Field label="Your Name">
                  <Input
                    value={selectedCoverLetter.data.yourName}
                    onChange={(event) => updateCoverLetterData({ yourName: event.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    value={selectedCoverLetter.data.yourEmail}
                    onChange={(event) => updateCoverLetterData({ yourEmail: event.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={selectedCoverLetter.data.yourPhone}
                    onChange={(event) => updateCoverLetterData({ yourPhone: event.target.value })}
                  />
                </Field>
                <Field label="Website">
                  <Input
                    value={selectedCoverLetter.data.yourWebsite}
                    onChange={(event) => updateCoverLetterData({ yourWebsite: event.target.value })}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={selectedCoverLetter.data.yourAddress}
                    onChange={(event) => updateCoverLetterData({ yourAddress: event.target.value })}
                  />
                </Field>
              </EditorSection>

              <EditorSection title="Recipient" description="Control the recipient and company details.">
                <Field label="Company">
                  <Input
                    value={selectedCoverLetter.data.companyName}
                    onChange={(event) => updateCoverLetterData({ companyName: event.target.value })}
                  />
                </Field>
                <Field label="Role">
                  <Input
                    value={selectedCoverLetter.data.position}
                    onChange={(event) => updateCoverLetterData({ position: event.target.value })}
                  />
                </Field>
                <Field label="Hiring Manager">
                  <Input
                    value={selectedCoverLetter.data.hiringManager}
                    onChange={(event) => updateCoverLetterData({ hiringManager: event.target.value })}
                  />
                </Field>
                <Field label="Date">
                  <Input
                    value={selectedCoverLetter.data.date}
                    onChange={(event) => updateCoverLetterData({ date: event.target.value })}
                  />
                </Field>
                <Field label="Company Address">
                  <Textarea
                    value={selectedCoverLetter.data.companyAddress}
                    onChange={(event) => updateCoverLetterData({ companyAddress: event.target.value })}
                  />
                </Field>
              </EditorSection>

              <EditorSection title="Body" description="Edit the cover letter paragraphs.">
                <Field label="Opening">
                  <Textarea
                    value={selectedCoverLetter.data.openingParagraph}
                    onChange={(event) => updateCoverLetterData({ openingParagraph: event.target.value })}
                  />
                </Field>
                <Field label="Body Paragraph 1">
                  <Textarea
                    value={selectedCoverLetter.data.bodyParagraph1}
                    onChange={(event) => updateCoverLetterData({ bodyParagraph1: event.target.value })}
                  />
                </Field>
                <Field label="Body Paragraph 2">
                  <Textarea
                    value={selectedCoverLetter.data.bodyParagraph2}
                    onChange={(event) => updateCoverLetterData({ bodyParagraph2: event.target.value })}
                  />
                </Field>
                <Field label="Body Paragraph 3">
                  <Textarea
                    value={selectedCoverLetter.data.bodyParagraph3}
                    onChange={(event) => updateCoverLetterData({ bodyParagraph3: event.target.value })}
                  />
                </Field>
                <Field label="Closing">
                  <Textarea
                    value={selectedCoverLetter.data.closingParagraph}
                    onChange={(event) => updateCoverLetterData({ closingParagraph: event.target.value })}
                  />
                </Field>
              </EditorSection>
            </>
          )}

          {documentType === 'email-signature' && (
            <>
              <EditorSection title="Template" description="Select and style the signature layout.">
                <Field label="Signature Template">
                  <select
                    value={signatureId}
                    onChange={(event) => setSignatureId(event.target.value as SignatureId)}
                    className={selectClassName}
                  >
                    {signatureTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <ColorField
                  label="Accent"
                  value={selectedSignature.accent}
                  onChange={(value) => updateSignatureAccent(value)}
                />
              </EditorSection>

              <EditorSection title="Signature" description="Update contact details and branding.">
                <Field label="Name">
                  <Input value={selectedSignature.data.name} onChange={(event) => updateSignatureData({ name: event.target.value })} />
                </Field>
                <Field label="Role">
                  <Input value={selectedSignature.data.role} onChange={(event) => updateSignatureData({ role: event.target.value })} />
                </Field>
                <Field label="Organization">
                  <Input
                    value={selectedSignature.data.organization ?? ''}
                    onChange={(event) => updateSignatureData({ organization: event.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <Input value={selectedSignature.data.email} onChange={(event) => updateSignatureData({ email: event.target.value })} />
                </Field>
                <Field label="Website">
                  <Input
                    value={selectedSignature.data.website}
                    onChange={(event) => updateSignatureData({ website: event.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <Input value={selectedSignature.data.phone} onChange={(event) => updateSignatureData({ phone: event.target.value })} />
                </Field>
                <Field label="Location">
                  <Input
                    value={selectedSignature.data.location ?? ''}
                    onChange={(event) => updateSignatureData({ location: event.target.value })}
                  />
                </Field>
                <Field label="Profile Image">
                  <select
                    value={selectedSignature.data.profileSrc}
                    onChange={(event) =>
                      updateSignatureData({
                        profileSrc: event.target.value,
                        profileAlt: profileOptions.find((option) => option.value === event.target.value)?.label ??
                          selectedSignature.data.profileAlt,
                      })
                    }
                    className={selectClassName}
                  >
                    {profileOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Logos">
                  <LogoMultiSelect
                    selected={selectedSignature.data.logos}
                    onChange={(next) => updateSignatureData({ logos: next })}
                  />
                </Field>
              </EditorSection>

              <EditorSection title="HTML" description="Copy the signature HTML for email clients.">
                <Textarea value={signatureHtml} readOnly rows={8} />
                {statusMessage && <p className="text-xs text-slate-500">{statusMessage}</p>}
              </EditorSection>
            </>
          )}
        </aside>

        <section className="print-area flex flex-col items-center">
          {documentType === 'resume' && (
            <div className="w-full">
              <ResumePreview template={selectedResume} />
            </div>
          )}
          {documentType === 'cover-letter' && (
            <div className="w-full">
              <CoverLetterPreview data={selectedCoverLetter.data} config={selectedCoverLetter.config} />
            </div>
          )}
          {documentType === 'email-signature' && (
            <div className="w-full">
              <EmailSignaturePreview template={selectedSignature} />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
