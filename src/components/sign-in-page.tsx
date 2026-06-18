import type { FormEvent } from 'react'
import { ArrowRight, FileSignature, FileText, Mail, ShieldCheck } from 'lucide-react'

import finchatLogo from '@/assets/finchat-logo.svg'
import finchatMark from '@/assets/finchat-mark.svg'

type SignInPageProps = {
  isSubmitting: boolean
  errorMessage: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

const productSurfaces = [
  {
    icon: FileText,
    title: 'Profile',
    copy: 'Resume variants checked for spacing, dates, credentials, and export quality.',
  },
  {
    icon: FileSignature,
    title: 'Narrative',
    copy: 'Cover and CV-style outputs aligned to the selected school, role, and voice.',
  },
  {
    icon: Mail,
    title: 'Identity',
    copy: 'Email signatures with controlled logos, contact details, and HTML export.',
  },
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
        <a className="fc-text-link" href="/brand-guidelines">
          Brand guidelines
        </a>
      </header>

      <section className="fc-signin-grid" aria-labelledby="studio-auth-title">
        <div className="fc-intro-panel">
          <p className="fc-kicker">Private document intelligence</p>
          <h1 id="studio-auth-title">
            Finance-ready documents, controlled from one workspace.
          </h1>
          <p className="fc-lead">
            FinChat keeps resumes, CV-style narratives, and email signatures aligned
            to the same source of truth before anything is copied, downloaded, or
            printed.
          </p>

          <div className="fc-product-grid" aria-label="FinChat product surfaces">
            {productSurfaces.map(({ icon: Icon, title, copy }) => (
              <article className="fc-product-card" key={title}>
                <span className="fc-product-icon">
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

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
            <ShieldCheck aria-hidden="true" />
            Session secured for private document work.
          </p>
        </form>
      </section>
    </main>
  )
}
