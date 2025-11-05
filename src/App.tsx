import { type ChangeEvent, useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'

import { CoverLetterPreview } from '@/components/cover-letter-preview'
import { COVER_LETTER_VARIATIONS, VARIATION_MAP, type VariationConfig } from '@/config/variations'
import {
  getContactItems,
  getLetterParagraphs,
  getOpportunitySummary,
  getRecipientLines,
  sanitizeFilenamePart,
} from '@/lib/letter'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type CoverLetterData, type VariationId } from '@/types'

type FieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>

const createInitialData = (config: VariationConfig): CoverLetterData => ({
  companyName: '[Company Name]',
  position: '[Role Title]',
  hiringManager: 'Hiring Manager',
  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  yourName: config.defaults.yourName,
  yourEmail: config.defaults.yourEmail,
  yourPhone: config.defaults.yourPhone,
  yourWebsite: config.defaults.yourWebsite,
  yourAddress: config.defaults.yourAddress,
  companyAddress: '123 Example Street\nCity, Province Postal Code',
  openingParagraph:
    'I am writing to express my interest in the [Role Title] position at [Company Name]. I am energized by the opportunity to bring my blend of finance and technology experience to your team.',
  bodyParagraph1:
    'In my current role, I [add a quantifiable achievement that demonstrates how you deliver measurable impact aligned with the position].',
  bodyParagraph2:
    'I am especially drawn to [Company Name] because [share a reason that connects your values, industry focus, or recent initiatives].',
  bodyParagraph3:
    'Beyond my technical background, I bring [highlight a leadership, collaboration, or client-facing strength that differentiates you].',
  closingParagraph:
    'Thank you for considering my application. I would welcome the chance to discuss how I can support the [Role Title] mandate at [Company Name].',
})

