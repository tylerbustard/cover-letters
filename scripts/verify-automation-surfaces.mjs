import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

import {
  applyOperationsToTemplate,
  buildDocumentContext,
  buildSignatureExportHtml,
} from '../netlify/functions/_ai-utils.mjs'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })

const closeServer = async (server) => {
  server.httpServer?.closeAllConnections?.()
  server.httpServer?.closeIdleConnections?.()
  await Promise.race([
    server.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ])
}

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
  const mcgillResume = defaults.getDefaultResumeState().templates.find((template) => template.id === 'mcgill')
  const mcgillCoverLetter = defaults.getDefaultCoverLetterState().templates.find((template) => template.id === 'mcgill')
  const mcgillSignature = defaults.getDefaultSignatureState().templates.find((template) => template.id === 'mcgill')

  assert.ok(resume, 'UNB resume template is available')
  assert.ok(coverLetter, 'UNB cover letter template is available')
  assert.ok(signature, 'UNB signature template is available')
  assert.ok(queensResume, "Queen's resume template is available")
  assert.ok(queensCoverLetter, "Queen's cover-letter template is available")
  assert.ok(queensSignature, "Queen's signature template is available")
  assert.ok(mcgillResume, 'McGill resume template is available')
  assert.ok(mcgillCoverLetter, 'McGill cover-letter template is available')
  assert.ok(mcgillSignature, 'McGill signature template is available')

  const resumeContext = buildDocumentContext('resume', resume)
  const coverLetterContext = buildDocumentContext('cover-letter', coverLetter)
  const signatureContext = buildDocumentContext('email-signature', signature)
  const resumeUiFieldMap = fieldMapHelpers.buildStudioFieldMap('resume', resume)
  const coverLetterUiFieldMap = fieldMapHelpers.buildStudioFieldMap('cover-letter', coverLetter)
  const signatureUiFieldMap = fieldMapHelpers.buildStudioFieldMap('email-signature', signature)
  const sortValues = (values) => [...values].sort((a, b) => a.localeCompare(b))
  const findTemplate = (state, id) => state.templates.find((template) => template.id === id)
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
  assert.deepEqual(
    sortValues(signatureContext.fieldMap.get('data.experienceLogos')?.assetOptions?.map((option) => option.value) ?? []),
    sortValues(['73strings', 'roi', 'bmo', 'td', 'rbc', 'grant-thornton', 'irving']),
    'signature automation only exposes chronological experience logo options',
  )
  assert.deepEqual(
    sortValues(signatureContext.fieldMap.get('data.certificationLogos')?.assetOptions?.map((option) => option.value) ?? []),
    sortValues(['bloomberg', 'cfa', 'coursera', 'csi', 'ets', 'training-the-street', 'wall-street-prep']),
    'signature automation only exposes certification logo options',
  )
  assert.deepEqual(
    sortValues(signatureContext.fieldMap.get('data.educationLogos')?.assetOptions?.map((option) => option.value) ?? []),
    sortValues(['unb', 'unb-full']),
    'UNB signature automation only exposes UNB education logo options',
  )
  assert.ok(
    !signatureContext.fieldMap.has('data.organization'),
    'signature automation hides legacy organization fallback',
  )
  assert.equal(signature.data.signoff, 'Sincerely', 'UNB signature default signoff is Sincerely')
  assert.equal(queensSignature.data.signoff, 'Sincerely', "Queen's signature default signoff is Sincerely")
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
    coverLetterContext.snapshot.config.credentialName,
    'University of New Brunswick',
    'UNB cover-letter header exposes the selected education name',
  )
  assert.equal(
    coverLetterContext.snapshot.config.credentialDetail,
    'Bachelor of Business Administration in Finance; Class of 2020',
    'UNB cover-letter header exposes the selected degree detail',
  )
  assert.ok(
    coverLetterContext.fieldMap.has('config.credentialName'),
    'cover-letter automation exposes the education line field',
  )
  assert.ok(
    coverLetterContext.fieldMap.has('config.credentialDetail'),
    'cover-letter automation exposes the degree line field',
  )
  assert.ok(
    coverLetterContext.fieldMap.has('config.credentialLogoSrc'),
    'cover-letter automation exposes the education logo field',
  )
  assert.equal(
    queensCoverLetter.config.tagline,
    queensResume.data.header.title,
    "Queen's cover-letter header title matches the resume masthead title",
  )
  assert.equal(
    queensCoverLetter.config.credentialName,
    "Queen's University - Smith School of Business",
    "Queen's cover-letter header carries the full school line",
  )
  assert.equal(
    queensCoverLetter.config.credentialDetail,
    'Master of Finance Candidate, 2026-2027',
    "Queen's cover-letter header carries the MFin candidate line",
  )
  assert.ok(
    queensResume.data.education.some(
      (entry) => entry.school === "Queen's University" && entry.date === '2026-2027',
    ),
    "Queen's resume carries the current MFin 2026-2027 education entry",
  )
  assert.equal(
    mcgillResume.data.header.title,
    'MBA Candidate, 2026-2027',
    'McGill resume masthead uses MBA candidate title',
  )
  assert.equal(
    mcgillResume.data.header.contact.email,
    'tyler@tylerbustard.net',
    'McGill resume uses the .net email identity',
  )
  assert.equal(
    mcgillResume.data.header.contact.website,
    'tylerbustard.net',
    'McGill resume uses the .net website identity',
  )
  assert.deepEqual(
    mcgillResume.data.education.map((entry) => entry.school),
    ['McGill University', 'University of New Brunswick'],
    'McGill resume education includes McGill and UNB only',
  )
  assert.equal(
    mcgillResume.data.education[0].degree,
    'Master of Business Administration Candidate',
    'McGill resume education uses MBA candidate degree',
  )
  assert.ok(
    mcgillResume.data.education[0].bullets.some((bullet) => bullet.includes('award amount not yet confirmed')),
    'McGill resume uses conservative scholarship wording',
  )
  assert.ok(
    !JSON.stringify(mcgillResume).includes('$13,000') &&
      !JSON.stringify(mcgillResume).includes('Master of Management in Finance') &&
      !JSON.stringify(mcgillResume).includes('Desautels Capital Management') &&
      !JSON.stringify(mcgillResume).includes('Northeast Christian College'),
    'McGill resume excludes old MMF, DCM, scholarship-dollar, and NCC claims',
  )
  assert.equal(
    mcgillCoverLetter.config.credentialDetail,
    'Master of Business Administration Candidate, 2026-2027',
    'McGill cover-letter header uses MBA 2026-2027 detail',
  )
  assert.equal(
    mcgillCoverLetter.data.yourEmail,
    'tyler@tylerbustard.net',
    'McGill cover-letter uses the .net email identity',
  )
  assert.deepEqual(
    mcgillSignature.data.affiliationLines,
    [
      'McGill University - Desautels Faculty of Management',
      'Master of Business Administration Candidate, 2026-2027',
    ],
    'McGill signature stores school and MBA role on separate rows',
  )
  assert.equal(
    mcgillSignature.data.email,
    'tyler@tylerbustard.net',
    'McGill signature uses the .net email identity',
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

  const signatureExperienceReplaceResult = applyOperationsToTemplate('email-signature', signature, [
    {
      op: 'replaceField',
      fieldId: 'data.experienceLogos',
      value: ['grant-thornton', 'rbc', '73strings', 'irving', 'td', 'bmo', 'roi'],
    },
  ])
  assert.deepEqual(
    signatureExperienceReplaceResult.template.data.experienceLogos.map((logo) => logo.src),
    ['73strings', 'roi', 'bmo', 'td', 'rbc', 'grant-thornton', 'irving'],
    'signature automation replaceField stores experience logos newest-to-oldest',
  )

  const signatureExperienceAddResult = applyOperationsToTemplate('email-signature', {
    ...signature,
    data: {
      ...signature.data,
      experienceLogos: [],
    },
  }, [
    { op: 'addListItem', fieldId: 'data.experienceLogos', value: 'grant-thornton' },
    { op: 'addListItem', fieldId: 'data.experienceLogos', value: '73strings' },
    { op: 'addListItem', fieldId: 'data.experienceLogos', value: 'rbc' },
  ])
  assert.deepEqual(
    signatureExperienceAddResult.template.data.experienceLogos.map((logo) => logo.src),
    ['73strings', 'rbc', 'grant-thornton'],
    'signature automation addListItem stores experience logos newest-to-oldest',
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

  // Guard against drift between the server export (_ai-utils.mjs) and the client
  // copy-HTML builder (src/lib/signature-html.ts): the affiliation rows must use
  // identical font-weight/color treatment in both outputs.
  const clientSignatureLib = await server.ssrLoadModule('/src/lib/signature-html.ts')
  const signatureLogoGroups = await server.ssrLoadModule('/src/lib/signature-logo-groups.ts')
  const assetsModule = await server.ssrLoadModule('/src/data/assets.ts')
  const { assets } = assetsModule
  const indexCss = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  const clientQueensSignatureHtml = clientSignatureLib.buildSignatureHtmlFragment(queensSignature)
  assert.equal(
    clientSignatureLib.buildSignaturePlainText(signature).split('\n')[0],
    'Sincerely',
    'client signature plain text starts with Sincerely',
  )
  assert.ok(
    clientQueensSignatureHtml.includes(
      "font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12px;",
    ),
    'client signature copy HTML renders the signoff in Aptos at 12px',
  )
  assert.ok(
    clientQueensSignatureHtml.includes('Sincerely'),
    'client signature copy HTML uses Sincerely',
  )
  assert.ok(
    !clientQueensSignatureHtml.includes('Best regards'),
    'client signature copy HTML does not use the old Best regards signoff',
  )
  assert.ok(
    queensSignatureHtml.includes(
      "font-family:'Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12px;",
    ),
    'server signature export renders the signoff in Aptos at 12px',
  )
  assert.ok(queensSignatureHtml.includes('Sincerely'), 'server signature export uses Sincerely')
  assert.ok(
    !queensSignatureHtml.includes('Best regards'),
    'server signature export does not use the old Best regards signoff',
  )
  assert.ok(
    indexCss.includes("font-family: 'Aptos', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;") &&
      indexCss.includes('font-size: 12px;'),
    'signature preview signoff CSS uses Aptos at 12px',
  )
  assert.ok(
    clientQueensSignatureHtml.includes('https://finchat.ca/ai-assets/profile-tyler.png'),
    'client signature copy HTML uses the live FinChat profile image URL',
  )
  assert.ok(
    clientQueensSignatureHtml.includes('https://finchat.ca/ai-assets/icons/mail.png'),
    'client signature copy HTML uses live FinChat contact icon URLs',
  )
  assert.ok(
    queensSignatureHtml.includes('https://finchat.ca/ai-assets/profile-tyler.png'),
    'server signature export uses the live FinChat profile image URL',
  )
  assert.ok(
    queensSignatureHtml.includes('https://finchat.ca/ai-assets/icons/mail.png') &&
      queensSignatureHtml.includes('https://finchat.ca/ai-assets/icons/phone.png') &&
      queensSignatureHtml.includes('https://finchat.ca/ai-assets/icons/globe.png') &&
      queensSignatureHtml.includes('https://finchat.ca/ai-assets/icons/map-pin.png'),
    'server signature export uses live FinChat contact icon URLs',
  )
  assert.ok(
    !clientQueensSignatureHtml.includes('https://tylerbustard.com/ai-assets/'),
    'client signature copy HTML does not use stale tylerbustard.com asset URLs',
  )
  assert.ok(
    !queensSignatureHtml.includes('https://tylerbustard.com/ai-assets/'),
    'server signature export does not use stale tylerbustard.com asset URLs',
  )
  assert.deepEqual(
    signatureLogoGroups.getSignatureExperienceLogoOptions().map((option) => option.label),
    ['73 Strings', 'ROI', 'BMO', 'TD', 'RBC', 'Grant Thornton', 'Irving Oil'],
    'signature experience logo options are shown newest-to-oldest',
  )
  assert.deepEqual(
    signatureLogoGroups.getSignatureEducationLogoOptions('unb').map((option) => option.label),
    ['UNB', 'UNB Full'],
    'UNB signature education options include both UNB logo variants',
  )

  const shuffledExperienceLogos = [
    { src: assets.logoGrantThornton, alt: 'Grant Thornton' },
    { src: assets.logoRbc, alt: 'Royal Bank of Canada' },
    { src: assets.logo73Strings, alt: '73 Strings' },
    { src: assets.logoIrving, alt: 'Irving Oil' },
    { src: assets.logoTd, alt: 'TD Bank' },
    { src: assets.logoBmo, alt: 'BMO' },
    { src: assets.logoRoi, alt: 'ROI' },
  ]
  assert.deepEqual(
    signatureLogoGroups
      .normalizeSignatureLogos(shuffledExperienceLogos, signatureLogoGroups.SIGNATURE_EXPERIENCE_LOGO_VALUES)
      .map((logo) => logo.alt),
    ['73 Strings', 'ROI', 'BMO', 'TD', 'RBC', 'Grant Thornton', 'Irving Oil'],
    'signature experience logos normalize to chronological newest-to-oldest order',
  )

  const clientUnbLogoHtml = clientSignatureLib.buildSignatureHtmlFragment({
    ...signature,
    data: {
      ...signature.data,
      educationLogos: [{ src: assets.logoUnb, alt: 'UNB' }],
    },
  })
  assert.ok(
    clientUnbLogoHtml.includes('https://finchat.ca/ai-assets/logos/unb.png'),
    'client signature copy HTML renders the selected UNB logo',
  )

  const serverUnbLogoHtml = buildSignatureExportHtml('https://finchat.ca', {
    ...signature,
    data: {
      ...signature.data,
      educationLogos: [{ src: 'unb', alt: 'UNB' }],
    },
  })
  assert.ok(
    serverUnbLogoHtml.includes('https://finchat.ca/ai-assets/logos/unb.png'),
    'server signature export renders the selected UNB logo',
  )

  const serverShuffledExperienceHtml = buildSignatureExportHtml('https://finchat.ca', {
    ...signature,
    data: {
      ...signature.data,
      experienceLogos: [
        { src: 'grant-thornton', alt: 'Grant Thornton' },
        { src: 'rbc', alt: 'Royal Bank of Canada' },
        { src: '73strings', alt: '73 Strings' },
        { src: 'irving', alt: 'Irving Oil' },
        { src: 'td', alt: 'TD Bank' },
        { src: 'bmo', alt: 'BMO' },
        { src: 'roi', alt: 'ROI' },
      ],
      educationLogos: [],
      certificationLogos: [],
    },
  })
  const chronologicalServerExperienceOrder = [
    '73strings',
    'roi',
    'bmo',
    'td',
    'rbc',
    'grant-thornton',
    'irving',
  ].map((token) => serverShuffledExperienceHtml.indexOf(`/ai-assets/logos/${token}.png`))
  assert.ok(
    chronologicalServerExperienceOrder.every((index) => index >= 0),
    'server signature export includes every selected experience logo',
  )
  assert.deepEqual(
    chronologicalServerExperienceOrder,
    [...chronologicalServerExperienceOrder].sort((a, b) => a - b),
    'server signature export renders experience logos newest-to-oldest',
  )
  const extractAffiliationRowStyles = (html) =>
    [...html.matchAll(/font-weight:(\d+);letter-spacing:0;color:(#[0-9a-f]{6});?"?\s*>\s*([^<]+)</giu)]
      .map((match) => ({
        weight: match[1],
        color: match[2].toLowerCase(),
        text: match[3].trim(),
      }))
      .filter((row) => row.text.includes('Queen') || row.text.includes('Candidate'))
  const serverAffiliationStyles = extractAffiliationRowStyles(queensSignatureHtml)
  const clientAffiliationStyles = extractAffiliationRowStyles(clientQueensSignatureHtml)
  assert.ok(
    serverAffiliationStyles.length >= 2,
    'server signature export exposes styled affiliation rows',
  )
  assert.deepEqual(
    serverAffiliationStyles,
    clientAffiliationStyles,
    'server signature export affiliation styling matches the client copy-HTML builder',
  )

  const queensResumeContactState = {
    selectedId: 'queens',
    templates: defaults.getDefaultResumeState().templates.map((template) =>
      template.id === 'queens'
        ? {
            ...template,
            data: {
              ...template.data,
              header: {
                ...template.data.header,
                contact: {
                  ...template.data.header.contact,
                  email: 'tyler.bustard@queensu.ca',
                  website: 'queensu.ca',
                },
              },
            },
          }
        : template,
    ),
  }
  const migratedQueensResumeContact = findTemplate(
    migrations.migrateResumeState(queensResumeContactState).state,
    'queens',
  )
  assert.equal(
    migratedQueensResumeContact?.data.header.contact.email,
    'tyler.bustard@queensu.ca',
    "Queen's resume migration preserves the Queen's .ca email domain",
  )
  assert.equal(
    migratedQueensResumeContact?.data.header.contact.website,
    'queensu.ca',
    "Queen's resume migration preserves .ca websites",
  )

  const legacyQueensCoverLetterState = {
    selectedId: 'queens',
    templates: defaults.getDefaultCoverLetterState().templates.map((template) => {
      if (template.id !== 'queens') return template

      const legacyConfig = {
        ...template.config,
        tagline: 'Master of Finance Candidate, 2027',
      }
      delete legacyConfig.credentialName
      delete legacyConfig.credentialDetail
      delete legacyConfig.credentialLogoSrc
      delete legacyConfig.credentialLogoAlt

      return {
        ...template,
        config: legacyConfig,
        data: {
          ...template.data,
          yourEmail: 'tyler.bustard@queensu.ca',
          yourWebsite: 'queensu.ca',
        },
      }
    }),
  }
  const migratedQueensCoverLetter = migrations.migrateCoverLetterState(legacyQueensCoverLetterState)
  assert.equal(
    migratedQueensCoverLetter.state.templates.find((template) => template.id === 'queens')?.config.tagline,
    'Finance & Technology',
    "Queen's cover-letter migration resets old MFin candidate lines to the resume masthead title",
  )
  assert.equal(
    findTemplate(migratedQueensCoverLetter.state, 'queens')?.config.credentialName,
    "Queen's University - Smith School of Business",
    "Queen's cover-letter migration restores the education header line",
  )
  assert.equal(
    findTemplate(migratedQueensCoverLetter.state, 'queens')?.config.credentialDetail,
    'Master of Finance Candidate, 2026-2027',
    "Queen's cover-letter migration restores the degree header line",
  )
  assert.equal(
    findTemplate(migratedQueensCoverLetter.state, 'queens')?.data.yourEmail,
    'tyler.bustard@queensu.ca',
    "Queen's cover-letter migration preserves the Queen's .ca email domain",
  )
  assert.equal(
    findTemplate(migratedQueensCoverLetter.state, 'queens')?.data.yourWebsite,
    'queensu.ca',
    "Queen's cover-letter migration preserves .ca websites",
  )

  const staleCoverLetterCredentialState = {
    selectedId: 'unb',
    templates: defaults.getDefaultCoverLetterState().templates.map((template) =>
      template.id === 'unb'
        ? {
            ...template,
            config: {
              ...template.config,
              credentialName: "Queen's University - Smith School of Business",
              credentialDetail: 'Master of Finance Candidate, 2026-2027',
              credentialLogoSrc: queensCoverLetter.config.credentialLogoSrc,
              credentialLogoAlt: "Queen's University",
            },
          }
        : template,
    ),
  }
  const migratedStaleCoverLetterCredential = findTemplate(
    migrations.migrateCoverLetterState(staleCoverLetterCredentialState).state,
    'unb',
  )
  assert.equal(
    migratedStaleCoverLetterCredential?.config.credentialName,
    'University of New Brunswick',
    'cover-letter migration restores the education line for the selected UNB degree preset',
  )
  assert.equal(
    migratedStaleCoverLetterCredential?.config.credentialDetail,
    'Bachelor of Business Administration in Finance; Class of 2020',
    'cover-letter migration restores the degree line for the selected UNB degree preset',
  )
  assert.equal(
    migratedStaleCoverLetterCredential?.config.credentialLogoSrc,
    coverLetter.config.credentialLogoSrc,
    'cover-letter migration restores the education logo for the selected UNB degree preset',
  )
  assert.equal(
    migratedStaleCoverLetterCredential?.config.credentialLogoAlt,
    'University of New Brunswick',
    'cover-letter migration restores the education logo alt for the selected UNB degree preset',
  )

  const blankCoverLetterCredentialState = {
    selectedId: 'mcgill',
    templates: defaults.getDefaultCoverLetterState().templates.map((template) =>
      template.id === 'mcgill'
        ? {
            ...template,
            config: {
              ...template.config,
              credentialName: '',
              credentialDetail: '',
              credentialLogoSrc: '',
              credentialLogoAlt: '',
            },
          }
        : template,
    ),
  }
  const migratedBlankCoverLetterCredential = findTemplate(
    migrations.migrateCoverLetterState(blankCoverLetterCredentialState).state,
    'mcgill',
  )
  assert.equal(
    migratedBlankCoverLetterCredential?.config.credentialName,
    'McGill University - Desautels Faculty of Management',
    'cover-letter migration restores blank education lines for the selected McGill degree preset',
  )
  assert.equal(
    migratedBlankCoverLetterCredential?.config.credentialDetail,
    'Master of Business Administration Candidate, 2026-2027',
    'cover-letter migration restores blank degree lines for the selected McGill degree preset',
  )
  assert.equal(
    migratedBlankCoverLetterCredential?.config.credentialLogoAlt,
    'McGill University',
    'cover-letter migration restores blank education logo labels for the selected McGill degree preset',
  )

  const legacyMcGillResumeState = {
    selectedId: 'mcgill',
    templates: defaults.getDefaultResumeState().templates.map((template) =>
      template.id === 'mcgill'
        ? {
            ...template,
            data: {
              ...template.data,
              header: {
                ...template.data.header,
                title: 'Finance & Technology',
                contact: {
                  ...template.data.header.contact,
                  email: 'tyler@tylerbustard.com',
                  website: 'tylerbustard.com',
                },
              },
              education: [
                {
                  ...template.data.education[0],
                  degree: 'Master of Management in Finance Candidate',
                  date: '2025-2027',
                  bullets: [
                    'Head of Risk Management for the Desautels Capital Management Fund and Chief Sustainability Officer for the SRI fund.',
                    'Recipient of two scholarships recognizing academic performance and leadership, totaling $13,000.',
                  ],
                },
                ...template.data.education.slice(1),
                {
                  id: 'education-northeast-christian-college',
                  degree: 'Theology Program',
                  program: 'Fredericton, NB',
                  school: 'Northeast Christian College',
                  date: '2014-2015',
                  bullets: ['Legacy NCC entry'],
                  logoSrc: 'ncc',
                  logoAlt: 'Northeast Christian College',
                },
              ],
            },
          }
        : template,
    ),
  }
  const migratedMcGillResume = findTemplate(
    migrations.migrateResumeState(legacyMcGillResumeState).state,
    'mcgill',
  )
  assert.equal(
    migratedMcGillResume?.data.header.contact.email,
    'tyler@tylerbustard.net',
    'McGill resume migration repairs old .com email identity',
  )
  assert.deepEqual(
    migratedMcGillResume?.data.education.map((entry) => entry.school),
    ['McGill University', 'University of New Brunswick'],
    'McGill resume migration removes legacy NCC entry',
  )
  assert.ok(
    !JSON.stringify(migratedMcGillResume).includes('$13,000') &&
      !JSON.stringify(migratedMcGillResume).includes('Master of Management in Finance') &&
      !JSON.stringify(migratedMcGillResume).includes('Desautels Capital Management'),
    'McGill resume migration removes old MMF, DCM, and scholarship-dollar claims',
  )

  const editedQueensResumeTitle = 'UI E2E Title Probe'
  const editedQueensResumeState = migrations.migrateResumeState({
    selectedId: 'queens',
    templates: defaults.getDefaultResumeState().templates.map((template) =>
      template.id === 'queens'
        ? {
            ...template,
            data: {
              ...template.data,
              header: {
                ...template.data.header,
                title: editedQueensResumeTitle,
              },
            },
          }
        : template,
    ),
  }).state
  const remigratedEditedQueensResume = findTemplate(
    migrations.migrateResumeState(editedQueensResumeState).state,
    'queens',
  )
  assert.equal(
    remigratedEditedQueensResume?.data.header.title,
    editedQueensResumeTitle,
    'resume migration preserves a custom edited title on a second migration pass',
  )

  const queensSignatureContactState = {
    selectedId: 'queens',
    templates: defaults.getDefaultSignatureState().templates.map((template) =>
      template.id === 'queens'
        ? {
            ...template,
            data: {
              ...template.data,
              email: 'tyler.bustard@queensu.ca',
              website: 'queensu.ca',
            },
          }
        : template,
    ),
  }
  const migratedQueensSignatureContact = findTemplate(
    migrations.migrateSignatureState(queensSignatureContactState).state,
    'queens',
  )
  assert.equal(
    migratedQueensSignatureContact?.data.email,
    'tyler.bustard@queensu.ca',
    "Queen's signature migration preserves the Queen's .ca email domain",
  )
  assert.equal(
    migratedQueensSignatureContact?.data.website,
    'queensu.ca',
    "Queen's signature migration preserves .ca websites",
  )

  const queensSignatureContactTypoState = {
    selectedId: 'queens',
    templates: defaults.getDefaultSignatureState().templates.map((template) =>
      template.id === 'queens'
        ? {
            ...template,
            data: {
              ...template.data,
              email: 'tyler.bustard@queensu.com',
              website: 'queensu.com',
            },
          }
        : template,
    ),
  }
  const migratedQueensSignatureContactTypo = findTemplate(
    migrations.migrateSignatureState(queensSignatureContactTypoState).state,
    'queens',
  )
  assert.equal(
    migratedQueensSignatureContactTypo?.data.email,
    'tyler.bustard@queensu.ca',
    "Queen's signature migration repairs the invalid queensu.com email typo",
  )
  assert.equal(
    migratedQueensSignatureContactTypo?.data.website,
    'queensu.ca',
    "Queen's signature migration repairs the invalid queensu.com website typo",
  )

  const legacyMcGillSignatureState = {
    selectedId: 'mcgill',
    templates: defaults.getDefaultSignatureState().templates.map((template) =>
      template.id === 'mcgill'
        ? {
            ...template,
            data: {
              ...template.data,
              email: 'tyler@tylerbustard.com',
              website: 'tylerbustard.com',
              role: 'Master of Management in Finance Candidate, 2027',
              organization: 'McGill University · Desautels Faculty of Management',
              affiliationLines: [
                'McGill University - Desautels Faculty of Management',
                'Master of Management in Finance Candidate, 2027',
              ],
            },
          }
        : template,
    ),
  }
  const migratedMcGillSignature = findTemplate(
    migrations.migrateSignatureState(legacyMcGillSignatureState).state,
    'mcgill',
  )
  assert.equal(
    migratedMcGillSignature?.data.email,
    'tyler@tylerbustard.net',
    'McGill signature migration repairs old .com email identity',
  )
  assert.deepEqual(
    migratedMcGillSignature?.data.affiliationLines,
    [
      'McGill University - Desautels Faculty of Management',
      'Master of Business Administration Candidate, 2026-2027',
    ],
    'McGill signature migration upgrades old MMF affiliation lines',
  )

  const legacyQueensSignatureState = {
    selectedId: 'queens',
    templates: defaults.getDefaultSignatureState().templates.map((template) =>
      template.id === 'queens'
        ? {
            ...template,
            data: {
              ...template.data,
              signoff: 'Best regards,',
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
  assert.equal(
    migratedQueensSignature.state.templates.find((template) => template.id === 'queens')?.data.signoff,
    'Sincerely',
    "Queen's signature migration upgrades the old Best regards signoff",
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
        mcgillSignatureAffiliation: mcgillSignature.data.affiliationLines,
        queensCoverLetterTagline: queensCoverLetter.config.tagline,
      },
      null,
      2,
    ),
  )
} finally {
  await closeServer(server)
}
