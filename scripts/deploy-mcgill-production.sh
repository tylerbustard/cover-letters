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

require_cmd curl
require_cmd grep
require_cmd node
require_cmd npm
require_cmd rg
require_cmd zip

deploy_zip() {
  local site_id="$1"
  local deploy_dir="$2"
  local label="$3"
  local zip_file
  local response
  local deploy_id
  local state
  zip_file="$(mktemp -t "${label}.XXXXXXXX")"
  rm -f "${zip_file}"
  zip_file="${zip_file}.zip"

  (cd "${deploy_dir}" && zip -qr "${zip_file}" .)
  response="$(
    curl -fsS \
      -X POST \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/zip" \
      --data-binary @"${zip_file}" \
      "https://api.netlify.com/api/v1/sites/${site_id}/deploys"
  )"
  rm -f "${zip_file}"

  deploy_id="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(j.id || '')" <<<"${response}")"
  state="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(j.state || '')" <<<"${response}")"
  if [[ -z "${deploy_id}" ]]; then
    echo "Deployment failed: Netlify did not return a deploy id for ${label}."
    exit 1
  fi

  echo "${label} deploy id: ${deploy_id}"
  for _ in {1..60}; do
    if [[ "${state}" == "ready" ]]; then
      return 0
    fi
    if [[ "${state}" == "error" ]]; then
      echo "Deployment failed: ${label} deploy ${deploy_id} entered error state."
      exit 1
    fi
    sleep 5
    response="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" "https://api.netlify.com/api/v1/deploys/${deploy_id}")"
    state="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(j.state || '')" <<<"${response}")"
  done

  echo "Deployment failed: ${label} deploy ${deploy_id} did not become ready in time."
  exit 1
}

echo "Building and verifying FinChat..."
cd "${FINCHAT_REPO}"
npm run verify
npm exec --yes netlify -- deploy \
  --prod \
  --dir=dist \
  --site="${FINCHAT_SITE_ID}" \
  --message="Deploy McGill MBA studio package"

echo "Building and verifying tylerbustard.net..."
cd "${NET_REPO}"
npm run check
npm run build
deploy_zip "${NET_SITE_ID}" "dist/public" "tylerbustard-net-mcgill"

echo "Waiting briefly for Netlify edge propagation..."
sleep 15

echo "Checking live FinChat bundle..."
require_status "https://finchat.ca/?v=$(date +%s)" "200" "FinChat home"
finchat_html="$(curl -fsSL "https://finchat.ca/?v=$(date +%s)")"
finchat_asset="$(rg -o '/assets/index-[^" ]+\.js' <<<"${finchat_html}" | head -n 1)"
if [[ -z "${finchat_asset}" ]]; then
  echo "Acceptance failed: could not find FinChat JS asset."
  exit 1
fi
finchat_js="$(curl -fsSL "https://finchat.ca${finchat_asset}")"
require_text "${finchat_js}" "McGill University - Desautels Faculty of Management" "FinChat McGill school"
require_text "${finchat_js}" "Master of Business Administration Candidate, 2026-2027" "FinChat MBA title"
require_text "${finchat_js}" "tyler@tylerbustard.net" "FinChat .net email"
reject_text "${finchat_js}" "Master of Management in Finance" "old MMF wording"
reject_text "${finchat_js}" "Peter Christoffersen" "unsupported award"
reject_text "${finchat_js}" "\$13,000" "unsupported scholarship amount"

echo "Checking live tylerbustard.net bundle..."
require_status "https://tylerbustard.net/?v=$(date +%s)" "200" "tylerbustard.net home"
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
if command -v pdftotext >/dev/null 2>&1; then
  pdf_text="$(pdftotext "${pdf_file}" -)"
  require_text "${pdf_text}" "Master of Business Administration Candidate" "resume MBA title"
  require_text "${pdf_text}" "tyler@tylerbustard.net" "resume .net email"
  reject_text "${pdf_text}" "Master of Management" "resume old MMF wording"
  reject_text "${pdf_text}" "Northeast Christian College" "resume NCC"
fi
rm -f "${pdf_file}"

echo "McGill MBA production deployment accepted."
