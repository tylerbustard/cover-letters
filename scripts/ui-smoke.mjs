// End-to-end UI smoke test: drives the real editor in a browser against a local
// `netlify dev` stack (port 8888, local blobs sandbox — production data is never
// touched). Verifies that the UI itself works and that what it PRODUCES (live
// preview, Export PDF tabs, signature HTML) reflects the edits made through it.
//
// Usage: node scripts/ui-smoke.mjs
// Artifacts: /tmp/studio-prints/ui-*.png / ui-*.pdf

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')

const BASE = 'http://localhost:8888'
const OUT = '/tmp/studio-prints'
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

mkdirSync(OUT, { recursive: true })

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const separatorIndex = line.indexOf('=')
      return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).replace(/\r$/u, '')]
    })
    .filter(([key]) => key.length > 0),
)

const failures = []
const consoleErrors = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
}

check('Chrome executable is available', existsSync(CHROME), CHROME)
if (failures.length > 0) process.exit(1)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Click the button whose visible text matches (buttons are not labelled with ids).
const clickButton = async (page, text) => {
  const handle = await page.evaluateHandle((label) => {
    const buttons = [...document.querySelectorAll('button')]
    return buttons.find((button) => button.textContent.trim().startsWith(label)) ?? null
  }, text)
  const element = handle.asElement()
  if (!element) throw new Error(`Button not found: ${text}`)
  await element.click()
}

// Replace the value of the input currently holding `currentValue`.
const retypeInput = async (page, currentValue, nextValue) => {
  const handle = await page.evaluateHandle((value) => {
    const inputs = [...document.querySelectorAll('input, textarea')]
    return inputs.find((input) => input.value === value) ?? null
  }, currentValue)
  const element = handle.asElement()
  if (!element) throw new Error(`Input not found with value: ${currentValue}`)
  await element.click({ clickCount: 3 })
  await element.type(nextValue, { delay: 5 })
}

const textOf = (page, selector) =>
  page.$eval(selector, (node) => node.textContent.trim()).catch(() => null)

const waitForStatus = async (page, fragment) => {
  try {
    await page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      { timeout: 8000 },
      fragment,
    )
    return true
  } catch {
    return false
  }
}

