import { useEffect, useMemo, useRef, useState } from 'react'

import { ResumePreview } from '@/components/resume-preview'
import { waitForDocumentReady } from '@/lib/export-ready'
import { hasLocalExportPayload, loadLocalExportTemplate } from '@/lib/local-export'
import { getAiProjectedTemplate, getStoredDocument, saveStoredDocument } from '@/lib/studio-api'
import { migrateResumeState } from '@/lib/studio-migrations'
import type { ResumeTemplate } from '@/types'

export const ResumeExportPage = () => {
  const [template, setTemplate] = useState<ResumeTemplate | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const hasTriggeredPrintRef = useRef(false)

  const searchParams = useMemo(
    () => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''),
    [],
  )
  const templateId = searchParams.get('template')
  const draftId = searchParams.get('draftId')
  const shouldAutoPrint = searchParams.get('autoprint') === '1'

  useEffect(() => {
    let cancelled = false

    const loadResume = async () => {
      try {
        if (hasLocalExportPayload(searchParams)) {
          const localTemplate = loadLocalExportTemplate<ResumeTemplate>('resume', searchParams)
          if (cancelled) return

          if (!localTemplate) {
            setErrorMessage('Unable to load the local resume payload.')
          } else {
            setTemplate(localTemplate)
          }
          return
        }

        if (templateId && draftId) {
          const projected = await getAiProjectedTemplate<ResumeTemplate>('resume', templateId, draftId)
          if (cancelled) return
          setTemplate(projected.template)
          return
        }

        const response = await getStoredDocument<unknown>('resume')
        const migrated = migrateResumeState(response.document)
        if (migrated.migrated) {
          await saveStoredDocument('resume', migrated.state)
        }

        if (cancelled) return

        const selected =
          migrated.state.templates.find((item) => item.id === templateId) ??
          migrated.state.templates.find((item) => item.id === migrated.state.selectedId) ??
          migrated.state.templates[0] ??
          null

        if (!selected) {
          setErrorMessage('Unable to load the resume document.')
        } else {
          setTemplate(selected)
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load the resume document.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadResume()

    return () => {
      cancelled = true
    }
  }, [draftId, templateId])

  useEffect(() => {
    if (!template) return

    const previousTitle = document.title
    document.title = 'Tyler Bustard - Resume'

    return () => {
      document.title = previousTitle
    }
  }, [template])

  useEffect(() => {
    if (!template || !shouldAutoPrint || hasTriggeredPrintRef.current) return

    hasTriggeredPrintRef.current = true
    let cancelled = false
    let timer = 0

    const triggerPrint = async () => {
      await waitForDocumentReady()

      if (cancelled) return

      timer = window.setTimeout(() => {
        if (!cancelled) {
          window.print()
        }
      }, 120)
    }

    void triggerPrint()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [shouldAutoPrint, template])

  if (isLoading) {
    return (
      <main className="studio-export-page">
        <div className="studio-export-status">Preparing resume PDF…</div>
      </main>
    )
  }

  if (!template) {
    return (
      <main className="studio-export-page">
        <div className="studio-export-status studio-export-status-error">
          {errorMessage || 'Unable to load the resume document.'}
        </div>
      </main>
    )
  }

  return (
    <main className="studio-export-page">
      <ResumePreview template={template} />
    </main>
  )
}
