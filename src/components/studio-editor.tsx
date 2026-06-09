import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, ClipboardList, Copy, Download, FileText, Layers, LogOut, Mail, Save, ShieldCheck } from 'lucide-react'

import { CoverLetterPreview } from '@/components/cover-letter-preview'
import { EmailSignaturePreview } from '@/components/email-signature-preview'
import { ResumePreview } from '@/components/resume-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import profileTyler from '@/assets/profile-tyler.png'
import { logoOptions, profileOptions, signatureOptions } from '@/data/assets'
import {
  applyAiReviewDraft,
  getAiReviewState,
  getStoredDocument,
  rejectAiReviewDraft,
  saveStoredDocument,
} from '@/lib/studio-api'
import {
  getDefaultCoverLetterState,
  getDefaultResumeState,
  getDefaultSignatureState,
} from '@/lib/studio-defaults'
import { migrateCoverLetterState, migrateResumeState, migrateSignatureState } from '@/lib/studio-migrations'
import { STUDIO_EDIT_SCHEMA } from '@/lib/studio-edit-schema'
import { buildStudioFieldMap, type StudioFieldMap } from '@/lib/studio-field-map'
import {
  buildSignatureHtml,
  buildSignatureHtmlFragment,
  buildSignaturePlainText,
} from '@/lib/signature-html'
import {
  SIGNATURE_CERTIFICATION_LOGO_VALUES,
  SIGNATURE_EXPERIENCE_LOGO_VALUES,
  canonicalizeSignatureLogoSrc,
  getSignatureCertificationLogoOptions,
  getSignatureEducationLogoOptions,
  getSignatureEducationLogoValues,
  getSignatureExperienceLogoOptions,
  normalizeSignatureLogos,
} from '@/lib/signature-logo-groups'
import { normalizeSignatureAffiliationLines } from '@/lib/signature-identity'
import { cn } from '@/lib/utils'
import type {
  CoverLetterId,
  CoverLetterTemplate,
  DocumentType,
  EmailSignatureTemplate,
  AiDraftDiffItem,
  AiDraftReviewState,
  ResumeCertificationArea,
  ResumeCertificationItem,
  ResumeEducationItem,
  ResumeExperienceGroup,
  ResumeExperienceItem,
  ResumeId,
  ResumeLeadershipGroup,
  ResumeLeadershipItem,
  ResumeTemplate,
  SignatureId,
  StudioSession,
} from '@/types'

const selectClassName =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400'

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`
const normalizeGroupColumns = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) return 2
  return Math.min(3, Math.max(1, Math.round(parsed)))
}

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
const getSectionAnchorId = (value: string) =>
  `studio-section-${value.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '')}`

const formatDiffValue = (value: unknown) => {
  if (value === null || typeof value === 'undefined') {
    return '—'
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : '""'
  }

  return JSON.stringify(value, null, 2)
}

const formatTimestamp = (value?: string) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
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
  <section className="studio-panel" id={getSectionAnchorId(title)}>
    <div className="studio-panel-header">
      <p className="studio-panel-kicker">{title}</p>
      {description && <p className="studio-panel-copy">{description}</p>}
    </div>
    <div className="studio-panel-body">{children}</div>
  </section>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="studio-field">
    <Label className="studio-field-label">{label}</Label>
    {children}
  </div>
)

const formatDocumentTypeLabel = (documentType: DocumentType) =>
  STUDIO_EDIT_SCHEMA.documents[documentType].displayName

const formatAllowedOps = (ops: string[]) => ops.join(', ')

const StudioMetric = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) => (
  <div className="studio-metric-card">
    <span className="studio-metric-icon" aria-hidden="true">
      {icon}
    </span>
    <div>
      <p className="studio-metric-label">{label}</p>
      <p className="studio-metric-value">{value}</p>
    </div>
  </div>
)

const InlineFields = ({ children }: { children: React.ReactNode }) => (
  <div className="studio-inline-fields">{children}</div>
)

const DraftDiffRow = ({ item }: { item: AiDraftDiffItem }) => (
  <div className="studio-draft-diff-item">
    <div className="studio-draft-diff-header">
      <div>
        <p className="studio-draft-diff-title">{item.fieldLabel}</p>
        <p className="studio-draft-diff-path">{item.jsonPath}</p>
      </div>
      <span className="studio-draft-op-chip">{item.op}</span>
    </div>
    <div className="studio-draft-diff-grid">
      <div className="studio-draft-diff-column">
        <p className="studio-draft-diff-label">Before</p>
        <pre className="studio-draft-diff-value">{formatDiffValue(item.before)}</pre>
      </div>
      <div className="studio-draft-diff-column">
        <p className="studio-draft-diff-label">After</p>
        <pre className="studio-draft-diff-value">{formatDiffValue(item.after)}</pre>
      </div>
    </div>
  </div>
)

const ItemCard = ({
  title,
  children,
  onRemove,
}: {
  title: string
  children: React.ReactNode
  onRemove?: () => void
}) => (
  <div className="studio-item-card">
    <div className="studio-item-card-header">
      <p>{title}</p>
      {onRemove && (
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      )}
    </div>
    <div className="studio-item-card-body">{children}</div>
  </div>
)

const LogoMultiSelect = ({
  selected,
  onChange,
  options = logoOptions,
}: {
  selected: { src: string; alt: string }[]
  onChange: (next: { src: string; alt: string }[]) => void
  options?: typeof logoOptions
}) => (
  <div className="studio-logo-grid">
    {options.map((option) => {
      const checked = selected.some((logo) => canonicalizeSignatureLogoSrc(logo.src) === option.value)

      return (
        <label key={option.value} className="studio-checkbox-row">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              if (event.target.checked) {
                onChange([
                  ...selected.filter((logo) => canonicalizeSignatureLogoSrc(logo.src) !== option.value),
                  { src: option.value, alt: option.label },
                ])
              } else {
                onChange(selected.filter((logo) => canonicalizeSignatureLogoSrc(logo.src) !== option.value))
              }
            }}
          />
          <span>{option.label}</span>
        </label>
      )
    })}
  </div>
)

const StudioOverviewPanel = ({
  documentType,
  templateLabel,
  outputLabel,
  fieldCount,
  collectionCount,
  pendingDraftCount,
}: {
  documentType: DocumentType
  templateLabel: string
  outputLabel: string
  fieldCount: number
  collectionCount: number
  pendingDraftCount: number
}) => {
  const sections = STUDIO_EDIT_SCHEMA.documents[documentType].sections

  return (
    <EditorSection title="Workspace" description="Current document, editable surface, and output state.">
      <div className="studio-overview-hero">
        <div>
          <p className="studio-overview-label">{formatDocumentTypeLabel(documentType)}</p>
          <h2 className="studio-overview-title">{templateLabel}</h2>
        </div>
        <span className="studio-overview-output">{outputLabel}</span>
      </div>

      <div className="studio-metric-grid">
        <StudioMetric icon={<FileText size={15} />} label="Sections" value={sections.length} />
        <StudioMetric icon={<Bot size={15} />} label="AI fields" value={fieldCount} />
        <StudioMetric icon={<Layers size={15} />} label="Collections" value={collectionCount} />
        <StudioMetric icon={<ClipboardList size={15} />} label="Drafts" value={pendingDraftCount} />
      </div>

      <nav className="studio-section-jump-list" aria-label={`${formatDocumentTypeLabel(documentType)} sections`}>
        {sections.map((section) => (
          <a key={section.id} href={`#${getSectionAnchorId(section.label)}`} className="studio-section-jump">
            <span>{section.label}</span>
            <small>{section.description}</small>
          </a>
        ))}
      </nav>
    </EditorSection>
  )
}

