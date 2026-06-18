// End-to-end UI smoke test: drives the real editor in a browser against a local
// `netlify dev` stack (port 8888, local blobs sandbox — production data is never
// touched). Verifies that the UI itself works and that what it PRODUCES (live
// preview, Export PDF tabs, and HTML output) reflects the edits made through it.
//
// Usage: node scripts/ui-smoke.mjs
// Artifacts: /tmp/studio-prints/ui-*.png / ui-*.pdf

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')

const BASE = process.env.UI_SMOKE_BASE || 'http://localhost:8888'
const BASE_URL = new URL(BASE)
const BASE_PORT = BASE_URL.port || (BASE_URL.protocol === 'https:' ? '443' : '80')
const BASE_TARGET_PORT = process.env.UI_SMOKE_TARGET_PORT || String(Number(BASE_PORT) + 1)
const OUT = '/tmp/studio-prints'
const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url))
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

mkdirSync(OUT, { recursive: true })

const clearLocalAuthRateLimit = () => {
  for (const relativeRoot of [
    '../.netlify/blobs-serve/entries',
    '../.netlify/blobs-serve/metadata',
  ]) {
    const rootPath = fileURLToPath(new URL(relativeRoot, import.meta.url))
    if (!existsSync(rootPath)) continue

    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      rmSync(path.join(rootPath, entry.name, 'site:auth-rate-limit'), { recursive: true, force: true })
    }
  }
}

clearLocalAuthRateLimit()

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

