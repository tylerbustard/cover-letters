// Regenerates a CLEAN public PDF (no Chrome header/footer) for the downloadable
// resume / cover letter, using the SAME default template the live site serves.
// Seeds localStorage via a tiny HTML page that redirects into the print route
// (avoids the URL-length 431), and prints with both no-header flags.
//
// Usage: node scripts/seed-and-print.mjs <cover|resume>
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
const PORT = 5012
const root = process.cwd()

const kind = process.argv[2] === 'resume' ? 'resume' : 'cover'
const cfg = {
  cover: {
    route: 'cover-letter',
    storageKey: 'studio-local-export:cover-letter',
    getState: 'getDefaultCoverLetterState',
    out: 'public/Tyler-Bustard-Cover-Letter.pdf',
  },
  resume: {
    route: 'resume',
    storageKey: 'studio-local-export:resume',
    getState: 'getDefaultResumeState',
    out: 'public/Tyler-Bustard-Resume.pdf',
  },
}[kind]

const runChild = (cmd, args, timeoutMs) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (d) => (stderr += d))
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('exit', () => { clearTimeout(timer); resolve(stderr) })
    child.on('error', (e) => { clearTimeout(timer); resolve(String(e)) })
  })

const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: PORT, strictPort: true } })
await server.listen()
try {
  const defaults = await server.ssrLoadModule('/src/lib/studio-defaults.ts')
  const state = defaults[cfg.getState]()
  const selected =
    state.templates.find((t) => t.id === state.selectedId) ?? state.templates[0]

  // localStorage value is the single template JSON string (what loadLocalExportTemplate expects).
  const templateJson = JSON.stringify(selected)
  const seedHtml = `<!doctype html><html><head><meta charset="utf-8"><title>seed</title></head><body><script>localStorage.setItem(${JSON.stringify(cfg.storageKey)}, ${JSON.stringify(templateJson)});location.replace(${JSON.stringify(`/studio/${cfg.route}/pdf?mode=local`)});<\/script></body></html>`

  await fs.mkdir(path.join(root, 'output'), { recursive: true })
  const seedPath = path.join(root, 'output', `seed-${kind}.html`)
  await fs.writeFile(seedPath, seedHtml, 'utf8')

  // wait for server
  const probe = `http://127.0.0.1:${PORT}/output/seed-${kind}.html`
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(probe)).ok) break } catch { /* wait */ }
    await new Promise((r) => setTimeout(r, 200))
  }

  const outPath = path.join(root, cfg.out)
  await fs.rm(outPath, { force: true })
  const profileDir = path.join(root, 'output', `.chrome-seed-${kind}`)
  await fs.rm(profileDir, { recursive: true, force: true })

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
      `--print-to-pdf=${outPath}`,
      '--print-to-pdf-no-header',
      '--no-pdf-header-footer',
      probe,
    ],
    20000,
  )
  await fs.rm(profileDir, { recursive: true, force: true })

  const wrote = await fs.stat(outPath).then((s) => s.size > 0).catch(() => false)
  console.log(wrote ? `OK -> ${cfg.out}` : 'FAILED: no PDF written')
} finally {
  await server.close()
}