const StudioAiMapPanel = ({
  documentType,
  fieldMap,
  onCopy,
}: {
  documentType: DocumentType
  fieldMap: StudioFieldMap
  onCopy: () => void
}) => {
  const sections = STUDIO_EDIT_SCHEMA.documents[documentType].sections.map((section) => ({
    ...section,
    fields: fieldMap.fields.filter((fieldEntry) => fieldEntry.sectionId === section.id),
    collections: fieldMap.collections.filter((collectionEntry) => collectionEntry.sectionId === section.id),
  }))
  const lockedRules = STUDIO_EDIT_SCHEMA.documents[documentType].lockedRules

  return (
    <EditorSection title="AI Field Map" description="Exact editable IDs exposed to reviewed AI drafts.">
      <div className="studio-ai-map-toolbar">
        <div className="studio-ai-map-summary">
          <span>
            <Bot size={14} />
            {fieldMap.fields.length} fields
          </span>
          <span>
            <Layers size={14} />
            {fieldMap.collections.length} collections
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy /> Copy map
        </Button>
      </div>

      <div className="studio-locked-rule-list">
        {lockedRules.map((rule) => (
          <div key={rule} className="studio-locked-rule">
            <ShieldCheck size={14} />
            <span>{rule}</span>
          </div>
        ))}
      </div>

      <div className="studio-ai-map-list">
        {sections.map((section) => (
          <details key={section.id} className="studio-ai-map-section" open={documentType !== 'resume'}>
            <summary>
              <span>{section.label}</span>
              <small>
                {section.fields.length} fields
                {section.collections.length ? ` / ${section.collections.length} collections` : ''}
              </small>
            </summary>

            {section.fields.length > 0 ? (
              <div className="studio-ai-map-entry-list">
                {section.fields.map((fieldEntry) => (
                  <div key={fieldEntry.fieldId} className="studio-ai-map-entry">
                    <div>
                      <p>{fieldEntry.fieldLabel}</p>
                      {fieldEntry.ownerLabel ? <small>{fieldEntry.ownerLabel}</small> : null}
                    </div>
                    <code>{fieldEntry.fieldId}</code>
                    <span>{fieldEntry.valueType}</span>
                    <small>{formatAllowedOps(fieldEntry.allowedOps)}</small>
                  </div>
                ))}
              </div>
            ) : null}

            {section.collections.length > 0 ? (
              <div className="studio-ai-collection-list">
                {section.collections.map((collectionEntry) => (
                  <div key={collectionEntry.collectionId} className="studio-ai-collection-entry">
                    <div>
                      <p>{collectionEntry.entryType}</p>
                      {collectionEntry.ownerLabel ? <small>{collectionEntry.ownerLabel}</small> : null}
                    </div>
                    <code>{collectionEntry.collectionId}</code>
                    <span>{collectionEntry.itemIds.length} items</span>
                  </div>
                ))}
              </div>
            ) : null}
          </details>
        ))}
      </div>
    </EditorSection>
  )
}

interface StudioEditorProps {
  initialDocumentType: DocumentType
  onDocumentTypeChange: (type: DocumentType) => void
  onLogout: () => Promise<void> | void
  session: StudioSession
}

