import { STUDIO_EDIT_SCHEMA } from '@/lib/studio-edit-schema'
import type {
  CoverLetterTemplate,
  DocumentType,
  EmailSignatureTemplate,
  ResumeTemplate,
  StudioEditSchemaFieldTemplate,
} from '@/types'

export interface StudioFieldMapEntry {
  sectionId: string
  sectionLabel: string
  fieldLabel: string
  fieldId: string
  valueType: StudioEditSchemaFieldTemplate['valueType']
  allowedOps: StudioEditSchemaFieldTemplate['allowedOps']
  affectsOutput: boolean
  ownerLabel?: string
}

export interface StudioCollectionMapEntry {
  sectionId: string
  sectionLabel: string
  collectionId: string
  entryType: string
  allowedOps: Array<'createEntry' | 'deleteEntry'>
  itemIds: string[]
  ownerLabel?: string
}

export interface StudioFieldMap {
  fields: StudioFieldMapEntry[]
  collections: StudioCollectionMapEntry[]
}

type EditableTemplate = ResumeTemplate | CoverLetterTemplate | EmailSignatureTemplate

const getDocumentSchema = (documentType: DocumentType) => STUDIO_EDIT_SCHEMA.documents[documentType]

const getSectionLabel = (documentType: DocumentType, sectionId: string) =>
  getDocumentSchema(documentType).sections.find((section) => section.id === sectionId)?.label ?? sectionId

const getFieldTemplate = (
  documentType: DocumentType,
  templateGroup: string,
  key: string,
): StudioEditSchemaFieldTemplate => {
  const fieldTemplate = getDocumentSchema(documentType).fieldTemplates[templateGroup]?.find(
    (field) => field.key === key,
  )

  if (!fieldTemplate) {
    throw new Error(`Missing studio field template: ${documentType}:${templateGroup}.${key}`)
  }

  return fieldTemplate
}

const field = (
  documentType: DocumentType,
  sectionId: string,
  templateGroup: string,
  key: string,
  fieldId: string,
  ownerLabel?: string,
): StudioFieldMapEntry => {
  const fieldTemplate = getFieldTemplate(documentType, templateGroup, key)

  return {
    sectionId,
    sectionLabel: getSectionLabel(documentType, sectionId),
    fieldLabel: fieldTemplate.fieldLabel,
    fieldId,
    valueType: fieldTemplate.valueType,
    allowedOps: fieldTemplate.allowedOps,
    affectsOutput: fieldTemplate.affectsOutput,
    ownerLabel,
  }
}

const collection = (
  documentType: DocumentType,
  sectionId: string,
  collectionId: string,
  entryType: string,
  itemIds: string[],
  ownerLabel?: string,
): StudioCollectionMapEntry => ({
  sectionId,
  sectionLabel: getSectionLabel(documentType, sectionId),
  collectionId,
  entryType,
  allowedOps: ['createEntry', 'deleteEntry'],
  itemIds,
  ownerLabel,
})

const getOwnerLabel = (...parts: Array<unknown>) =>
  parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .find(Boolean)

