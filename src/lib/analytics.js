// Day 4 analytics: RFM scoring, cohort retention, ABC (Pareto) analysis.
// All functions take rows from prepareRows (one row per line item).

import { daysBetween, levelOf, levelThresholds } from './metrics'

// ---------- RFM (scored 1–5) ----------

/** Segment names in display order (labels live in i18n as rfm5_<key>) */
export const RFM_SEGMENT_KEYS = ['champions', 'loyal', 'promising', 'needsAttention', 'atRisk', 'lost']

/**
 * Pick a segment from the R and F scores (1 = worst … 5 = best). The rules cover every combination:
 *   R ≥ 4: F ≥ 4 champions · F = 3 loyal · F ≤ 2 promising (recent but not frequent yet)
 *   R = 3: F ≥ 3 loyal · F ≤ 2 needsAttention
 *   R ≤ 2: F ≥ 3 atRisk (used to be regular) · F ≤ 2 lost
 */
export function rfmSegmentOf(r, f) {
  if (r >= 4) return f >= 4 ? 'champions' : f === 3 ? 'loyal' : 'promising'
  if (r === 3) return f >= 3 ? 'loyal' : 'needsAttention'
  return f >= 3 ? 'atRisk' : 'lost'
}

/**
 * Score 1–5 by quintile of the values (5 = best). Ties share one score: a value's position is the middle of its tied
 * block, so a mass of identical values (e.g. many members with 1 bill) lands in one score instead of being split.
 * lowerIsBetter flips the direction (recency: fewer days since the last bill = higher score)
 */
function quintileScorer(values, lowerIsBetter = false) {
  const sorted = values.map((v) => (lowerIsBetter ? -v : v)).sort((a, b) => a - b)
  const score = new Map()
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j < sorted.length && sorted[j] === sorted[i]) j++
    score.set(sorted[i], Math.min(5, Math.floor((((i + j) / 2) / sorted.length) * 5) + 1))
    i = j
  }
  return (v) => score.get(lowerIsBetter ? -v : v)
}

/**
 * Score every member on Recency, Frequency and Monetary (each 1–5 by quintile) and group them into segments
 *   R = days since last bill, counted from asOf (lower is better)
 *   F = number of distinct bills   M = total spend
 * Returns { members: [{ customer, recencyDays, frequency, monetary, r, f, m, segment }], segments: [{ key, count, share, sales, avgSpend, avgR, avgF }] }
 */
export function rfmScores(rows, asOf) {
  const byMember = new Map()
  for (const row of rows) {
    if (!row.customer) continue
    let m = byMember.get(row.customer)
    if (!m) byMember.set(row.customer, (m = { customer: row.customer, last: row.date, orders: new Set(), monetary: 0 }))
    if (row.date > m.last) m.last = row.date
    m.orders.add(row.orderId)
    m.monetary += row.amount
  }
  const base = [...byMember.values()].map((m) => ({
    customer: m.customer,
    recencyDays: daysBetween(m.last, asOf),
    frequency: m.orders.size,
    monetary: m.monetary,
  }))

  const scoreR = quintileScorer(base.map((m) => m.recencyDays), true)
  const scoreF = quintileScorer(base.map((m) => m.frequency))
  const scoreM = quintileScorer(base.map((m) => m.monetary))
  const members = base.map((m) => {
    const r = scoreR(m.recencyDays)
    const f = scoreF(m.frequency)
    return { ...m, r, f, m: scoreM(m.monetary), segment: rfmSegmentOf(r, f) }
  })

  const total = members.length
  const segments = RFM_SEGMENT_KEYS.map((key) => {
    const list = members.filter((m) => m.segment === key)
    const sum = (field) => list.reduce((s, m) => s + m[field], 0)
    return {
      key,
      count: list.length,
      share: total ? (list.length / total) * 100 : 0,
      sales: sum('monetary'),
      avgSpend: list.length ? sum('monetary') / list.length : 0,
      avgRecency: list.length ? sum('recencyDays') / list.length : 0,
      avgFrequency: list.length ? sum('frequency') / list.length : 0,
    }
  })
  return { members, segments }
}

// ---------- Cohort retention ----------

/** YYYY-MM of a YYYY-MM-DD date */
const monthOf = (date) => date.slice(0, 7)

/** Months from YYYY-MM a to YYYY-MM b (b − a) */
export function monthsBetween(a, b) {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))
}

