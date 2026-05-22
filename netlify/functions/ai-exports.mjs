import { createExportArtifact, handleHttpError, parseBody, requireAiScopes } from './_ai-utils.mjs'
import { json } from './_utils.mjs'

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed' })
    }

    const auth = requireAiScopes(event, ['exports:write'])
    if (auth.response) {
      return auth.response
    }

    return json(200, await createExportArtifact(event, parseBody(event)))
  } catch (error) {
    return handleHttpError(error)
  }
}
