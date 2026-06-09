import { timingSafeEqual } from 'node:crypto'

import {
  AI_ISSUED_SCOPES,
  AI_TOKEN_TTL_SECONDS,
  encodeAiToken,
  getAiConfig,
  handleHttpError,
  parseBody,
} from './_ai-utils.mjs'
import { json } from './_utils.mjs'

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method not allowed' })
    }

    const { clientId, clientSecret, jwtSecret, issuer, audience } = getAiConfig()
    const body = parseBody(event)
    const requestedClientId = Buffer.from(String(body.client_id ?? ''))
    const requestedSecret = Buffer.from(String(body.client_secret ?? ''))
    const expectedClientId = Buffer.from(clientId)
    const expectedSecret = Buffer.from(clientSecret)

    const clientMatches =
      requestedClientId.length === expectedClientId.length &&
      timingSafeEqual(requestedClientId, expectedClientId)
    const secretMatches =
      requestedSecret.length === expectedSecret.length &&
      timingSafeEqual(requestedSecret, expectedSecret)

    if (!clientMatches || !secretMatches) {
      return json(401, { error: 'Invalid AI client credentials' })
    }

    const now = Math.floor(Date.now() / 1000)
    const claims = {
      iss: issuer,
      aud: audience,
      sub: clientId,
      scope: AI_ISSUED_SCOPES,
      iat: now,
      exp: now + AI_TOKEN_TTL_SECONDS,
    }

    return json(200, {
      access_token: encodeAiToken(claims, jwtSecret),
      token_type: 'Bearer',
      expires_in: AI_TOKEN_TTL_SECONDS,
      scope: AI_ISSUED_SCOPES,
    })
  } catch (error) {
    return handleHttpError(error)
  }
}