const buildResumeFieldMap = (template: ResumeTemplate): StudioFieldMap => {
  const fields: StudioFieldMapEntry[] = [
    field('resume', 'header', 'header', 'name', 'data.header.name'),
    field('resume', 'header', 'header', 'title', 'data.header.title'),
    field('resume', 'header', 'header', 'profileSrc', 'data.header.profileSrc'),
    field('resume', 'header', 'header', 'summary', 'data.header.summary'),
    field('resume', 'contact-rail', 'contactRail', 'email', 'data.header.contact.email'),
    field('resume', 'contact-rail', 'contactRail', 'phone', 'data.header.contact.phone'),
    field('resume', 'contact-rail', 'contactRail', 'website', 'data.header.contact.website'),
    field('resume', 'contact-rail', 'contactRail', 'location', 'data.header.contact.location'),
  ]
  const collections: StudioCollectionMapEntry[] = [
    collection('resume', 'education', 'data.education', 'educationEntry', template.data.education.map((entry) => entry.id)),
    collection(
      'resume',
      'primary-experience',
      'data.experience.primary',
      'experienceEntry',
      template.data.experience.primary.map((entry) => entry.id),
    ),
    collection(
      'resume',
      'additional-experience',
      'data.experience.groups',
      'experienceGroup',
      template.data.experience.groups.map((group) => group.id),
    ),
    collection(
      'resume',
      'grouped-certifications',
      'data.certifications.areas',
      'certificationArea',
      template.data.certifications.areas.map((area) => area.id),
    ),
    collection('resume', 'community', 'data.leadership', 'leadershipGroup', template.data.leadership.map((group) => group.id)),
  ]

  for (const entry of template.data.education) {
    const owner = getOwnerLabel(entry.degree, entry.school, entry.id)
    fields.push(
      field('resume', 'education', 'educationEntry', 'degree', `data.education.${entry.id}.degree`, owner),
      field('resume', 'education', 'educationEntry', 'program', `data.education.${entry.id}.program`, owner),
      field('resume', 'education', 'educationEntry', 'school', `data.education.${entry.id}.school`, owner),
      field('resume', 'education', 'educationEntry', 'date', `data.education.${entry.id}.date`, owner),
      field('resume', 'education', 'educationEntry', 'logoSrc', `data.education.${entry.id}.logoSrc`, owner),
      field('resume', 'education', 'educationEntry', 'bullets', `data.education.${entry.id}.bullets`, owner),
    )
  }

  for (const entry of template.data.experience.primary) {
    const owner = getOwnerLabel(entry.role, entry.company, entry.id)
    fields.push(
      field('resume', 'primary-experience', 'experienceEntry', 'role', `data.experience.primary.${entry.id}.role`, owner),
      field('resume', 'primary-experience', 'experienceEntry', 'company', `data.experience.primary.${entry.id}.company`, owner),
      field('resume', 'primary-experience', 'experienceEntry', 'location', `data.experience.primary.${entry.id}.location`, owner),
      field('resume', 'primary-experience', 'experienceEntry', 'date', `data.experience.primary.${entry.id}.date`, owner),
      field('resume', 'primary-experience', 'experienceEntry', 'logoSrc', `data.experience.primary.${entry.id}.logoSrc`, owner),
      field('resume', 'primary-experience', 'experienceEntry', 'bullets', `data.experience.primary.${entry.id}.bullets`, owner),
      field('resume', 'primary-experience', 'experienceEntry', 'skills', `data.experience.primary.${entry.id}.skills`, owner),
    )
  }

  for (const group of template.data.experience.groups) {
    const groupOwner = getOwnerLabel(group.title, group.id)
    fields.push(
      field('resume', 'additional-experience', 'experienceGroup', 'title', `data.experience.groups.${group.id}.title`, groupOwner),
      field('resume', 'additional-experience', 'experienceGroup', 'layout', `data.experience.groups.${group.id}.layout`, groupOwner),
      field('resume', 'additional-experience', 'experienceGroup', 'columns', `data.experience.groups.${group.id}.columns`, groupOwner),
    )
    collections.push(
      collection(
        'resume',
        'additional-experience',
        `data.experience.groups.${group.id}.items`,
        'experienceEntry',
        group.items.map((entry) => entry.id),
        groupOwner,
      ),
    )

    for (const entry of group.items) {
      const owner = getOwnerLabel(entry.role, entry.company, entry.id)
      fields.push(
        field('resume', 'additional-experience', 'experienceEntry', 'role', `data.experience.groups.${group.id}.items.${entry.id}.role`, owner),
        field('resume', 'additional-experience', 'experienceEntry', 'company', `data.experience.groups.${group.id}.items.${entry.id}.company`, owner),
        field('resume', 'additional-experience', 'experienceEntry', 'location', `data.experience.groups.${group.id}.items.${entry.id}.location`, owner),
        field('resume', 'additional-experience', 'experienceEntry', 'date', `data.experience.groups.${group.id}.items.${entry.id}.date`, owner),
        field('resume', 'additional-experience', 'experienceEntry', 'logoSrc', `data.experience.groups.${group.id}.items.${entry.id}.logoSrc`, owner),
        field('resume', 'additional-experience', 'experienceEntry', 'bullets', `data.experience.groups.${group.id}.items.${entry.id}.bullets`, owner),
        field('resume', 'additional-experience', 'experienceEntry', 'skills', `data.experience.groups.${group.id}.items.${entry.id}.skills`, owner),
      )
    }
  }

  for (const area of template.data.certifications.areas) {
    const areaOwner = getOwnerLabel(area.title, area.id)
    fields.push(
      field('resume', 'grouped-certifications', 'certificationArea', 'title', `data.certifications.areas.${area.id}.title`, areaOwner),
      field('resume', 'grouped-certifications', 'certificationArea', 'column', `data.certifications.areas.${area.id}.column`, areaOwner),
      field('resume', 'grouped-certifications', 'certificationArea', 'caption', `data.certifications.areas.${area.id}.caption`, areaOwner),
      field('resume', 'grouped-certifications', 'certificationArea', 'summaryValue', `data.certifications.areas.${area.id}.summaryValue`, areaOwner),
      field('resume', 'grouped-certifications', 'certificationArea', 'summaryLogos', `data.certifications.areas.${area.id}.summaryLogos`, areaOwner),
    )
    collections.push(
      collection(
        'resume',
        'grouped-certifications',
        `data.certifications.areas.${area.id}.items`,
        'certificationItem',
        area.items.map((entry) => entry.id),
        areaOwner,
      ),
    )

    for (const entry of area.items) {
      const owner = getOwnerLabel(entry.name, entry.issuer, entry.id)
      fields.push(
        field('resume', 'grouped-certifications', 'certificationItem', 'name', `data.certifications.areas.${area.id}.items.${entry.id}.name`, owner),
        field('resume', 'grouped-certifications', 'certificationItem', 'issuer', `data.certifications.areas.${area.id}.items.${entry.id}.issuer`, owner),
        field('resume', 'grouped-certifications', 'certificationItem', 'year', `data.certifications.areas.${area.id}.items.${entry.id}.year`, owner),
        field('resume', 'grouped-certifications', 'certificationItem', 'detail', `data.certifications.areas.${area.id}.items.${entry.id}.detail`, owner),
        field('resume', 'grouped-certifications', 'certificationItem', 'logoSrc', `data.certifications.areas.${area.id}.items.${entry.id}.logoSrc`, owner),
        field('resume', 'grouped-certifications', 'certificationItem', 'emphasis', `data.certifications.areas.${area.id}.items.${entry.id}.emphasis`, owner),
      )
    }
  }

  for (const group of template.data.leadership) {
    const groupOwner = getOwnerLabel(group.title, group.id)
    fields.push(
      field('resume', 'community', 'leadershipGroup', 'title', `data.leadership.${group.id}.title`, groupOwner),
      field('resume', 'community', 'leadershipGroup', 'layout', `data.leadership.${group.id}.layout`, groupOwner),
      field('resume', 'community', 'leadershipGroup', 'columns', `data.leadership.${group.id}.columns`, groupOwner),
    )
    collections.push(
      collection(
        'resume',
        'community',
        `data.leadership.${group.id}.items`,
        'leadershipItem',
        group.items.map((entry) => entry.id),
        groupOwner,
      ),
    )

    for (const entry of group.items) {
      const owner = getOwnerLabel(entry.role, entry.organization, entry.id)
      fields.push(
        field('resume', 'community', 'leadershipItem', 'role', `data.leadership.${group.id}.items.${entry.id}.role`, owner),
        field('resume', 'community', 'leadershipItem', 'organization', `data.leadership.${group.id}.items.${entry.id}.organization`, owner),
        field('resume', 'community', 'leadershipItem', 'location', `data.leadership.${group.id}.items.${entry.id}.location`, owner),
        field('resume', 'community', 'leadershipItem', 'date', `data.leadership.${group.id}.items.${entry.id}.date`, owner),
        field('resume', 'community', 'leadershipItem', 'logoSrc', `data.leadership.${group.id}.items.${entry.id}.logoSrc`, owner),
        field('resume', 'community', 'leadershipItem', 'bullets', `data.leadership.${group.id}.items.${entry.id}.bullets`, owner),
        field('resume', 'community', 'leadershipItem', 'skills', `data.leadership.${group.id}.items.${entry.id}.skills`, owner),
      )
    }
  }

  return { fields, collections }
}