const waitForLocalStack = async (timeoutMs) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/sign-in`, { redirect: 'manual' })
      if (response.ok) return true
    } catch {}
    await sleep(750)
  }
  return false
}

const ensureLocalStack = async () => {
  if (await waitForLocalStack(1500)) return null

  console.log(`Starting local Netlify stack at ${BASE} for UI smoke...`)
  const child = spawn(
    'npm',
    [
      'exec',
      '--',
      'netlify',
      'dev',
      '--offline',
      '--no-open',
      '--port',
      BASE_PORT,
      '--target-port',
      BASE_TARGET_PORT,
    ],
    {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PORT: BASE_TARGET_PORT },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  const tail = []
  const remember = (chunk) => {
    const text = chunk.toString()
    tail.push(text)
    if (tail.length > 24) tail.shift()
    if (process.env.QA_UI_DEBUG === '1') process.stdout.write(text)
  }
  child.stdout.on('data', remember)
  child.stderr.on('data', remember)

  if (await waitForLocalStack(90000)) return child

  child.kill('SIGTERM')
  throw new Error(`Unable to start local Netlify stack at ${BASE}.\n${tail.join('')}`)
}

const stopLocalStack = async (child) => {
  if (!child) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(2500).then(() => child.kill('SIGKILL')),
  ])
}

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

const devServer = await ensureLocalStack()
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
    titleExists: Boolean(document.querySelector('#studio-auth-title')),
    usernameAutocomplete: document.querySelector('#username')?.getAttribute('autocomplete'),
    brandLogoLoaded: document.querySelector('.fc-brand-logo')?.complete === true &&
      document.querySelector('.fc-brand-logo')?.naturalWidth > 0,
    productCards: document.querySelectorAll('.fc-product-card').length,
    guidelinesHref: document.querySelector('a[href="/brand-guidelines"]')?.textContent?.trim(),
  }))
  check(
    'sign-in exposes simplified brand and form semantics',
    authSemantics.formLabel === 'Sign in to FinChat' &&
      authSemantics.titleExists &&
      authSemantics.usernameAutocomplete === 'username' &&
      authSemantics.brandLogoLoaded &&
      authSemantics.productCards === 3 &&
      authSemantics.guidelinesHref === 'Brand guidelines',
    JSON.stringify(authSemantics),
  )
  await page.keyboard.press('Tab')
  check(
    'skip link is the first keyboard target',
    await page.evaluate(() => document.activeElement?.classList.contains('fc-skip-link') === true),
  )
  check('brand guidelines route is public', await page.evaluate(async () => {
    const response = await fetch('/brand-guidelines', { redirect: 'manual' })
    return response.ok
  }))
  await page.focus('#username')
  await page.type('#username', env.ADMIN_USERNAME)
  await page.type('#password', env.ADMIN_PASSWORD)
  await clickButton(page, 'Enter studio')
  const loginReachedStudio = await page
    .waitForSelector('.resume-header-name', { timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  if (!loginReachedStudio) {
    const loginDiagnostic = await page.evaluate(async () => {
      const username = document.querySelector('#username')?.value ?? ''
      const password = document.querySelector('#password')?.value ?? ''
      const loginProbe = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }).catch(() => null)
      const loginProbeText = loginProbe ? await loginProbe.text().catch(() => '') : ''
      const sessionResponse = await fetch('/api/auth/session').catch(() => null)
      const sessionText = sessionResponse ? await sessionResponse.text().catch(() => '') : ''
      return {
        url: window.location.href,
        bodyText: document.body.innerText.slice(0, 800),
        loginProbeStatus: loginProbe?.status ?? null,
        loginProbeText: loginProbeText.slice(0, 400),
        usernameLength: username.length,
        passwordLength: password.length,
        sessionStatus: sessionResponse?.status ?? null,
        sessionText: sessionText.slice(0, 400),
      }
    })
    check('login reaches studio after submit', false, JSON.stringify(loginDiagnostic))
    throw new Error('Login did not reach the studio; see diagnostic check above.')
  }
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

  // ---- Profile: live preview reacts to edits ----
  const originalTitle = await textOf(page, '.resume-header-role')
  check('resume preview shows header title', Boolean(originalTitle), `"${originalTitle}"`)

  const probeTitle = 'UI E2E Title Probe'
  await retypeInput(page, originalTitle, probeTitle)
  await sleep(400)
  check(
    'editing Title field updates live preview',
    (await textOf(page, '.resume-header-role')) === probeTitle,
  )

  // ---- Profile: save flow ----
  await clickButton(page, 'Save')
  check('Save shows "Profile saved." status', await waitForStatus(page, 'Profile saved.'))

  const storedTitle = await page.evaluate(async () => {
    const response = await fetch('/api/documents/resume', { credentials: 'include' })
    const data = await response.json()
    const state = data.document
    const selected = state?.templates?.find((template) => template.id === state.selectedId)
    return { selectedId: state?.selectedId, title: selected?.data?.header?.title }
  })
  check('saved resume title reaches document storage', storedTitle.title === probeTitle, JSON.stringify(storedTitle))

  // ---- Profile: Export PDF produces a tab containing the edit ----
  const exportedResume = await captureExportTab(
    browser,
    page,
    '/studio/resume/pdf',
    `${OUT}/ui-export-resume.pdf`,
    '.resume-header-name',
  )
  check('Export PDF tab uses local handoff', exportedResume.url.includes('mode=local'), exportedResume.url)
  check('Export PDF tab renders the edited title', exportedResume.headerRole === probeTitle, `"${exportedResume.headerRole}"`)

  // ---- Profile: revert the probe edit ----
  await retypeInput(page, probeTitle, originalTitle)
  await clickButton(page, 'Save')
  check('revert + save restores original title', await waitForStatus(page, 'Profile saved.'))

  // ---- Profile: template preset switching ----
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

  // ---- Narrative tab ----
  await clickButton(page, 'Narrative')
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

  // ---- Identity tab ----
  await clickButton(page, 'Identity')
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
    'produced identity HTML uses new hierarchy styling',
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

  // "Copy HTML" pipes the same payload to the clipboard; intercept the write.
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
  await clickButton(page, 'Copy HTML')
  await sleep(500)
  const copied = await page.evaluate(() => window.__copied)
  check(
    'Copy HTML copies the identity fragment',
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
  await stopLocalStack(devServer)
}

console.log('\n--- console errors during run ---')
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)')
console.log(`\n${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} FAILURES`}`)
if (failures.length > 0) process.exit(1)
