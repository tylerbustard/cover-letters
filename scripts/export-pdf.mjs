#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const execFileAsync = promisify(execFile)

const STUDIO_STORAGE_KEY = 'career-document-studio'
const DEFAULT_BASE_URL = 'http://127.0.0.1:5005'
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_OUTPUT_DIR = path.resolve(PROJECT_ROOT, '..', 'output', 'playwright')
const RESUME_CANDIDATES = [
  { preset: 'balanced', breakAnchor: 'co-op-and-professional-certifications' },
  { preset: 'balanced', breakAnchor: 'co-op-experience' },
  { preset: 'balanced', breakAnchor: 'none' },
  { preset: 'relaxed', breakAnchor: 'co-op-and-professional-certifications' },
  { preset: 'compact', breakAnchor: 'co-op-and-professional-certifications' },
]
const FILL_VARIANTS = [
  { fontScale: 1.45, spaceScale: 1 },
  { fontScale: 1.35, spaceScale: 1.05 },
  { fontScale: 1.3, spaceScale: 1.1 },
  { fontScale: 1.25, spaceScale: 1.1 },
  { fontScale: 1.2, spaceScale: 1.1 },
  { fontScale: 1.5, spaceScale: 1.45 },
  { fontScale: 1.45, spaceScale: 1.5 },
  { fontScale: 1.45, spaceScale: 1.45 },
  { fontScale: 1.4, spaceScale: 1.45 },
  { fontScale: 1.35, spaceScale: 1.45 },
  { fontScale: 1.35, spaceScale: 1.35 },
  { fontScale: 1.25, spaceScale: 1.35 },
  { fontScale: 1.25, spaceScale: 1.25 },
  { fontScale: 1.15, spaceScale: 1.15 },
  { fontScale: 1, spaceScale: 1 },
]

const usage = () => {
  console.log(`Usage:
  npm run export:pdf -- --type resume --id unb --output ../output/playwright/unb-resume.pdf [--base-url http://127.0.0.1:5005] [--state-file ./studio.json] [--density comfortable|compact] [--contact-layout single-line|wrap] [--avatar visible|hidden]

Notes:
  - --type must be "resume" or "cover-letter"
  - Resume export runs a balance loop, saves candidate PNGs/PDFs, and promotes the winning result.
  - Without --state-file, the app will export seed data unless the target origin already has local studio state
`)
}

const parseArgs = (argv) => {
  const parsed = {}

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index]
    if (!entry.startsWith('--')) continue

    const key = entry.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      parsed[key] = 'true'
      continue
    }

    parsed[key] = next
    index += 1
  }

  return parsed
}

const args = parseArgs(process.argv.slice(2))

if (args.help === 'true') {
  usage()
  process.exit(0)
}

if (args.type !== 'resume' && args.type !== 'cover-letter') {
  usage()
  throw new Error('Missing or invalid --type. Use "resume" or "cover-letter".')
}

if (typeof args.id !== 'string' || args.id.trim().length === 0) {
  usage()
  throw new Error('Missing --id.')
}

const outputPath = path.resolve(
  process.cwd(),
  typeof args.output === 'string' && args.output.trim().length > 0
    ? args.output
    : path.join(DEFAULT_OUTPUT_DIR, `${args.id}-${args.type}.pdf`),
)

const buildBaseUrl = () => {
  if (typeof args['base-url'] === 'string' && args['base-url'].trim().length > 0) {
    return args['base-url']
  }

  return DEFAULT_BASE_URL
}

const buildExportUrl = ({
  type,
  id,
  render = 'capture',
  balance = 'auto',
  tuning,
}) => {
  const url = new URL(buildBaseUrl())
  url.search = ''
  url.searchParams.set('export', type)
  url.searchParams.set('id', id)
  url.searchParams.set('render', render)
  url.searchParams.set('balance', tuning ? 'locked' : balance)

  if (args.density === 'comfortable' || args.density === 'compact') {
    url.searchParams.set('density', args.density)
  }

  if (args['contact-layout'] === 'single-line' || args['contact-layout'] === 'wrap') {
    url.searchParams.set('contactLayout', args['contact-layout'])
  }

  if (args.avatar === 'visible' || args.avatar === 'hidden') {
    url.searchParams.set('avatar', args.avatar)
  }

  if (tuning) {
    url.searchParams.set('preset', tuning.preset)
    url.searchParams.set('breakAnchor', tuning.breakAnchor)
    url.searchParams.set('fontScale', `${tuning.fontScale}`)
    url.searchParams.set('spaceScale', `${tuning.spaceScale}`)
  }

  return url.toString()
}