const buildCoverLetterFieldMap = (): StudioFieldMap => ({
  fields: [
    field('cover-letter', 'template', 'template', 'presetLabel', 'config.presetLabel'),
    field('cover-letter', 'template', 'template', 'tagline', 'config.tagline'),
    field('cover-letter', 'template', 'template', 'contextNote', 'config.contextNote'),
    field('cover-letter', 'template', 'template', 'credentialName', 'config.credentialName'),
    field('cover-letter', 'template', 'template', 'credentialDetail', 'config.credentialDetail'),
    field('cover-letter', 'template', 'template', 'credentialLogoSrc', 'config.credentialLogoSrc'),
    field('cover-letter', 'template', 'template', 'profileSrc', 'config.profileSrc'),
    field('cover-letter', 'template', 'template', 'signatureSrc', 'config.signatureSrc'),
    field('cover-letter', 'sender', 'sender', 'yourName', 'data.yourName'),
    field('cover-letter', 'sender', 'sender', 'yourEmail', 'data.yourEmail'),
    field('cover-letter', 'sender', 'sender', 'yourPhone', 'data.yourPhone'),
    field('cover-letter', 'sender', 'sender', 'yourWebsite', 'data.yourWebsite'),
    field('cover-letter', 'sender', 'sender', 'yourAddress', 'data.yourAddress'),
    field('cover-letter', 'recipient', 'recipient', 'companyName', 'data.companyName'),
    field('cover-letter', 'recipient', 'recipient', 'position', 'data.position'),
    field('cover-letter', 'recipient', 'recipient', 'hiringManager', 'data.hiringManager'),
    field('cover-letter', 'recipient', 'recipient', 'date', 'data.date'),
    field('cover-letter', 'recipient', 'recipient', 'companyAddress', 'data.companyAddress'),
    field('cover-letter', 'body', 'body', 'openingParagraph', 'data.openingParagraph'),
    field('cover-letter', 'body', 'body', 'bodyParagraph1', 'data.bodyParagraph1'),
    field('cover-letter', 'body', 'body', 'bodyParagraph2', 'data.bodyParagraph2'),
    field('cover-letter', 'body', 'body', 'bodyParagraph3', 'data.bodyParagraph3'),
    field('cover-letter', 'body', 'body', 'closingParagraph', 'data.closingParagraph'),
    field('cover-letter', 'body', 'body', 'signoffLabel', 'data.signoffLabel'),
  ],
  collections: [],
})

