import type {
  AiDraft,
  AiDraftReviewState,
  DocumentType,
  StoredCoverLetterState,
  StoredResumeState,
  StoredSignatureState,
  StudioSession,
} from '@/types'

type StoredDocumentResponse<T> = {
  document: T | null
}

const getErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json()
    if (typeof payload?.error === 'string') {
      return payload.error
    }
  } catch {
    // Ignore malformed payloads and use status text fallback.
  }

  return response.statusText || 'Request failed'
}

const requestJson = async <T,>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

export const getSession = () => requestJson<{ session: StudioSession | null }>('/api/auth/session')

export const login = (username: string, password: string) =>
  requestJson<{ session: StudioSession }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const logout = () =>
  requestJson<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })

export const getStoredDocument = <T,>(type: DocumentType) =>
  requestJson<StoredDocumentResponse<T>>(`/api/documents/${type}`)

export const saveStoredDocument = <T,>(type: DocumentType, document: T) =>
  requestJson<{ ok: true; updatedAt: string }>(`/api/documents/${type}`, {
    method: 'PUT',
    body: JSON.stringify({ document }),
  })

export const getAiReviewState = (documentType: DocumentType, templateId: string) =>
  requestJson<AiDraftReviewState>(
    `/api/admin/ai-review-state/${documentType}/${encodeURIComponent(templateId)}`,
  )

export const applyAiReviewDraft = (draftId: string) =>
  requestJson<{ draft: AiDraft; updatedAt: string; projectedHash?: string }>(
    `/api/admin/ai-review/${encodeURIComponent(draftId)}/apply`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )

export const rejectAiReviewDraft = (draftId: string) =>
  requestJson<{ draft: AiDraft }>(`/api/admin/ai-review/${encodeURIComponent(draftId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

export const getAiProjectedTemplate = <T,>(
  type: DocumentType,
  templateId: string,
  draftId?: string,
) =>
  requestJson<{ template: T; projectedHash: string; draftId: string | null }>(
    `/api/admin/ai-preview/${type}/${encodeURIComponent(templateId)}${draftId ? `?draftId=${encodeURIComponent(draftId)}` : ''}`,
  )

export type ResumeDocumentState = StoredResumeState
export type CoverLetterDocumentState = StoredCoverLetterState
export type SignatureDocumentState = StoredSignatureState
