import { FormEvent, useEffect, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Database,
  FileCheck2,
  LineChart,
  LockKeyhole,
  Network,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
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

const authMarketCards = [
  { label: 'Document set', value: '3 docs', detail: 'Resume, cover, signature' },
  { label: 'Export gate', value: 'PDF/HTML', detail: 'Print and inbox ready' },
  { label: 'Tenant', value: 'Private', detail: 'Authenticated workspace' },
]

const authPipelineItems = [
  { label: 'Extract', value: 'Credentials', icon: Database },
  { label: 'Monitor', value: 'Draft quality', icon: Network },
  { label: 'Value', value: 'Ready outputs', icon: FileCheck2 },
]

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
    <section className="studio-auth-panel" aria-labelledby="studio-auth-title">
      <a className="studio-skip-link" href="#studio-sign-in-form">
        Skip to sign in
      </a>
      <div className="studio-auth-intro" aria-describedby="studio-auth-copy">
        <div className="studio-auth-brand-row">
          <div className="studio-auth-logo-lockup">
            <div className="studio-auth-logo-mark">
              <img
                src={finchatLogo}
                alt="FinChat"
                className="studio-brand-mark-image"
              />
            </div>
            <div>
              <p className="studio-brand-kicker">FinChat</p>
              <p className="studio-auth-product-line">Document Intelligence OS</p>
            </div>
          </div>
          <span className="studio-auth-live-pill">
            <span aria-hidden="true" />
            Live QA
          </span>
        </div>

        <h1 id="studio-auth-title" className="studio-auth-title">Financial document intelligence.</h1>
        <p id="studio-auth-copy" className="studio-auth-copy">
          Controlled resume, cover letter, and signature automation with source-aware
          profiles, audit checks, and export-ready HTML/PDF.
        </p>

        <div className="studio-auth-product-grid" aria-label="FinChat workspace preview">
          <div className="studio-auth-terminal">
            <div className="studio-auth-terminal-top">
              <div className="studio-auth-window-controls" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span>FINCHAT TERMINAL</span>
              <strong>QA PASS</strong>
            </div>

            <div className="studio-auth-market-grid">
              {authMarketCards.map((card) => (
                <div key={card.label} className="studio-auth-market-card">
                  <p>{card.label}</p>
                  <strong>{card.value}</strong>
                  <span>{card.detail}</span>
                </div>
              ))}
            </div>

            <div className="studio-auth-terminal-checks">
              <div>
                <p>Control ledger</p>
                <strong>Current workspace checks</strong>
              </div>
              <div className="studio-auth-check-list">
                <span>Identity fields <strong>Mapped</strong></span>
                <span>Education presets <strong>Versioned</strong></span>
                <span>Signature assets <strong>Ready</strong></span>
              </div>
            </div>
          </div>

          <div className="studio-auth-flow">
            {authPipelineItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="studio-auth-flow-item">
                <span className="studio-auth-flow-icon">
                  <Icon size={16} />
                </span>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="studio-auth-highlights" aria-label="Platform capabilities">
          <span><BarChart3 size={15} /> Analytics</span>
          <span><Workflow size={15} /> Automation</span>
          <span><ShieldCheck size={15} /> Audit trail</span>
        </div>
        <div className="studio-auth-meta">
          <div>
            <p className="studio-auth-meta-label">Workspace</p>
            <p className="studio-auth-meta-value">Financial profile operations</p>
          </div>
          <div>
            <p className="studio-auth-meta-label">Controls</p>
            <p className="studio-auth-meta-value">Saved presets and export gates</p>
          </div>
        </div>
      </div>

      <form
        id="studio-sign-in-form"
        className="studio-auth-form"
        aria-label="Sign in to FinChat"
        aria-busy={isSubmitting}
        onSubmit={(event) => void onSubmit(event)}
      >
        <div className="studio-auth-form-header">
          <div className="studio-auth-icon">
            <LockKeyhole />
          </div>
          <div>
            <p className="studio-auth-form-title">Secure access</p>
            <p className="studio-auth-form-copy">Authorized FinChat workspace</p>
          </div>
          <LineChart className="studio-auth-form-signal" aria-hidden="true" />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="studio-field-label">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={errorMessage ? 'studio-auth-error' : undefined}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="studio-field-label">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={errorMessage ? 'studio-auth-error' : undefined}
              required
            />
          </div>
        </div>

        <div className="studio-auth-actions">
          {errorMessage ? (
            <p id="studio-auth-error" className="studio-auth-error" role="alert">
              {errorMessage}
            </p>
          ) : (
            <span className="studio-auth-error-placeholder" aria-hidden="true" />
          )}
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