const buildPlainTextLetter = (data: CoverLetterData) => {
  const headerLines: string[] = []

  if (data.yourName.trim()) headerLines.push(data.yourName.trim())
  if (data.yourAddress.trim()) headerLines.push(data.yourAddress.trim())

  const contactParts = [data.yourEmail, data.yourPhone, data.yourWebsite]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (contactParts.length > 0) {
    headerLines.push(contactParts.join(' | '))
  }

  const recipientLines = getRecipientLines(data)
  const paragraphs = getLetterParagraphs(data)
  const greetingName = data.hiringManager.trim() || 'Hiring Manager'

  const lines: string[] = []

  if (headerLines.length > 0) {
    lines.push(...headerLines, '')
  }

  if (data.date.trim()) {
    lines.push(data.date.trim(), '')
  }

  if (recipientLines.length > 0) {
    lines.push(...recipientLines, '')
  }

  lines.push(`Dear ${greetingName},`, '', ...paragraphs, '', 'Sincerely,', data.yourName.trim() || 'Tyler Bustard')

  return lines.join('\n')
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildPdfHtml = (data: CoverLetterData, config: VariationConfig) => {
  const contactChips = getContactItems(data)
    .map((item) => `<span>${escapeHtml(item.value)}</span>`)
    .join('')

  const recipientHtml = getRecipientLines(data)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('')

  const paragraphsHtml = getLetterParagraphs(data)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, '<br />')}</p>`)
    .join('')

  const greetingName = escapeHtml(data.hiringManager.trim() || 'Hiring Manager')
  const opportunitySummary = escapeHtml(getOpportunitySummary(data))

  const dateHtml = data.date.trim()
    ? `<div class="date">${escapeHtml(data.date.trim())}</div>`
    : ''

  const contactBlock = contactChips ? `<div class="contact">${contactChips}</div>` : ''
  const summaryHtml = config.summary
    ? `<p class="summary">${escapeHtml(config.summary)}</p>`
    : ''
  const signatureHtml = config.signatureSrc
    ? `<div class="signature-image"><img src="${config.signatureSrc}" alt="${escapeHtml(config.signatureAlt)}" /></div>`
    : ''
  const recipientBlock = recipientHtml ? `<div class="recipient">${recipientHtml}</div>` : ''
  const metaBlock = dateHtml || recipientBlock ? `<div class="meta">${dateHtml}${recipientBlock}</div>` : ''
  const logoHtml = config.logoSrc
    ? `<div class="logo"><img src="${config.logoSrc}" alt="${escapeHtml(config.logoAlt)}" /></div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Cover Letter - ${escapeHtml(data.companyName || 'Opportunity')}</title>
  <style>
    @page { margin: 1in; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1d1d1f; line-height: 1.65; margin: 0; }
    .letter { max-width: 7.5in; margin: 0 auto; }
    .header { border-bottom: 3px solid ${config.accent}; padding-bottom: 18px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .identity { flex: 1; }
    .organization { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: ${config.accent}; margin-bottom: 6px; }
    .name { font-size: 24px; font-weight: 700; color: ${config.accentDark}; letter-spacing: -0.01em; }
    .tagline { font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; color: ${config.accent}; margin-top: 6px; }
    .logo { width: 56px; height: 56px; border-radius: 16px; border: 1px solid ${config.accent}1f; background: ${config.accentLight}; display: flex; align-items: center; justify-content: center; }
    .logo img { max-width: 40px; max-height: 40px; object-fit: contain; }
    .contact { margin: 12px 0 0; display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #4b5563; }
    .contact span { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 999px; background: ${config.accentLight}; border: 1px solid ${config.accent}1a; }
    .summary { font-size: 13px; color: #374151; line-height: 1.7; border-top: 1px solid #e5e7eb; margin-top: 18px; padding-top: 18px; }
    .meta { font-size: 13px; color: #4b5563; margin-bottom: 22px; }
    .recipient { margin-top: 10px; }
    .opportunity { margin-bottom: 24px; padding: 16px 18px; border-radius: 16px; background: ${config.accentLight}; color: ${config.accentDark}; }
    .opportunity-label { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; color: ${config.accentDark}; }
    .opportunity-organization { font-weight: 600; font-size: 14px; margin-bottom: 6px; }
    .opportunity p { margin: 0; color: #374151; }
    .greeting { font-size: 14px; font-weight: 600; color: ${config.accentDark}; margin-bottom: 16px; }
    .body p { margin: 0 0 16px; text-align: justify; }
    .closing { margin-top: 32px; font-size: 14px; }
    .signature-image { margin: 12px 0; }
    .signature-image img { height: 48px; width: auto; object-fit: contain; filter: grayscale(100%); }
  </style>
</head>
<body>
  <div class="letter">
    <div class="header">
      <div class="identity">
        <div class="organization">${escapeHtml(config.organization)}</div>
        <div class="name">${escapeHtml(data.yourName)}</div>
        <div class="tagline">${escapeHtml(config.tagline)}</div>
      </div>
      ${logoHtml}
    </div>
    ${contactBlock}
    ${summaryHtml}
    ${metaBlock}
    <div class="opportunity">
      <div class="opportunity-label">Opportunity Focus</div>
      <div class="opportunity-organization">${escapeHtml(config.organization)}</div>
      <p>${opportunitySummary.replace(/\r?\n/g, '<br />')}</p>
    </div>
    <div class="greeting">Dear ${greetingName},</div>
    <div class="body">${paragraphsHtml}</div>
    <div class="closing">
      <p>Sincerely,</p>
      ${signatureHtml}
      <p>${escapeHtml(data.yourName)}</p>
    </div>
  </div>
</body>
</html>`
}

export default function App() {
  const [variationId, setVariationId] = useState<VariationId>(COVER_LETTER_VARIATIONS[0].id)
  const [data, setData] = useState<CoverLetterData>(() => createInitialData(COVER_LETTER_VARIATIONS[0]))
  const [previewMode, setPreviewMode] = useState(false)

  const selectedVariation = VARIATION_MAP[variationId]

  useEffect(() => {
    const defaults = VARIATION_MAP[variationId].defaults

    setData((prev) => ({
      ...prev,
      ...defaults,
    }))
  }, [variationId])

  const handleFieldChange = (field: keyof CoverLetterData) => (event: FieldChangeEvent) => {
    const { value } = event.target
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const downloadCoverLetter = () => {
    const content = buildPlainTextLetter(data)
    const companySlug = sanitizeFilenamePart(data.companyName, 'Company')
    const positionSlug = sanitizeFilenamePart(data.position, 'Role')
    const fileName = `Cover_Letter_${companySlug}_${positionSlug}_${variationId}.txt`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const downloadPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = buildPdfHtml(data, selectedVariation)
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f7' }}>
      <div className="mx-auto max-w-7xl px-4 py-12">
        <header className="mb-10 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold text-gray-900">Cover Letter Generator</h1>
              </div>
              <p className="mt-3 max-w-2xl text-gray-600">
                Create polished cover letters that match the resume aesthetics across every site variation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {COVER_LETTER_VARIATIONS.map((variation) => {
                const isActive = variation.id === variationId

                return (
                  <button
                    key={variation.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setVariationId(variation.id)}
                    className={cn(
                      'w-full min-w-[180px] rounded-2xl border px-4 py-3 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto',
                      isActive ? 'shadow-md' : 'hover:border-gray-300 hover:shadow-md',
                    )}
                    style={{
                      borderColor: isActive ? variation.accent : 'rgba(0,0,0,0.08)',
                      backgroundColor: isActive ? variation.accentLight : '#ffffff',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl border"
                        style={{
                          borderColor: isActive ? `${variation.accent}33` : 'rgba(0,0,0,0.08)',
                          backgroundColor: isActive ? '#ffffff' : variation.accentLight,
                        }}
                      >
                        <img src={variation.logoSrc} alt={variation.logoAlt} className="h-6 w-6 object-contain" />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-900">{variation.label}</span>
                        <span className="mt-1 block text-xs text-gray-600">{variation.description}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-600">
              Currently viewing the <span className="font-semibold text-gray-900">{selectedVariation.label}</span> variation styled for{' '}
              <span className="text-gray-900">{selectedVariation.tagline}</span> resumes at {selectedVariation.organization}.
            </p>
          </div>
        </header>

        <div className="mb-6 flex justify-center lg:hidden">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                !previewMode
                  ? 'rounded-md bg-primary text-primary-foreground'
                  : 'rounded-md text-gray-600 hover:text-gray-900',
              )}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                previewMode
                  ? 'rounded-md bg-primary text-primary-foreground'
                  : 'rounded-md text-gray-600 hover:text-gray-900',
              )}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,380px),1fr]">
          <div className={cn('space-y-6', previewMode && 'hidden', 'lg:block')}>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Personal Details</h2>
              <p className="mt-1 text-sm text-gray-500">This information appears in the header of your cover letter.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="yourName">Your Name</Label>
                  <Input id="yourName" value={data.yourName} onChange={handleFieldChange('yourName')} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="yourEmail">Your Email</Label>
                  <Input id="yourEmail" value={data.yourEmail} onChange={handleFieldChange('yourEmail')} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="yourPhone">Your Phone</Label>
                  <Input id="yourPhone" value={data.yourPhone} onChange={handleFieldChange('yourPhone')} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="yourWebsite">Your Website</Label>
                  <Input
                    id="yourWebsite"
                    value={data.yourWebsite}
                    onChange={handleFieldChange('yourWebsite')}
                    className="mt-1"
                    placeholder="tylerbustard.net"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="yourAddress">Your Location</Label>
                  <Input id="yourAddress" value={data.yourAddress} onChange={handleFieldChange('yourAddress')} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" value={data.date} onChange={handleFieldChange('date')} className="mt-1" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Opportunity Details</h2>
              <p className="mt-1 text-sm text-gray-500">Add company context so the preview highlights the right role.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={data.companyName} onChange={handleFieldChange('companyName')} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="position">Position Title</Label>
                  <Input id="position" value={data.position} onChange={handleFieldChange('position')} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="hiringManager">Hiring Manager</Label>
                  <Input id="hiringManager" value={data.hiringManager} onChange={handleFieldChange('hiringManager')} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="companyAddress">Company Address (optional)</Label>
                  <Textarea
                    id="companyAddress"
                    value={data.companyAddress}
                    onChange={handleFieldChange('companyAddress')}
                    className="mt-1"
                    rows={3}
                    placeholder={`123 Bay Street\nToronto, ON M5J 2N8`}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Letter Narrative</h2>
              <p className="mt-1 text-sm text-gray-500">Shape the story you want to tell. Leave any section blank to use the smart defaults.</p>
              <div className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="openingParagraph">Opening paragraph</Label>
                  <Textarea
                    id="openingParagraph"
                    value={data.openingParagraph}
                    onChange={handleFieldChange('openingParagraph')}
                    className="mt-1"
                    rows={3}
                    placeholder="I am writing to express my interest in..."
                  />
                </div>
                <div>
                  <Label htmlFor="bodyParagraph1">Body paragraph 1</Label>
                  <Textarea
                    id="bodyParagraph1"
                    value={data.bodyParagraph1}
                    onChange={handleFieldChange('bodyParagraph1')}
                    className="mt-1"
                    rows={4}
                    placeholder="Highlight a result, initiative, or skill that aligns with the role."
                  />
                </div>
                <div>
                  <Label htmlFor="bodyParagraph2">Body paragraph 2</Label>
                  <Textarea
                    id="bodyParagraph2"
                    value={data.bodyParagraph2}
                    onChange={handleFieldChange('bodyParagraph2')}
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="bodyParagraph3">Body paragraph 3</Label>
                  <Textarea
                    id="bodyParagraph3"
                    value={data.bodyParagraph3}
                    onChange={handleFieldChange('bodyParagraph3')}
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="closingParagraph">Closing paragraph</Label>
                  <Textarea
                    id="closingParagraph"
                    value={data.closingParagraph}
                    onChange={handleFieldChange('closingParagraph')}
                    className="mt-1"
                    rows={3}
                    placeholder="I am eager to bring my skills..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={cn('space-y-6', !previewMode && 'hidden', 'lg:block')}>
            <div className="rounded-3xl bg-transparent">
              <CoverLetterPreview data={data} config={selectedVariation} />
            </div>

            <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
              <Button onClick={downloadCoverLetter} size="lg" className="gap-2">
                <Download className="h-5 w-5" />
                Download as TXT
              </Button>
              <Button onClick={downloadPDF} size="lg" variant="outline" className="gap-2">
                <FileText className="h-5 w-5" />
                Download as PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
