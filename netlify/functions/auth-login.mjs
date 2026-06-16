import { createHmac, timingSafeEqual } from 'node:crypto'

import { buildCookie, encodeSession, getAuthConfig, getNamedStore, json, parseBody } from './_utils.mjs'

const RATE_LIMIT_STORE = 'auth-rate-limit'
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_LOCK_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_FAILURES = 10

const getHeader = (event, name) => {
  const lowerName = name.toLowerCase()
  const entry = Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === lowerName)
  return typeof entry?.[1] === 'string' ? entry[1] : ''
}

const getClientIdentifier = (event) => {
  const forwardedFor = getHeader(event, 'x-forwarded-for').split(',')[0]?.trim()
  return (
    getHeader(event, 'x-nf-client-connection-ip') ||
    getHeader(event, 'client-ip') ||
    forwardedFor ||
    'unknown-client'
  )
}

const createDigest = (label, value, secret) =>
  createHmac('sha256', secret).update(`${label}:${String(value)}`).digest()

const constantTimeCredentialMatches = (label, candidate, expected, secret) =>
  timingSafeEqual(createDigest(label, candidate, secret), createDigest(label, expected, secret))

const getRateLimitKey = (event, secret) =>
  `login/${createHmac('sha256', secret).update(getClientIdentifier(event)).digest('base64url')}.json`

const readRateLimitRecord = async (event, key) => {
  try {
    return (await getNamedStore(event, RATE_LIMIT_STORE).get(key, { type: 'json' })) ?? null
  } catch {
    return null
  }
}

const writeRateLimitRecord = async (event, key, record) => {
  try {
    await getNamedStore(event, RATE_LIMIT_STORE).setJSON(key, record, {
      metadata: {
        failedAttempts: record.failedAttempts,
        lockedUntil: record.lockedUntil,
        windowStartedAt: record.windowStartedAt,
      },
    })
  } catch {
    // Rate limiting must not become a production outage if the blob store is unavailable.
  }
}

const clearRateLimitRecord = async (event, key) => {
  try {
    await getNamedStore(event, RATE_LIMIT_STORE).delete(key)
  } catch {
    // Successful auth should continue even if cleanup fails.
  }
}

const getActiveRateLimit = async (event, key, now) => {
  const record = await readRateLimitRecord(event, key)
  const lockedUntil = Number(record?.lockedUntil ?? 0)

  if (lockedUntil > now) {
    return {
      response: json(
        429,
        { error: 'Too many failed sign-in attempts. Try again shortly.' },
        { 'Retry-After': String(Math.ceil((lockedUntil - now) / 1000)) },
      ),
    }
  }

  return { record }
}

const recordFailedLogin = async (event, key, previousRecord, now) => {
  const windowStartedAt = Number(previousRecord?.windowStartedAt ?? 0)
  const withinWindow = windowStartedAt > 0 && now - windowStartedAt <= RATE_LIMIT_WINDOW_MS
  const failedAttempts = (withinWindow ? Number(previousRecord?.failedAttempts ?? 0) : 0) + 1
  const lockedUntil = failedAttempts >= RATE_LIMIT_MAX_FAILURES ? now + RATE_LIMIT_LOCK_MS : 0

  await writeRateLimitRecord(event, key, {
    failedAttempts,
    lockedUntil,
    windowStartedAt: withinWindow ? windowStartedAt : now,
    updatedAt: now,
  })
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const { username: adminUsername, password: adminPassword, secret } = getAuthConfig()
  const { username = '', password = '' } = parseBody(event)
  const rateLimitKey = getRateLimitKey(event, secret)
  const now = Date.now()
  const rateLimit = await getActiveRateLimit(event, rateLimitKey, now)

  if (rateLimit.response) {
    return rateLimit.response
  }

  const usernameMatches = constantTimeCredentialMatches('username', username, adminUsername, secret)
  const passwordMatches = constantTimeCredentialMatches('password', password, adminPassword, secret)
  if (!usernameMatches || !passwordMatches) {
    await recordFailedLogin(event, rateLimitKey, rateLimit.record, now)
    return json(401, { error: 'Invalid credentials' })
  }

  await clearRateLimitRecord(event, rateLimitKey)
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