/**
 * Monthly cohort retention for members.
 * Cohort = month of a member's first bill in `rows`. Cell (cohort, k) = % of that cohort who bought again k months later
 * (k = 0 is always 100%). Months that haven't happened yet (after the last month in the data) are null, not 0.
 * Returns { months: [YYYY-MM], cohorts: [{ month, size, cells: [{ offset, active, rate }] }], average: [rate per offset] }
 */
export function cohortRetention(rows) {
  const monthsByMember = new Map() // customer -> Set of YYYY-MM with a bill
  let lastMonth = ''
  for (const row of rows) {
    if (!row.customer) continue
    const month = monthOf(row.date)
    if (!monthsByMember.has(row.customer)) monthsByMember.set(row.customer, new Set())
    monthsByMember.get(row.customer).add(month)
    if (month > lastMonth) lastMonth = month
  }

  const cohortMembers = new Map() // first month -> [Set of active months]
  for (const set of monthsByMember.values()) {
    const first = [...set].sort()[0]
    if (!cohortMembers.has(first)) cohortMembers.set(first, [])
    cohortMembers.get(first).push(set)
  }

  const months = [...cohortMembers.keys()].sort()
  const cohorts = months.map((month) => {
    const members = cohortMembers.get(month)
    const maxOffset = monthsBetween(month, lastMonth)
    const cells = []
    for (let offset = 0; offset <= maxOffset; offset++) {
      const target = shiftMonth(month, offset)
      const active = members.filter((set) => set.has(target)).length
      cells.push({ offset, active, rate: (active / members.length) * 100 })
    }
    return { month, size: members.length, cells }
  })

  // Average retention per offset, weighted by cohort size (only cohorts old enough to have that offset)
  const longest = cohorts.reduce((n, c) => Math.max(n, c.cells.length), 0)
  const average = Array.from({ length: longest }, (_, offset) => {
    const eligible = cohorts.filter((c) => c.cells[offset])
    const size = eligible.reduce((s, c) => s + c.size, 0)
    const active = eligible.reduce((s, c) => s + c.cells[offset].active, 0)
    return size ? (active / size) * 100 : null
  })
  return { months, cohorts, average }
}

/** Add n months to a YYYY-MM string */
export function shiftMonth(month, n) {
  const total = Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Heatmap level (0–4) for a retention % cell: relative to the other cells (offset 0 = 100% is left out) */
export function retentionLevels(cohorts) {
  const values = cohorts.flatMap((c) => c.cells.slice(1).map((cell) => cell.rate))
  const thresholds = levelThresholds(values, 5)
  return (rate) => levelOf(rate, thresholds)
}

// ---------- ABC analysis ----------

export const ABC_A_SHARE = 80 // class A = products making up the first 80% of sales
export const ABC_B_SHARE = 95 // class B = up to 95%, the rest is C

/**
 * ABC (Pareto) analysis of products by sales
 * Sort by sales high → low, accumulate the share, and cut: A ≤ 80% · B ≤ 95% · C the rest.
 * A product belongs to the class where the running share was still under the cut *before* adding it,
 * so the product that crosses 80% stays in A (every class is non-empty when there is data).
 * Returns { items: [{ key, sales, qty, share, cumulativeShare, rank, cls }], classes: [{ cls, count, countShare, sales, share }] }
 */
export function abcAnalysis(rows) {
  const byProduct = new Map()
  for (const r of rows) {
    let p = byProduct.get(r.product)
    if (!p) byProduct.set(r.product, (p = { key: r.product, sales: 0, qty: 0 }))
    p.sales += r.amount
    p.qty += r.qty
  }
  const sorted = [...byProduct.values()].sort((a, b) => b.sales - a.sales || a.key.localeCompare(b.key))
  const total = sorted.reduce((s, p) => s + p.sales, 0)

  let running = 0
  const items = sorted.map((p, i) => {
    const before = total ? (running / total) * 100 : 0
    running += p.sales
    const cls = before < ABC_A_SHARE ? 'A' : before < ABC_B_SHARE ? 'B' : 'C'
    return {
      ...p,
      rank: i + 1,
      share: total ? (p.sales / total) * 100 : 0,
      cumulativeShare: total ? (running / total) * 100 : 0,
      cls,
    }
  })

  const classes = ['A', 'B', 'C'].map((cls) => {
    const list = items.filter((p) => p.cls === cls)
    const sales = list.reduce((s, p) => s + p.sales, 0)
    return {
      cls,
      count: list.length,
      countShare: items.length ? (list.length / items.length) * 100 : 0,
      sales,
      share: total ? (sales / total) * 100 : 0,
    }
  })
  return { items, classes }
}
