#!/usr/bin/env zsh
set -euo pipefail

FINCHAT_REPO="/Volumes/Tyler SSD/Website/site/private-document-studio"
NET_REPO="/Volumes/Tyler SSD/Website/site/website-mcgill-net"
FINCHAT_SITE_ID="5b51fe5c-b09b-4b6f-b108-c006bf64ad91"
NET_SITE_ID="8134f7db-78b1-4db3-a527-77f7b3473c84"

TOKEN="${NETLIFY_AUTH_TOKEN:-${NETLIFY_TOKEN:-}}"
if [[ -z "${TOKEN}" ]]; then
  echo "Missing NETLIFY_AUTH_TOKEN or NETLIFY_TOKEN."
  exit 1
fi
export NETLIFY_AUTH_TOKEN="${TOKEN}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

require_text() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if ! grep -Fq "$needle" <<<"$haystack"; then
    echo "Acceptance failed: missing ${label}: ${needle}"
    exit 1
  fi
}

reject_text() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if grep -Fq "$needle" <<<"$haystack"; then
    echo "Acceptance failed: found forbidden ${label}: ${needle}"
    exit 1
  fi
}

require_status() {
  local url="$1"
  local expected="$2"
  local label="$3"
  local http_code
  http_code="$(curl -fsSIL -o /dev/null -w "%{http_code}" "$url")"
  if [[ "${http_code}" != "${expected}" ]]; then
    echo "Acceptance failed: ${label} returned HTTP ${http_code}, expected ${expected}."
    exit 1
  fi
}

require_finchat_login() {
  local url="$1"
  node - "${url}" <<'NODE'
import { readFileSync } from 'node:fs'

const [url] = process.argv.slice(2)
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const separatorIndex = line.indexOf('=')
      return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).replace(/\r$/u, '')]
    })
    .filter(([key]) => key.length > 0),
)

const response = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  }),
})

let payload = {}
try {
  payload = await response.json()
} catch {}

if (!response.ok || !payload?.session) {
  console.error(`Acceptance failed: FinChat live login returned HTTP ${response.status}.`)
  process.exit(1)
}

console.log('FinChat live login verified.')
NODE
}

require_cmd curl
require_cmd git
require_cmd grep
require_cmd node
require_cmd npm
require_cmd pdftotext
require_cmd rg
require_cmd zip

require_clean_git() {
  local repo="$1"
  local label="$2"
  local dirty
  dirty="$(git -C "${repo}" status --short)"
  if [[ -n "${dirty}" ]]; then
    echo "Refusing deploy: ${label} worktree has uncommitted changes."
    echo "${dirty}"
    exit 1
  fi
}

require_file_text() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if [[ ! -f "${file}" ]]; then
    echo "Acceptance failed: missing ${label}: ${file}"
    exit 1
  fi
  require_text "$(cat "${file}")" "${needle}" "${label}"
}

require_netlify_site() {
  local site_id="$1"
  local label="$2"
  local expected_host="$3"
  node - "${site_id}" "${label}" "${expected_host}" <<'NODE'
const [siteId, label, expectedHost] = process.argv.slice(2)
const token = process.env.NETLIFY_AUTH_TOKEN
const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
  headers: { Authorization: `Bearer ${token}` },
})
if (!response.ok) {
  console.error(`Netlify site preflight failed for ${label}: HTTP ${response.status}`)
  process.exit(1)
}
const site = await response.json()
const hostValues = [
  site.custom_domain,
  site.ssl_url,
  site.url,
  ...(Array.isArray(site.domain_aliases) ? site.domain_aliases : []),
]
  .filter(Boolean)
  .map((value) => {
    try {
      return new URL(value).hostname
    } catch {
      return String(value)
    }
  })
if (!hostValues.includes(expectedHost)) {
  console.error(`Netlify site preflight failed for ${label}: expected host ${expectedHost}; saw ${hostValues.join(', ')}`)
  process.exit(1)
}
console.log(`${label} Netlify site verified: ${site.name}`)
NODE
}

