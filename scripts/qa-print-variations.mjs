#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')

const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 5025
const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'output', 'print-qa', 'latest')

const failures = []
const results = []

const check = (name, ok, detail = '') => {
  const message = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`
  console.log(message)
  if (!ok) failures.push(`${name}${detail ? ` - ${detail}` : ''}`)
}

const run = (command, args, options = {}) =>
  spawnSync(command, args, { encoding: 'utf8', ...options })

const requireCommand = (command) => {
  const result = run('sh', ['-lc', `command -v ${command}`])
  check(`${command} is available`, result.status === 0)
}

const requirePythonModule = (moduleName, importName = moduleName) => {
  const result = run('python3', ['-c', `import ${importName}`])
  check(`python3 module ${moduleName} is available`, result.status === 0, result.stderr.trim())
}

requireCommand('pdfinfo')
requireCommand('pdftotext')
requireCommand('pdftoppm')
requireCommand('python3')
requirePythonModule('Pillow', 'PIL')
check('Chrome executable is available', existsSync(CHROME), CHROME)

if (failures.length > 0) {
  console.error(`\n${failures.length} print QA preflight failure(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const getPdfPages = (pdfPath) => {
  const info = run('pdfinfo', [pdfPath]).stdout
  return Number((info.match(/Pages:\s+(\d+)/u) || [])[1] || 0)
}

const getPdfText = (pdfPath) => run('pdftotext', [pdfPath, '-']).stdout

const rasterizePdf = (pdfPath, outPrefix) => {
  const result = run('pdftoppm', ['-png', '-r', '150', pdfPath, outPrefix])
  if (result.status !== 0) {
    throw new Error(result.stderr || `Unable to rasterize ${pdfPath}`)
  }
}

const imageBounds = (pngGlob) => {
  const script = `
from pathlib import Path
from PIL import Image, ImageChops
import json
paths = sorted(Path(${JSON.stringify(OUT_DIR)}).glob(${JSON.stringify(pngGlob)}))
rows = []
for path in paths:
    image = Image.open(path).convert('RGB')
    bbox = ImageChops.difference(image, Image.new('RGB', image.size, 'white')).getbbox()
    rows.append({
        'name': path.name,
        'width': image.size[0],
        'height': image.size[1],
        'bbox': bbox,
        'top': bbox[1] if bbox else None,
        'bottom': bbox[3] if bbox else None,
        'left': bbox[0] if bbox else None,
        'right': bbox[2] if bbox else None,
    })
print(json.dumps(rows))
`
  const result = run('python3', ['-c', script])
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Unable to inspect rendered PNG bounds')
  }
  return JSON.parse(result.stdout)
}

const waitForImagesAndFonts = (page) =>
  page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
    await Promise.all(
      [...document.images].map((image) =>
        image.complete
          ? true
          : new Promise((resolve) => {
              const timer = window.setTimeout(resolve, 8000)
              const finalize = () => {
                window.clearTimeout(timer)
                resolve()
              }
              image.addEventListener('load', finalize, { once: true })
              image.addEventListener('error', finalize, { once: true })
            }),
      ),
    )
  })

const localExportUrl = (route, template) => {
  const payload = Buffer.from(JSON.stringify(template), 'utf8').toString('base64url')
  return `http://127.0.0.1:${PORT}/studio/${route}/pdf?mode=local&payload=${payload}`
}

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const inspectDocumentPage = (page, documentType) =>
  page.evaluate((type) => {
    const images = [...document.images]
    const brokenImages = images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.alt || image.src)
    const root = document.documentElement
    const role = document.querySelector('.resume-header-role')?.textContent?.trim() ?? ''
    const credentialName = document.querySelector('.cover-letter-credential-name')?.textContent?.trim() ?? ''
    const credentialDetail = document.querySelector('.cover-letter-credential-detail')?.textContent?.trim() ?? ''

    return {
      brokenImages,
      role,
      credentialName,
      credentialDetail,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      bodyText: document.body.innerText,
      readySelectorFound:
        type === 'resume'
          ? Boolean(document.querySelector('.resume-header-name'))
          : Boolean(document.querySelector('.cover-letter-document-greeting')),
    }
  }, documentType)

const assertRenderedBounds = (caseName, bounds) => {
  check(`${caseName} PNG pages rendered`, bounds.length > 0, `${bounds.length} page image(s)`)
  for (const pageBounds of bounds) {
    const label = `${caseName} ${pageBounds.name}`
    check(`${label} has visible content`, Boolean(pageBounds.bbox), JSON.stringify(pageBounds.bbox))
    if (!pageBounds.bbox) continue
    check(`${label} content stays inside left margin`, pageBounds.left >= 35, `left=${pageBounds.left}`)
    check(`${label} content stays inside right margin`, pageBounds.right <= pageBounds.width - 35, `right=${pageBounds.right}`)
    check(`${label} content stays inside top margin`, pageBounds.top >= 35, `top=${pageBounds.top}`)
    check(`${label} content stays inside bottom margin`, pageBounds.bottom <= pageBounds.height - 35, `bottom=${pageBounds.bottom}`)
  }
}

await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })

const server = await createServer({
  root: ROOT,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
})

await server.listen()

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: ['--no-first-run', '--disable-gpu'],
})

