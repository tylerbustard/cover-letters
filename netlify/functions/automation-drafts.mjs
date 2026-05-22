import {
  applyDraftToDocument,
  createDraft,
  handleHttpError,
  parseBody,
  requireSession,
} from './_ai-utils.mjs'
import { getDocumentsStore, json } from './_utils.mjs'

const resolveDraftMatch = (event) => {
  const rawTarget = [event.rawUrl, event.path].filter(Boolean).join(' ')
  return rawTarget.match(/\/automation\/drafts\/([^/?\s]+)(?:\/(apply))?(?:[/?\s]|$)/)
}

const resolveDraftId = (event) =>
  event.queryStringParameters?.draftId || decodeURIComponent(resolveDraftMatch(event)?.[1] || '')
const resolveAction = (event) => event.queryStringParameters?.action || resolveDraftMatch(event)?.[2] || ''

export const handler = async (event) => {
  try {
    const auth = requireSession(event)
    if (auth.response) {
      return auth.response
    }

    if (event.httpMethod === 'POST' && !resolveDraftId(event)) {
      const draft = await createDraft(event, parseBody(event), auth.session.username)
      return json(200, { draft })
    }

    if (event.httpMethod === 'GET' && resolveDraftId(event)) {
      const store = getDocumentsStore(event)
      const draft = await store.get(`ai/drafts/${resolveDraftId(event)}.json`, { type: 'json' })
      if (!draft) {
        return json(404, { error: 'Draft not found' })
      }

      return json(200, { draft })
    }

    if (event.httpMethod === 'POST' && resolveDraftId(event) && resolveAction(event) === 'apply') {
      const result = await applyDraftToDocument(event, resolveDraftId(event), auth.session.username)
      return json(200, result)
    }

    return json(405, { error: 'Method not allowed' })
  } catch (error) {
    return handleHttpError(error)
  }
}
