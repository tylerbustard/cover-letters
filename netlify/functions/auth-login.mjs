import { timingSafeEqual } from 'node:crypto'

import { buildCookie, encodeSession, getAuthConfig, json, parseBody } from './_utils.mjs'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const { username: adminUsername, password: adminPassword, secret } = getAuthConfig()
  const { username = '', password = '' } = parseBody(event)

  const usernameBuffer = Buffer.from(String(username))
  const passwordBuffer = Buffer.from(String(password))
  const adminUsernameBuffer = Buffer.from(adminUsername)
  const adminPasswordBuffer = Buffer.from(adminPassword)

  const usernameMatches =
    usernameBuffer.length === adminUsernameBuffer.length &&
    timingSafeEqual(usernameBuffer, adminUsernameBuffer)
  const passwordMatches =
    passwordBuffer.length === adminPasswordBuffer.length &&
    timingSafeEqual(passwordBuffer, adminPasswordBuffer)

  if (!usernameMatches || !passwordMatches) {
    return json(401, { error: 'Invalid credentials' })
  }

  const cookie = buildCookie(encodeSession(adminUsername, secret))

  return json(
    200,
    {
      session: {
        username: adminUsername,
      },
    },
    {
      'Set-Cookie': cookie,
    },
  )
}
