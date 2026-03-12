import { type CSSProperties } from 'react'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'

import {
  createDocumentVisualStyle,
  DocumentContactChip,
  DocumentLogoBadge,
} from '@/components/document-primitives'
import type {
  EmailSignatureTemplate,
  PresentationContactLayout,
  PresentationDensity,
} from '@/types'

interface EmailSignaturePreviewProps {
  template: EmailSignatureTemplate
  density: PresentationDensity
  showAvatar: boolean
  contactLayout: PresentationContactLayout
}

export const EmailSignaturePreview = ({
  template,
  density,
  showAvatar,
  contactLayout,
}: EmailSignaturePreviewProps) => {
  const { data } = template
  const styleVars = createDocumentVisualStyle({
    accent: template.accent,
    accentSoft: template.accentSoft,
    accentDark: template.accentDark,
  }) as CSSProperties
  const contactItems = [
    { key: 'email', icon: Mail, value: data.email },
    { key: 'phone', icon: Phone, value: data.phone },
    { key: 'website', icon: Globe, value: data.website },
  ]

  if (data.location) {
    contactItems.push({ key: 'location', icon: MapPin, value: data.location })
  }

  return (
    <div
      className="signature-preview"
      style={styleVars}
      data-density={density}
      data-contact-layout={contactLayout}
      data-avatar={showAvatar ? 'visible' : 'hidden'}
    >
      <div className="signature-card">
        <p className="signature-signoff">Sincerely,</p>
        <div className="signature-identity">
          {showAvatar ? <img src={data.profileSrc} alt={data.profileAlt} className="signature-avatar" /> : null}
          <div className="document-title-stack signature-title-stack">
            <h3>{data.name}</h3>
            <p className="signature-role">{data.role}</p>
            {data.organization && <p className="signature-org">{data.organization}</p>}
          </div>
        </div>

        <div className="signature-contact-grid">
          {contactItems.map((item) => (
            <DocumentContactChip
              key={item.key}
              contactKey={item.key}
              icon={item.icon}
              value={item.value}
              className="signature-contact-chip"
            />
          ))}
        </div>

        {data.logos.length > 0 && (
          <div className="signature-logos">
            {data.logos.map((logo, index) => (
              <DocumentLogoBadge
                key={`${logo.alt}-${index}`}
                src={logo.src}
                alt={logo.alt}
                className="signature-logo-badge"
                imageClassName="signature-logo-image"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
