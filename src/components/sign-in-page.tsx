import type { FormEvent } from 'react'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'

import finchatLogo from '@/assets/finchat-logo.svg'
import finchatMark from '@/assets/finchat-mark.svg'

type SignInPageProps = {
  isSubmitting: boolean
  errorMessage: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

const accessRows = [
  ['Source graph', 'Mapped'],
  ['Review gate', 'Online'],
  ['Exports', 'Controlled'],
]

export function SignInPage({ isSubmitting, errorMessage, onSubmit }: SignInPageProps) {
  return (
    <main className="fc-page fc-signin">
      <a className="fc-skip-link" href="#studio-sign-in-form">
        Skip to sign in
      </a>

      <header className="fc-topbar">
        <a className="fc-brand-lockup" href="/sign-in" aria-label="FinChat home">
          <img className="fc-brand-logo" src={finchatLogo} alt="FinChat.ca" />
        </a>
      </header>

      <section className="fc-signin-grid" aria-labelledby="studio-auth-title">
        <aside className="fc-access-panel">
          <div>
            <p className="fc-kicker">Private access</p>
            <h1 id="studio-auth-title">Secure studio for controlled document intelligence.</h1>
            <p>
              Sign in to manage profile data, narrative assets, identity HTML, and
              production-ready delivery gates.
            </p>
          </div>

          <div className="fc-access-terminal" aria-label="Workspace status">
            <div className="fc-terminal-bar">
              <span />
              <span />
              <span />
              <strong>FINCHAT SESSION</strong>
            </div>
            <div className="fc-control-list">
              {accessRows.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <form
          id="studio-sign-in-form"
          className="fc-login-card"
          aria-label="Sign in to FinChat"
          aria-busy={isSubmitting}
          onSubmit={(event) => void onSubmit(event)}
        >
          <div className="fc-login-mark">
            <img src={finchatMark} alt="" aria-hidden="true" />
          </div>
          <p className="fc-kicker">Secure access</p>
          <h2>Enter the studio</h2>
          <p className="fc-login-copy">
            Access is restricted to the private FinChat workspace.
          </p>

          {errorMessage ? (
            <p id="studio-auth-error" className="fc-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <label className="fc-field" htmlFor="username">
            <span>Username</span>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={errorMessage ? 'studio-auth-error' : undefined}
              required
            />
          </label>

          <label className="fc-field" htmlFor="password">
            <span>Password</span>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={errorMessage ? 'studio-auth-error' : undefined}
              required
            />
          </label>

          <button className="fc-button fc-button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Enter studio'}
            <ArrowRight aria-hidden="true" />
          </button>

          <p className="fc-security-note">
            <LockKeyhole aria-hidden="true" />
            Session secured for private document work.
          </p>
          <p className="fc-security-note fc-security-note-secondary">
            <ShieldCheck aria-hidden="true" />
            Credentials verified through the FinChat auth layer.
          </p>
        </form>
      </section>
    </main>
  )
}
