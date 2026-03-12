import type {
  ExportBalancePreset,
  ExportBalanceResult,
  ExportBreakAnchor,
  ExportMetrics,
  ResumeExportTuning,
} from '@/types'

interface BalanceCandidate {
  preset: ExportBalancePreset
  breakAnchor: ExportBreakAnchor
}

interface BalanceBlock {
  anchor: ExportBreakAnchor | null
  externalGapBefore: number
  intrinsicHeight: number
  groupKey: string | null
}

interface ResumeMeasurement {
  headerHeight: number
  blocks: BalanceBlock[]
}

const LETTER_PAGE_HEIGHT_IN = 11
const RESUME_MARGIN_TOP_BOTTOM_IN = 0.35 * 2
const PRINTABLE_PAGE_HEIGHT_PX = (LETTER_PAGE_HEIGHT_IN - RESUME_MARGIN_TOP_BOTTOM_IN) * 96
const PAGE_ONE_TARGET_IN: [number, number] = [0.3, 0.8]
const PAGE_TWO_TARGET_IN: [number, number] = [0.35, 1]
const PAGE_THREE_TARGET_IN: [number, number] = [0.4, 1.4]
const GAP_PENALTY_THRESHOLD_IN = 0.1
const PAGE_TWO_PENALTY_WEIGHT = 1.4
const IMBALANCE_PENALTY_WEIGHT = 0.6
const INTERNAL_GAP_PENALTY_WEIGHT = 0.65

export const RESUME_BALANCE_CANDIDATES: BalanceCandidate[] = [
  { preset: 'balanced', breakAnchor: 'co-op-and-professional-certifications' },
  { preset: 'balanced', breakAnchor: 'co-op-experience' },
  { preset: 'balanced', breakAnchor: 'none' },
  { preset: 'relaxed', breakAnchor: 'co-op-and-professional-certifications' },
  { preset: 'compact', breakAnchor: 'co-op-and-professional-certifications' },
]

const getTargetPageCountForBreakAnchor = (breakAnchor: ExportBreakAnchor) =>
  breakAnchor === 'co-op-and-professional-certifications' ? 3 : 2

const shouldBreakBeforeAnchor = (breakAnchor: ExportBreakAnchor, blockAnchor: ExportBreakAnchor | null) => {
  if (!blockAnchor || breakAnchor === 'none') {
    return false
  }

  if (breakAnchor === 'co-op-and-professional-certifications') {
    return blockAnchor === 'co-op-experience' || blockAnchor === 'professional-certifications'
  }

  return breakAnchor === blockAnchor
}

const roundInches = (value: number) => Number((value / 96).toFixed(3))

const roundMetric = (value: number) => Number(value.toFixed(3))

const distanceFromRange = (value: number, range: [number, number]) => {
  if (value < range[0]) return range[0] - value
  if (value > range[1]) return value - range[1]
  return 0
}

const getRectRelativeToRoot = (element: Element, rootRectTop: number) => {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top - rootRectTop,
    bottom: rect.bottom - rootRectTop,
  }
}

const getDirectChildren = (element: Element) =>
  Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)

const getResumeGroupKey = (element: HTMLElement) =>
  Array.from(element.classList).find((token) => token.startsWith('resume-group-')) ?? null

const groupGridRows = (container: HTMLElement, rootRectTop: number) => {
  const rowMap = new Map<number, { top: number; bottom: number }>()

  for (const child of getDirectChildren(container)) {
    const { top, bottom } = getRectRelativeToRoot(child, rootRectTop)
    const key = Math.round(top)
    const existing = rowMap.get(key)

    if (existing) {
      existing.top = Math.min(existing.top, top)
      existing.bottom = Math.max(existing.bottom, bottom)
      continue
    }

    rowMap.set(key, { top, bottom })
  }

  return Array.from(rowMap.values()).sort((left, right) => left.top - right.top)
}

const appendBlock = ({
  blocks,
  prevBottom,
  startTop,
  endBottom,
  anchor,
  groupKey,
}: {
  blocks: BalanceBlock[]
  prevBottom: number
  startTop: number
  endBottom: number
  anchor: ExportBreakAnchor | null
  groupKey: string | null
}) => {
  blocks.push({
    anchor,
    externalGapBefore: Math.max(0, startTop - prevBottom),
    intrinsicHeight: endBottom - startTop,
    groupKey,
  })

  return endBottom
}

