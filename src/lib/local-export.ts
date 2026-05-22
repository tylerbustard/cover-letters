import type { DocumentType } from '@/types'

const LOCAL_EXPORT_MODE = 'local'
const LOCAL_EXPORT_STORAGE_PREFIX = 'studio-local-export:'

const tryParseJson = <T,>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const decodePayload = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4 || 4)) % 4
  const padded = `${normalized}${'='.repeat(padding)}`
  const binary = window.atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export const hasLocalExportPayload = (searchParams: URLSearchParams) =>
  searchParams.get('mode') === LOCAL_EXPORT_MODE || searchParams.has('payload')

export const getLocalExportStorageKey = (documentType: DocumentType) =>
  `${LOCAL_EXPORT_STORAGE_PREFIX}${documentType}`

export const loadLocalExportTemplate = <T,>(
  documentType: DocumentType,
  searchParams: URLSearchParams,
): T | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const inlinePayload = searchParams.get('payload')
  if (inlinePayload) {
    try {
      return tryParseJson<T>(decodePayload(inlinePayload))
    } catch {
      return null
    }
  }

  const storedPayload = window.localStorage.getItem(getLocalExportStorageKey(documentType))
  if (!storedPayload) {
    return null
  }

  return tryParseJson<T>(storedPayload)
}
