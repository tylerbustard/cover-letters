#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const failures = []

const run = (command, args) => spawnSync(command, args, { encoding: 'utf8' })

const check = (name, ok, detail = '') => {
  const message = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`
  console.log(message)
  if (!ok) failures.push(`${name}${detail ? ` - ${detail}` : ''}`)
}

const requireCommand = (command) => {
  const result = run('sh', ['-lc', `command -v ${command}`])
  check(`${command} is available`, result.status === 0)
}

requireCommand('pdfinfo')
requireCommand('pdftotext')

if (failures.length > 0) {
  console.error(`\n${failures.length} static PDF QA preflight failure(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const cases = [
  {
    name: 'public resume PDF',
    path: 'public/Tyler-Bustard-Resume.pdf',
    pages: 2,
    requiredText: [
      'Tyler Bustard',
      'Finance & Technology',
      'Senior Associate, Portfolio Monitoring',
      "Queen's University",
      'Master of Finance Candidate',
    ],
  },
  {
    name: 'public cover letter PDF',
    path: 'public/Tyler-Bustard-Cover-Letter.pdf',
    pages: 1,
    requiredText: [
      'Tyler Bustard',
      'Finance & Technology',
      "Queen's University - Smith School of Business",
      'Master of Finance Candidate, 2026-2027',
      'Sincerely,',
    ],
  },
]

for (const testCase of cases) {
  check(`${testCase.name} exists`, existsSync(testCase.path), testCase.path)
  if (!existsSync(testCase.path)) continue

  const info = run('pdfinfo', [testCase.path])
  const text = run('pdftotext', [testCase.path, '-'])
  const pageCount = Number((info.stdout.match(/Pages:\s+(\d+)/u) || [])[1] || 0)

  check(`${testCase.name} page count`, pageCount === testCase.pages, `${pageCount}/${testCase.pages}`)
  check(
    `${testCase.name} has no browser header/footer text`,
    !/(https?:\/\/|127\.0\.0\.1|\d{1,2}\/\d{1,2}\/\d{2},)/u.test(text.stdout),
  )

  for (const expected of testCase.requiredText) {
    check(`${testCase.name} contains "${expected}"`, text.stdout.includes(expected))
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} static PDF QA failure(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('\nSTATIC PDF QA CHECKS PASSED')
