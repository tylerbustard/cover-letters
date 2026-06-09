type SignatureIdentityData = {
  role?: unknown
  organization?: unknown
  affiliationLines?: unknown
}

const asCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const dedupeRows = (rows: string[]) => {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = row.toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// The signature data already stores affiliationLines as the rows to display
// (institution[; school], then credential/role), so normalization is just a trim +
// de-dupe — no fragment parsing or school-name heuristics. Falls back to
// organization + role for legacy signatures that predate affiliationLines.
export const normalizeSignatureAffiliationLines = (data: SignatureIdentityData): string[] => {
  const raw = Array.isArray(data.affiliationLines)
    ? data.affiliationLines
    : [data.organization, data.role]
  return dedupeRows(raw.map(asCleanString).filter(Boolean))
}

// At most two display rows: the institution line first, everything else folded into a
// single second line so the signature keeps "institution on one line, role on another".
export const getSignatureAffiliationDisplayRows = (data: SignatureIdentityData): string[] => {
  const lines = normalizeSignatureAffiliationLines(data)
  if (lines.length <= 2) return lines
  return [lines[0], lines.slice(1).join('; ')]
}

export const formatSignatureAffiliation = (data: SignatureIdentityData) =>
  getSignatureAffiliationDisplayRows(data).join('\n')