const measureResumeBlocks = (root: HTMLElement): ResumeMeasurement | null => {
  const rootRect = root.getBoundingClientRect()
  const header = root.querySelector(':scope > .document-header')

  if (!(header instanceof HTMLElement)) {
    return null
  }

  const headerRect = getRectRelativeToRoot(header, rootRect.top)
  const blocks: BalanceBlock[] = []
  let flowBottom = headerRect.bottom

  for (const section of getDirectChildren(root).filter((child) => child.classList.contains('resume-section'))) {
    const heading = getDirectChildren(section).find((child) => child.classList.contains('document-section-heading'))

    if (!(heading instanceof HTMLElement)) {
      continue
    }

    const headingRect = getRectRelativeToRoot(heading, rootRect.top)
    const sectionAnchor = section.classList.contains('resume-section-professional-certifications')
      ? 'professional-certifications'
      : null

    let needsSectionPrefix = true

    const processGrid = ({
      container,
      titleTop,
      anchor,
      groupKey,
    }: {
      container: HTMLElement
      titleTop?: number
      anchor: ExportBreakAnchor | null
      groupKey: string | null
    }) => {
      const rows = groupGridRows(container, rootRect.top)

      rows.forEach((row, index) => {
        const blockStartTop =
          index === 0
            ? Math.min(row.top, needsSectionPrefix ? headingRect.top : row.top, titleTop ?? row.top)
            : row.top

        flowBottom = appendBlock({
          blocks,
          prevBottom: flowBottom,
          startTop: blockStartTop,
          endBottom: row.bottom,
          anchor: index === 0 ? anchor : null,
          groupKey,
        })

        needsSectionPrefix = false
      })
    }

    const processStackChild = (
      child: HTMLElement,
      anchor: ExportBreakAnchor | null,
      titleTop?: number,
      groupKey: string | null = null,
    ) => {
      if (child.classList.contains('resume-card') || child.classList.contains('resume-stat')) {
        const rect = getRectRelativeToRoot(child, rootRect.top)
        const blockStartTop = Math.min(
          rect.top,
          needsSectionPrefix ? headingRect.top : rect.top,
          titleTop ?? rect.top,
        )

        flowBottom = appendBlock({
          blocks,
          prevBottom: flowBottom,
          startTop: blockStartTop,
          endBottom: rect.bottom,
          anchor,
          groupKey,
        })

        needsSectionPrefix = false
        return
      }

      if (child.classList.contains('resume-grid')) {
        processGrid({ container: child, titleTop, anchor, groupKey })
        return
      }

      if (!child.classList.contains('resume-group')) {
        return
      }

      const groupKeyValue = getResumeGroupKey(child)
      const groupTitle = getDirectChildren(child).find((node) => node.classList.contains('resume-group-title'))
      const groupTitleTop = groupTitle ? getRectRelativeToRoot(groupTitle, rootRect.top).top : undefined
      const groupAnchor = child.classList.contains('resume-group-co-op-experience') ? 'co-op-experience' : null
      let needsGroupPrefix = true

      for (const groupChild of getDirectChildren(child).filter((node) => !node.classList.contains('resume-group-title'))) {
        if (groupChild.classList.contains('resume-grid')) {
          processGrid({
            container: groupChild,
            titleTop: needsGroupPrefix ? groupTitleTop : undefined,
            anchor: needsGroupPrefix ? groupAnchor : null,
            groupKey: groupKeyValue,
          })
          needsGroupPrefix = false
          continue
        }

        processStackChild(
          groupChild,
          needsGroupPrefix ? groupAnchor : null,
          needsGroupPrefix ? groupTitleTop : undefined,
          groupKeyValue,
        )
        needsGroupPrefix = false
      }
    }

    for (const child of getDirectChildren(section).filter((node) => !node.classList.contains('document-section-heading'))) {
      if (child.classList.contains('resume-stack')) {
        for (const stackChild of getDirectChildren(child)) {
          processStackChild(stackChild, needsSectionPrefix ? sectionAnchor : null)
        }
        continue
      }

      if (child.classList.contains('resume-grid')) {
        processGrid({ container: child, anchor: needsSectionPrefix ? sectionAnchor : null, groupKey: null })
      }
    }
  }

  return {
    headerHeight: headerRect.bottom,
    blocks,
  }
}

