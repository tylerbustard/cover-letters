import assert from 'node:assert/strict'
import { createServer } from 'vite'

import {
  applyOperationsToTemplate,
  buildDocumentContext,
  buildSignatureExportHtml,
} from '../netlify/functions/_ai-utils.mjs'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })

try {
  const defaults = await server.ssrLoadModule('/src/lib/studio-defaults.ts')
  const fieldMapHelpers = await server.ssrLoadModule('/src/lib/studio-field-map.ts')
  const migrations = await server.ssrLoadModule('/src/lib/studio-migrations.ts')
  const resume = defaults.getDefaultResumeState().templates.find((template) => template.id === 'unb')
  const coverLetter = defaults.getDefaultCoverLetterState().templates.find((template) => template.id === 'unb')
  const signature = defaults.getDefaultSignatureState().templates.find((template) => template.id === 'unb')
  const queensResume = defaults.getDefaultResumeState().templates.find((template) => template.id === 'queens')
  const queensCoverLetter = defaults.getDefaultCoverLetterState().templates.find((template) => template.id === 'queens')
  const queensSignature = defaults.getDefaultSignatureState().templates.find((template) => template.id === 'queens')

  assert.ok(resume, 'UNB resume template is available')
  assert.ok(coverLetter, 'UNB cover letter template is available')
  assert.ok(signature, 'UNB signature template is available')
  assert.ok(queensResume, "Queen's resume template is available")
  assert.ok(queensCoverLetter, "Queen's cover-letter template is available")
  assert.ok(queensSignature, "Queen's signature template is available")

  const resumeContext = buildDocumentContext('resume', resume)
  const coverLetterContext = buildDocumentContext('cover-letter', coverLetter)
  const signatureContext = buildDocumentContext('email-signature', signature)
  const resumeUiFieldMap = fieldMapHelpers.buildStudioFieldMap('resume', resume)
  const coverLetterUiFieldMap = fieldMapHelpers.buildStudioFieldMap('cover-letter', coverLetter)
  const signatureUiFieldMap = fieldMapHelpers.buildStudioFieldMap('email-signature', signature)
  const sortValues = (values) => [...values].sort((a, b) => a.localeCompare(b))
  const firstExperienceGroupId = resumeContext.snapshot.experience.groups[0].id
  const firstLeadershipGroupId = resumeContext.snapshot.leadership[0].id
  const firstCertificationAreaId = resumeContext.snapshot.certifications.areas[0].id
  const firstNestedExperienceItemId = resumeContext.snapshot.experience.groups[0].items[0].id

  assert.ok(
    resumeContext.collectionMap.has('data.experience.groups'),
    'resume automation exposes additional-experience group collection',
  )
  assert.ok(
    resumeContext.collectionMap.has('data.leadership'),
    'resume automation exposes community group collection',
  )
  assert.ok(
    resumeContext.fieldMap.has(`data.leadership.${firstLeadershipGroupId}.columns`),
    'resume automation exposes optional community grid columns',
  )
  assert.ok(
    signatureContext.fieldMap.has('data.certificationLogos'),
    'signature automation exposes certification logos',
  )
  assert.ok(
    signatureContext.fieldMap.has('data.affiliationLines'),
    'signature automation exposes structured affiliation lines',
  )
  assert.ok(
    !signatureContext.fieldMap.has('data.organization'),
    'signature automation hides legacy organization fallback',
  )
  assert.deepEqual(
    sortValues(resumeUiFieldMap.fields.map((field) => field.fieldId)),
    sortValues(resumeContext.fields.map((field) => field.fieldId)),
    'studio resume AI field map matches automation field IDs',
  )
  assert.deepEqual(
    sortValues(resumeUiFieldMap.collections.map((collection) => collection.collectionId)),
    sortValues(resumeContext.collections.map((collection) => collection.collectionId)),
    'studio resume AI collection map matches automation collection IDs',
  )
  assert.deepEqual(
    sortValues(coverLetterUiFieldMap.fields.map((field) => field.fieldId)),
    sortValues(coverLetterContext.fields.map((field) => field.fieldId)),
    'studio cover-letter AI field map matches automation field IDs',
  )
  assert.equal(
    coverLetterContext.snapshot.config.contextNote,
    'University of New Brunswick · Bachelor of Business Administration in Finance; Class of 2020',
    'UNB cover-letter context note carries the full credential and class year',
  )
  assert.equal(
    queensCoverLetter.config.tagline,
    'Master of Finance Candidate, 2026-2027',
    "Queen's cover-letter header matches the current Queen's resume credential year",
  )
  assert.ok(
    queensResume.data.education.some(
      (entry) => entry.school === "Queen's University" && entry.date === '2026-2027',
    ),
    "Queen's resume carries the current MFin 2026-2027 education entry",
  )
  assert.deepEqual(
    sortValues(signatureUiFieldMap.fields.map((field) => field.fieldId)),
    sortValues(signatureContext.fields.map((field) => field.fieldId)),
    'studio signature AI field map matches automation field IDs',
  )

  const resumeResult = applyOperationsToTemplate('resume', resume, [
    {
      op: 'createEntry',
      collectionId: 'data.experience.groups',
      value: {
        id: 'experience-group-test',
        title: 'Selected Transaction Experience',
        layout: 'grid',
        columns: 3,
        items: [
          {
            id: 'experience-test-item',
            role: 'Deal Team Analyst',
            company: 'Test Company',
            location: 'Toronto, ON',
            date: '2026',
            bullets: ['Built a tested automation draft path.'],
            skills: ['Automation'],
            logoSrc: 'bmo',
          },
        ],
      },
    },
    {
      op: 'deleteEntry',
      collectionId: `data.experience.groups.${firstExperienceGroupId}.items`,
      entryId: firstNestedExperienceItemId,
    },
    {
      op: 'replaceField',
      fieldId: `data.leadership.${firstLeadershipGroupId}.layout`,
      value: 'grid',
    },
    {
      op: 'replaceField',
      fieldId: `data.leadership.${firstLeadershipGroupId}.columns`,
      value: 3,
    },
    {
      op: 'replaceField',
      fieldId: `data.certifications.areas.${firstCertificationAreaId}.column`,
      value: 'right',
    },
  ])

  assert.equal(resumeResult.diff.length, 5, 'resume operation diff records every automation change')
  assert.equal(
    resumeResult.diff[0].after?.id,
    'experience-group-test',
    'created resume group is present in diff after snapshot',
  )
  assert.equal(
    resumeResult.diff[1].before?.id,
    firstNestedExperienceItemId,
    'deleted nested resume entry is present in diff before snapshot',
  )
  assert.equal(resumeResult.diff[2].after, 'grid', 'community layout metadata is replaceable')
  assert.equal(resumeResult.diff[3].after, 3, 'optional community columns metadata is replaceable')
  assert.equal(resumeResult.diff[4].after, 'right', 'certification area column metadata is replaceable')

  const signatureResult = applyOperationsToTemplate('email-signature', signature, [
    {
      op: 'replaceField',
      fieldId: 'data.certificationLogos',
      value: ['bloomberg', 'cfa', 'bloomberg', 'bmo'],
    },
    {
      op: 'replaceField',
      fieldId: 'data.logoTone',
      value: 'monochrome',
    },
    {
      op: 'replaceField',
      fieldId: 'data.affiliationLines',
      value: ['University of New Brunswick', 'Finance Graduate, 2020'],
    },
  ])

  assert.deepEqual(
    signatureResult.template.data.certificationLogos.map((logo) => logo.src),
    ['bloomberg', 'cfa'],
    'signature certification logos de-duplicate and reject non-certification logos',
  )
  assert.equal(signatureResult.template.data.logoTone, 'monochrome', 'signature logo tone is replaceable')
  assert.deepEqual(
    signatureResult.template.data.affiliationLines,
    ['University of New Brunswick', 'Finance Graduate, 2020'],
    'signature affiliation lines are replaceable as structured text',
  )

  assert.throws(
    () =>
      applyOperationsToTemplate('email-signature', signature, [
        { op: 'addListItem', fieldId: 'data.certificationLogos', value: 'bmo' },
      ]),
    /Logo is not allowed for data\.certificationLogos/u,
    'signature automation rejects non-certification logo additions',
  )

  const signatureHtml = buildSignatureExportHtml('https://finchat.ca', {
    ...signatureResult.template,
    data: {
      ...signatureResult.template.data,
      experienceLogos: [],
      educationLogos: [],
    },
  })
  assert.ok(
    signatureHtml.includes('https://finchat.ca/ai-assets/logos/mono/bloomberg.png'),
    'signature HTML export uses live monochrome certification asset URLs',
  )
  assert.ok(
    !signatureHtml.includes('https://finchat.ca/ai-assets/logos/mono/bmo.png'),
    'signature HTML export does not leak rejected certification logo URLs',
  )

  const queensSignatureHtml = buildSignatureExportHtml('https://finchat.ca', queensSignature)
  assert.deepEqual(
    queensSignature.data.affiliationLines,
    ["Queen's University - Smith School of Business", 'Master of Finance Candidate, 2026-2027'],
    "Queen's signature default stores institution and school on one line, then role on the next",
  )
  assert.ok(
    queensSignatureHtml.includes('Queen&#39;s University - Smith School of Business'),
    "Queen's signature export groups university and school on one line",
  )
  assert.ok(
    queensSignatureHtml.includes('Master of Finance Candidate, 2026-2027'),
    "Queen's signature export renders the candidate role on its own line",
  )
  assert.ok(
    !queensSignatureHtml.includes(
      'Queen&#39;s University - Smith School of Business; Master of Finance Candidate, 2026-2027',
    ),
    "Queen's signature export no longer compresses the institution, school, and role into one line",
  )
  assert.ok(
    !queensSignatureHtml.includes('Queen&#39;s University · Smith School of Business'),
    "Queen's signature export no longer relies on the old merged institution string",
  )

  const legacyQueensCoverLetterState = {
    selectedId: 'queens',
    templates: defaults.getDefaultCoverLetterState().templates.map((template) =>
      template.id === 'queens'
        ? {
            ...template,
            config: {
              ...template.config,
              tagline: 'Master of Finance Candidate, 2027',
            },
          }
        : template,
    ),
  }
  const migratedQueensCoverLetter = migrations.migrateCoverLetterState(legacyQueensCoverLetterState)
  assert.equal(
    migratedQueensCoverLetter.state.templates.find((template) => template.id === 'queens')?.config.tagline,
    'Master of Finance Candidate, 2026-2027',
    "Queen's cover-letter migration upgrades the old 2027-only candidate line",
  )

  const legacyQueensSignatureState = {
    selectedId: 'queens',
    templates: defaults.getDefaultSignatureState().templates.map((template) =>
      template.id === 'queens'
        ? {
            ...template,
            data: {
              ...template.data,
              affiliationLines: [
                "Queen's University - Smith School of Business",
                'Master of Finance Candidate, 2027',
              ],
            },
          }
        : template,
    ),
  }
  const migratedQueensSignature = migrations.migrateSignatureState(legacyQueensSignatureState)
  assert.deepEqual(
    migratedQueensSignature.state.templates.find((template) => template.id === 'queens')?.data.affiliationLines,
    ["Queen's University - Smith School of Business", 'Master of Finance Candidate, 2026-2027'],
    "Queen's signature migration upgrades the old 2027-only candidate line",
  )

  console.log(
    JSON.stringify(
      {
        ok: true,
        resumeDiffCount: resumeResult.diff.length,
        signatureCertificationLogos: signatureResult.template.data.certificationLogos.map((logo) => logo.src),
        signatureLogoTone: signatureResult.template.data.logoTone,
        signatureAffiliationLines: signatureResult.template.data.affiliationLines,
        queensSignatureAffiliation: queensSignature.data.affiliationLines,
        queensCoverLetterTagline: queensCoverLetter.config.tagline,
      },
      null,
      2,
    ),
  )
} finally {
  await server.close()
}
