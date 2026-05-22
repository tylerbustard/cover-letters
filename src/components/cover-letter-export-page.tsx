import { useEffect, useMemo, useRef, useState } from 'react'

import { CoverLetterPreview } from '@/components/cover-letter-preview'
import { waitForDocumentReady } from '@/lib/export-ready'
import { hasLocalExportPayload, loadLocalExportTemplate } from '@/lib/local-export'
import { getAiProjectedTemplate, getStoredDocument, saveStoredDocument } from '@/lib/studio-api'
import { migrateCoverLetterState } from '@/lib/studio-migrations'
import type { CoverLetterTemplate } from '@/types'

export const CoverLetterExportPage = () => {
  const [template, setTemplate] = useState<CoverLetterTemplate | null>(null)
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

    const loadCoverLetter = async () => {
      try {
        if (hasLocalExportPayload(searchParams)) {
          const localTemplate = loadLocalExportTemplate<CoverLetterTemplate>(
            'cover-letter',
            searchParams,
          )
          if (cancelled) return

          if (!localTemplate) {
            setErrorMessage('Unable to load the local cover letter payload.')
          } else {
            setTemplate(localTemplate)
          }
          return
        }

        if (templateId && draftId) {
          const projected = await getAiProjectedTemplate<CoverLetterTemplate>(
            'cover-letter',
            templateId,
            draftId,
          )
          if (cancelled) return
          setTemplate(projected.template)
          return
        }

        const response = await getStoredDocument<unknown>('cover-letter')
        const migrated = migrateCoverLetterState(response.document)
        if (migrated.migrated) {
          await saveStoredDocument('cover-letter', migrated.state)
        }

        if (cancelled) return

        const selected =
          migrated.state.templates.find((item) => item.id === templateId) ??
          migrated.state.templates.find((item) => item.id === migrated.state.selectedId) ??
          migrated.state.templates[0] ??
          null

        if (!selected) {
          setErrorMessage('Unable to load the cover letter document.')
        } else {
          setTemplate(selected)
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load the cover letter document.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadCoverLetter()

    return () => {
      cancelled = true
    }
  }, [draftId, templateId])

  useEffect(() => {
    if (!template) return

    const previousTitle = document.title
    document.title = 'Tyler Bustard - Cover Letter'

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
        <div className="studio-export-status">Preparing cover letter PDF…</div>
      </main>
    )
  }

  if (!template) {
    return (
      <main className="studio-export-page">
        <div className="studio-export-status studio-export-status-error">
          {errorMessage || 'Unable to load the cover letter document.'}
        </div>
      </main>
    )
  }

  return (
    <main className="studio-export-page">
      <CoverLetterPreview data={template.data} config={template.config} />
    </main>
  )
}
