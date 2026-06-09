import { getAiDocumentSnapshot, handleHttpError, requireSession } from './_ai-utils.mjs'
import { json } from './_utils.mjs'

const resolvePathMatch = (event) => {
  const rawTarget = [event.rawUrl, event.path].filter(Boolean).join(' ')
  return rawTarget.match(
    /\/automation\/documents\/(resume|cover-letter|email-signature)\/([^/?\s]+)(?:[/?\s]|$)/,
  )
}

const resolveType = (event) => event.queryStringParameters?.type || resolvePathMatch(event)?.[1] || ''
const resolveTemplateId = (event) =>
  event.queryStringParameters?.templateId || decodeURIComponent(resolvePathMatch(event)?.[2] || '')

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'Method not allowed' })
    }

    const auth = requireSession(event)
    if (auth.response) {
      return auth.response
    }

    const documentType = resolveType(event)
    const templateId = resolveTemplateId(event)
    if (!documentType || !templateId) {
      return json(400, { error: 'documentType and templateId are required' })
    }

    return json(200, await getAiDocumentSnapshot(event, documentType, templateId))
  } catch (error) {
    return handleHttpError(error)
  }
}
