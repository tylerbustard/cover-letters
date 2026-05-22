import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Redirect, useLocation } from 'wouter'

import { CoverLetterExportPage } from '@/components/cover-letter-export-page'
import { ResumeExportPage } from '@/components/resume-export-page'
import { StudioEditor } from '@/components/studio-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import finchatLogo from '@/assets/finchat-logo.svg'
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
      <img
        src={finchatLogo}
        alt="FinChat"
        className="studio-brand-mark-image"
      />
    </div>
    <div>
      <p className="studio-brand-kicker">FinChat</p>
      <h1 className="studio-brand-title">Loading...</h1>
    </div>
  </div>
)

const SignInPage = ({
  isSubmitting,
  errorMessage,
  onSubmit,
}: {
  isSubmitting: boolean
  errorMessage: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}) => (
  <main className="studio-auth-page">
    <section className="studio-auth-panel">
      <div className="studio-auth-intro">
        <p className="studio-brand-kicker">FinChat</p>
        <h1 className="studio-auth-title">Financial Intelligence Platform</h1>
        <p className="studio-auth-copy">
          Secure access to financial analytics, document automation, and reporting tools.
          Enterprise-grade workspace for finance professionals.
        </p>
        <div className="studio-auth-highlights" aria-label="Platform capabilities">
          <span>Analytics</span>
          <span>Reports</span>
          <span>Documents</span>
        </div>
        <div className="studio-auth-meta">
          <div>
            <p className="studio-auth-meta-label">Platform</p>
            <p className="studio-auth-meta-value">Secure financial workspace</p>
          </div>
          <div>
            <p className="studio-auth-meta-label">Output</p>
            <p className="studio-auth-meta-value">Export-ready financial documents</p>
          </div>
        </div>
      </div>

      <form className="studio-auth-form" onSubmit={(event) => void onSubmit(event)}>
        <div className="studio-auth-form-header">
          <div className="studio-auth-icon">
            <LockKeyhole />
          </div>
          <div>
            <p className="studio-auth-form-title">Sign in</p>
            <p className="studio-auth-form-copy">Use your admin credentials to open the studio.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="studio-field-label">
              Username
            </Label>
            <Input id="username" name="username" autoComplete="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="studio-field-label">
              Password
            </Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
        </div>

        <div className="studio-auth-actions">
          {errorMessage ? <p className="studio-auth-error">{errorMessage}</p> : <span />}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Enter studio'}
            <ArrowRight />
          </Button>
        </div>
      </form>
    </section>
  </main>
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

  if (!session) {
    if (location !== '/sign-in') {
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
