import {
  applyDraftToDocument,
  getReviewState,
  handleHttpError,
  rejectDraft,
  requireSession,
} from './_ai-utils.mjs'
import { json } from './_utils.mjs'

const resolvePathMatch = (event) => {
  const rawTarget = [event.rawUrl, event.path].filter(Boolean).join(' ')
  return rawTarget.match(
    /\/admin\/ai-review-state\/(resume|cover-letter|email-signature)\/([^/?\s]+)(?:[/?\s]|$)/,
  )
}

const resolveDraftId = (event) => event.queryStringParameters?.draftId || ''
const resolveAction = (event) => event.queryStringParameters?.action || ''
const resolveDocumentType = (event) =>
  event.queryStringParameters?.documentType || resolvePathMatch(event)?.[1] || ''
const resolveTemplateId = (event) =>
  event.queryStringParameters?.templateId || decodeURIComponent(resolvePathMatch(event)?.[2] || '')

export const handler = async (event) => {
  try {
    const auth = requireSession(event)
    if (auth.response) {
      return auth.response
    }

    if (event.httpMethod === 'GET') {
      const documentType = resolveDocumentType(event)
      const templateId = resolveTemplateId(event)
      if (!documentType || !templateId) {
        return json(400, { error: 'documentType and templateId are required' })
      }

      return json(200, await getReviewState(event, documentType, templateId))
    }

    if (event.httpMethod === 'POST' && resolveDraftId(event) && resolveAction(event) === 'apply') {
      return json(200, await applyDraftToDocument(event, resolveDraftId(event), auth.session.username))
    }

    if (event.httpMethod === 'POST' && resolveDraftId(event) && resolveAction(event) === 'reject') {
      return json(200, { draft: await rejectDraft(event, resolveDraftId(event), auth.session.username) })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (error) {
    return handleHttpError(error)
  }
}