const buildSignatureFieldMap = (): StudioFieldMap => ({
  fields: [
    field('email-signature', 'identity', 'identity', 'name', 'data.name'),
    field('email-signature', 'identity', 'identity', 'affiliationLines', 'data.affiliationLines'),
    field('email-signature', 'identity', 'identity', 'signoff', 'data.signoff'),
    field('email-signature', 'identity', 'identity', 'email', 'data.email'),
    field('email-signature', 'identity', 'identity', 'website', 'data.website'),
    field('email-signature', 'identity', 'identity', 'phone', 'data.phone'),
    field('email-signature', 'identity', 'identity', 'location', 'data.location'),
    field('email-signature', 'identity', 'identity', 'profileSrc', 'data.profileSrc'),
    field('email-signature', 'identity', 'identity', 'experienceLogos', 'data.experienceLogos'),
    field('email-signature', 'identity', 'identity', 'educationLogos', 'data.educationLogos'),
    field('email-signature', 'identity', 'identity', 'certificationLogos', 'data.certificationLogos'),
    field('email-signature', 'identity', 'identity', 'logoTone', 'data.logoTone'),
  ],
  collections: [],
})

export const buildStudioFieldMap = (
  documentType: DocumentType,
  template: EditableTemplate,
): StudioFieldMap => {
  if (documentType === 'resume') return buildResumeFieldMap(template as ResumeTemplate)
  if (documentType === 'cover-letter') return buildCoverLetterFieldMap()
  return buildSignatureFieldMap()
}
