// Verifies the email-signature certification selection end-to-end:
// builds the EXPORT HTML (what gets pasted into a mail client) for a signature
// where only a SUBSET of certifications is selected, then screenshots it so we can
// confirm only the selected certs render. Usage: node scripts/render-signature.mjs
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

if (!process.env._RENDER_REEXEC) {
  const { spawnSync } = await import('node:child_process')
  const r = spawnSync(process.execPath, ['--max-http-header-size=2097152', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, _RENDER_REEXEC: '1' },
  })
  process.exit(r.status ?? 1)
}

const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const root = process.cwd()
const outDir = path.join(root, 'output/claude-review')
await fs.mkdir(outDir, { recursive: true })

const runChild = (cmd, args, timeoutMs) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('exit', () => { clearTimeout(timer); resolve() })
    child.on('error', () => { clearTimeout(timer); resolve() })
  })

const closeServer = async (server) => {
  server.httpServer?.closeAllConnections?.()
  server.httpServer?.closeIdleConnections?.()
  await Promise.race([
    server.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ])
}

// Point hosted-asset URLs (icons + logos) at the local dev server so the export
// renders without needing the not-yet-deployed finchat.ca assets.
process.env.VITE_SIGNATURE_ASSET_ORIGIN = 'http://127.0.0.1:5014'

const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 5014, strictPort: true } })
await server.listen()
try {
  const { assets } = await server.ssrLoadModule('/src/data/assets.ts')
  const { SIGNATURE_TEMPLATES } = await server.ssrLoadModule('/src/data/signatures.ts')
  const { buildSignatureHtml } = await server.ssrLoadModule('/src/lib/signature-html.ts')

  // Take the UNB signature and SELECT only 3 of the 7 certifications.
  const base = SIGNATURE_TEMPLATES.find((t) => t.id === 'unb')
  const selectedCerts = [
    { src: assets.logoCfa, alt: 'CFA' },
    { src: assets.logoBloomberg, alt: 'Bloomberg' },
    { src: assets.logoCsi, alt: 'CSI' },
  ]
  const template = { ...base, data: { ...base.data, certificationLogos: selectedCerts } }

  const fragment = buildSignatureHtml(template)
  const htmlPath = path.join(outDir, 'sig-test.html')
  await fs.writeFile(htmlPath, fragment, 'utf8')

  // Report what the export actually emitted (image src URLs) so we can assert.
  const imgSrcs = [...fragment.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1])
  console.log('IMG SRCS IN EXPORT HTML:')
  imgSrcs.forEach((s) => console.log('  ', s))

  const shotPath = path.join(outDir, 'sig-test.png')
  const profileDir = path.join(outDir, '.chrome-sig')
  await fs.rm(profileDir, { recursive: true, force: true })
  await fs.rm(shotPath, { force: true })
  await runChild(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profileDir}`,
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      '--window-size=760,360',
      '--virtual-time-budget=8000',
      `--screenshot=${shotPath}`,
      `file://${htmlPath}`,
    ],
    20000,
  )
  await fs.rm(profileDir, { recursive: true, force: true })
  const ok = await fs.stat(shotPath).then((s) => s.size > 0).catch(() => false)
  console.log(ok ? `OK screenshot -> ${shotPath}` : 'screenshot FAILED')
} finally {
  await closeServer(server)
}
