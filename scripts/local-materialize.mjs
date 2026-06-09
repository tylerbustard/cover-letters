#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'

import { createServer } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const DOCUMENT_TYPES = new Set(['resume', 'cover-letter', 'email-signature'])

const readStdin = async () =>
  new Promise((resolve, reject) => {
    let raw = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      raw += chunk
    })
    process.stdin.on('end', () => resolve(raw.trim()))
    process.stdin.on('error', reject)
  })

const parseJson = (raw, fallback) => {
  if (!raw) return fallback

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(
      `Unable to parse JSON input: ${error instanceof Error ? error.message : 'invalid payload'}`,
    )
  }
}

const getDefaultStateLoader = (module, documentType) => {
  if (documentType === 'resume') return module.getDefaultResumeState
  if (documentType === 'cover-letter') return module.getDefaultCoverLetterState
  return module.getDefaultSignatureState
}

const selectTemplate = (state, explicitTemplateId = '') => {
  const selectedTemplateId =
    explicitTemplateId || (typeof state?.selectedId === 'string' ? state.selectedId : '')
  const templates = Array.isArray(state?.templates) ? state.templates : []
  const template =
    templates.find((entry) => entry?.id === selectedTemplateId) ?? templates[0] ?? null

  if (!template) {
    throw new Error('No local templates are available for the requested document type.')
  }

  return template
}

const createResponse = (documentType, template, context) => ({
  documentType,
  templateId: template.id,
  templateLabel: template.label,
  baseHash: context.baseHash,
  snapshot: context.snapshot,
  fields: context.fields,
  collections: context.collections,
  template,
})

const printUsage = () => {
  console.error(
    [
      'Usage:',
      '  node scripts/local-materialize.mjs snapshot <documentType> [templateId]',
      '  node scripts/local-materialize.mjs materialize <documentType> [templateId]',
      '',
      'For materialize, provide JSON on stdin:',
      '  {',
      '    "operations": [...],',
      '    "origin": "http://127.0.0.1:5005"',
      '  }',
    ].join('\n'),
  )
}

const main = async () => {
  const [command = '', documentType = '', templateId = ''] = process.argv.slice(2)
  if (!['snapshot', 'materialize'].includes(command) || !DOCUMENT_TYPES.has(documentType)) {
    printUsage()
    process.exitCode = 1
    return
  }

  const vite = await createServer({
    root: repoRoot,
    appType: 'custom',
    logLevel: 'error',
    server: {
      hmr: false,
      middlewareMode: true,
    },
  })

  try {
    const defaultsModule = await vite.ssrLoadModule('/src/lib/studio-defaults.ts')
    const aiUtilsModule = await vite.ssrLoadModule('/netlify/functions/_ai-utils.mjs')
    const loadDefaultState = getDefaultStateLoader(defaultsModule, documentType)
    const state = loadDefaultState()
    const template = selectTemplate(state, templateId)
    const context = aiUtilsModule.buildDocumentContext(documentType, template)

    if (command === 'snapshot') {
      process.stdout.write(
        `${JSON.stringify(createResponse(documentType, template, context), null, 2)}\n`,
      )
      return
    }

    const payload = parseJson(await readStdin(), {})
    const operations = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.operations)
        ? payload.operations
        : []
    const origin =
      typeof payload?.origin === 'string' && payload.origin.trim()
        ? payload.origin.trim()
        : 'http://127.0.0.1:5005'
    const applied = aiUtilsModule.applyOperationsToTemplate(documentType, template, operations)
    const nextContext = aiUtilsModule.buildDocumentContext(documentType, applied.template)
    const response = {
      documentType,
      templateId: applied.template.id,
      templateLabel: applied.template.label,
      baseHash: context.baseHash,
      snapshot: nextContext.snapshot,
      fields: nextContext.fields,
      collections: nextContext.collections,
      template: applied.template,
      diff: applied.diff,
      fieldsTouched: applied.fieldsTouched,
      projectedHash: applied.projectedHash,
    }

    if (documentType === 'email-signature') {
      response.html = aiUtilsModule.buildSignatureExportHtml(origin, applied.template)
    }

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`)
  } finally {
    await vite.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unexpected local materialization error')
  process.exitCode = 1
})
