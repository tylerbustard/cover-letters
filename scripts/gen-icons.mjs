// Generates transparent PNG contact icons (mail/phone/globe/map-pin) from the exact
// lucide v0.453 paths used in the document headers, so the EMAIL SIGNATURE EXPORT can
// reference hosted images (email clients can't render inline SVG/React icons reliably).
// Output: public/ai-assets/icons/<name>.png  (rendered at 4x for retina crispness).
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const COLOR = '#64748b' // slate-500, matches signature/header contact text
const RENDER = 64 // px (displayed ~13-16px; 4x for crispness)

const ICONS = {
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  'map-pin':
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
}

const runChild = (cmd, args, timeoutMs) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('exit', () => { clearTimeout(timer); resolve() })
    child.on('error', () => { clearTimeout(timer); resolve() })
  })

const root = process.cwd()
const outDir = path.join(root, 'public/ai-assets/icons')
await fs.mkdir(outDir, { recursive: true })
const tmp = path.join(root, 'output', '.icons')
await fs.mkdir(tmp, { recursive: true })

for (const [name, shapes] of Object.entries(ICONS)) {
  // viewBox padded slightly so round caps never clip at the edges.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RENDER}" height="${RENDER}" viewBox="-1.5 -1.5 27 27" fill="none" stroke="${COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`
  const htmlPath = path.join(tmp, `${name}.html`)
  await fs.writeFile(htmlPath, html, 'utf8')

  const outPath = path.join(outDir, `${name}.png`)
  const profileDir = path.join(tmp, `.chrome-${name}`)
  await fs.rm(profileDir, { recursive: true, force: true })
  await fs.rm(outPath, { force: true })
  await runChild(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profileDir}`,
      '--hide-scrollbars',
      '--default-background-color=00000000',
      `--window-size=${RENDER},${RENDER}`,
      `--screenshot=${outPath}`,
      `file://${htmlPath}`,
    ],
    15000,
  )
  await fs.rm(profileDir, { recursive: true, force: true })
  const ok = await fs.stat(outPath).then((s) => s.size > 0).catch(() => false)
  console.log(`${ok ? 'OK' : 'FAIL'}  ${name}.png`)
}
await fs.rm(tmp, { recursive: true, force: true })
