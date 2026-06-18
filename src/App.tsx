import { FormEvent, useEffect, useState } from 'react'
import { Redirect, useLocation } from 'wouter'

import { CoverLetterExportPage } from '@/components/cover-letter-export-page'
import { BrandGuidelinesPage } from '@/components/brand-guidelines-page'
import { ResumeExportPage } from '@/components/resume-export-page'
import { StudioEditor } from '@/components/studio-editor'
import { SignInPage } from '@/components/sign-in-page'
import finchatMark from '@/assets/finchat-mark.svg'
import { hasLocalExportPayload } from '@/lib/local-export'
import { getSession, login, logout } from '@/lib/studio-api'
import type { DocumentType, StudioSession } from '@/types'

const DOCUMENT_TYPES: DocumentType[] = ['resume', 'cover-letter', 'email-signature']

const getDocumentTypeFromLocation = (location: string): DocumentType | null => {
  const match = location.match(/^\/studio\/(resume|cover-letter|email-signature)$/)
  return (match?.[1] as DocumentType | undefined) ?? null
}

const isResumeExportLocation = (location: string) => location === '/studio/resume/pdf'
const isCoverLetterExportLocation = (location: string) => location === '/studio/cover-letter/pdf'

const BootSplash = () => (
  <div className="studio-boot">
    <div className="studio-boot-mark">
      <img src={finchatMark} alt="FinChat" className="studio-brand-mark-image" />
    </div>
    <div>
      <p className="studio-brand-kicker">FinChat</p>
      <h1 className="studio-brand-title">Loading…</h1>
    </div>
  </div>
)

export default function App() {
  const [location, navigate] = useLocation()
  const [session, setSession] = useState<StudioSession | null>(null)
  const [isBooting, setIsBooting] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const searchParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  )
  const isLocalResumeExport =
    isResumeExportLocation(location) && hasLocalExportPayload(searchParams)
  const isLocalCoverLetterExport =
    isCoverLetterExportLocation(location) && hasLocalExportPayload(searchParams)
  const allowsAnonymousExport = isLocalResumeExport || isLocalCoverLetterExport

  useEffect(() => {
    if (allowsAnonymousExport) {
      setIsBooting(false)
      return
    }

    let cancelled = false

    const hydrateSession = async () => {
      try {
        const response = await getSession()
        if (!cancelled) {
          setSession(response.session)
        }
      } catch {
        if (!cancelled) {
          setSession(null)
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false)
        }
      }
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [allowsAnonymousExport])

  if (isLocalResumeExport) {
    return <ResumeExportPage />
  }

  if (isLocalCoverLetterExport) {
    return <CoverLetterExportPage />
  }

  if (location === '/brand-guidelines') {
    return <BrandGuidelinesPage />
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    const form = new FormData(event.currentTarget)
    const username = String(form.get('username') ?? '').trim()
    const password = String(form.get('password') ?? '')

    try {
      const response = await login(username, password)
      setSession(response.session)
      navigate('/studio/resume')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setSession(null)
    navigate('/sign-in')
  }

  if (isBooting) {
    return <BootSplash />
  }

  // The sign-in screen is the default public front end.
  if (!session) {
    if (location !== '/' && location !== '/sign-in') {
      return <Redirect to="/sign-in" />
    }

    return (
      <SignInPage
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onSubmit={handleLogin}
      />
    )
  }

  if (location === '/' || location === '/sign-in') {
    return <Redirect to="/studio/resume" />
  }

  if (isResumeExportLocation(location)) {
    return <ResumeExportPage />
  }

  if (isCoverLetterExportLocation(location)) {
    return <CoverLetterExportPage />
  }

  const activeDocumentType = getDocumentTypeFromLocation(location)

  if (!activeDocumentType || !DOCUMENT_TYPES.includes(activeDocumentType)) {
    return <Redirect to="/studio/resume" />
  }

  return (
    <StudioEditor
      initialDocumentType={activeDocumentType}
      onDocumentTypeChange={(type) => navigate(`/studio/${type}`)}
      onLogout={handleLogout}
      session={session}
    />
  )
}
