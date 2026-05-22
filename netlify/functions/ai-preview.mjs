import { getProjectedTemplate, handleHttpError, requireSession } from './_ai-utils.mjs'
import { json } from './_utils.mjs'

const resolvePathMatch = (event) => {
  const rawTarget = [event.rawUrl, event.path].filter(Boolean).join(' ')
  return rawTarget.match(
    /\/admin\/ai-preview\/(resume|cover-letter|email-signature)\/([^/?\s]+)(?:[/?\s]|$)/,
  )
}

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

    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'Method not allowed' })
    }

    const documentType = resolveDocumentType(event)
    const templateId = resolveTemplateId(event)
    const draftId = event.queryStringParameters?.draftId || ''

    if (!documentType || !templateId) {
      return json(400, { error: 'documentType and templateId are required' })
    }

    return json(200, await getProjectedTemplate(event, documentType, templateId, draftId))
  } catch (error) {
    return handleHttpError(error)
  }
}
