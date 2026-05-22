import { getMonochromeLogoSrc, resolveStudioAssetSrc } from '@/data/assets'
import type { EmailSignatureTemplate } from '@/types'

interface EmailSignaturePreviewProps {
  template: EmailSignatureTemplate
}

type SignatureContactItem = {
  key: string
  value: string
  href?: string
}

type SignatureLogoGroupProps = {
  logos: Array<{ src: string; alt: string }>
}

const SignatureLogoGroup = ({ logos }: SignatureLogoGroupProps) => {
  if (logos.length === 0) return null

  return (
    <div className="signature-document-logo-group">
      {logos.map((logo, index) => (
        <span key={`${logo.alt}-${index}`} className="signature-document-logo-entry">
          {index > 0 ? <span className="signature-document-logo-separator" aria-hidden="true" /> : null}
          <span className="signature-document-logo-shell">
            <img src={logo.src} alt={logo.alt} className="signature-document-logo" />
          </span>
        </span>
      ))}
    </div>
  )
}

export const EmailSignaturePreview = ({ template }: EmailSignaturePreviewProps) => {
  const { data } = template
  const hasRole = data.role.trim().length > 0
  const hasOrganization = Boolean(data.organization?.trim())
  const experienceLogos = data.experienceLogos.map((logo) => ({
    ...logo,
    src: data.logoTone === 'original' ? logo.src : getMonochromeLogoSrc(logo.src),
  }))
  const educationLogos = data.educationLogos.map((logo) => ({
    ...logo,
    src: data.logoTone === 'original' ? logo.src : getMonochromeLogoSrc(logo.src),
  }))

  const contactItems: SignatureContactItem[] = [
    data.phone
      ? {
          key: 'phone',
          value: data.phone,
          href: `tel:${data.phone.replace(/[^+\d]/gu, '')}`,
        }
      : null,
    data.email
      ? {
          key: 'email',
          value: data.email,
          href: `mailto:${data.email}`,
        }
      : null,
    data.website
      ? {
          key: 'website',
          value: data.website,
          href: `https://${data.website.replace(/^https?:\/\//u, '')}`,
        }
      : null,
    data.location
      ? {
          key: 'location',
          value: data.location,
        }
      : null,
  ].filter((item): item is SignatureContactItem => Boolean(item))

  return (
    <div className="signature-document">
      <div className="signature-document-card">
        <p className="signature-document-signoff">{data.signoff || 'Best regards,'}</p>

        <div className="signature-document-main">
          <div className="signature-document-avatar-shell">
            <img
              src={resolveStudioAssetSrc(data.profileSrc, data.profileSrc)}
              alt={data.profileAlt}
              className="signature-document-avatar"
            />
          </div>

          <div className="signature-document-copy">
            <h2 className="signature-document-name">{data.name}</h2>
            {hasRole ? <p className="signature-document-role">{data.role}</p> : null}
            {hasOrganization ? (
              <p className="signature-document-organization">{data.organization}</p>
            ) : null}
          </div>
        </div>

        <div className="signature-document-contact-rail">
          {contactItems.map((item, index) => {
            return (
              <span key={item.key} className="signature-document-contact-cluster">
                {item.href ? (
                  <a
                    href={item.href}
                    target={item.key === 'website' ? '_blank' : undefined}
                    rel={item.key === 'website' ? 'noopener noreferrer' : undefined}
                    className="signature-document-contact-item"
                  >
                    {item.value}
                  </a>
                ) : (
                  <span className="signature-document-contact-item">{item.value}</span>
                )}
                {index < contactItems.length - 1 ? (
                  <span className="signature-document-contact-separator" aria-hidden="true">
                    |
                  </span>
                ) : null}
              </span>
            )
          })}
        </div>

        <div className="signature-document-divider" />

        <div className="signature-document-logos">
          <SignatureLogoGroup logos={experienceLogos} />
          <SignatureLogoGroup logos={educationLogos} />
        </div>
      </div>
    </div>
  )
}
