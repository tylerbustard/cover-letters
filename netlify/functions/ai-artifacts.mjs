import { getArtifact, handleHttpError } from './_ai-utils.mjs'
import { ROBOTS_HEADER, json } from './_utils.mjs'

const buildBinaryResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': ROBOTS_HEADER,
    ...headers,
  },
  body,
})

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'Method not allowed' })
    }

    const rawTarget = [event.rawUrl, event.path].filter(Boolean).join(' ')
    const artifactId =
      event.queryStringParameters?.artifactId ||
      decodeURIComponent(rawTarget.match(/\/ai\/artifacts\/([^/?\s]+)(?:[/?\s]|$)/)?.[1] || '')
    if (!artifactId) {
      return json(400, { error: 'artifactId is required' })
    }

    const artifact = await getArtifact(event, artifactId)

    if (artifact.redirectUrl) {
      return buildBinaryResponse(302, '', {
        Location: artifact.redirectUrl,
        'Content-Type': artifact.contentType || 'application/octet-stream',
      })
    }

    if (typeof artifact.body !== 'string') {
      return json(404, { error: 'Artifact body is unavailable' })
    }

    const headers = {
      'Content-Type': artifact.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${artifact.fileName || artifact.artifactId}"`,
    }

    return buildBinaryResponse(200, artifact.body, headers)
  } catch (error) {
    return handleHttpError(error)
  }
}
