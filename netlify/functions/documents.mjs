import { getDocumentsStore, json, parseBody, requireSession } from './_utils.mjs'

const VALID_TYPES = new Set(['resume', 'cover-letter', 'email-signature'])

const resolveType = (event) => {
  const queryType = event.queryStringParameters?.type
  if (queryType) {
    return queryType
  }

  const rawTarget = [event.rawUrl, event.path].filter(Boolean).join(' ')
  const match = rawTarget.match(/\/documents\/(resume|cover-letter|email-signature)(?:[/?\s]|$)/)
  return match?.[1]
}

export const handler = async (event) => {
  const auth = requireSession(event)
  if (auth.response) {
    return auth.response
  }

  const type = resolveType(event)
  if (!type || !VALID_TYPES.has(type)) {
    return json(400, { error: 'Invalid document type' })
  }

  const store = getDocumentsStore(event)
  const key = `${type}.json`

  if (event.httpMethod === 'GET') {
    const document = await store.get(key, { type: 'json' })
    return json(200, {
      document,
    })
  }

  if (event.httpMethod === 'PUT') {
    const { document } = parseBody(event)
    if (!document || typeof document !== 'object') {
      return json(400, { error: 'Invalid document payload' })
    }

    const updatedAt = new Date().toISOString()
    await store.set(
      key,
      JSON.stringify({
        ...document,
        updatedAt,
      }),
      {
        metadata: {
          type,
          updatedAt,
        },
      },
    )

    return json(200, {
      ok: true,
      updatedAt,
    })
  }

  return json(405, { error: 'Method not allowed' })
}
