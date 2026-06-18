import { ArrowLeft, Check, Download } from 'lucide-react'

import finchatLogo from '@/assets/finchat-logo.svg'
import finchatMark from '@/assets/finchat-mark.svg'

const palette = [
  { name: 'Navy', value: '#0f172a', role: 'Primary wordmark and text' },
  { name: 'Deep Blue', value: '#244871', role: 'Mark body and dark surfaces' },
  { name: 'Action Blue', value: '#2563eb', role: 'Primary actions and .ca accent' },
  { name: 'Sky', value: '#7ab2ff', role: 'Charts, highlights, and data accents' },
  { name: 'Paper', value: '#f8fafc', role: 'Public-page background' },
  { name: 'Line', value: '#e2e8f0', role: 'Rules, dividers, and card borders' },
]

const rules = [
  'Use the horizontal lockup whenever space allows.',
  'Use the app mark for favicons, compact navigation, and square placements.',
  'Keep the .ca accent blue in the wordmark.',
  'Avoid heavy shadows, glow effects, and decorative fintech clutter.',
  'Keep copy direct: private workspace, document intelligence, finance-ready output.',
]

export function BrandGuidelinesPage() {
  return (
    <main className="fc-page fc-guidelines">
      <header className="fc-topbar">
        <a className="fc-brand-lockup" href="/sign-in" aria-label="FinChat sign in">
          <img className="fc-brand-logo" src={finchatLogo} alt="FinChat.ca" />
        </a>
        <a className="fc-text-link" href="/sign-in">
          <ArrowLeft aria-hidden="true" />
          Studio sign in
        </a>
      </header>

      <section className="fc-guide-hero">
        <p className="fc-kicker">Brand guidelines</p>
        <h1>Simple, financial, controlled.</h1>
        <p>
          FinChat should feel like a private financial software product: clean type,
          crisp rules, restrained colour, and a logo system that works from favicon to
          full lockup.
        </p>
      </section>

      <section className="fc-guide-grid" aria-label="Logo system">
        <article className="fc-guide-card fc-guide-card-wide">
          <div>
            <p className="fc-card-label">Primary lockup</p>
            <h2>Use this for headers and public brand moments.</h2>
          </div>
          <img className="fc-guide-logo" src={finchatLogo} alt="FinChat.ca horizontal lockup" />
          <a className="fc-button fc-button-secondary" href="/finchat-logo.svg" download>
            <Download aria-hidden="true" />
            Download SVG
          </a>
        </article>

        <article className="fc-guide-card">
          <p className="fc-card-label">App mark</p>
          <img className="fc-guide-mark" src={finchatMark} alt="FinChat app mark" />
          <p className="fc-card-copy">
            Use this compact mark when the full wordmark would be too small.
          </p>
          <a className="fc-button fc-button-secondary" href="/finchat-mark.svg" download>
            <Download aria-hidden="true" />
            Download mark
          </a>
        </article>

        <article className="fc-guide-card">
          <p className="fc-card-label">Wordmark rule</p>
          <h2>FinChat<span>.ca</span></h2>
          <p className="fc-card-copy">
            Set the wordmark in Poppins or Inter Tight. Keep letter spacing at zero
            and reserve blue for the domain accent.
          </p>
        </article>
      </section>

      <section className="fc-section-block">
        <div className="fc-section-heading">
          <p className="fc-kicker">Palette</p>
          <h2>Restrained blues, white space, and clear hierarchy.</h2>
        </div>
        <div className="fc-palette-grid">
          {palette.map((colour) => (
            <article className="fc-swatch-card" key={colour.name}>
              <span className="fc-swatch" style={{ background: colour.value }} />
              <div>
                <h3>{colour.name}</h3>
                <p>{colour.value}</p>
                <span>{colour.role}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="fc-section-block">
        <div className="fc-section-heading">
          <p className="fc-kicker">Product rules</p>
          <h2>Make the interface feel like finance software, not a landing page.</h2>
        </div>
        <ul className="fc-rule-list">
          {rules.map((rule) => (
            <li key={rule}>
              <Check aria-hidden="true" />
              {rule}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
