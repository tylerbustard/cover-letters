# Career Document Studio – Project Handoff (Mac)

Date: 2026-02-02

## What Was Built
A unified Vite + React + TypeScript + Tailwind application that consolidates:
- Cover Letters (McGill, Queen’s, UNB, UofT/Rotman)
- Resumes (UNB, Queen’s, McGill, Rotman)
- Email Signatures (UNB, Queen’s, McGill, Rotman, 73 Strings)

Everything is editable in-app with a consistent UI and a live preview. PDF export uses the browser print dialog. Email signatures include HTML generation + copy-to-clipboard.

## Project Location
Current Windows path:
- `\\tsclient\Websites\Cover Letter - Resume - Email Signature\unified-app`

On Mac you can copy this folder locally (e.g., `~/Projects/unified-app`).

## How To Run (Mac)
1. `cd /path/to/unified-app`
2. `npm install`
3. `npm run dev`
4. Open the URL shown in the terminal (typically `http://localhost:5173`).

Build/Preview:
- `npm run build`
- `npm run preview`

## Key Architecture
Single-page app with tab-based navigation:
- `Resume`
- `Cover Letter`
- `Email Signature`

Editor (left) + Preview (right). All content is in local component state (no persistence yet).

## Important Files
- `src/App.tsx`: main UI + all editor logic + export actions.
- `src/types.ts`: canonical data model (ResumeTemplate, CoverLetterTemplate, EmailSignatureTemplate).
- `src/data/resumes.ts`: all resume content (UNB, Queen’s, McGill, Rotman).
- `src/data/coverLetters.ts`: cover letter template data.
- `src/data/signatures.ts`: email signature template data.
- `src/data/assets.ts`: central asset registry and options for selectors.
- `src/components/resume-preview.tsx`: resume rendering.
- `src/components/cover-letter-preview.tsx`: cover letter rendering.
- `src/components/email-signature-preview.tsx`: signature rendering.
- `src/config/variations.ts`: cover letter theme defaults.
- `src/index.css`: global styling, print styles, typography.
- `tailwind.config.ts`: Tailwind config.

## Assets
- `src/assets/` contains profile images + signature.
- `src/assets/logos/` contains all logos referenced by resumes/signatures.

Note: Some legacy logos remain in `src/assets` from the original cover-letter app. They are unused but not deleted because removal commands were blocked by policy. You can safely remove unused files if desired.

## Resume Sources & Consistency
Resumes were extracted from these sources:
- UNB: `website-unb/client/src/pages/resume.tsx`
- Queen’s: `website-queens/client/src/pages/resume.tsx`
- McGill: `website-mcgill/client/src/pages/resume.tsx`
- Rotman: `website-uoft/client/src/pages/resume.tsx`

Consistency improvements:
- Standardized spacing, card styling, and typography.
- Preserved the original header structure with photo + name + contact chips + summary.
- Section headings normalized for all resumes.

## Export Behavior
- `Export PDF` triggers `window.print()`.
- Print styles are in `src/index.css`.
- Email signatures include HTML generation in `App.tsx` and can be copied using `Copy HTML`.

## Known Limitations
- No persistence: edits reset on refresh.
- No dedicated PDF library (uses print-to-PDF).
- No server or database.

## Suggested Next Improvements
1. Local persistence (localStorage) so edits survive refresh.
2. Export/import JSON for templates.
3. Asset manager UI to upload logos and profile images.
4. PDF export with a dedicated renderer if needed (e.g., `react-pdf` or Puppeteer in Electron).

## macOS Desktop App Packaging
You asked for a physical UI on Mac. Two main options:

### Option A: Electron (recommended for fastest delivery)
1. Add Electron dependencies:
   - `npm install -D electron electron-builder wait-on concurrently`
2. Create `electron/main.js` and `electron/preload.js`.
3. Dev workflow: run Vite and Electron together.
4. Production: build Vite then package with `electron-builder`.

Example `package.json` scripts (to add):
- `"dev:ui": "vite"`
- `"dev:electron": "wait-on http://localhost:5173 && electron electron/main.js"`
- `"dev": "concurrently -k \"npm:dev:ui\" \"npm:dev:electron\""`
- `"build:ui": "vite build"`
- `"build": "npm run build:ui && electron-builder"`

Example `electron/main.js` (outline):
- In dev, load `http://localhost:5173`
- In prod, load `dist/index.html`

### Option B: Tauri (smaller, more native feel)
1. Install Rust + Tauri CLI.
2. `npm create tauri-app` and point it to the existing Vite app.
3. Configure `tauri.conf.json` with:
   - `"build": { "beforeBuildCommand": "npm run build", "beforeDevCommand": "npm run dev", "devPath": "http://localhost:5173", "distDir": "../dist" }`
4. Use `npm run tauri dev` and `npm run tauri build`.

## Notes on Fonts
`src/index.css` loads Google Fonts:
- `Space Grotesk` for UI
- `Source Serif 4` for resume/letter typography

If packaging offline, consider bundling fonts locally.

## Ownership
All template content and design choices are intended to match the existing assets and resume formats while standardizing spacing and layout.
