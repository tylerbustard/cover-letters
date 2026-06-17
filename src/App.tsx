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
import { studioProductLabels } from '@/lib/studio-labels'
import { getSession, login, logout } from '@/lib/studio-api'
import type { DocumentType, StudioSession } from '@/types'

const DOCUMENT_TYPES: DocumentType[] = ['resume', 'cover-letter', 'email-signature']

const authIntelligenceModules = [
  {
    id: 'source',
    label: 'Source Graph',
    signal: 'Controlled',
    cards: [
      { label: 'Data room', value: 'Private', detail: 'Secure source layer' },
      { label: 'Source map', value: 'Mapped', detail: 'Profile and proof signals' },
      { label: 'Review state', value: 'Clean', detail: 'No open alerts' },
    ],
    checks: [
      { label: 'Source records', value: 'Mapped' },
      { label: 'Access controls', value: 'Private' },
      { label: 'Asset library', value: 'Ready' },
    ],
  },
  {
    id: 'review',
    label: 'Review Queue',
    signal: 'Live review',
    cards: [
      { label: 'Narrative queue', value: 'Live', detail: 'Role-aware review' },
      { label: 'Quality screen', value: 'Checked', detail: 'Tone and spacing controls' },
      { label: 'Change log', value: 'Traced', detail: 'Editable before release' },
    ],
    checks: [
      { label: 'Draft controls', value: 'Active' },
      { label: 'Version guard', value: 'On' },
      { label: 'Review ledger', value: 'Current' },
    ],
  },
  {
    id: 'control',
    label: 'Control Room',
    signal: 'Ready state',
    cards: [
      { label: 'Delivery lane', value: 'Ready', detail: 'Final handoff controls' },
      { label: 'Brand system', value: 'Synced', detail: 'Visual identity assets' },
      { label: 'Output gate', value: 'Locked', detail: 'Validated before release' },
    ],
    checks: [
      { label: 'Contact data', value: 'Valid' },
      { label: 'Visual assets', value: 'Loaded' },
      { label: 'Final gate', value: 'Passed' },
    ],
  },
] as const

const authPipelineItems = [
  { label: 'Extract', value: 'Source data', icon: Database },
  { label: 'Monitor', value: 'Review gates', icon: Network },
  { label: 'Value', value: 'Decision views', icon: FileCheck2 },
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
}) => {
  const [activeModuleId, setActiveModuleId] = useState<(typeof authIntelligenceModules)[number]['id']>('source')
  const activeModule =
    authIntelligenceModules.find((module) => module.id === activeModuleId) ?? authIntelligenceModules[0]

  return (
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
              <p className="studio-auth-product-line">{studioProductLabels.productLine}</p>
            </div>
          </div>
          <span className="studio-auth-live-pill">
            <span aria-hidden="true" />
            Live QA
          </span>
        </div>

        <h1 id="studio-auth-title" className="studio-auth-title">Interactive financial intelligence workspace.</h1>
        <p id="studio-auth-copy" className="studio-auth-copy">
          A secure operating layer for profile data, market narratives, source controls,
          and review-ready delivery workflows.
        </p>

        <div className="studio-auth-module-tabs" role="group" aria-label="Workspace preview module">
          {authIntelligenceModules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={
                activeModule.id === module.id
                  ? 'studio-auth-module-tab studio-auth-module-tab-active'
                  : 'studio-auth-module-tab'
              }
              aria-pressed={activeModule.id === module.id}
              onClick={() => setActiveModuleId(module.id)}
            >
              <span>{module.signal}</span>
              <strong>{module.label}</strong>
            </button>
          ))}
        </div>

        <div className="studio-auth-product-grid" aria-label="FinChat workspace preview">
          <div className="studio-auth-terminal">
            <div className="studio-auth-terminal-top">
              <div className="studio-auth-window-controls" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span>FINCHAT TERMINAL</span>
              <strong>{activeModule.signal}</strong>
            </div>

            <div className="studio-auth-market-grid">
              {activeModule.cards.map((card) => (
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
                <strong>{activeModule.label} checks</strong>
              </div>
              <div className="studio-auth-check-list">
                {activeModule.checks.map((check) => (
                  <span key={check.label}>{check.label} <strong>{check.value}</strong></span>
                ))}
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
            <p className="studio-auth-meta-value">Private intelligence operations</p>
          </div>
          <div>
            <p className="studio-auth-meta-label">Controls</p>
            <p className="studio-auth-meta-value">Source controls and review gates</p>
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
}

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
