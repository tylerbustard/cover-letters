import { getMonochromeLogoSrc, resolveStudioAssetSrc } from '@/data/assets'
import type { EmailSignatureTemplate, LogoAsset } from '@/types'

const STUDIO_ASSET_ORIGIN = 'https://tylerbustard.com'

type SignatureHtmlContactItem = {
  key: string
  value: string
  href: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const toAbsoluteStudioAssetUrl = (src: string) => {
  const resolved = resolveStudioAssetSrc(src, src)
  if (!resolved) return ''
  if (resolved.startsWith('http://') || resolved.startsWith('https://') || resolved.startsWith('data:')) {
    return resolved
  }

  return new URL(resolved, STUDIO_ASSET_ORIGIN).toString()
}

const getSignatureContactItems = (template: EmailSignatureTemplate): SignatureHtmlContactItem[] => {
  const { data } = template

  return [
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
          href: '',
        }
      : null,
  ].filter((item): item is SignatureHtmlContactItem => Boolean(item))
}

const normalizeLogoGroup = (logos: LogoAsset[], logoTone: EmailSignatureTemplate['data']['logoTone']) =>
  logos.map((logo) => ({
    alt: logo.alt,
    src: toAbsoluteStudioAssetUrl(logoTone === 'original' ? logo.src : getMonochromeLogoSrc(logo.src)),
  }))

const renderLogoRailHtml = (
  experienceLogos: Array<{ alt: string; src: string }>,
  educationLogos: Array<{ alt: string; src: string }>,
) => {
  const logos = [...experienceLogos, ...educationLogos]
  if (logos.length === 0) return ''

  const logoCells = logos
    .map(
      (logo, index) => `
        <td style="padding:0 ${index === logos.length - 1 ? 0 : 11}px 0 0;vertical-align:middle;">
          <img
            src="${logo.src}"
            alt="${escapeHtml(logo.alt)}"
            style="display:block;height:14px;width:auto;max-width:62px;opacity:0.62;border:0;outline:none;text-decoration:none;image-rendering:-webkit-optimize-contrast;"
          />
        </td>
      `,
    )
    .join('')

  return `
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
      <tr>${logoCells}</tr>
    </table>
  `
}

export const buildSignaturePlainText = (template: EmailSignatureTemplate) => {
  const { data } = template
  const lines = [
    data.signoff || 'Best regards,',
    '',
    data.name,
    data.organization || '',
    ...getSignatureContactItems(template).map((item) => item.value),
  ].filter((line) => line.trim().length > 0)

  return lines.join('\n')
}

export const buildSignatureHtmlFragment = (template: EmailSignatureTemplate) => {
  const { data } = template
  const hasRole = data.role.trim().length > 0
  const hasOrganization = Boolean(data.organization?.trim())

  const profileSrc = toAbsoluteStudioAssetUrl(data.profileSrc)
  const experienceLogos = normalizeLogoGroup(data.experienceLogos, data.logoTone)
  const educationLogos = normalizeLogoGroup(data.educationLogos, data.logoTone)

  const contactItems = getSignatureContactItems(template)

  const contactRailHtml = contactItems
    .map((item, index) => {
      const separatorHtml =
        index < contactItems.length - 1
          ? `<td style="padding:0 12px 0 0;vertical-align:middle;color:#cbd5e1;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12.5px;line-height:1.35;">|</td>`
          : ''
      const valueHtml = item.href
        ? `<a href="${escapeHtml(item.href)}" style="color:#64748b;text-decoration:none;">${escapeHtml(item.value)}</a>`
        : escapeHtml(item.value)

      return `
        <td style="padding:0 12px 0 0;vertical-align:middle;color:#64748b;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12.5px;line-height:1.35;white-space:nowrap;">${valueHtml}</td>
        ${separatorHtml}
      `
    })
    .join('')

  const logoRailHtml = renderLogoRailHtml(experienceLogos, educationLogos)

  return `
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;background:#ffffff;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;color:#0f172a;max-width:620px;">
      <tr>
        <td style="padding:0;background:#ffffff;">
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 10px 0;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.35;font-weight:500;letter-spacing:0;color:#475569;">
                ${escapeHtml(data.signoff || 'Best regards,')}
              </td>
            </tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0 14px 0 0;vertical-align:top;">
                <img
                  src="${profileSrc}"
                  alt="${escapeHtml(data.profileAlt)}"
                  width="56"
                  height="56"
                  style="display:block;width:56px;height:56px;border-radius:999px;border:1px solid #d7dee8;background:#ffffff;object-fit:cover;object-position:center 12%;"
                />
              </td>
              <td style="padding:0;vertical-align:top;">
                <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:0;font-family:'Aptos Display','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:22px;line-height:1.08;font-weight:700;letter-spacing:0;color:#0f172a;">
                      ${escapeHtml(data.name)}
                    </td>
                  </tr>
                  ${
                    hasRole
                      ? `
                        <tr>
                          <td style="height:4px;font-size:1px;line-height:1px;">&nbsp;</td>
                        </tr>
                        <tr>
                          <td style="padding:0;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.35;font-weight:600;letter-spacing:0;color:#334155;">
                            ${escapeHtml(data.role)}
                          </td>
                        </tr>
                      `
                      : ''
                  }
                  ${
                    hasOrganization
                      ? `
                        <tr>
                          <td style="height:${hasRole ? 3 : 4}px;font-size:1px;line-height:1px;">&nbsp;</td>
                        </tr>
                        <tr>
                          <td style="padding:1px 0 0 0;font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12.5px;line-height:1.35;letter-spacing:0;color:#64748b;">
                            ${escapeHtml(data.organization || '')}
                          </td>
                        </tr>
                      `
                      : ''
                  }
                </table>
              </td>
            </tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              <td style="height:10px;font-size:1px;line-height:1px;">&nbsp;</td>
            </tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              ${contactRailHtml}
            </tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              <td style="height:9px;font-size:1px;line-height:1px;">&nbsp;</td>
            </tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:75%;">
            <tr>
              <td style="height:1px;background:#e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td>
            </tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
            <tr>
              <td style="height:10px;font-size:1px;line-height:1px;">&nbsp;</td>
            </tr>
          </table>

          ${logoRailHtml}
        </td>
      </tr>
    </table>
  `
}

export const buildSignatureHtml = (template: EmailSignatureTemplate) => {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
  </head>
  <body style="margin:0;padding:0;background:#ffffff;">
    ${buildSignatureHtmlFragment(template)}
  </body>
</html>`
}