try {
  const { RESUME_TEMPLATES } = await server.ssrLoadModule('/src/data/resumes.ts')
  const { COVER_LETTER_TEMPLATES } = await server.ssrLoadModule('/src/data/coverLetters.ts')
  const { SIGNATURE_TEMPLATES } = await server.ssrLoadModule('/src/data/signatures.ts')
  const signatureHtml = await server.ssrLoadModule('/src/lib/signature-html.ts')

  const documentCases = [
    ...RESUME_TEMPLATES.map((template) => ({
      type: 'resume',
      route: 'resume',
      name: `resume-${template.id}`,
      template,
      expectedPages: 2,
      readySelector: '.resume-header-name',
      expectedText: [
        template.data.header.name,
        template.data.header.title,
        template.data.experience.primary[0]?.role,
        template.data.education[0]?.school,
        template.data.leadership[0]?.items[0]?.role,
      ].filter(Boolean),
    })),
    ...COVER_LETTER_TEMPLATES.map((template) => ({
      type: 'cover-letter',
      route: 'cover-letter',
      name: `cover-${template.id}`,
      template,
      expectedPages: 1,
      readySelector: '.cover-letter-document-greeting',
      expectedText: [
        template.data.yourName,
        template.config.credentialName,
        template.config.credentialDetail,
        `Dear ${template.data.hiringManager},`,
        template.data.signoffLabel,
      ].filter(Boolean),
    })),
  ]

  for (const testCase of documentCases) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 1600 })

    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text())
    })

    await page.goto(localExportUrl(testCase.route, testCase.template), {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })
    await page.waitForSelector(testCase.readySelector, { timeout: 15000 })
    await waitForImagesAndFonts(page)

    const preview = await inspectDocumentPage(page, testCase.type)
    check(`${testCase.name} preview ready`, preview.readySelectorFound)
    check(`${testCase.name} preview has no broken images`, preview.brokenImages.length === 0, preview.brokenImages.join(', '))
    check(`${testCase.name} preview has no horizontal overflow`, preview.scrollWidth <= preview.clientWidth + 2, `${preview.scrollWidth}/${preview.clientWidth}`)
    check(`${testCase.name} preview has no console/page errors`, pageErrors.length === 0, pageErrors.join(' | '))

    if (testCase.type === 'cover-letter') {
      check(`${testCase.name} preview credential name`, preview.credentialName === testCase.template.config.credentialName, preview.credentialName)
      check(`${testCase.name} preview credential detail`, preview.credentialDetail === testCase.template.config.credentialDetail, preview.credentialDetail)
    } else {
      check(`${testCase.name} preview header title`, preview.role === testCase.template.data.header.title, preview.role)
    }

    const screenshotPath = path.join(OUT_DIR, `${testCase.name}-preview.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const pdfPath = path.join(OUT_DIR, `${testCase.name}.pdf`)
    await page.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true })
    await page.close()

    const pages = getPdfPages(pdfPath)
    const text = getPdfText(pdfPath)
    const rasterPrefix = path.join(OUT_DIR, testCase.name)
    rasterizePdf(pdfPath, rasterPrefix)
    const bounds = imageBounds(`${testCase.name}-*.png`.replace('-preview', ''))

    check(`${testCase.name} PDF page count`, pages === testCase.expectedPages, `${pages}/${testCase.expectedPages}`)
    check(`${testCase.name} PDF has no browser header/footer text`, !/(http:\/\/127\.0\.0\.1|\d{1,2}\/\d{1,2}\/\d{2},)/u.test(text))
    check(`${testCase.name} PDF has no loading/error text`, !/(Preparing .* PDF|Unable to load|Loading\.\.\.)/u.test(text))
    for (const expected of testCase.expectedText) {
      check(`${testCase.name} PDF contains "${expected}"`, text.includes(expected))
    }
    assertRenderedBounds(testCase.name, bounds.filter((entry) => !entry.name.includes('-preview')))

    results.push({ name: testCase.name, pages, preview: screenshotPath, pdf: pdfPath })
  }

  for (const template of SIGNATURE_TEMPLATES) {
    const name = `signature-${template.id}`
    const html = signatureHtml.buildSignatureHtml(template)
    const htmlPath = path.join(OUT_DIR, `${name}.html`)
    await writeFile(htmlPath, html)

    check(`${name} HTML uses Sincerely`, html.includes('Sincerely'))
    check(`${name} HTML omits Best regards`, !html.includes('Best regards'))
    check(`${name} HTML includes name`, html.includes(template.data.name))
    for (const line of template.data.affiliationLines ?? []) {
      check(`${name} HTML includes affiliation "${line}"`, html.includes(line) || html.includes(escapeHtml(line)))
    }
    check(`${name} HTML uses stable FinChat assets`, !html.includes('/assets/') && html.includes('https://finchat.ca/ai-assets/'))

    const page = await browser.newPage()
    await page.setViewport({ width: 900, height: 600 })
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await waitForImagesAndFonts(page)
    const signaturePreview = await page.evaluate(() => {
      const images = [...document.images]
      return {
        text: document.body.innerText,
        brokenImages: images
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.alt || image.src),
      }
    })
    check(`${name} rendered HTML has no broken images`, signaturePreview.brokenImages.length === 0, signaturePreview.brokenImages.join(', '))
    await page.screenshot({ path: path.join(OUT_DIR, `${name}-preview.png`), fullPage: true })
    await page.close()
  }
} finally {
  await browser.close().catch(() => {})
  await server.close()
}

console.log('\nPrint QA artifacts:', OUT_DIR)
console.log(JSON.stringify(results, null, 2))

if (failures.length > 0) {
  console.error(`\n${failures.length} print QA failure(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('\nALL PRINT QA CHECKS PASSED')