deploy_zip() {
  local site_id="$1"
  local deploy_dir="$2"
  local label="$3"
  local zip_file
  local curl_config
  local response
  local deploy_id
  local state
  zip_file="$(mktemp -t "${label}.XXXXXXXX")"
  rm -f "${zip_file}"
  zip_file="${zip_file}.zip"
  curl_config="$(mktemp -t "${label}.curl.XXXXXXXX")"
  chmod 600 "${curl_config}"
  print -r -- "header = \"Authorization: Bearer ${TOKEN}\"" > "${curl_config}"

  (cd "${deploy_dir}" && zip -qr "${zip_file}" .)
  if ! response="$(
    curl -fsS \
      --config "${curl_config}" \
      -X POST \
      -H "Content-Type: application/zip" \
      --data-binary @"${zip_file}" \
      "https://api.netlify.com/api/v1/sites/${site_id}/deploys"
  )"; then
    rm -f "${zip_file}" "${curl_config}"
    exit 1
  fi
  rm -f "${zip_file}"

  deploy_id="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(j.id || '')" <<<"${response}")"
  state="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(j.state || '')" <<<"${response}")"
  if [[ -z "${deploy_id}" ]]; then
    rm -f "${curl_config}"
    echo "Deployment failed: Netlify did not return a deploy id for ${label}."
    exit 1
  fi

  echo "${label} deploy id: ${deploy_id}"
  for _ in {1..60}; do
    if [[ "${state}" == "ready" ]]; then
      rm -f "${curl_config}"
      return 0
    fi
    if [[ "${state}" == "error" ]]; then
      rm -f "${curl_config}"
      echo "Deployment failed: ${label} deploy ${deploy_id} entered error state."
      exit 1
    fi
    sleep 5
    if ! response="$(curl -fsS --config "${curl_config}" "https://api.netlify.com/api/v1/deploys/${deploy_id}")"; then
      rm -f "${curl_config}"
      exit 1
    fi
    state="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(j.state || '')" <<<"${response}")"
  done

  rm -f "${curl_config}"
  echo "Deployment failed: ${label} deploy ${deploy_id} did not become ready in time."
  exit 1
}

echo "Building and verifying FinChat..."
cd "${FINCHAT_REPO}"
echo "Using Netlify CLI $(npm exec -- netlify --version)"
require_netlify_site "${FINCHAT_SITE_ID}" "FinChat" "finchat.ca"
require_netlify_site "${NET_SITE_ID}" "tylerbustard.net" "tylerbustard.net"
require_clean_git "${FINCHAT_REPO}" "FinChat"
require_clean_git "${NET_REPO}" "tylerbustard.net"
npm run qa:ui
require_clean_git "${FINCHAT_REPO}" "FinChat after UI smoke"
npm run verify:production
require_clean_git "${FINCHAT_REPO}" "FinChat after verification"
npm exec -- netlify deploy \
  --prod \
  --dir=dist \
  --site="${FINCHAT_SITE_ID}" \
  --message="Deploy McGill MBA studio package"

echo "Building and verifying tylerbustard.net..."
cd "${NET_REPO}"
npm run check
npm run build
require_file_text "${NET_REPO}/dist/public/_redirects" "/*    /index.html   200" "tylerbustard.net SPA redirects"
require_clean_git "${NET_REPO}" "tylerbustard.net after build"
deploy_zip "${NET_SITE_ID}" "dist/public" "tylerbustard-net-mcgill"

echo "Waiting briefly for Netlify edge propagation..."
sleep 15

echo "Checking live FinChat bundle..."
cd "${FINCHAT_REPO}"
require_status "https://finchat.ca/?v=$(date +%s)" "200" "FinChat home"
require_status "https://finchat.ca/sign-in?v=$(date +%s)" "200" "FinChat sign-in route"
require_status "https://finchat.ca/studio/email-signature?v=$(date +%s)" "200" "FinChat signature studio route"
require_status "https://finchat.ca/studio/resume?v=$(date +%s)" "200" "FinChat resume studio route"
require_status "https://finchat.ca/studio/cover-letter?v=$(date +%s)" "200" "FinChat cover-letter studio route"
require_status "https://finchat.ca/ai-assets/logos/unb-full.png?v=$(date +%s)" "200" "FinChat hosted UNB logo"
require_status "https://finchat.ca/ai-assets/logos/queens-alt.png?v=$(date +%s)" "200" "FinChat hosted Queen's logo"
require_status "https://finchat.ca/ai-assets/logos/mcgill.png?v=$(date +%s)" "200" "FinChat hosted McGill logo"
require_status "https://finchat.ca/ai-assets/logos/rotman.png?v=$(date +%s)" "200" "FinChat hosted Rotman logo"
finchat_session_json="$(curl -fsSL "https://finchat.ca/api/auth/session?v=$(date +%s)")"
require_text "${finchat_session_json}" "session" "FinChat auth session function"
require_finchat_login "https://finchat.ca/api/auth/login"
finchat_html="$(curl -fsSL "https://finchat.ca/?v=$(date +%s)")"
finchat_asset="$(rg -o '/assets/index-[^" ]+\.js' <<<"${finchat_html}" | head -n 1)"
if [[ -z "${finchat_asset}" ]]; then
  echo "Acceptance failed: could not find FinChat JS asset."
  exit 1
