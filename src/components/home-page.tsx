import {
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  Layers3,
  LineChart,
  LockKeyhole,
  Network,
  ShieldCheck,
  Workflow,
} from 'lucide-react'

import finchatLogo from '@/assets/finchat-logo.svg'
import finchatMark from '@/assets/finchat-mark.svg'
import stringsLogo from '@/assets/logos/73strings.webp'
import bloombergLogo from '@/assets/logos/bloomberg.png'
import bmoLogo from '@/assets/logos/bmo.png'
import cfaLogo from '@/assets/logos/cfa.png'
import grantThorntonLogo from '@/assets/logos/grant-thornton.png'
import mcgillLogo from '@/assets/logos/mcgill.png'
import queensLogo from '@/assets/logos/queens-alt.png'
import rbcLogo from '@/assets/logos/rbc.png'
import tdLogo from '@/assets/logos/td.png'
import unbLogo from '@/assets/logos/unb-full.png'

const sourceLogos = [
  { name: '73 Strings', src: stringsLogo },
  { name: 'RBC', src: rbcLogo },
  { name: 'BMO', src: bmoLogo },
  { name: 'TD', src: tdLogo },
  { name: 'Bloomberg', src: bloombergLogo },
  { name: 'CFA Institute', src: cfaLogo },
  { name: "Queen's University", src: queensLogo },
  { name: 'McGill University', src: mcgillLogo },
  { name: 'University of New Brunswick', src: unbLogo },
  { name: 'Grant Thornton', src: grantThorntonLogo },
]

const productPillars = [
  {
    icon: Layers3,
    title: 'Profile',
    copy: 'Structured career data, credential hierarchy, dates, spacing, and printable output controls.',
  },
  {
    icon: FileCheck2,
    title: 'Narrative',
    copy: 'Role-aware positioning that keeps education, contact details, and institutional context aligned.',
  },
  {
    icon: BadgeCheck,
    title: 'Identity',
    copy: 'Signature and brand assets with controlled logos, clean HTML, and repeatable export behavior.',
  },
]

const metrics = [
  { value: '3', label: 'output systems' },
  { value: '19', label: 'secured functions' },
  { value: '100%', label: 'private workspace' },
  { value: 'PDF + HTML', label: 'delivery formats' },
]

const controlRows = [
  ['Source map', 'Mapped'],
  ['Review gate', 'Active'],
  ['Export QA', 'Passed'],
  ['Brand system', 'Synced'],
]

export function HomePage() {
  return (
    <main className="fc-page fc-home">
      <header className="fc-site-nav">
        <a className="fc-brand-lockup" href="/" aria-label="FinChat home">
          <img className="fc-brand-logo" src={finchatLogo} alt="FinChat.ca" />
        </a>
        <nav className="fc-nav-links" aria-label="Primary">
          <a href="#platform">Platform</a>
          <a href="#control">Control</a>
        </nav>
        <a className="fc-button fc-button-primary fc-nav-action" href="/sign-in">
          Sign in
          <ArrowRight aria-hidden="true" />
        </a>
      </header>

      <section className="fc-hero" aria-labelledby="fc-hero-title">
        <div className="fc-hero-scene" aria-hidden="true">
          <div className="fc-hero-terminal">
            <div className="fc-terminal-bar">
              <span />
              <span />
              <span />
              <strong>FINCHAT CONTROL ROOM</strong>
            </div>
            <div className="fc-terminal-grid">
              <div>
                <p>Profile graph</p>
                <strong>Finance & Technology</strong>
                <span className="fc-line-chart" />
              </div>
              <div>
                <p>Output status</p>
                <strong>Ready</strong>
                <span className="fc-status-pill">Validated</span>
              </div>
              <div>
                <p>Identity layer</p>
                <strong>Synced</strong>
                <span className="fc-mini-bars" />
              </div>
            </div>
          </div>
          <div className="fc-floating-panel fc-floating-panel-a">
            <p>review queue</p>
            <strong>Spacing · dates · credentials</strong>
          </div>
          <div className="fc-floating-panel fc-floating-panel-b">
            <p>export lane</p>
            <strong>PDF / HTML</strong>
          </div>
        </div>

        <div className="fc-hero-content">
          <p className="fc-kicker">FinChat.ca</p>
          <h1 id="fc-hero-title">Financial document intelligence for controlled career assets.</h1>
          <p className="fc-hero-copy">
            A private operating layer for profile data, narrative packages, source controls,
            and review-ready identity outputs.
          </p>
          <div className="fc-hero-actions">
            <a className="fc-button fc-button-primary" href="/sign-in">
              Enter studio
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="fc-logo-cloud" aria-labelledby="fc-logo-cloud-title">
        <div>
          <p className="fc-kicker">Source graph</p>
          <h2 id="fc-logo-cloud-title">Education, market, and operator signals in one controlled layer.</h2>
        </div>
        <div className="fc-logo-grid" aria-label="Credential and source logos">
          {sourceLogos.map((logo) => (
            <div className="fc-logo-tile" key={logo.name}>
              <img src={logo.src} alt={logo.name} />
            </div>
          ))}
        </div>
      </section>

      <section className="fc-metrics-band" aria-label="FinChat workspace metrics">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>

      <section id="platform" className="fc-section-block fc-product-section">
        <div className="fc-section-heading">
          <p className="fc-kicker">Platform</p>
          <h2>Three surfaces, one source of truth.</h2>
        </div>
        <div className="fc-product-grid fc-product-grid-large">
          {productPillars.map(({ icon: Icon, title, copy }) => (
            <article className="fc-product-card fc-product-card-large" key={title}>
              <span className="fc-product-icon">
                <Icon aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="control" className="fc-control-section" aria-labelledby="fc-control-title">
        <div className="fc-control-copy">
          <p className="fc-kicker">Control room</p>
          <h2 id="fc-control-title">Built like finance software, not a generic template editor.</h2>
          <p>
            FinChat keeps every public-facing output attached to a structured source
            layer, then checks layout, assets, and delivery paths before release.
          </p>
          <div className="fc-control-badges">
            <span><ShieldCheck aria-hidden="true" /> Private by default</span>
            <span><Workflow aria-hidden="true" /> Repeatable review</span>
            <span><Network aria-hidden="true" /> Source-linked output</span>
          </div>
        </div>

        <div className="fc-control-panel">
          <div className="fc-control-panel-header">
            <img src={finchatMark} alt="" aria-hidden="true" />
            <div>
              <p>Workspace status</p>
              <strong>Production-ready</strong>
            </div>
            <LineChart aria-hidden="true" />
          </div>
          <div className="fc-control-list">
            {controlRows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fc-builder-strip" aria-labelledby="fc-builder-title">
        <div>
          <p className="fc-kicker">Behind the platform</p>
          <h2 id="fc-builder-title">Built from finance, education, and automation workflows.</h2>
        </div>
        <p>
          FinChat is shaped around source-linked profile data, review gates, and exact
          delivery for high-stakes career materials where formatting, credentials, and
          institutional context have to stay consistent.
        </p>
      </section>

      <section className="fc-final-cta">
        <div>
          <p className="fc-kicker">Private access</p>
          <h2>Enter the studio when the output needs to be exact.</h2>
        </div>
        <a className="fc-button fc-button-primary" href="/sign-in">
          Secure sign in
          <LockKeyhole aria-hidden="true" />
        </a>
      </section>

      <footer className="fc-footer">
        <img src={finchatLogo} alt="FinChat.ca" />
        <span>Private document intelligence workspace.</span>
      </footer>
    </main>
  )
}