const createResumeCandidates = () =>
  RESUME_CANDIDATES.flatMap((candidate) =>
    FILL_VARIANTS.map(({ fontScale, spaceScale }) => ({
        preset: candidate.preset,
        breakAnchor: candidate.breakAnchor,
        fontScale,
        spaceScale,
      })),
  )

const getTargetPageCountForBreakAnchor = (breakAnchor) =>
  breakAnchor === 'co-op-and-professional-certifications' ? 3 : 2

const sanitizeStem = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document'

const toCandidateId = (tuning) =>
  `${tuning.preset}-${tuning.breakAnchor}-f${tuning.fontScale.toFixed(3).replace(/\./g, '_')}-s${tuning.spaceScale
    .toFixed(3)
    .replace(/\./g, '_')}`

const loadStudioState = async (context) => {
  if (typeof args['state-file'] !== 'string' || args['state-file'].trim().length === 0) {
    return
  }

  const stateFilePath = path.resolve(process.cwd(), args['state-file'])
  const rawState = await fs.readFile(stateFilePath, 'utf8')
  JSON.parse(rawState)

  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: STUDIO_STORAGE_KEY, value: rawState },
  )
}

const waitForExportMetrics = async (page) => {
  await page.waitForFunction(() => Boolean(window.__exportMetrics), { timeout: 15000 })
  return page.evaluate(() => window.__exportMetrics)
}

