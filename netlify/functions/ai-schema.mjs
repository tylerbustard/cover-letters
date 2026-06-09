import { STUDIO_EDIT_SCHEMA } from '../../src/lib/studio-edit-schema.ts'
import { handleHttpError, requireAiScopes } from './_ai-utils.mjs'
import { json } from './_utils.mjs'

const resolveType = (event) => {
  const queryType = event.queryStringParameters?.type
  if (queryType) {
    return queryType
  }

  const rawTarget = [event.rawUrl, event.path].filter(Boolean).join(' ')
  const match = rawTarget.match(/\/ai\/schema\/(resume|cover-letter|email-signature)(?:[/?\s]|$)/)
  return match?.[1] || ''
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'Method not allowed' })
    }

    const auth = requireAiScopes(event, ['schema:read'])
    if (auth.response) {
      return auth.response
    }

    const type = resolveType(event)
    const documentSchema = STUDIO_EDIT_SCHEMA.documents[type]
    if (!documentSchema) {
      return json(400, { error: 'Invalid document type' })
    }

    return json(200, {
      schemaVersion: STUDIO_EDIT_SCHEMA.schemaVersion,
      documentType: type,
      assetOptions: STUDIO_EDIT_SCHEMA.assetOptions,
      ...documentSchema,
    })
  } catch (error) {
    return handleHttpError(error)
  }
}