const runAuthRateLimitSmoke = async () => {
  const isolatedIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`
  const postLogin = () =>
    fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': isolatedIp,
      },
      body: JSON.stringify({
        username: env.ADMIN_USERNAME,
        password: 'definitely-not-the-studio-password',
      }),
    })

  let lastStatus = 0
  for (let index = 0; index < 10; index += 1) {
    const response = await postLogin()
    lastStatus = response.status
  }

  const lockedResponse = await postLogin()
  check('failed sign-ins trigger auth rate limiting', lastStatus === 401 && lockedResponse.status === 429)
}

// Clicking Export PDF opens a new tab; wait for it, let it render, and capture
// the PDF exactly as the print dialog would produce it.
const captureExportTab = async (browser, page, expectedUrlPart, outFile, readySelector) => {
  const targetPromise = browser.waitForTarget(
    (target) => target.url().includes(expectedUrlPart),
    { timeout: 15000 },
  )
  await clickButton(page, 'Export PDF')
  const target = await targetPromise
  const exportPage = await target.page()
  await exportPage.evaluateOnNewDocument(() => {
    window.print = () => {}
  })
  await exportPage.evaluate(() => {
    window.print = () => {}
  })
  await exportPage.waitForSelector(readySelector, { timeout: 15000 })
  await sleep(1500)
  await exportPage.pdf({ path: outFile, printBackground: true, preferCSSPageSize: true })
  const exportUrl = exportPage.url()
  const headerRole = await exportPage
    .$eval('.resume-header-role', (node) => node.textContent.trim())
    .catch(() => null)
  await exportPage.close()
  return { headerRole, url: exportUrl }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: ['--no-first-run', '--disable-gpu'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1100 })
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (text.includes('Not allowed to load local resource: blob:capture')) return
    consoleErrors.push(`console: ${text}`)
  })

  // ---- Sign in through the real form ----
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle2' })
  const authSemantics = await page.evaluate(() => ({
    formLabel: document.querySelector('#studio-sign-in-form')?.getAttribute('aria-label'),
    panelLabelledBy: document.querySelector('.studio-auth-panel')?.getAttribute('aria-labelledby'),
    titleExists: Boolean(document.querySelector('#studio-auth-title')),
    usernameAutocomplete: document.querySelector('#username')?.getAttribute('autocomplete'),
  }))
  check(
    'sign-in exposes accessible form semantics',
    authSemantics.formLabel === 'Sign in to FinChat' &&
      authSemantics.panelLabelledBy === 'studio-auth-title' &&
      authSemantics.titleExists &&
      authSemantics.usernameAutocomplete === 'username',
    JSON.stringify(authSemantics),
  )
  await page.keyboard.press('Tab')
  check(
    'skip link is the first keyboard target',
    await page.evaluate(() => document.activeElement?.classList.contains('studio-skip-link') === true),
  )
  await page.focus('#username')
  await page.type('#username', env.ADMIN_USERNAME)
  await page.type('#password', env.ADMIN_PASSWORD)
  await clickButton(page, 'Enter studio')
  await page.waitForSelector('.resume-header-name', { timeout: 20000 })
  check('sign-in form logs in and lands on /studio/resume', page.url().includes('/studio/resume'))
  const activeTabSemantics = await page.$eval('.studio-nav-button-active', (button) => ({
    ariaCurrent: button.getAttribute('aria-current'),
    type: button.getAttribute('type'),
  }))
  check(
    'active document tab exposes current page state',
    activeTabSemantics.ariaCurrent === 'page' && activeTabSemantics.type === 'button',
    JSON.stringify(activeTabSemantics),
  )

  // ---- Resume: live preview reacts to edits ----
  const originalTitle = await textOf(page, '.resume-header-role')
  check('resume preview shows header title', Boolean(originalTitle), `"${originalTitle}"`)

  const probeTitle = 'UI E2E Title Probe'
  await retypeInput(page, originalTitle, probeTitle)
  await sleep(400)
  check(
    'editing Title field updates live preview',
    (await textOf(page, '.resume-header-role')) === probeTitle,
  )

  // ---- Resume: save flow ----
  await clickButton(page, 'Save')
  check('Save shows "Resume saved." status', await waitForStatus(page, 'Resume saved.'))

  const storedTitle = await page.evaluate(async () => {
    const response = await fetch('/api/documents/resume', { credentials: 'include' })
    const data = await response.json()
    const state = data.document
    const selected = state?.templates?.find((template) => template.id === state.selectedId)
    return { selectedId: state?.selectedId, title: selected?.data?.header?.title }
  })
  check('saved resume title reaches document storage', storedTitle.title === probeTitle, JSON.stringify(storedTitle))

  // ---- Resume: Export PDF produces a tab containing the edit ----
  const exportedResume = await captureExportTab(
    browser,
    page,
    '/studio/resume/pdf',
    `${OUT}/ui-export-resume.pdf`,
    '.resume-header-name',
  )
  check('Export PDF tab uses local handoff', exportedResume.url.includes('mode=local'), exportedResume.url)
  check('Export PDF tab renders the edited title', exportedResume.headerRole === probeTitle, `"${exportedResume.headerRole}"`)

  // ---- Resume: revert the probe edit ----
  await retypeInput(page, probeTitle, originalTitle)
  await clickButton(page, 'Save')
  check('revert + save restores original title', await waitForStatus(page, 'Resume saved.'))

  // ---- Resume: template preset switching ----
  const presetSelect = await page.$('select')
  const firstLabel = await textOf(page, '.studio-preview-shell .resume-header-role')
  await presetSelect.select('unb')
  await sleep(500)
  const unbHeaderName = await textOf(page, '.resume-header-name')
  check('switching preset re-renders preview', Boolean(unbHeaderName), `name="${unbHeaderName}"`)
  await presetSelect.select('queens')
  await sleep(500)
  check(
    'switching back restores previous preset',
    (await textOf(page, '.resume-header-role')) === firstLabel,
  )

  // ---- Cover letter tab ----
  await clickButton(page, 'Cover Letter')
  await page.waitForSelector('.cover-letter-document-greeting', { timeout: 15000 })
  const greeting = await textOf(page, '.cover-letter-document-greeting')
  check('cover letter preview renders greeting', Boolean(greeting), `"${greeting}"`)

  const managerValue = greeting.replace(/^Dear /, '').replace(/,$/, '')
  await retypeInput(page, managerValue, 'Jane Probe')
  await sleep(400)
  check(
    'editing hiring manager updates greeting live',
    (await textOf(page, '.cover-letter-document-greeting')) === 'Dear Jane Probe,',
  )
  await retypeInput(page, 'Jane Probe', managerValue)
  await sleep(400)

  const exportedCoverLetter = await captureExportTab(
    browser,
    page,
    '/studio/cover-letter/pdf',
    `${OUT}/ui-export-cover-letter.pdf`,
    '.cover-letter-document-greeting',
  )
  check('cover letter Export PDF tab uses local handoff', exportedCoverLetter.url.includes('mode=local'), exportedCoverLetter.url)
  check('cover letter Export PDF tab renders', exportedCoverLetter.headerRole !== null, `role="${exportedCoverLetter.headerRole}"`)

  // ---- Email signature tab ----
  await clickButton(page, 'Email Signature')
  await page.waitForSelector('.signature-document-name', { timeout: 15000 })

  const weights = await page.evaluate(() => {
    const institution = document.querySelector('.signature-document-affiliation-institution')
    const role = document.querySelector('.signature-document-affiliation-role')
    return {
      institution: institution ? getComputedStyle(institution).fontWeight : null,
      role: role ? getComputedStyle(role).fontWeight : null,
    }
  })
  check(
    'signature affiliation hierarchy: institution bold, role regular',
    weights.institution === '600' && weights.role === '400',
    JSON.stringify(weights),
  )

  // The HTML textarea is exactly what Copy HTML / Download HTML produce.
  const getSignatureHtml = () => page.$eval('textarea[readonly]', (node) => node.value)
  const htmlBefore = await getSignatureHtml()
  check(
    'produced signature HTML uses new hierarchy styling',
    htmlBefore.includes('font-weight:600') && htmlBefore.includes('#1e293b'),
  )

  // Toggle one certification logo off and confirm the produced HTML drops it.
  const toggled = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.studio-checkbox-row')]
    const row = rows.find((entry) => entry.querySelector('input')?.checked)
    if (!row) return null
    const label = row.textContent.trim()
    row.querySelector('input').click()
    return label
  })
  await sleep(500)
  const htmlAfter = await getSignatureHtml()
  const logoCountBefore = (htmlBefore.match(/logos\//g) || []).length
  const logoCountAfter = (htmlAfter.match(/logos\//g) || []).length
  check(
    `unchecking "${toggled}" removes it from produced HTML`,
    logoCountAfter < logoCountBefore,
    `${logoCountBefore} → ${logoCountAfter} logo refs`,
  )

  // Restore the toggle.
  await page.evaluate((label) => {
    const rows = [...document.querySelectorAll('.studio-checkbox-row')]
    const row = rows.find((entry) => entry.textContent.trim() === label)
    row?.querySelector('input')?.click()
  }, toggled)
  await sleep(500)
  check(
    'rechecking restores the produced HTML',
    ((await getSignatureHtml()).match(/logos\//g) || []).length === logoCountBefore,
  )

  // "Copy Signature" pipes the same payload to the clipboard; intercept the write.
  await page.evaluate(() => {
    window.__copied = null
    navigator.clipboard.write = async (items) => {
      const blob = await items[0].getType('text/html')
      window.__copied = await blob.text()
    }
    navigator.clipboard.writeText = async (text) => {
      window.__copied = text
    }
  })
  await clickButton(page, 'Copy Signature')
  await sleep(500)
  const copied = await page.evaluate(() => window.__copied)
  check(
    'Copy Signature copies the signature fragment',
    Boolean(copied) && copied.includes('font-weight:600'),
    copied ? `${copied.length} chars` : 'nothing captured',
  )

  // "Download .html" produces a Blob download; intercept createObjectURL to
  // capture exactly what the file would contain.
  const downloaded = await page.evaluate(async () => {
    let captured = null
    const original = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      captured = blob
      return 'blob:capture'
    }
    const buttons = [...document.querySelectorAll('button')]
    const button = buttons.find((entry) => entry.textContent.trim().startsWith('Download .html'))
    if (!button) return { error: 'button not found' }
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 300))
    URL.createObjectURL = original
    if (!captured) return { error: 'no blob captured' }
    return { size: captured.size, text: await captured.text() }
  })
  check(
    'Download .html produces the full signature document',
    !downloaded.error && downloaded.text.includes('font-weight:600'),
    downloaded.error || `${downloaded.size} bytes`,
  )

  // The signature tab intentionally has no Export PDF (HTML is the product);
  // capture what printing the page would emit anyway via the global print CSS.
  await page.pdf({ path: `${OUT}/ui-export-signature.pdf`, printBackground: true, preferCSSPageSize: true })

  await page.screenshot({ path: `${OUT}/ui-final-state.png` })

  await runAuthRateLimitSmoke()
} finally {
  await browser.close()
}

console.log('\n--- console errors during run ---')
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)')
console.log(`\n${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} FAILURES`}`)
if (failures.length > 0) process.exit(1)