const convertPdfToPngs = async (pdfPath, outputPrefix) => {
  await execFileAsync('pdftoppm', ['-png', pdfPath, outputPrefix])
  const directory = path.dirname(outputPrefix)
  const prefix = path.basename(outputPrefix)
  const files = await fs.readdir(directory)

  return files
    .filter((file) => file.startsWith(`${prefix}-`) && file.endsWith('.png'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((file) => path.join(directory, file))
}

const getPdfPageCount = async (pdfPath) => {
  const { stdout } = await execFileAsync('pdfinfo', [pdfPath])
  const pagesLine = stdout
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('Pages:'))

  if (!pagesLine) {
    return null
  }

  const numericValue = Number(pagesLine.replace('Pages:', '').trim())
  return Number.isFinite(numericValue) ? numericValue : null
}

const ensureOutputDirs = async (outputPdfPath) => {
  const stem = sanitizeStem(path.basename(outputPdfPath, '.pdf'))
  const outputDir = path.dirname(outputPdfPath)
  const candidateDir = path.join(outputDir, 'candidates', stem)
  await fs.mkdir(outputDir, { recursive: true })
  await fs.rm(candidateDir, { recursive: true, force: true })
  await fs.mkdir(candidateDir, { recursive: true })
  await fs.rm(outputPdfPath, { force: true })
  await fs.rm(path.join(outputDir, `${stem}.metrics.json`), { force: true })

  const outputFiles = await fs.readdir(outputDir)
  await Promise.all(
    outputFiles
      .filter((file) => file.startsWith(`${stem}-page-`) && file.endsWith('.png'))
      .map((file) => fs.rm(path.join(outputDir, file), { force: true })),
  )

  return { stem, outputDir, candidateDir }
}

const promoteWinnerArtifacts = async ({ winner, outputPdfPath, outputDir, stem }) => {
  await fs.copyFile(winner.pdfPath, outputPdfPath)

  const promotedPngs = []
  for (const [index, pngPath] of winner.pngPaths.entries()) {
    const finalPngPath = path.join(outputDir, `${stem}-page-${index + 1}.png`)
    await fs.copyFile(pngPath, finalPngPath)
    promotedPngs.push(finalPngPath)
  }

  return promotedPngs
}

const runResumeExportLoop = async ({ page, outputPdfPath, outputDir, candidateDir, stem }) => {
  const candidates = createResumeCandidates()
  const candidateResults = []

  for (const [index, tuning] of candidates.entries()) {
    const candidateId = toCandidateId(tuning)
    const exportUrl = buildExportUrl({
      type: 'resume',
      id: args.id,
      render: 'capture',
      balance: 'locked',
      tuning,
    })

    await page.goto(exportUrl, { waitUntil: 'networkidle' })
    await page.emulateMedia({ media: 'print' })

    const metrics = await waitForExportMetrics(page)
    const candidatePdfPath = path.join(candidateDir, `${candidateId}.pdf`)
    const candidatePngPrefix = path.join(candidateDir, candidateId)

    await page.pdf({
      path: candidatePdfPath,
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
    })

    const pngPaths = await convertPdfToPngs(candidatePdfPath, candidatePngPrefix)
    const pageCount = await getPdfPageCount(candidatePdfPath)

    candidateResults.push({
      tuning,
      metrics,
      pageCount,
      pdfPath: candidatePdfPath,
      pngPaths,
      candidateId,
    })

    console.log(
      `[resume-export] ${index + 1}/${candidates.length} ${candidateId} pages=${pageCount ?? 'unknown'} score=${metrics?.score ?? 'n/a'}`,
    )
  }

  const ranked = [...candidateResults].sort((left, right) => {
    const leftTargetPageCount = getTargetPageCountForBreakAnchor(left.tuning.breakAnchor)
    const rightTargetPageCount = getTargetPageCountForBreakAnchor(right.tuning.breakAnchor)
    const leftOrder = RESUME_CANDIDATES.findIndex(
      (candidate) => candidate.preset === left.tuning.preset && candidate.breakAnchor === left.tuning.breakAnchor,
    )
    const rightOrder = RESUME_CANDIDATES.findIndex(
      (candidate) => candidate.preset === right.tuning.preset && candidate.breakAnchor === right.tuning.breakAnchor,
    )
    const leftValid =
      left.metrics &&
      left.metrics.pageCount === leftTargetPageCount &&
      left.pageCount === leftTargetPageCount &&
      !left.metrics.overflow &&
      !left.metrics.orphanedHeadings &&
      !left.metrics.splitGroups &&
      Number.isFinite(left.metrics.score)
    const rightValid =
      right.metrics &&
      right.metrics.pageCount === rightTargetPageCount &&
      right.pageCount === rightTargetPageCount &&
      !right.metrics.overflow &&
      !right.metrics.orphanedHeadings &&
      !right.metrics.splitGroups &&
      Number.isFinite(right.metrics.score)

    if (leftValid !== rightValid) {
      return leftValid ? -1 : 1
    }

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    if (leftValid && rightValid && left.metrics.score !== right.metrics.score) {
      return left.metrics.score - right.metrics.score
    }

    return 0
  })

  const winner = ranked[0]
  if (!winner?.metrics) {
    throw new Error('Resume export loop did not produce a valid candidate.')
  }

  const promotedPngs = await promoteWinnerArtifacts({
    winner,
    outputPdfPath,
    outputDir,
    stem,
  })

  const metricsPath = path.join(outputDir, `${stem}.metrics.json`)
  const metricsPayload = {
    winner: {
      candidateId: winner.candidateId,
      tuning: winner.tuning,
      metrics: winner.metrics,
      pdfPath: outputPdfPath,
      pngPaths: promotedPngs,
    },
    candidates: candidateResults.map((candidate) => ({
      candidateId: candidate.candidateId,
      tuning: candidate.tuning,
      metrics: candidate.metrics,
      pageCount: candidate.pageCount,
      pdfPath: candidate.pdfPath,
      pngPaths: candidate.pngPaths,
    })),
  }

  await fs.writeFile(metricsPath, JSON.stringify(metricsPayload, null, 2))

  return {
    pdfPath: outputPdfPath,
    pngPaths: promotedPngs,
    metricsPath,
    metrics: winner.metrics,
    candidateId: winner.candidateId,
  }
}

const runCoverLetterExport = async ({ page, outputPdfPath, outputDir, stem }) => {
  const exportUrl = buildExportUrl({
    type: 'cover-letter',
    id: args.id,
    render: 'capture',
    balance: 'auto',
  })

  await page.goto(exportUrl, { waitUntil: 'networkidle' })
  await page.emulateMedia({ media: 'print' })
  await page.pdf({
    path: outputPdfPath,
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
  })

  const pngPrefix = path.join(outputDir, `${stem}-page`)
  const pngPaths = await convertPdfToPngs(outputPdfPath, pngPrefix)
  const pageCount = await getPdfPageCount(outputPdfPath)
  const metricsPath = path.join(outputDir, `${stem}.metrics.json`)
  await fs.writeFile(
    metricsPath,
    JSON.stringify(
      {
        winner: {
          pageCount,
          pdfPath: outputPdfPath,
          pngPaths,
        },
      },
      null,
      2,
    ),
  )

  return {
    pdfPath: outputPdfPath,
    pngPaths,
    metricsPath,
    pageCount,
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()

try {
  await loadStudioState(context)

  const { stem, outputDir, candidateDir } = await ensureOutputDirs(outputPath)
  const page = await context.newPage()

  const result =
    args.type === 'resume'
      ? await runResumeExportLoop({
          page,
          outputPdfPath: outputPath,
          outputDir,
          candidateDir,
          stem,
        })
      : await runCoverLetterExport({
          page,
          outputPdfPath: outputPath,
          outputDir,
          stem,
        })

  console.log(JSON.stringify({ type: args.type, id: args.id, ...result }, null, 2))
} finally {
  await context.close()
  await browser.close()
}