const simulateExportMetrics = (measurement: ResumeMeasurement, tuning: ResumeExportTuning): ExportMetrics => {
  const pageWhitespacesPx: number[] = []
  const groupPages = new Map<string, Set<number>>()
  let used = measurement.headerHeight
  let currentPage = 1
  let overflow = used > PRINTABLE_PAGE_HEIGHT_PX
  let internalGapScore = 0

  for (const block of measurement.blocks) {
    if (shouldBreakBeforeAnchor(tuning.breakAnchor, block.anchor) && used > 0) {
      pageWhitespacesPx.push(Math.max(0, PRINTABLE_PAGE_HEIGHT_PX - used))
      currentPage += 1
      used = 0
    }

    if (block.intrinsicHeight > PRINTABLE_PAGE_HEIGHT_PX) {
      overflow = true
    }

    const requiredGap = used > 0 ? block.externalGapBefore : 0
    const requiredHeight = requiredGap + block.intrinsicHeight

    if (used + requiredHeight > PRINTABLE_PAGE_HEIGHT_PX) {
      pageWhitespacesPx.push(Math.max(0, PRINTABLE_PAGE_HEIGHT_PX - used))
      currentPage += 1
      used = 0
    }

    if (used > 0) {
      const gapInches = roundInches(requiredGap)
      internalGapScore += Math.max(0, gapInches - GAP_PENALTY_THRESHOLD_IN)
    }

    used += (used > 0 ? block.externalGapBefore : 0) + block.intrinsicHeight

    if (block.groupKey) {
      const pages = groupPages.get(block.groupKey) ?? new Set<number>()
      pages.add(currentPage)
      groupPages.set(block.groupKey, pages)
    }
  }

  pageWhitespacesPx.push(Math.max(0, PRINTABLE_PAGE_HEIGHT_PX - used))

  const pageCount = pageWhitespacesPx.length
  const pageWhitespace = pageWhitespacesPx.map((value) => roundInches(value))
  const splitGroups = Array.from(groupPages.values()).some((pages) => pages.size > 1)
  const orphanedHeadings = false
  const targetPageCount = getTargetPageCountForBreakAnchor(tuning.breakAnchor)
  const targetRanges =
    targetPageCount === 3 ? [PAGE_ONE_TARGET_IN, PAGE_TWO_TARGET_IN, PAGE_THREE_TARGET_IN] : [PAGE_ONE_TARGET_IN, PAGE_TWO_TARGET_IN]
  const whitespacePenalty =
    targetRanges.reduce(
      (total, range, index) => total + distanceFromRange(pageWhitespace[index] ?? 0, range) * (index === 1 ? PAGE_TWO_PENALTY_WEIGHT : 1),
      0,
    )
  const imbalancePenalty = targetPageCount === 3
    ? (Math.abs((pageWhitespace[0] ?? 0) - (pageWhitespace[1] ?? 0)) + Math.abs((pageWhitespace[1] ?? 0) - (pageWhitespace[2] ?? 0))) *
      IMBALANCE_PENALTY_WEIGHT
    : Math.abs((pageWhitespace[0] ?? 0) - (pageWhitespace[1] ?? 0)) * IMBALANCE_PENALTY_WEIGHT
  const score =
    pageCount === targetPageCount && !overflow && !splitGroups && !orphanedHeadings
      ? roundMetric(whitespacePenalty + imbalancePenalty + internalGapScore * INTERNAL_GAP_PENALTY_WEIGHT)
      : Number.POSITIVE_INFINITY

  return {
    tuning,
    pageCount,
    pageWhitespace,
    overflow,
    orphanedHeadings,
    splitGroups,
    internalGapScore: roundMetric(internalGapScore),
    score,
  }
}

export const measureResumeExportMetrics = (
  root: HTMLElement,
  tuning: ResumeExportTuning,
): ExportMetrics | null => {
  const measurement = measureResumeBlocks(root)

  if (!measurement) {
    return null
  }

  return simulateExportMetrics(measurement, tuning)
}

export const measureResumeBalanceCandidates = (root: HTMLElement) => {
  const measurement = measureResumeBlocks(root)

  if (!measurement) {
    return []
  }

  return RESUME_BALANCE_CANDIDATES.map((candidate) => {
    const metrics = simulateExportMetrics(measurement, {
      ...candidate,
      fontScale: 1,
      spaceScale: 1,
    })

    return {
      preset: candidate.preset,
      breakAnchor: candidate.breakAnchor,
      pageCount: metrics.pageCount,
      page1Whitespace: metrics.pageWhitespace[0],
      page2Whitespace: metrics.pageWhitespace[1],
      page3Whitespace: metrics.pageWhitespace[2],
      score: metrics.score,
    } satisfies ExportBalanceResult
  })
}

export const selectBestResumeBalance = (results: ExportBalanceResult[]) => {
  if (results.length === 0) {
    return null
  }

  const order = new Map(
    RESUME_BALANCE_CANDIDATES.map((candidate, index) => [`${candidate.preset}:${candidate.breakAnchor}`, index]),
  )

  const ranked = [...results].sort((left, right) => {
    const leftValid = left.pageCount === getTargetPageCountForBreakAnchor(left.breakAnchor) && Number.isFinite(left.score)
    const rightValid = right.pageCount === getTargetPageCountForBreakAnchor(right.breakAnchor) && Number.isFinite(right.score)

    if (leftValid !== rightValid) {
      return leftValid ? -1 : 1
    }

    if (leftValid && rightValid && left.score !== right.score) {
      return left.score - right.score
    }

    if (!leftValid && !rightValid && left.pageCount !== right.pageCount) {
      return (
        Math.abs(left.pageCount - getTargetPageCountForBreakAnchor(left.breakAnchor)) -
        Math.abs(right.pageCount - getTargetPageCountForBreakAnchor(right.breakAnchor))
      )
    }

    return (
      (order.get(`${left.preset}:${left.breakAnchor}`) ?? 0) -
      (order.get(`${right.preset}:${right.breakAnchor}`) ?? 0)
    )
  })

  return ranked[0] ?? null
}
