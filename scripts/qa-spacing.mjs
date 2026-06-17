#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createServer } from 'vite'

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(ROOT, 'config', 'variants.json')
const REPORT_DIR = path.join(ROOT, 'output', 'variation-matrix')
const REPORT_PATH = path.join(REPORT_DIR, 'latest.json')

const failures = []
const report = {
  generatedAt: new Date().toISOString(),
  schemaVersion: null,
  checks: [],
  variants: [],
}

const run = (command, args, options = {}) =>
  spawnSync(command, args, { encoding: 'utf8', ...options })

const normalizeText = (value) => String(value).replace(/\s+/gu, ' ').trim()

const decodeHtmlText = (value) =>
  normalizeText(
    String(value)
      .replace(/<style[\s\S]*?<\/style>/giu, ' ')
      .replace(/<script[\s\S]*?<\/script>/giu, ' ')
      .replace(/<[^>]+>/gu, ' ')
      .replace(/&nbsp;/gu, ' ')
      .replace(/&amp;/gu, '&')
      .replace(/&#39;|&apos;/gu, "'")
      .replace(/&quot;/gu, '"'),
  )

const check = (name, ok, detail = '') => {
  const message = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`
  console.log(message)
  report.checks.push({ name, ok, detail })
  if (!ok) failures.push(`${name}${detail ? ` - ${detail}` : ''}`)
}

const requireCommand = (command) => {
  const result = run('sh', ['-lc', `command -v ${command}`])
  check(`${command} is available`, result.status === 0)
}

const requirePythonModule = (moduleName, importName = moduleName) => {
  const result = run('python3', ['-c', `import ${importName}`])
  check(`python3 module ${moduleName} is available`, result.status === 0, result.stderr.trim())
}

const closeServer = async (server) => {
  server.httpServer?.closeAllConnections?.()
  server.httpServer?.closeIdleConnections?.()
  await Promise.race([
    server.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ])
}

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'))

const getPdfPages = (pdfPath) => {
  const info = run('pdfinfo', [pdfPath]).stdout
  return Number((info.match(/Pages:\s+(\d+)/u) || [])[1] || 0)
}

const getPdfText = (pdfPath) => run('pdftotext', [pdfPath, '-']).stdout

const inspectPngs = (artifactDir, glob) => {
  const script = `
from pathlib import Path
from PIL import Image, ImageChops
import json

root = Path(${JSON.stringify(artifactDir)})
rows = []
for path in sorted(root.glob(${JSON.stringify(glob)})):
    if '-preview' in path.name:
        continue
    image = Image.open(path).convert('RGB')
    bbox = ImageChops.difference(image, Image.new('RGB', image.size, 'white')).getbbox()
    if bbox:
        left, top, right, bottom = bbox
        width, height = image.size
        rows.append({
            'name': path.name,
            'width': width,
            'height': height,
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom,
            'rightBlank': width - right,
            'bottomBlank': height - bottom,
            'contentHeightRatio': (bottom - top) / height,
            'bottomWhitespaceRatio': (height - bottom) / height,
            'verticalWhitespaceImbalance': abs((top / height) - ((height - bottom) / height)),
        })
    else:
        width, height = image.size
        rows.append({
            'name': path.name,
            'width': width,
            'height': height,
            'left': None,
            'top': None,
            'right': None,
            'bottom': None,
            'rightBlank': None,
            'bottomBlank': None,
            'contentHeightRatio': 0,
            'bottomWhitespaceRatio': 1,
            'verticalWhitespaceImbalance': 1,
        })

print(json.dumps(rows))
`
  const result = run('python3', ['-c', script])
  if (result.status !== 0) {
    throw new Error(result.stderr || `Unable to inspect PNGs for ${glob}`)
  }
  return JSON.parse(result.stdout)
}

const inspectSignaturePreview = (artifactDir, fileName) => {
  const script = `
from pathlib import Path
from PIL import Image, ImageChops
import json

path = Path(${JSON.stringify(artifactDir)}) / ${JSON.stringify(fileName)}
image = Image.open(path).convert('RGB')
bbox = ImageChops.difference(image, Image.new('RGB', image.size, 'white')).getbbox()
if bbox:
    left, top, right, bottom = bbox
    payload = {
        'name': path.name,
        'width': image.size[0],
        'height': image.size[1],
        'contentWidth': right - left,
        'contentHeight': bottom - top,
        'bbox': bbox,
    }
else:
    payload = {
        'name': path.name,
        'width': image.size[0],
        'height': image.size[1],
        'contentWidth': 0,
        'contentHeight': 0,
        'bbox': None,
    }
print(json.dumps(payload))
`
  const result = run('python3', ['-c', script])
  if (result.status !== 0) {
    throw new Error(result.stderr || `Unable to inspect signature preview ${fileName}`)
  }
  return JSON.parse(result.stdout)
}

const fileIsRecent = async (filePath, maxAgeMs) => {
  try {
    const metadata = await stat(filePath)
    return {
      ok: Date.now() - metadata.mtimeMs <= maxAgeMs,
      ageMinutes: (Date.now() - metadata.mtimeMs) / 60000,
    }
  } catch {
    return { ok: false, missing: true }
  }
}

const includesNormalized = (haystack, needle) =>
  normalizeText(haystack).includes(normalizeText(needle))

const requireText = (caseName, text, requiredValues) => {
  for (const required of requiredValues) {
    check(`${caseName} contains "${required}"`, includesNormalized(text, required))
  }
}

const rejectText = (caseName, text, forbiddenValues) => {
  for (const forbidden of forbiddenValues) {
    check(`${caseName} excludes "${forbidden}"`, !includesNormalized(text, forbidden))
  }
}

const compareIds = (kind, actualIds, expectedIds) => {
  const actual = [...actualIds].sort()
  const expected = [...expectedIds].sort()
  check(`${kind} manifest covers exact source ids`, JSON.stringify(actual) === JSON.stringify(expected), `${actual.join(', ')} / ${expected.join(', ')}`)
}

const assertPdfLayout = (caseName, bounds, target) => {
  check(`${caseName} PNG page count matches manifest`, bounds.length === target.expectedPages, `${bounds.length}/${target.expectedPages}`)
  const fills = []

  for (const pageBounds of bounds) {
    const label = `${caseName} ${pageBounds.name}`
    check(`${label} has visible content`, pageBounds.left !== null, JSON.stringify(pageBounds))
    if (pageBounds.left === null) continue

    fills.push(pageBounds.contentHeightRatio)
    check(`${label} left margin stays clear`, pageBounds.left >= target.minLeftMarginPx, `left=${pageBounds.left}`)
    check(`${label} right margin stays clear`, pageBounds.rightBlank >= target.minRightMarginPx, `rightBlank=${pageBounds.rightBlank}`)
    check(`${label} top margin stays clear`, pageBounds.top >= target.minTopMarginPx, `top=${pageBounds.top}`)
    check(`${label} bottom margin stays clear`, pageBounds.bottomBlank >= target.minBottomMarginPx, `bottomBlank=${pageBounds.bottomBlank}`)
    check(
      `${label} uses enough vertical space`,
      pageBounds.contentHeightRatio >= target.minContentHeightRatio,
      `fill=${pageBounds.contentHeightRatio.toFixed(3)}`,
    )
    check(
      `${label} avoids excessive bottom whitespace`,
      pageBounds.bottomWhitespaceRatio <= target.maxBottomWhitespaceRatio,
      `bottomWhitespace=${pageBounds.bottomWhitespaceRatio.toFixed(3)}`,
    )
    check(
      `${label} keeps top/bottom whitespace balanced`,
      pageBounds.verticalWhitespaceImbalance <= target.maxVerticalWhitespaceImbalance,
      `imbalance=${pageBounds.verticalWhitespaceImbalance.toFixed(3)}`,
    )
  }

  if (fills.length > 1) {
    const spread = Math.max(...fills) - Math.min(...fills)
    check(`${caseName} page fill spread is controlled`, spread <= target.maxPageFillSpread, `spread=${spread.toFixed(3)}`)
  }
}

const assertNoOrphanPageStart = (caseName, pdfText) => {
  const pages = pdfText
    .split('\f')
    .map((page) => normalizeText(page))
    .filter(Boolean)

  pages.slice(1).forEach((pageText, index) => {
    check(`${caseName} page ${index + 2} does not start with an orphan bullet`, !/^[•*-]/u.test(pageText), pageText.slice(0, 60))
  })
}

requireCommand('pdfinfo')
requireCommand('pdftotext')
requireCommand('python3')
requirePythonModule('Pillow', 'PIL')

const manifest = await readJson(MANIFEST_PATH)
report.schemaVersion = manifest.schemaVersion

const artifactDir = path.join(ROOT, manifest.artifactDir)
const maxAgeMs = Number(manifest.maxArtifactAgeMinutes ?? 30) * 60 * 1000

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })

try {
  const { RESUME_TEMPLATES } = await server.ssrLoadModule('/src/data/resumes.ts')
  const { COVER_LETTER_TEMPLATES } = await server.ssrLoadModule('/src/data/coverLetters.ts')
  const { SIGNATURE_TEMPLATES } = await server.ssrLoadModule('/src/data/signatures.ts')
  const signatureHtml = await server.ssrLoadModule('/src/lib/signature-html.ts')

  const source = {
    profile: new Map(RESUME_TEMPLATES.map((template) => [template.id, template])),
    narrative: new Map(COVER_LETTER_TEMPLATES.map((template) => [template.id, template])),
    identity: new Map(SIGNATURE_TEMPLATES.map((template) => [template.id, template])),
  }

  compareIds('Profile', source.profile.keys(), Object.keys(manifest.profile.variants))
  compareIds('Narrative', source.narrative.keys(), Object.keys(manifest.narrative.variants))
  compareIds('Identity', source.identity.keys(), Object.keys(manifest.identity.variants))

  for (const [kind, collection] of [
    ['profile', manifest.profile],
    ['narrative', manifest.narrative],
  ]) {
    const target = manifest.layoutTargets[kind]
    const prefix = collection.artifactPrefix

    for (const [id, variant] of Object.entries(collection.variants)) {
      const template = source[kind].get(id)
      const caseName = `${kind}-${id}`
      check(`${caseName} source template exists`, Boolean(template))
      if (!template) continue

      const pdfPath = path.join(artifactDir, `${prefix}-${id}.pdf`)
      const recent = await fileIsRecent(pdfPath, maxAgeMs)
      check(
        `${caseName} PDF artifact is current`,
        recent.ok,
        recent.missing ? pdfPath : `${recent.ageMinutes.toFixed(1)} minutes old`,
      )
      if (!recent.ok) continue

      const pages = getPdfPages(pdfPath)
      const pdfText = getPdfText(pdfPath)
      const bounds = inspectPngs(artifactDir, `${prefix}-${id}-*.png`)
      const forbiddenText = [
        ...(manifest.globalForbiddenText ?? []),
        ...(collection.forbiddenText ?? []),
        ...(variant.forbiddenText ?? []),
      ]

      check(`${caseName} PDF page count matches manifest`, pages === target.expectedPages, `${pages}/${target.expectedPages}`)
      requireText(caseName, pdfText, variant.requiredText ?? [])
      rejectText(caseName, pdfText, forbiddenText)
      assertNoOrphanPageStart(caseName, pdfText)
      assertPdfLayout(caseName, bounds, target)

      report.variants.push({
        kind,
        id,
        pages,
        requiredTextCount: variant.requiredText?.length ?? 0,
        layout: bounds.map((entry) => ({
          page: entry.name,
          fill: Number(entry.contentHeightRatio.toFixed(3)),
          bottomWhitespace: Number(entry.bottomWhitespaceRatio.toFixed(3)),
          imbalance: Number(entry.verticalWhitespaceImbalance.toFixed(3)),
        })),
      })
    }
  }

  for (const [id, variant] of Object.entries(manifest.identity.variants)) {
    const template = source.identity.get(id)
    const caseName = `identity-${id}`
    check(`${caseName} source template exists`, Boolean(template))
    if (!template) continue

    const htmlPath = path.join(artifactDir, `${manifest.identity.artifactPrefix}-${id}.html`)
    const previewPath = path.join(artifactDir, `${manifest.identity.artifactPrefix}-${id}-preview.png`)
    const recent = await fileIsRecent(htmlPath, maxAgeMs)
    check(
      `${caseName} HTML artifact is current`,
      recent.ok,
      recent.missing ? htmlPath : `${recent.ageMinutes.toFixed(1)} minutes old`,
    )
    if (!recent.ok) continue

    const artifactHtml = await readFile(htmlPath, 'utf8')
    const builtHtml = signatureHtml.buildSignatureHtml(template)
    const artifactText = decodeHtmlText(artifactHtml)
    const forbiddenText = [
      ...(manifest.globalForbiddenText ?? []),
      ...(manifest.identity.forbiddenText ?? []),
      ...(variant.forbiddenText ?? []),
    ]

    check(`${caseName} downloaded HTML matches export builder`, normalizeText(artifactHtml) === normalizeText(builtHtml))
    requireText(caseName, artifactText, variant.requiredText ?? [])
    rejectText(caseName, artifactText, forbiddenText)

    const previewRecent = await fileIsRecent(previewPath, maxAgeMs)
    check(
      `${caseName} rendered preview artifact is current`,
      previewRecent.ok,
      previewRecent.missing ? previewPath : `${previewRecent.ageMinutes.toFixed(1)} minutes old`,
    )
    if (previewRecent.ok) {
      const preview = inspectSignaturePreview(artifactDir, `${manifest.identity.artifactPrefix}-${id}-preview.png`)
      const target = manifest.layoutTargets.identity
      check(`${caseName} preview has visible content`, Boolean(preview.bbox), JSON.stringify(preview))
      check(`${caseName} preview width is controlled`, preview.contentWidth <= target.maxRenderedWidthPx, `width=${preview.contentWidth}`)
      check(`${caseName} preview height is controlled`, preview.contentHeight <= target.maxRenderedHeightPx, `height=${preview.contentHeight}`)
      check(`${caseName} preview width is not collapsed`, preview.contentWidth >= target.minRenderedWidthPx, `width=${preview.contentWidth}`)
      check(`${caseName} preview height is not collapsed`, preview.contentHeight >= target.minRenderedHeightPx, `height=${preview.contentHeight}`)

      report.variants.push({
        kind: 'identity',
        id,
        requiredTextCount: variant.requiredText?.length ?? 0,
        layout: {
          width: preview.contentWidth,
          height: preview.contentHeight,
        },
      })
    }
  }
} finally {
  await closeServer(server)
}

await mkdir(REPORT_DIR, { recursive: true })
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
console.log(`\nVariation matrix report: ${REPORT_PATH}`)

if (failures.length > 0) {
  console.error(`\n${failures.length} variation matrix failure(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('\nALL VARIATION MATRIX CHECKS PASSED')
