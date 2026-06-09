import { clearCookie, json } from './_utils.mjs'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  return json(
    200,
    { ok: true },
    {
      'Set-Cookie': clearCookie(),
    },
  )
}
