#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')

const BASE = (process.env.FINCHAT_LIVE_BASE || 'https://finchat.ca').replace(/\/+$/u, '')
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

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
const browserEvents = []

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures.push(`${name}${detail ? ` - ${detail}` : ''}`)
}

const clickButton = async (page, text) => {
  const handle = await page.evaluateHandle((label) => {
    const buttons = [...document.querySelectorAll('button')]
    return buttons.find((button) => button.textContent.trim().startsWith(label)) ?? null
  }, text)
  const element = handle.asElement()
  if (!element) throw new Error(`Button not found: ${text}`)
  await element.click()
}

const inspectPage = (page) =>
  page.evaluate(() => {
    const images = [...document.images]
    return {
      text: document.body.innerText,
      rootChildren: document.getElementById('root')?.children.length ?? 0,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      brokenImages: images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.alt || image.src),
    }
  })

const checkSecurityHeaders = async (path, label) => {
  const response = await fetch(`${BASE}${path}?v=${Date.now()}`)
  const headers = response.headers
  const contentSecurityPolicy = headers.get('content-security-policy') ?? ''
  const permissionsPolicy = headers.get('permissions-policy') ?? ''
  const strictTransportSecurity = headers.get('strict-transport-security') ?? ''

  check(`${label} returns HTTP 200`, response.status === 200, String(response.status))
  check(
    `${label} blocks framing`,
    headers.get('x-frame-options') === 'DENY' &&
      contentSecurityPolicy.includes("frame-ancestors 'none'"),
  )
  check(`${label} disables MIME sniffing`, headers.get('x-content-type-options') === 'nosniff')
  check(`${label} keeps referrers same-origin`, headers.get('referrer-policy') === 'same-origin')
  check(`${label} sends HSTS`, strictTransportSecurity.includes('max-age=31536000'))
  check(`${label} limits sensitive browser permissions`, permissionsPolicy.includes('camera=()'))
}

const openStudioRoute = async (page, route, selector, expectedText) => {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 45000 })
  await page.waitForSelector(selector, { timeout: 30000 })
  const snapshot = await inspectPage(page)
  check(`${route} renders React app`, snapshot.rootChildren > 0, `root children=${snapshot.rootChildren}`)
  check(`${route} has no broken images`, snapshot.brokenImages.length === 0, snapshot.brokenImages.join(', '))
  check(
    `${route} has no horizontal overflow`,
    snapshot.scrollWidth <= snapshot.clientWidth + 2,
    `${snapshot.scrollWidth}/${snapshot.clientWidth}`,
  )
  for (const text of expectedText) {
    check(`${route} contains "${text}"`, snapshot.text.includes(text))
  }
}

check('Chrome executable is available', existsSync(CHROME), CHROME)
check('ADMIN_USERNAME is configured', Boolean(env.ADMIN_USERNAME))
check('ADMIN_PASSWORD is configured', Boolean(env.ADMIN_PASSWORD))
if (failures.length > 0) process.exit(1)

await checkSecurityHeaders('/sign-in', 'static app')
await checkSecurityHeaders('/api/auth/session', 'API')
if (failures.length > 0) process.exit(1)

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: ['--no-first-run', '--disable-gpu'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1000 })

  page.on('pageerror', (error) => browserEvents.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') browserEvents.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    browserEvents.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`)
  })

  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle2', timeout: 45000 })
  await page.type('#username', env.ADMIN_USERNAME)
  await page.type('#password', env.ADMIN_PASSWORD)
  await clickButton(page, 'Enter studio')
  await page.waitForSelector('.resume-header-name', { timeout: 30000 })

  const signedInSnapshot = await inspectPage(page)
  check('live sign-in lands in the resume studio', page.url().includes('/studio/resume'), page.url())
  check('live sign-in renders Tyler profile', signedInSnapshot.text.includes('Tyler Bustard'))

  await openStudioRoute(page, '/studio/resume', '.resume-header-name', ['Tyler Bustard'])
  await openStudioRoute(page, '/studio/cover-letter', '.cover-letter-document-greeting', [
    'Tyler Bustard',
    'Dear',
  ])
  await openStudioRoute(page, '/studio/email-signature', '.signature-document-name', [
    'Tyler Bustard',
    'Sincerely',
  ])

  check('live browser run has no console/page/request errors', browserEvents.length === 0, browserEvents.join(' | '))
} finally {
  await browser.close()
}

console.log(`\n${failures.length === 0 ? 'LIVE FINCHAT SMOKE PASSED' : `${failures.length} FAILURE(S)`}`)
if (failures.length > 0) process.exit(1)