export function StudioEditor({
  initialDocumentType,
  onDocumentTypeChange,
  onLogout,
  session,
}: StudioEditorProps) {
  const [documentType, setDocumentType] = useState<DocumentType>(initialDocumentType)
  const [resumeTemplates, setResumeTemplates] = useState<ResumeTemplate[]>(() => getDefaultResumeState().templates)
  const [resumeId, setResumeId] = useState<ResumeId>(() => getDefaultResumeState().selectedId)
  const [coverLetters, setCoverLetters] = useState<CoverLetterTemplate[]>(() => getDefaultCoverLetterState().templates)
  const [coverLetterId, setCoverLetterId] = useState<CoverLetterId>(() => getDefaultCoverLetterState().selectedId)
  const [signatureTemplates, setSignatureTemplates] = useState<EmailSignatureTemplate[]>(() => getDefaultSignatureState().templates)
  const [signatureId, setSignatureId] = useState<SignatureId>(() => getDefaultSignatureState().selectedId)
  const [isHydrating, setIsHydrating] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [aiReviewState, setAiReviewState] = useState<AiDraftReviewState | null>(null)
  const [isLoadingAiReview, setIsLoadingAiReview] = useState(false)
  const [aiReviewError, setAiReviewError] = useState('')
  const [activeDraftActionId, setActiveDraftActionId] = useState('')

  const selectedResume = resumeTemplates.find((template) => template.id === resumeId) ?? resumeTemplates[0]
  const selectedCoverLetter = coverLetters.find((template) => template.id === coverLetterId) ?? coverLetters[0]
  const selectedSignature =
    signatureTemplates.find((template) => template.id === signatureId) ?? signatureTemplates[0]
  const activeTemplate =
    documentType === 'resume'
      ? selectedResume
      : documentType === 'cover-letter'
        ? selectedCoverLetter
        : selectedSignature
  const activeTemplateId =
    documentType === 'resume'
      ? selectedResume?.id
      : documentType === 'cover-letter'
        ? selectedCoverLetter?.id
        : selectedSignature?.id
  const signatureHtml = useMemo(() => buildSignatureHtml(selectedSignature), [selectedSignature])
  const signatureHtmlFragment = useMemo(
    () => buildSignatureHtmlFragment(selectedSignature),
    [selectedSignature],
  )
  const signaturePlainText = useMemo(
    () => buildSignaturePlainText(selectedSignature),
    [selectedSignature],
  )
  const previewMeta = useMemo(
    () => ({
      resume: {
        kicker: 'Resume Studio',
        title: selectedResume.label,
        copy: 'Editorial preview and export tuned to the TylerBustard.com resume system.',
      },
      'cover-letter': {
        kicker: 'Cover Letter Studio',
        title: selectedCoverLetter.config.presetLabel || selectedCoverLetter.label,
        copy: 'Unified application letter styling with a cleaner hierarchy and print-ready structure.',
      },
      'email-signature': {
        kicker: 'Email Signature Studio',
        title: selectedSignature.label,
        copy: 'Grouped experience and education logo strips, updated typography, and production-ready HTML export.',
      },
    }),
    [selectedCoverLetter.config.presetLabel, selectedCoverLetter.label, selectedResume.label, selectedSignature.label],
  )
  const activeTemplateLabel =
    documentType === 'resume'
      ? selectedResume.label
      : documentType === 'cover-letter'
        ? selectedCoverLetter.config.presetLabel || selectedCoverLetter.label
        : selectedSignature.label
  const activeOutputLabel = documentType === 'email-signature' ? 'HTML signature' : 'PDF document'
  const activeFieldMap = useMemo(
    () => buildStudioFieldMap(documentType, activeTemplate),
    [activeTemplate, documentType],
  )
  const aiFieldMapText = useMemo(() => {
    const lines = [
      `schemaVersion: ${STUDIO_EDIT_SCHEMA.schemaVersion}`,
      `documentType: ${documentType}`,
      `templateId: ${activeTemplateId}`,
      `templateLabel: ${activeTemplateLabel}`,
      '',
      'fields:',
      ...activeFieldMap.fields.map((fieldEntry) =>
        [
          `- ${fieldEntry.fieldId}`,
          `label=${fieldEntry.fieldLabel}`,
          `section=${fieldEntry.sectionLabel}`,
          `type=${fieldEntry.valueType}`,
          `ops=${formatAllowedOps(fieldEntry.allowedOps)}`,
          fieldEntry.ownerLabel ? `owner=${fieldEntry.ownerLabel}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
      ),
    ]

    if (activeFieldMap.collections.length > 0) {
      lines.push(
        '',
        'collections:',
        ...activeFieldMap.collections.map((collectionEntry) =>
          [
            `- ${collectionEntry.collectionId}`,
            `section=${collectionEntry.sectionLabel}`,
            `entryType=${collectionEntry.entryType}`,
            `items=${collectionEntry.itemIds.join(', ') || 'none'}`,
            collectionEntry.ownerLabel ? `owner=${collectionEntry.ownerLabel}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
        ),
      )
    }

    return lines.join('\n')
  }, [activeFieldMap.collections, activeFieldMap.fields, activeTemplateId, activeTemplateLabel, documentType])

  const loadSingleDocument = useCallback(async (type: DocumentType) => {
    const response = await getStoredDocument<unknown>(type)

    if (!response.document) {
      return false
    }

    if (type === 'resume') {
      const migrated = migrateResumeState(response.document)
      setResumeTemplates(migrated.state.templates)
      setResumeId(migrated.state.selectedId)
      if (migrated.migrated) {
        await saveStoredDocument('resume', migrated.state)
      }
      return migrated.migrated
    }

    if (type === 'cover-letter') {
      const migrated = migrateCoverLetterState(response.document)
      setCoverLetters(migrated.state.templates)
      setCoverLetterId(migrated.state.selectedId)
      if (migrated.migrated) {
        await saveStoredDocument('cover-letter', migrated.state)
      }
      return migrated.migrated
    }

    const migrated = migrateSignatureState(response.document)
    setSignatureTemplates(migrated.state.templates)
    setSignatureId(migrated.state.selectedId)
    if (migrated.migrated) {
      await saveStoredDocument('email-signature', migrated.state)
    }
    return migrated.migrated
  }, [])

  const loadAiReview = useCallback(
    async (type: DocumentType, templateId: string) => {
      if (!templateId) {
        setAiReviewState(null)
        setAiReviewError('')
        return
      }

      setIsLoadingAiReview(true)
      setAiReviewError('')

      try {
        const reviewState = await getAiReviewState(type, templateId)
        setAiReviewState(reviewState)
      } catch (error) {
        setAiReviewState(null)
        setAiReviewError(error instanceof Error ? error.message : 'Unable to load AI review state.')
      } finally {
        setIsLoadingAiReview(false)
      }
    },
    [],
  )

  useEffect(() => {
    setDocumentType(initialDocumentType)
  }, [initialDocumentType])

  useEffect(() => {
    let cancelled = false

    const loadDocuments = async () => {
      try {
        const migrationResults = await Promise.all([
          loadSingleDocument('resume'),
          loadSingleDocument('cover-letter'),
          loadSingleDocument('email-signature'),
        ])

        if (cancelled) return

        if (migrationResults.some(Boolean)) {
          setStatusMessage('Legacy documents normalized to the new studio format.')
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(error instanceof Error ? error.message : 'Using local defaults.')
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false)
        }
      }
    }

    void loadDocuments()

    return () => {
      cancelled = true
    }
  }, [loadSingleDocument])

  useEffect(() => {
    if (isHydrating || !activeTemplateId) {
      return
    }

    void loadAiReview(documentType, activeTemplateId)
  }, [activeTemplateId, documentType, isHydrating, loadAiReview])

  const handleDocumentTypeChange = (next: DocumentType) => {
    setDocumentType(next)
    onDocumentTypeChange(next)
  }

  const pushStatusMessage = (message: string, timeout = 2600) => {
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage(''), timeout)
  }

  const handleSaveDocument = async () => {
    setIsSaving(true)

    try {
      if (documentType === 'resume') {
        await saveStoredDocument('resume', { selectedId: resumeId, templates: resumeTemplates })
        await loadAiReview('resume', selectedResume.id)
        pushStatusMessage('Resume saved.')
      } else if (documentType === 'cover-letter') {
        await saveStoredDocument('cover-letter', {
          selectedId: coverLetterId,
          templates: coverLetters,
        })
        await loadAiReview('cover-letter', selectedCoverLetter.id)
        pushStatusMessage('Cover letter saved.')
      } else {
        await saveStoredDocument('email-signature', {
          selectedId: signatureId,
          templates: signatureTemplates,
        })
        await loadAiReview('email-signature', selectedSignature.id)
        pushStatusMessage('Email signature saved.')
      }
    } catch (error) {
      pushStatusMessage(error instanceof Error ? error.message : 'Unable to save right now.', 3400)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportPdf = async () => {
    if (documentType === 'resume') {
      const exportWindow = window.open('', '_blank')

      try {
        await saveStoredDocument('resume', { selectedId: resumeId, templates: resumeTemplates })
        const exportUrl = `/studio/resume/pdf?template=${encodeURIComponent(resumeId)}&autoprint=1`

        if (exportWindow) {
          exportWindow.location.href = exportUrl
        } else {
          window.location.assign(exportUrl)
        }

        pushStatusMessage('Resume PDF ready to save.')
      } catch (error) {
        exportWindow?.close()
        pushStatusMessage(
          error instanceof Error ? error.message : 'Unable to prepare the resume PDF right now.',
          3400,
        )
      }

      return
    }

    if (documentType === 'cover-letter') {
      const exportWindow = window.open('', '_blank')

      try {
        await saveStoredDocument('cover-letter', {
          selectedId: coverLetterId,
          templates: coverLetters,
        })
        const exportUrl = `/studio/cover-letter/pdf?template=${encodeURIComponent(coverLetterId)}&autoprint=1`

        if (exportWindow) {
          exportWindow.location.href = exportUrl
        } else {
          window.location.assign(exportUrl)
        }

        pushStatusMessage('Cover letter PDF ready to save.')
      } catch (error) {
        exportWindow?.close()
        pushStatusMessage(
          error instanceof Error ? error.message : 'Unable to prepare the cover letter PDF right now.',
          3400,
        )
      }

      return
    }

    const previousTitle = document.title
    const label = selectedSignature.label
    document.title = `${label}-${documentType}`
    window.print()
    window.setTimeout(() => {
      document.title = previousTitle
    }, 500)
  }

  const handleCopySignatureHtml = async () => {
    try {
      if (typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard.write === 'function') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([signatureHtmlFragment], { type: 'text/html;charset=utf-8' }),
            'text/plain': new Blob([signaturePlainText], { type: 'text/plain;charset=utf-8' }),
          }),
        ])
        pushStatusMessage('Signature copied as rich HTML.')
        return
      }

      await navigator.clipboard.writeText(signaturePlainText)
      pushStatusMessage('Signature copied as plain text fallback.')
    } catch {
      pushStatusMessage('Unable to copy signature HTML right now.', 3200)
    }
  }

  const handleCopyAiFieldMap = async () => {
    try {
      await navigator.clipboard.writeText(aiFieldMapText)
      pushStatusMessage('AI field map copied.')
    } catch {
      pushStatusMessage('Unable to copy the AI field map right now.', 3200)
    }
  }

  const handleDownloadSignatureHtml = () => {
    const blob = new Blob([signatureHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedSignature.label.replace(/\s+/g, '-').toLowerCase()}.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleApplyAiDraft = async (draftId: string) => {
    if (!activeTemplateId) {
      pushStatusMessage('No active template is selected for AI review.', 3200)
      return
    }

    setActiveDraftActionId(draftId)

    try {
      await applyAiReviewDraft(draftId)
      await loadSingleDocument(documentType)
      await loadAiReview(documentType, activeTemplateId)
      pushStatusMessage('AI draft applied.')
    } catch (error) {
      pushStatusMessage(error instanceof Error ? error.message : 'Unable to apply the AI draft.', 3400)
    } finally {
      setActiveDraftActionId('')
    }
  }

  const handleRejectAiDraft = async (draftId: string) => {
    if (!activeTemplateId) {
      pushStatusMessage('No active template is selected for AI review.', 3200)
      return
    }

    setActiveDraftActionId(draftId)

    try {
      await rejectAiReviewDraft(draftId)
      await loadAiReview(documentType, activeTemplateId)
      pushStatusMessage('AI draft rejected.')
    } catch (error) {
      pushStatusMessage(error instanceof Error ? error.message : 'Unable to reject the AI draft.', 3400)
    } finally {
      setActiveDraftActionId('')
    }
  }

  const updateResumeTemplate = (id: ResumeId, updater: (template: ResumeTemplate) => ResumeTemplate) => {
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

  const updateEducationItem = (index: number, patch: Partial<ResumeEducationItem>) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        education: template.data.education.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      },
    }))
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
        education: template.data.education.filter((_, itemIndex) => itemIndex !== index),
      },
    }))
  }

  const updatePrimaryExperienceItem = (index: number, patch: Partial<ResumeExperienceItem>) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        experience: {
          ...template.data.experience,
          primary: template.data.experience.primary.map((item, itemIndex) =>
            itemIndex === index ? { ...item, ...patch } : item,
          ),
        },
      },
    }))
  }

  const addPrimaryExperienceItem = () => {
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

  const removePrimaryExperienceItem = (index: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        experience: {
          ...template.data.experience,
          primary: template.data.experience.primary.filter((_, itemIndex) => itemIndex !== index),
        },
      },
    }))
  }

  const updateExperienceGroup = (groupIndex: number, patch: Partial<ResumeExperienceGroup>) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        experience: {
          ...template.data.experience,
          groups: template.data.experience.groups.map((group, index) =>
            index === groupIndex ? { ...group, ...patch } : group,
          ),
        },
      },
    }))
  }

  const updateExperienceGroupItem = (
    groupIndex: number,
    itemIndex: number,
    patch: Partial<ResumeExperienceItem>,
  ) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        experience: {
          ...template.data.experience,
          groups: template.data.experience.groups.map((group, index) =>
            index === groupIndex
              ? {
                  ...group,
                  items: group.items.map((item, entryIndex) =>
                    entryIndex === itemIndex ? { ...item, ...patch } : item,
                  ),
                }
              : group,
          ),
        },
      },
    }))
  }

  const addExperienceGroupItem = (groupIndex: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        experience: {
          ...template.data.experience,
          groups: template.data.experience.groups.map((group, index) =>
            index === groupIndex
              ? {
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
              : group,
          ),
        },
      },
    }))
  }

  const removeExperienceGroupItem = (groupIndex: number, itemIndex: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        experience: {
          ...template.data.experience,
          groups: template.data.experience.groups.map((group, index) =>
            index === groupIndex
              ? { ...group, items: group.items.filter((_, entryIndex) => entryIndex !== itemIndex) }
              : group,
          ),
        },
      },
    }))
  }

  const updateCertificationArea = (areaIndex: number, patch: Partial<ResumeCertificationArea>) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          areas: template.data.certifications.areas.map((area, index) =>
            index === areaIndex ? { ...area, ...patch } : area,
          ),
        },
      },
    }))
  }

  const updateCertificationItem = (
    areaIndex: number,
    itemIndex: number,
    patch: Partial<ResumeCertificationItem>,
  ) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          areas: template.data.certifications.areas.map((area, index) =>
            index === areaIndex
              ? {
                  ...area,
                  items: area.items.map((item, entryIndex) =>
                    entryIndex === itemIndex ? { ...item, ...patch } : item,
                  ),
                }
              : area,
          ),
        },
      },
    }))
  }

  const addCertificationArea = () => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          areas: [
            ...template.data.certifications.areas,
            {
              id: makeId('cert-area'),
              title: 'New Certification Area',
              caption: 'Caption',
              column: 'left',
              items: [],
            },
          ],
        },
      },
    }))
  }

  const removeCertificationArea = (areaIndex: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          areas: template.data.certifications.areas.filter((_, index) => index !== areaIndex),
        },
      },
    }))
  }

  const addCertificationItem = (areaIndex: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          areas: template.data.certifications.areas.map((area, index) =>
            index === areaIndex
              ? {
                  ...area,
                  items: [
                    ...area.items,
                    {
                      id: makeId('cert'),
                      name: 'New Certification',
                      issuer: 'Issuer',
                      year: 'Year',
                      logoSrc: logoOptions[0].value,
                      logoAlt: logoOptions[0].label,
                    },
                  ],
                }
              : area,
          ),
        },
      },
    }))
  }

  const removeCertificationItem = (areaIndex: number, itemIndex: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        certifications: {
          areas: template.data.certifications.areas.map((area, index) =>
            index === areaIndex
              ? { ...area, items: area.items.filter((_, entryIndex) => entryIndex !== itemIndex) }
              : area,
          ),
        },
      },
    }))
  }

  const updateLeadershipGroup = (groupIndex: number, patch: Partial<ResumeLeadershipGroup>) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        leadership: template.data.leadership.map((group, index) =>
          index === groupIndex ? { ...group, ...patch } : group,
        ),
      },
    }))
  }

  const updateLeadershipItem = (
    groupIndex: number,
    itemIndex: number,
    patch: Partial<ResumeLeadershipItem>,
  ) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        leadership: template.data.leadership.map((group, index) =>
          index === groupIndex
            ? {
                ...group,
                items: group.items.map((item, entryIndex) =>
                  entryIndex === itemIndex ? { ...item, ...patch } : item,
                ),
              }
            : group,
        ),
      },
    }))
  }

  const addLeadershipItem = (groupIndex: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        leadership: template.data.leadership.map((group, index) =>
          index === groupIndex
            ? {
                ...group,
                items: [
                  ...group.items,
                  {
                    id: makeId('community'),
                    role: 'New Role',
                    organization: 'Organization',
                    location: 'Location',
                    date: 'Year',
                    bullets: [],
                    skills: [],
                    logoSrc: logoOptions[0].value,
                    logoAlt: logoOptions[0].label,
                  },
                ],
              }
            : group,
        ),
      },
    }))
  }

  const removeLeadershipItem = (groupIndex: number, itemIndex: number) => {
    updateResumeTemplate(resumeId, (template) => ({
      ...template,
      data: {
        ...template.data,
        leadership: template.data.leadership.map((group, index) =>
          index === groupIndex
            ? { ...group, items: group.items.filter((_, entryIndex) => entryIndex !== itemIndex) }
            : group,
        ),
      },
    }))
  }

  const updateCoverLetterTemplate = (
    id: CoverLetterId,
    updater: (template: CoverLetterTemplate) => CoverLetterTemplate,
  ) => {
    setCoverLetters((prev) => prev.map((template) => (template.id === id ? updater(template) : template)))
  }

  const updateCoverLetterConfig = (patch: Partial<CoverLetterTemplate['config']>) => {
    updateCoverLetterTemplate(coverLetterId, (template) => ({
      ...template,
      label:
        typeof patch.presetLabel === 'string' && patch.presetLabel.trim()
          ? patch.presetLabel.trim()
          : template.label,
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
    id: SignatureId,
    updater: (template: EmailSignatureTemplate) => EmailSignatureTemplate,
  ) => {
    setSignatureTemplates((prev) => prev.map((template) => (template.id === id ? updater(template) : template)))
  }

  const updateSignatureData = (patch: Partial<EmailSignatureTemplate['data']>) => {
    updateSignatureTemplate(signatureId, (template) => {
      const nextData = {
        ...template.data,
        ...patch,
      }

      return {
        ...template,
        data: {
          ...nextData,
          ...(template.id === 'queens'
            ? {
                email:
                  typeof patch.email === 'string' && patch.email.includes('.')
                    ? patch.email.replace(/\.net$/u, '.com').replace(/\.ca$/u, '.com')
                    : nextData.email.replace(/\.net$/u, '.com').replace(/\.ca$/u, '.com'),
                website:
                  typeof patch.website === 'string' && patch.website.includes('.')
                    ? patch.website.replace(/\.net$/u, '.com').replace(/\.ca$/u, '.com')
                    : nextData.website.replace(/\.net$/u, '.com').replace(/\.ca$/u, '.com'),
              }
            : {}),
          experienceLogos: normalizeSignatureLogos(nextData.experienceLogos, SIGNATURE_EXPERIENCE_LOGO_VALUES),
          educationLogos: normalizeSignatureLogos(
            nextData.educationLogos,
            getSignatureEducationLogoValues(template.id),
          ),
          certificationLogos: normalizeSignatureLogos(nextData.certificationLogos, SIGNATURE_CERTIFICATION_LOGO_VALUES),
          affiliationLines: normalizeSignatureAffiliationLines(nextData),
        },
      }
    })
  }

  return (
    <div className="studio-shell">
      <header className="studio-shell-header no-print">
        <div className="studio-shell-header-bar">
          <div className="studio-brand">
            <div className="studio-brand-mark">
              <img
                src={profileTyler}
                alt="Tyler Bustard portrait"
                className="studio-brand-mark-image"
              />
            </div>
            <div className="studio-brand-copy">
              <p className="studio-brand-kicker">Private Document Studio</p>
              <h1 className="studio-brand-title">Tyler Bustard</h1>
            </div>
          </div>

          <nav className="studio-nav">
            {(
              [
                { id: 'resume', label: 'Resume' },
                { id: 'cover-letter', label: 'Cover Letter' },
                { id: 'email-signature', label: 'Email Signature' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleDocumentTypeChange(tab.id)}
                className={cn(
                  'studio-nav-button',
                  documentType === tab.id ? 'studio-nav-button-active' : 'studio-nav-button-idle',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="studio-shell-actions">
            <p className="studio-shell-status">
              {isHydrating ? 'Syncing saved documents…' : statusMessage || `Signed in as ${session.username}`}
            </p>
            <div className="studio-shell-action-row">
              <Button onClick={handleSaveDocument} variant="outline" disabled={isHydrating || isSaving}>
                <Save /> {isSaving ? 'Saving…' : 'Save'}
              </Button>
              {documentType === 'email-signature' ? (
                <>
                  <Button onClick={handleDownloadSignatureHtml} variant="default" disabled={isHydrating}>
                    <Download /> Download .html
                  </Button>
                  <Button onClick={handleCopySignatureHtml} variant="outline" disabled={isHydrating}>
                    <Mail /> Copy Signature
                  </Button>
                </>
              ) : (
                <Button onClick={handleExportPdf} variant="default" disabled={isHydrating}>
                  <Download /> Export PDF
                </Button>
              )}
              <Button onClick={() => void onLogout()} variant="ghost" disabled={isSaving}>
                <LogOut /> Log out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="studio-workspace">
        <aside className="studio-editor-rail no-print">
          <StudioOverviewPanel
            documentType={documentType}
            templateLabel={activeTemplateLabel}
            outputLabel={activeOutputLabel}
            fieldCount={activeFieldMap.fields.length}
            collectionCount={activeFieldMap.collections.length}
            pendingDraftCount={aiReviewState?.pendingDrafts.length ?? 0}
          />

          <StudioAiMapPanel
            documentType={documentType}
            fieldMap={activeFieldMap}
            onCopy={handleCopyAiFieldMap}
          />

          {documentType === 'resume' && (
            <>
              <EditorSection title="Template" description="Presets now control content only. Styling stays unified.">
                <Field label="Resume Preset">
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
              </EditorSection>

              <EditorSection title="Header" description="Update the portrait, title, summary, and compact contact rail.">
                <Field label="Name">
                  <Input value={selectedResume.data.header.name} onChange={(event) => updateResumeHeader({ name: event.target.value })} />
                </Field>
                <Field label="Title">
                  <Input value={selectedResume.data.header.title} onChange={(event) => updateResumeHeader({ title: event.target.value })} />
                </Field>
                <Field label="Portrait">
                  <select
                    value={selectedResume.data.header.profileSrc}
                    onChange={(event) =>
                      updateResumeHeader({
                        profileSrc: event.target.value,
                        profileAlt:
                          profileOptions.find((option) => option.value === event.target.value)?.label ??
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

              <EditorSection title="Contact rail" description="Small metadata line shown under the identity block.">
                <InlineFields>
                  <Field label="Email">
                    <Input value={selectedResume.data.header.contact.email} onChange={(event) => updateResumeContact({ email: event.target.value })} />
                  </Field>
                  <Field label="Phone">
                    <Input value={selectedResume.data.header.contact.phone} onChange={(event) => updateResumeContact({ phone: event.target.value })} />
                  </Field>
                </InlineFields>
                <InlineFields>
                  <Field label="Website">
                    <Input value={selectedResume.data.header.contact.website} onChange={(event) => updateResumeContact({ website: event.target.value })} />
                  </Field>
                  <Field label="Location">
                    <Input value={selectedResume.data.header.contact.location} onChange={(event) => updateResumeContact({ location: event.target.value })} />
                  </Field>
                </InlineFields>
              </EditorSection>

              <EditorSection title="Education" description="White editorial entries matching the public resume system.">
                {selectedResume.data.education.map((item, index) => (
                  <ItemCard key={item.id} title={item.degree} onRemove={() => removeEducationItem(index)}>
                    <InlineFields>
                      <Field label="Degree">
                        <Input value={item.degree} onChange={(event) => updateEducationItem(index, { degree: event.target.value })} />
                      </Field>
                      <Field label="Program">
                        <Input value={item.program} onChange={(event) => updateEducationItem(index, { program: event.target.value })} />
                      </Field>
                    </InlineFields>
                    <InlineFields>
                      <Field label="School">
                        <Input value={item.school} onChange={(event) => updateEducationItem(index, { school: event.target.value })} />
                      </Field>
                      <Field label="Dates">
                        <Input value={item.date} onChange={(event) => updateEducationItem(index, { date: event.target.value })} />
                      </Field>
                    </InlineFields>
                    <Field label="Logo">
                      <select
                        value={item.logoSrc}
                        onChange={(event) =>
                          updateEducationItem(index, { logoSrc: event.target.value, logoAlt: findLogoLabel(event.target.value) })
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
                      <Textarea value={joinLines(item.bullets)} onChange={(event) => updateEducationItem(index, { bullets: splitLines(event.target.value) })} />
                    </Field>
                  </ItemCard>
                ))}
                <Button variant="outline" onClick={addEducationItem}>
                  Add education entry
                </Button>
              </EditorSection>

              <EditorSection title="Primary experience" description="Top roles that lead the document.">
                {selectedResume.data.experience.primary.map((item, index) => (
                  <ItemCard key={item.id} title={item.role} onRemove={() => removePrimaryExperienceItem(index)}>
                    <InlineFields>
                      <Field label="Role">
                        <Input value={item.role} onChange={(event) => updatePrimaryExperienceItem(index, { role: event.target.value })} />
                      </Field>
                      <Field label="Company">
                        <Input value={item.company} onChange={(event) => updatePrimaryExperienceItem(index, { company: event.target.value })} />
                      </Field>
                    </InlineFields>
                    <InlineFields>
                      <Field label="Location">
                        <Input value={item.location} onChange={(event) => updatePrimaryExperienceItem(index, { location: event.target.value })} />
                      </Field>
                      <Field label="Dates">
                        <Input value={item.date} onChange={(event) => updatePrimaryExperienceItem(index, { date: event.target.value })} />
                      </Field>
                    </InlineFields>
                    <Field label="Logo">
                      <select
                        value={item.logoSrc}
                        onChange={(event) =>
                          updatePrimaryExperienceItem(index, { logoSrc: event.target.value, logoAlt: findLogoLabel(event.target.value) })
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
                    <Field label="Achievements">
                      <Textarea value={joinLines(item.bullets)} onChange={(event) => updatePrimaryExperienceItem(index, { bullets: splitLines(event.target.value) })} />
                    </Field>
                    <Field label="Skills">
                      <Input value={joinComma(item.skills)} onChange={(event) => updatePrimaryExperienceItem(index, { skills: splitComma(event.target.value) })} />
                    </Field>
                  </ItemCard>
                ))}
                <Button variant="outline" onClick={addPrimaryExperienceItem}>
                  Add primary role
                </Button>
              </EditorSection>

              <EditorSection title="Additional experience" description="Early-career and co-op groupings.">
                {selectedResume.data.experience.groups.map((group, groupIndex) => (
                  <ItemCard key={group.id} title={group.title || 'Experience group'}>
                    <InlineFields>
                      <Field label="Group title">
                        <Input value={group.title ?? ''} onChange={(event) => updateExperienceGroup(groupIndex, { title: event.target.value })} />
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
                      <Field label="Grid columns">
                        <select
                          value={String(normalizeGroupColumns(group.columns))}
                          onChange={(event) =>
                            updateExperienceGroup(groupIndex, {
                              columns: normalizeGroupColumns(event.target.value),
                            })
                          }
                          className={selectClassName}
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                      </Field>
                    </InlineFields>
                    {group.items.map((item, itemIndex) => (
                      <ItemCard
                        key={item.id}
                        title={item.role}
                        onRemove={() => removeExperienceGroupItem(groupIndex, itemIndex)}
                      >
                        <InlineFields>
                          <Field label="Role">
                            <Input value={item.role} onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { role: event.target.value })} />
                          </Field>
                          <Field label="Company">
                            <Input value={item.company} onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { company: event.target.value })} />
                          </Field>
                        </InlineFields>
                        <InlineFields>
                          <Field label="Location">
                            <Input value={item.location} onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { location: event.target.value })} />
                          </Field>
                          <Field label="Dates">
                            <Input value={item.date} onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { date: event.target.value })} />
                          </Field>
                        </InlineFields>
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
                        <Field label="Achievements">
                          <Textarea value={joinLines(item.bullets)} onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { bullets: splitLines(event.target.value) })} />
                        </Field>
                        <Field label="Skills">
                          <Input value={joinComma(item.skills)} onChange={(event) => updateExperienceGroupItem(groupIndex, itemIndex, { skills: splitComma(event.target.value) })} />
                        </Field>
                      </ItemCard>
                    ))}
                    <Button variant="outline" onClick={() => addExperienceGroupItem(groupIndex)}>
                      Add grouped role
                    </Button>
                  </ItemCard>
                ))}
              </EditorSection>

              <EditorSection title="Grouped certifications" description="Public-resume style certification areas with editorial headings.">
                {selectedResume.data.certifications.areas.map((area, areaIndex) => (
                  <ItemCard key={area.id} title={area.title} onRemove={() => removeCertificationArea(areaIndex)}>
                    <InlineFields>
                      <Field label="Area title">
                        <Input value={area.title} onChange={(event) => updateCertificationArea(areaIndex, { title: event.target.value })} />
                      </Field>
                      <Field label="Column">
                        <select
                          value={area.column ?? 'left'}
                          onChange={(event) =>
                            updateCertificationArea(areaIndex, { column: event.target.value as 'left' | 'right' })
                          }
                          className={selectClassName}
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </Field>
                    </InlineFields>
                    <Field label="Caption">
                      <Input value={area.caption} onChange={(event) => updateCertificationArea(areaIndex, { caption: event.target.value })} />
                    </Field>
                    <InlineFields>
                      <Field label="Summary value">
                        <Input value={area.summaryValue ?? ''} onChange={(event) => updateCertificationArea(areaIndex, { summaryValue: event.target.value })} />
                      </Field>
                      <Field label="Summary logos">
                        <LogoMultiSelect selected={area.summaryLogos ?? []} onChange={(next) => updateCertificationArea(areaIndex, { summaryLogos: next })} />
                      </Field>
                    </InlineFields>
                    {area.items.map((item, itemIndex) => (
                      <ItemCard key={item.id} title={item.name} onRemove={() => removeCertificationItem(areaIndex, itemIndex)}>
                        <InlineFields>
                          <Field label="Name">
                            <Input value={item.name} onChange={(event) => updateCertificationItem(areaIndex, itemIndex, { name: event.target.value })} />
                          </Field>
                          <Field label="Issuer">
                            <Input value={item.issuer} onChange={(event) => updateCertificationItem(areaIndex, itemIndex, { issuer: event.target.value })} />
                          </Field>
                        </InlineFields>
                        <InlineFields>
                          <Field label="Year">
                            <Input value={item.year} onChange={(event) => updateCertificationItem(areaIndex, itemIndex, { year: event.target.value })} />
                          </Field>
                          <Field label="Detail">
                            <Input value={item.detail ?? ''} onChange={(event) => updateCertificationItem(areaIndex, itemIndex, { detail: event.target.value })} />
                          </Field>
                        </InlineFields>
                        <Field label="Logo">
                          <select
                            value={item.logoSrc}
                            onChange={(event) =>
                              updateCertificationItem(areaIndex, itemIndex, {
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
                        <label className="studio-checkbox-row">
                          <input
                            type="checkbox"
                            checked={Boolean(item.emphasis)}
                            onChange={(event) =>
                              updateCertificationItem(areaIndex, itemIndex, { emphasis: event.target.checked })
                            }
                          />
                          <span>Emphasize certification</span>
                        </label>
                      </ItemCard>
                    ))}
                    <Button variant="outline" onClick={() => addCertificationItem(areaIndex)}>
                      Add certification row
                    </Button>
                  </ItemCard>
                ))}
                <Button variant="outline" onClick={addCertificationArea}>
                  Add certification area
                </Button>
              </EditorSection>

              <EditorSection title="Community" description="Community entries now match the public resume structure.">
                {selectedResume.data.leadership.map((group, groupIndex) => (
                  <ItemCard key={group.id} title={group.title || 'Community group'}>
                    <InlineFields>
                      <Field label="Group title">
                        <Input value={group.title ?? ''} onChange={(event) => updateLeadershipGroup(groupIndex, { title: event.target.value })} />
                      </Field>
                      <Field label="Layout">
                        <select
                          value={group.layout}
                          onChange={(event) =>
                            updateLeadershipGroup(groupIndex, {
                              layout: event.target.value as ResumeLeadershipGroup['layout'],
                            })
                          }
                          className={selectClassName}
                        >
                          <option value="stack">Stack</option>
                          <option value="grid">Grid</option>
                        </select>
                      </Field>
                      <Field label="Grid columns">
                        <select
                          value={String(normalizeGroupColumns(group.columns))}
                          onChange={(event) =>
                            updateLeadershipGroup(groupIndex, {
                              columns: normalizeGroupColumns(event.target.value),
                            })
                          }
                          className={selectClassName}
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                      </Field>
                    </InlineFields>
                    {group.items.map((item, itemIndex) => (
                      <ItemCard key={item.id} title={item.role} onRemove={() => removeLeadershipItem(groupIndex, itemIndex)}>
                        <InlineFields>
                          <Field label="Role">
                            <Input value={item.role} onChange={(event) => updateLeadershipItem(groupIndex, itemIndex, { role: event.target.value })} />
                          </Field>
                          <Field label="Organization">
                            <Input value={item.organization} onChange={(event) => updateLeadershipItem(groupIndex, itemIndex, { organization: event.target.value })} />
                          </Field>
                        </InlineFields>
                        <InlineFields>
                          <Field label="Location">
                            <Input value={item.location} onChange={(event) => updateLeadershipItem(groupIndex, itemIndex, { location: event.target.value })} />
                          </Field>
                          <Field label="Dates">
                            <Input value={item.date} onChange={(event) => updateLeadershipItem(groupIndex, itemIndex, { date: event.target.value })} />
                          </Field>
                        </InlineFields>
                        <Field label="Logo">
                          <select
                            value={item.logoSrc}
                            onChange={(event) =>
                              updateLeadershipItem(groupIndex, itemIndex, {
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
                          <Textarea value={joinLines(item.bullets)} onChange={(event) => updateLeadershipItem(groupIndex, itemIndex, { bullets: splitLines(event.target.value) })} />
                        </Field>
                        <Field label="Skills">
                          <Input value={joinComma(item.skills)} onChange={(event) => updateLeadershipItem(groupIndex, itemIndex, { skills: splitComma(event.target.value) })} />
                        </Field>
                      </ItemCard>
                    ))}
                    <Button variant="outline" onClick={() => addLeadershipItem(groupIndex)}>
                      Add community entry
                    </Button>
                  </ItemCard>
                ))}
              </EditorSection>
            </>
          )}

          {documentType === 'cover-letter' && (
            <>
              <EditorSection title="Template" description="Presets change sender defaults and context, not the visual system.">
                <Field label="Cover letter preset">
                  <select
                    value={coverLetterId}
                    onChange={(event) => setCoverLetterId(event.target.value as CoverLetterId)}
                    className={selectClassName}
                  >
                    {coverLetters.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.config.presetLabel || template.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <InlineFields>
                  <Field label="Preset label">
                    <Input value={selectedCoverLetter.config.presetLabel} onChange={(event) => updateCoverLetterConfig({ presetLabel: event.target.value })} />
                  </Field>
                  <Field label="Header title">
                    <Input value={selectedCoverLetter.config.tagline} onChange={(event) => updateCoverLetterConfig({ tagline: event.target.value })} />
                  </Field>
                </InlineFields>
                <Field label="Context note">
                  <Input value={selectedCoverLetter.config.contextNote} onChange={(event) => updateCoverLetterConfig({ contextNote: event.target.value })} />
                </Field>
                <InlineFields>
                  <Field label="Portrait">
                    <select
                      value={selectedCoverLetter.config.profileSrc}
                      onChange={(event) =>
                        updateCoverLetterConfig({
                          profileSrc: event.target.value,
                          profileAlt:
                            profileOptions.find((option) => option.value === event.target.value)?.label ??
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
                </InlineFields>
              </EditorSection>

              <EditorSection title="Sender" description="Contact details shown in the editorial header and signoff.">
                <InlineFields>
                  <Field label="Your name">
                    <Input value={selectedCoverLetter.data.yourName} onChange={(event) => updateCoverLetterData({ yourName: event.target.value })} />
                  </Field>
                  <Field label="Email">
                    <Input value={selectedCoverLetter.data.yourEmail} onChange={(event) => updateCoverLetterData({ yourEmail: event.target.value })} />
                  </Field>
                </InlineFields>
                <InlineFields>
                  <Field label="Phone">
                    <Input value={selectedCoverLetter.data.yourPhone} onChange={(event) => updateCoverLetterData({ yourPhone: event.target.value })} />
                  </Field>
                  <Field label="Website">
                    <Input value={selectedCoverLetter.data.yourWebsite} onChange={(event) => updateCoverLetterData({ yourWebsite: event.target.value })} />
                  </Field>
                </InlineFields>
                <Field label="Location">
                  <Input value={selectedCoverLetter.data.yourAddress} onChange={(event) => updateCoverLetterData({ yourAddress: event.target.value })} />
                </Field>
              </EditorSection>

              <EditorSection title="Recipient" description="Opportunity context and addressee details.">
                <InlineFields>
                  <Field label="Company">
                    <Input value={selectedCoverLetter.data.companyName} onChange={(event) => updateCoverLetterData({ companyName: event.target.value })} />
                  </Field>
                  <Field label="Position">
                    <Input value={selectedCoverLetter.data.position} onChange={(event) => updateCoverLetterData({ position: event.target.value })} />
                  </Field>
                </InlineFields>
                <InlineFields>
                  <Field label="Hiring manager">
                    <Input value={selectedCoverLetter.data.hiringManager} onChange={(event) => updateCoverLetterData({ hiringManager: event.target.value })} />
                  </Field>
                  <Field label="Date">
                    <Input value={selectedCoverLetter.data.date} onChange={(event) => updateCoverLetterData({ date: event.target.value })} />
                  </Field>
                </InlineFields>
                <Field label="Company address">
                  <Textarea value={selectedCoverLetter.data.companyAddress} onChange={(event) => updateCoverLetterData({ companyAddress: event.target.value })} />
                </Field>
              </EditorSection>

              <EditorSection title="Body" description="Editorial letter body with readable spacing and print output.">
                <Field label="Opening">
                  <Textarea value={selectedCoverLetter.data.openingParagraph} onChange={(event) => updateCoverLetterData({ openingParagraph: event.target.value })} />
                </Field>
                <Field label="Body paragraph 1">
                  <Textarea value={selectedCoverLetter.data.bodyParagraph1} onChange={(event) => updateCoverLetterData({ bodyParagraph1: event.target.value })} />
                </Field>
                <Field label="Body paragraph 2">
                  <Textarea value={selectedCoverLetter.data.bodyParagraph2} onChange={(event) => updateCoverLetterData({ bodyParagraph2: event.target.value })} />
                </Field>
                <Field label="Body paragraph 3">
                  <Textarea value={selectedCoverLetter.data.bodyParagraph3} onChange={(event) => updateCoverLetterData({ bodyParagraph3: event.target.value })} />
                </Field>
                <Field label="Closing">
                  <Textarea value={selectedCoverLetter.data.closingParagraph} onChange={(event) => updateCoverLetterData({ closingParagraph: event.target.value })} />
                </Field>
                <Field label="Signoff label">
                  <Input value={selectedCoverLetter.data.signoffLabel} onChange={(event) => updateCoverLetterData({ signoffLabel: event.target.value })} />
                </Field>
              </EditorSection>
            </>
          )}

          {documentType === 'email-signature' && (
            <>
              <EditorSection title="Template" description="Unified signature styling with content presets only.">
                <Field label="Signature preset">
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
              </EditorSection>

              <EditorSection title="Identity" description="Name, title, institution line, contact details, and logo groups used by preview and export.">
                <InlineFields>
                  <Field label="Name">
                    <Input value={selectedSignature.data.name} onChange={(event) => updateSignatureData({ name: event.target.value })} />
                  </Field>
                  <Field label="Signoff">
                    <Input value={selectedSignature.data.signoff ?? ''} onChange={(event) => updateSignatureData({ signoff: event.target.value })} />
                  </Field>
                </InlineFields>
                <Field label="Affiliation lines">
                  <Textarea
                    value={joinLines(normalizeSignatureAffiliationLines(selectedSignature.data))}
                    onChange={(event) =>
                      updateSignatureData({
                        affiliationLines: splitLines(event.target.value),
                      })
                    }
                    rows={4}
                  />
                </Field>
                <InlineFields>
                  <Field label="Email">
                    <Input value={selectedSignature.data.email} onChange={(event) => updateSignatureData({ email: event.target.value })} />
                  </Field>
                  <Field label="Website">
                    <Input value={selectedSignature.data.website} onChange={(event) => updateSignatureData({ website: event.target.value })} />
                  </Field>
                </InlineFields>
                <InlineFields>
                  <Field label="Phone">
                    <Input value={selectedSignature.data.phone} onChange={(event) => updateSignatureData({ phone: event.target.value })} />
                  </Field>
                  <Field label="Location">
                    <Input value={selectedSignature.data.location ?? ''} onChange={(event) => updateSignatureData({ location: event.target.value })} />
                  </Field>
                </InlineFields>
                <Field label="Portrait">
                  <select
                    value={selectedSignature.data.profileSrc}
                    onChange={(event) =>
                      updateSignatureData({
                        profileSrc: event.target.value,
                        profileAlt:
                          profileOptions.find((option) => option.value === event.target.value)?.label ??
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
                <Field label="Logo tone">
                  <select
                    value={selectedSignature.data.logoTone ?? 'original'}
                    onChange={(event) =>
                      updateSignatureData({
                        logoTone: event.target.value as EmailSignatureTemplate['data']['logoTone'],
                      })
                    }
                    className={selectClassName}
                  >
                    <option value="original">Original</option>
                    <option value="monochrome">Monochrome</option>
                  </select>
                </Field>
                <Field label="Experience logos">
                  <LogoMultiSelect
                    selected={selectedSignature.data.experienceLogos}
                    onChange={(next) => updateSignatureData({ experienceLogos: next })}
                    options={getSignatureExperienceLogoOptions()}
                  />
                </Field>
                <Field label="Education logos">
                  <LogoMultiSelect
                    selected={selectedSignature.data.educationLogos}
                    onChange={(next) => updateSignatureData({ educationLogos: next })}
                    options={getSignatureEducationLogoOptions(selectedSignature.id)}
                  />
                </Field>
                <Field label="Certification logos">
                  <LogoMultiSelect
                    selected={selectedSignature.data.certificationLogos}
                    onChange={(next) => updateSignatureData({ certificationLogos: next })}
                    options={getSignatureCertificationLogoOptions()}
                  />
                </Field>
              </EditorSection>

              <EditorSection title="HTML" description="Copy or download the production-ready signature HTML.">
                <Textarea value={signatureHtml} readOnly rows={10} />
              </EditorSection>
            </>
          )}

          <EditorSection
            title="AI Draft Review"
            description="AI can propose reviewed edits against the customizable document schema. Review the exact diffs here before anything is applied."
          >
            {isLoadingAiReview ? (
              <p className="studio-ai-review-copy">Loading AI review state…</p>
            ) : null}

            {aiReviewError ? (
              <p className="studio-ai-review-copy studio-ai-review-error">{aiReviewError}</p>
            ) : null}

            {!isLoadingAiReview && !aiReviewError && aiReviewState?.latestAppliedAudit ? (
              <div className="studio-ai-audit-card">
                <div className="studio-ai-audit-header">
                  <div>
                    <p className="studio-ai-audit-title">Latest applied AI change</p>
                    <p className="studio-ai-audit-meta">
                      {formatTimestamp(aiReviewState.latestAppliedAudit.appliedAt)} by{' '}
                      {aiReviewState.latestAppliedAudit.appliedBy}
                    </p>
                  </div>
                  <span className="studio-ai-audit-chip">
                    {aiReviewState.latestAppliedAudit.fieldsTouched.length} touched
                  </span>
                </div>
                {aiReviewState.latestAppliedAudit.jobContext ? (
                  <p className="studio-ai-review-copy">{aiReviewState.latestAppliedAudit.jobContext}</p>
                ) : null}
                {aiReviewState.latestAppliedAudit.notes ? (
                  <p className="studio-ai-review-copy">{aiReviewState.latestAppliedAudit.notes}</p>
                ) : null}
              </div>
            ) : null}

            {!isLoadingAiReview &&
            !aiReviewError &&
            aiReviewState &&
            aiReviewState.pendingDrafts.length === 0 ? (
              <p className="studio-ai-review-copy">
                No pending AI drafts for this template. Content, grouping, logos, and visible metadata can be customized; export mechanics stay protected.
              </p>
            ) : null}

            {aiReviewState?.pendingDrafts.map((draft) => {
              const isActing = activeDraftActionId === draft.id

              return (
                <div key={draft.id} className="studio-ai-draft-card">
                  <div className="studio-ai-draft-header">
                    <div>
                      <p className="studio-ai-draft-title">Pending draft</p>
                      <p className="studio-ai-draft-meta">
                        {formatTimestamp(draft.createdAt)} by {draft.createdBy}
                      </p>
                    </div>
                    <span className="studio-ai-audit-chip">{draft.diff.length} diff items</span>
                  </div>

                  {draft.jobContext ? (
                    <div className="studio-ai-note-block">
                      <p className="studio-ai-note-label">Job context</p>
                      <p className="studio-ai-review-copy">{draft.jobContext}</p>
                    </div>
                  ) : null}

                  {draft.notes ? (
                    <div className="studio-ai-note-block">
                      <p className="studio-ai-note-label">Notes</p>
                      <p className="studio-ai-review-copy">{draft.notes}</p>
                    </div>
                  ) : null}

                  <div className="studio-ai-tag-list" aria-label="Fields touched">
                    {draft.fieldsTouched.map((fieldId) => (
                      <span key={fieldId} className="studio-ai-tag">
                        {fieldId}
                      </span>
                    ))}
                  </div>

                  <div className="studio-draft-diff-list">
                    {draft.diff.map((item, index) => (
                      <DraftDiffRow
                        key={`${draft.id}-${item.fieldId ?? item.collectionId ?? index}`}
                        item={item}
                      />
                    ))}
                  </div>

                  <div className="studio-ai-draft-actions">
                    <Button
                      variant="default"
                      disabled={isActing || isSaving}
                      onClick={() => void handleApplyAiDraft(draft.id)}
                    >
                      {isActing ? 'Applying…' : 'Apply draft'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isActing || isSaving}
                      onClick={() => void handleRejectAiDraft(draft.id)}
                    >
                      {isActing ? 'Working…' : 'Reject draft'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </EditorSection>
        </aside>

        <section className="print-area">
          <div className="studio-preview-shell">
            <div className="studio-preview-header no-print">
              <div>
                <p className="studio-preview-kicker">{previewMeta[documentType].kicker}</p>
                <h2 className="studio-preview-title">{previewMeta[documentType].title}</h2>
              </div>
              <p className="studio-preview-copy">{previewMeta[documentType].copy}</p>
            </div>
            <div className="studio-preview-stage">
            {documentType === 'resume' && <ResumePreview template={selectedResume} />}
            {documentType === 'cover-letter' && (
              <CoverLetterPreview data={selectedCoverLetter.data} config={selectedCoverLetter.config} />
            )}
            {documentType === 'email-signature' && <EmailSignaturePreview template={selectedSignature} />}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
