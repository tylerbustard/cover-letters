// Local render harness: boots a Vite dev server, builds a base64 payload from the
// source data modules, prints the hidden /studio/{resume,cover-letter}/pdf route to
// PDF via headless Chrome, then rasterizes to PNG with pdftoppm for visual review.
//
// Usage: node scripts/render-doc.mjs <resume|cover> [templateId] [outName]
//   node scripts/render-doc.mjs cover unb cover-unb
//   node scripts/render-doc.mjs resume queens resume-queens

import { createServer } from 'vite'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

// The resume payload rides in the URL and exceeds Node's default 16KB header cap
// (HTTP 431). Re-exec once with a larger limit so callers don't have to remember it.
if (!process.env._RENDER_REEXEC) {
  const r = spawnSync(process.execPath, ['--max-http-header-size=2097152', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, _RENDER_REEXEC: '1' },
  })
  process.exit(r.status ?? 1)
}

// Run a child to completion without blocking the event loop (the in-process Vite
// dev server must stay responsive to serve Chrome). Kills the child after `timeoutMs`.
const runChild = (cmd, args, timeoutMs) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (d) => (stderr += d))
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('exit', (code) => {
      clearTimeout(timer)
      resolve({ code, stderr })
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ code: -1, stderr: String(err) })
    })
  })

const closeServer = async (server) => {
  server.httpServer?.closeAllConnections?.()
  server.httpServer?.closeIdleConnections?.()
  await Promise.race([
    server.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ])
}

const [, , kindArg = 'cover', templateIdArg, outNameArg] = process.argv
const kind = kindArg === 'resume' ? 'resume' : 'cover'
const templateId = templateIdArg || (kind === 'resume' ? 'queens' : 'unb')
const outName = outNameArg || `${kind}-${templateId}`

const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 5012
const root = process.cwd()
const outDir = path.join(root, 'output/claude-review')
await fs.mkdir(outDir, { recursive: true })

const server = await createServer({
  root,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
})
await server.listen()

try {
  const route = kind === 'resume' ? 'resume' : 'cover-letter'
  const dataModPath = kind === 'resume' ? '/src/data/resumes.ts' : '/src/data/coverLetters.ts'
  const exportName = kind === 'resume' ? 'RESUME_TEMPLATES' : 'COVER_LETTER_TEMPLATES'
  const mod = await server.ssrLoadModule(dataModPath)
  const list = mod[exportName]
  const selected = list.find((t) => t.id === templateId) ?? list[0]
  if (!selected) throw new Error(`No template '${templateId}' in ${exportName}`)

  const payload = Buffer.from(JSON.stringify(selected), 'utf8').toString('base64url')
  const url = `http://127.0.0.1:${PORT}/studio/${route}/pdf?mode=local&payload=${payload}`

  // Wait until the dev server actually serves the SPA shell before launching Chrome,
  // otherwise Chrome races ahead and prints an ERR_CONNECTION_REFUSED page.
  const probeUrl = `http://127.0.0.1:${PORT}/studio/${route}/pdf`
  let ready = false
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(probeUrl)
      if (r.ok) {
        ready = true
        break
      }
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 200))
  }
  if (!ready) throw new Error(`Dev server never became ready on ${PORT}`)

  const pdfPath = path.join(outDir, `${outName}.pdf`)
  const profileDir = path.join(outDir, `.chrome-${outName}`)
  await fs.rm(profileDir, { recursive: true, force: true })

  // Headless Chrome writes the PDF but often fails to exit after --print-to-pdf,
  // so we cap it with a timeout+SIGKILL and judge success by the PDF existing.
  // Must use async spawn (not spawnSync) so the in-process Vite server keeps serving.
  await fs.rm(pdfPath, { force: true })
  await runChild(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profileDir}`,
      '--virtual-time-budget=8000',
      '--run-all-compositor-stages-before-draw',
      `--print-to-pdf=${pdfPath}`,
      '--print-to-pdf-no-header',
      url,
    ],
    20000,
  )

  const wrote = await fs
    .stat(pdfPath)
    .then((s) => s.size > 0)
    .catch(() => false)

  if (!wrote) {
    console.error('Chrome did not produce a PDF')
    process.exitCode = 1
  } else {
    // rasterize all pages at 150 dpi
    await fs.rm(profileDir, { recursive: true, force: true })
    const png = spawnSync('pdftoppm', ['-png', '-r', '150', pdfPath, path.join(outDir, outName)], {
      encoding: 'utf8',
    })
    const info = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8' })
    const pages = (info.stdout.match(/Pages:\s+(\d+)/) || [])[1]
    console.log(`OK  ${outName}: ${pages} page(s) -> ${pdfPath}`)
    if (png.status !== 0) console.error('pdftoppm:', png.stderr)
  }
} finally {
  await closeServer(server)
}
