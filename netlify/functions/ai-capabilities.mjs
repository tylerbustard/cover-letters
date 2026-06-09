import { buildAiCapabilities, handleHttpError, requireAiScopes } from './_ai-utils.mjs'
import { json } from './_utils.mjs'

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'Method not allowed' })
    }

    const auth = requireAiScopes(event, ['schema:read'])
    if (auth.response) {
      return auth.response
    }

    return json(200, buildAiCapabilities())
  } catch (error) {
    return handleHttpError(error)
  }
}
