import { type CSSProperties } from 'react'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'

import type { EmailSignatureTemplate } from '@/types'

interface EmailSignaturePreviewProps {
  template: EmailSignatureTemplate
}

export const EmailSignaturePreview = ({ template }: EmailSignaturePreviewProps) => {
  const { data } = template
  const styleVars: CSSProperties = {
    '--signature-accent': template.accent,
  } as CSSProperties

  return (
    <div className="signature-preview" style={styleVars}>
      <div className="signature-card">
        <p className="signature-signoff">Best regards,</p>
        <div className="signature-identity">
          <img src={data.profileSrc} alt={data.profileAlt} className="signature-avatar" />
          <div>
            <h3>{data.name}</h3>
            <p className="signature-role">{data.role}</p>
            {data.organization && <p className="signature-org">{data.organization}</p>}
          </div>
        </div>
        <ul className="signature-contact">
          <li>
            <span className="signature-icon">
              <Phone size={12} />
            </span>
            <span>{data.phone}</span>
          </li>
          <li>
            <span className="signature-icon">
              <Mail size={12} />
            </span>
            <span>{data.email}</span>
          </li>
          <li>
            <span className="signature-icon">
              <Globe size={12} />
            </span>
            <span>{data.website}</span>
          </li>
          {data.location && (
            <li>
              <span className="signature-icon">
                <MapPin size={12} />
              </span>
              <span>{data.location}</span>
            </li>
          )}
        </ul>
        <div className="signature-logos">
          {data.logos.map((logo, index) => (
            <div key={`${logo.alt}-${index}`} className="signature-logo">
              <img src={logo.src} alt={logo.alt} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
