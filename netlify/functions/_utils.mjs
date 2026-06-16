import { createHmac, timingSafeEqual } from 'node:crypto'

import { connectLambda, getStore } from '@netlify/blobs'
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'

const SESSION_COOKIE = '__Host-studio_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7
const ROBOTS_HEADER = 'noindex, nofollow, noarchive, nosnippet'
const SECURITY_HEADERS = {
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Robots-Tag': ROBOTS_HEADER,
    ...SECURITY_HEADERS,
    ...extraHeaders,
  },
  body: JSON.stringify(body),
})

const parseBody = (event) => {
  if (!event.body) {
    return {}
  }

  try {
    return JSON.parse(event.body)
  } catch {
    return {}
  }
}

const getAuthConfig = () => {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  const secret = process.env.SESSION_SECRET

  if (!username || !password || !secret) {
    throw new Error('Missing studio auth environment variables')
  }

  return { username, password, secret }
}

const signPayload = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url')

const encodeSession = (username, secret) => {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
    }),
    'utf8',
  ).toString('base64url')

  const signature = signPayload(payload, secret)
  return `${payload}.${signature}`
}

const decodeSession = (token, secret) => {
  if (!token || typeof token !== 'string') {
    return null
  }

  const [payload, signature] = token.split('.')
  if (!payload || !signature) {
    return null
  }

  const expected = signPayload(payload, secret)
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof parsed?.username !== 'string' || typeof parsed?.expiresAt !== 'number') {
      return null
    }

    if (parsed.expiresAt <= Date.now()) {
      return null
    }

    return { username: parsed.username }
  } catch {
    return null
  }
}

const getSessionFromEvent = (event) => {
  const { secret } = getAuthConfig()
  const cookies = parseCookie(event.headers.cookie ?? '')
  return decodeSession(cookies[SESSION_COOKIE], secret)
}

const requireSession = (event) => {
  const session = getSessionFromEvent(event)
  if (!session) {
    return {
      session: null,
      response: json(401, { error: 'Unauthorized' }),
    }
  }

  return { session }
}

const buildCookie = (value, maxAge = SESSION_MAX_AGE) =>
  serializeCookie(SESSION_COOKIE, value, {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: 'lax',
    secure: true,
  })

const clearCookie = () =>
  serializeCookie(SESSION_COOKIE, '', {
    expires: new Date(0),
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
  })

const getNamedStore = (event, name) => {
  const apiToken = process.env.NETLIFY_API_TOKEN
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID

  if (apiToken && siteID) {
    return getStore({
      name,
      siteID,
      token: apiToken,
      consistency: 'strong',
    })
  }

  connectLambda(event)
  return getStore(name)
}

const getDocumentsStore = (event) => getNamedStore(event, 'private-documents')

export {
  ROBOTS_HEADER,
  buildCookie,
  clearCookie,
  decodeSession,
  encodeSession,
  getAuthConfig,
  getDocumentsStore,
  getNamedStore,
  getSessionFromEvent,
  json,
  parseBody,
  requireSession,
}
