import { getSessionFromEvent, json } from './_utils.mjs'

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' })
  }

  const session = getSessionFromEvent(event)

  return json(200, {
    session,
  })
}