fi
finchat_js="$(curl -fsSL "https://finchat.ca${finchat_asset}")"
require_text "${finchat_js}" "University of New Brunswick" "FinChat UNB school"
require_text "${finchat_js}" "Bachelor of Business Administration in Finance; Class of 2020" "FinChat UNB degree"
require_text "${finchat_js}" "Queen's University - Smith School of Business" "FinChat Queen's school"
require_text "${finchat_js}" "Master of Finance Candidate, 2026-2027" "FinChat Queen's title"
require_text "${finchat_js}" "McGill University - Desautels Faculty of Management" "FinChat McGill school"
require_text "${finchat_js}" "Master of Business Administration Candidate, 2026-2027" "FinChat MBA title"
require_text "${finchat_js}" "tyler@tylerbustard.net" "FinChat .net email"
require_text "${finchat_js}" "University of Toronto - Rotman School of Management" "FinChat Rotman school"
require_text "${finchat_js}" "Master of Business Administration Candidate, 2026" "FinChat Rotman title"
require_text "${finchat_js}" "tyler@tylerbustard.info" "FinChat Rotman .info email"
reject_text "${finchat_js}" "Master of Management in Finance" "old MMF wording"
reject_text "${finchat_js}" "Peter Christoffersen" "unsupported award"
reject_text "${finchat_js}" "\$13,000" "unsupported scholarship amount"
npm run qa:live:finchat

echo "Checking live tylerbustard.net bundle..."
cd "${NET_REPO}"
require_status "https://tylerbustard.net/?v=$(date +%s)" "200" "tylerbustard.net home"
require_status "https://tylerbustard.net/resume?v=$(date +%s)" "200" "tylerbustard.net resume route"
net_html="$(curl -fsSL "https://tylerbustard.net/?v=$(date +%s)")"
net_asset="$(rg -o '/assets/index-[^" ]+\.js' <<<"${net_html}" | head -n 1)"
if [[ -z "${net_asset}" ]]; then
  echo "Acceptance failed: could not find tylerbustard.net JS asset."
  exit 1
fi
net_js="$(curl -fsSL "https://tylerbustard.net${net_asset}")"
require_text "${net_js}" "MBA Candidate, 2026-2027" ".net hero title"
require_text "${net_js}" "McGill University - Desautels Faculty of Management" ".net McGill school"
require_text "${net_js}" "tyler@tylerbustard.net" ".net email"
reject_text "${net_js}" "Master of Management" "old MMF wording"
reject_text "${net_js}" "Peter Christoffersen" "unsupported award"
reject_text "${net_js}" "Desautels Capital" "unsupported DCM claim"
reject_text "${net_js}" "Northeast Christian College" "NCC public variant"
reject_text "${net_js}" "tyler@tylerbustard.com" "old .com email"

echo "Checking live static resume PDF..."
require_status "https://tylerbustard.net/Tyler-Bustard-Resume.pdf?v=$(date +%s)" "200" "static resume PDF"
pdf_file="$(mktemp -t tylerbustard-net-resume.XXXXXX.pdf)"
curl -fsSL "https://tylerbustard.net/Tyler-Bustard-Resume.pdf?v=$(date +%s)" -o "${pdf_file}"
pdf_text="$(pdftotext "${pdf_file}" -)"
require_text "${pdf_text}" "Master of Business Administration Candidate" "resume MBA title"
require_text "${pdf_text}" "McGill University - Desautels Faculty of Management" "resume McGill school"
require_text "${pdf_text}" "tyler@tylerbustard.net" "resume .net email"
reject_text "${pdf_text}" "Master of Management" "resume old MMF wording"
reject_text "${pdf_text}" "Northeast Christian College" "resume NCC"
rm -f "${pdf_file}"

echo "McGill MBA production deployment accepted."
