// Calculation logic for the sales dashboard.
// Each row in sales.csv is one line item; several rows can share an order_id (one bill).

// ---------- Data preparation ----------

/** Revenue for one row = qty × unit_price */
export function lineTotal(row) {
  return Number(row.qty) * Number(row.unit_price)
}

/**
 * Take the date (YYYY-MM-DD) straight from the string, which is already Thai time,
 * e.g. "2025-04-01T18:48:40+07:00" -> "2025-04-01".
 * Avoid new Date(), which would convert to the browser's timezone and could shift the date.
 */
export function thaiDate(datetime) {
  return datetime.slice(0, 10)
}

/** Add n days to a YYYY-MM-DD string (computed in UTC so there's no timezone drift) */
export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Days between two dates (b − a) */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

/** Day of week: 0 = Monday … 6 = Sunday */
function weekdayOf(date) {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
}

/**
 * Convert raw CSV rows into a shape that's ready to compute with (done once after load):
 * compute amount = qty × unit_price, pull out the date/hour/weekday up front, and drop rows with bad numbers
 */
export function prepareRows(rawRows) {
  const weekdayCache = new Map()
  const rows = []
  for (const r of rawRows) {
    const amount = lineTotal(r)
    if (!r.datetime || !Number.isFinite(amount)) continue
    const date = thaiDate(r.datetime)
    if (!weekdayCache.has(date)) weekdayCache.set(date, weekdayOf(date))
    rows.push({
      orderId: r.order_id,
      date,
      hour: Number(r.datetime.slice(11, 13)),
      weekday: weekdayCache.get(date),
      branch: r.branch?.trim() || '—',
      product: r.product_id?.trim() || '—',
      qty: Number(r.qty),
      amount,
      customer: r.customer_id?.trim() ?? '', // blank = walk-in customer (not a member)
      payment: r.payment_method?.trim() || '—',
      channel: r.channel?.trim() || '—',
    })
  }
  return rows
}

/** First and last date in the data */
export function dataBounds(rows) {
  let min = null
  let max = null
  for (const r of rows) {
    if (min === null || r.date < min) min = r.date
    if (max === null || r.date > max) max = r.date
  }
  return { min, max }
}

/** Distinct values of a field (for filter dropdowns), sorted by revenue high to low */
export function distinctValues(rows, field) {
  return shareBy(rows, field).map((d) => d.key)
}

// ---------- Filters and comparison periods ----------

/** Keep rows inside the date range and matching branch/channel ('all' = no filter) */
export function filterRows(rows, { from, to, branch = 'all', channel = 'all' }) {
  return rows.filter(
    (r) =>
      r.date >= from &&
      r.date <= to &&
      (branch === 'all' || r.branch === branch) &&
      (channel === 'all' || r.channel === channel),
  )
}

/**
 * Comparison period = the same number of days immediately before the selected range,
 * e.g. 1–30 Sep -> compare against 2–31 Aug.
 * Returns null if the data doesn't cover the whole previous period (a partial previous period would inflate the % change)
 */
export function previousPeriod({ from, to }, minDate) {
  const length = daysBetween(from, to) + 1
  const prev = { from: addDays(from, -length), to: addDays(from, -1) }
  return prev.from < minDate ? null : prev
}

/** Percent change from prev to current (null if prev is 0 or missing) */
export function percentChange(current, prev) {
  if (prev == null || prev === 0) return null
  return ((current - prev) / prev) * 100
}

// ---------- KPIs ----------

/** Total revenue: sum of amount across every row */
export function totalSales(rows) {
  return rows.reduce((sum, row) => sum + row.amount, 0)
}

/** Number of bills = count of unique order_id values (not row count) */
export function countOrders(rows) {
  return new Set(rows.map((row) => row.orderId)).size
}

/** Average per bill = total revenue ÷ number of bills */
export function averageOrderValue(rows) {
  const orders = countOrders(rows)
  return orders === 0 ? 0 : totalSales(rows) / orders
}

/** Unique members = count of distinct customer_id, skipping blanks (walk-in customers) */
export function countUniqueMembers(rows) {
  const members = new Set()
  for (const row of rows) if (row.customer) members.add(row.customer)
  return members.size
}

/** The 4 main KPIs together */
export function computeKpis(rows) {
  return {
    totalSales: totalSales(rows),
    orderCount: countOrders(rows),
    averageOrderValue: averageOrderValue(rows),
    memberCount: countUniqueMembers(rows),
  }
}

// ---------- Over time ----------

/**
 * Daily revenue: sum amount grouped by Thai date,
 * then fill days with no sales as 0 so the line doesn't skip over gaps (covers the whole from–to range).
 */
export function dailySales(rows, { from, to }) {
  const byDate = new Map()
  for (const row of rows) byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.amount)
  const result = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    result.push({ date, sales: byDate.get(date) ?? 0 })
  }
  return result
}

/**
 * Trailing moving average: average of `sales` over the current day and the (window − 1) days before it.
 * Days without a full window yet get null so the chart doesn't draw a misleading partial average.
 */
export function withMovingAverage(daily, window = 7) {
  let runningSum = 0
  return daily.map((day, i) => {
    runningSum += day.sales
    if (i >= window) runningSum -= daily[i - window].sales // drop the day that slid out of the window
    return { ...day, avg: i >= window - 1 ? runningSum / window : null }
  })
}

/** Last day of a month from "YYYY-MM" */
function monthEnd(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

/**
 * Monthly revenue: sum grouped by "YYYY-MM"
 * partial = true if the selected range doesn't cover the whole month (e.g. data only runs to the 20th)
 */
export function monthlySales(rows, { from, to }) {
  const byMonth = new Map()
  for (const row of rows) {
    const month = row.date.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + row.amount)
  }
  const result = []
  for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = addDays(monthEnd(month), 1).slice(0, 7)) {
    const partial = from > `${month}-01` || to < monthEnd(month)
    result.push({ month, sales: byMonth.get(month) ?? 0, partial })
  }
  return result
}

/**
 * Next-month forecast with linear regression (straight-line fit, least squares)
 * over the last `lookback` full months:
 *   x = month index 0, 1, 2, …   y = revenue
 *   slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²,  intercept = ȳ − slope·x̄
 *   forecast = intercept + slope · (next x)
 * Needs at least 3 full months, otherwise returns null.
 */
export function forecastNextMonth(monthly, lookback = 6) {
  const full = monthly.filter((m) => !m.partial)
  if (full.length < 3) return null
  const recent = full.slice(-lookback)
  const n = recent.length
  const xMean = (n - 1) / 2
  const yMean = recent.reduce((s, m) => s + m.sales, 0) / n
  let num = 0
  let den = 0
  recent.forEach((m, x) => {
    num += (x - xMean) * (m.sales - yMean)
    den += (x - xMean) ** 2
  })
  const slope = num / den
  const lastFull = recent[n - 1]
  const nextMonth = addDays(monthEnd(lastFull.month), 1).slice(0, 7)
  return {
    month: nextMonth,
    value: Math.max(0, yMean + slope * (n - xMean)),
    basedOn: lastFull.month,
    baseValue: lastFull.sales,
    slope,
  }
}

// ---------- Breakdowns ----------

/**
 * Revenue grouped by any field (branch, product, channel, payment, …), sorted high to low.
 * Returns [{ key, sales, orders, share }] where share = % of total revenue
 */
export function shareBy(rows, field) {
  const groups = new Map()
  let total = 0
  for (const row of rows) {
    const key = row[field]
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { key, sales: 0, qty: 0, orders: new Set() }))
    g.sales += row.amount
    g.qty += row.qty
    g.orders.add(row.orderId)
    total += row.amount
  }
  return [...groups.values()]
    .map((g) => ({ key: g.key, sales: g.sales, qty: g.qty, orders: g.orders.size, share: total ? (g.sales / total) * 100 : 0 }))
    .sort((a, b) => b.sales - a.sales)
}

/** Revenue by branch, sorted high to low */
export function salesByBranch(rows) {
  return shareBy(rows, 'branch')
}

/** Top n best-selling products by revenue */
export function topProducts(rows, n = 10) {
  return shareBy(rows, 'product').slice(0, n)
}

/** Revenue and bill count by hour (only hours that have sales), sorted by hour */
export function salesByHour(rows) {
  const byHour = new Map()
  for (const row of rows) {
    let h = byHour.get(row.hour)
    if (!h) byHour.set(row.hour, (h = { hour: row.hour, sales: 0, orders: new Set() }))
    h.sales += row.amount
    h.orders.add(row.orderId)
  }
  return [...byHour.values()]
    .map((h) => ({ hour: h.hour, sales: h.sales, orders: h.orders.size }))
    .sort((a, b) => a.hour - b.hour)
}

/**
 * Heatmap of revenue by weekday × hour
 * Returns { hours: [7..20], cells: [[...per hour] × 7 days], max }
 */
export function weekdayHourMatrix(rows) {
  const hourSet = new Set(rows.map((r) => r.hour))
  const hours = [...hourSet].sort((a, b) => a - b)
  const index = new Map(hours.map((h, i) => [h, i]))
  const cells = Array.from({ length: 7 }, () => hours.map(() => 0))
  for (const row of rows) cells[row.weekday][index.get(row.hour)] += row.amount
  const max = Math.max(0, ...cells.flat())
  return { hours, cells, max, thresholds: levelThresholds(cells.flat(), 5) }
}

/**
 * Split values into `levels` equal-sized groups (quantiles), e.g. 5 levels -> 20% of cells per level
 * Returns the (levels − 1) cut points: sort the values, take the value at the 20%, 40%, 60%, 80% positions
 * This spreads colors evenly across the grid, instead of scaling from 0 where every cell ends up mid-tone
 */
export function levelThresholds(values, levels = 5) {
  const sorted = [...values].sort((a, b) => a - b)
  return Array.from({ length: levels - 1 }, (_, i) => sorted[Math.floor(((i + 1) * sorted.length) / levels)])
}

/** Which level a value falls in (0 = lowest … thresholds.length = highest) */
export function levelOf(value, thresholds) {
  if (value <= 0) return 0 // no sales always sits at the lowest level (even when lots of cells are 0)
  return thresholds.filter((t) => value >= t).length
}

// ---------- Customers ----------

/**
 * Members vs walk-in customers: revenue, bills, average per bill, and share of revenue
 * plus repeat rate = % of members with 2+ bills
 */
export function memberComparison(rows) {
  const group = (isMember) => {
    const subset = rows.filter((r) => Boolean(r.customer) === isMember)
    return { sales: totalSales(subset), orders: countOrders(subset), aov: averageOrderValue(subset) }
  }
  const member = group(true)
  const walkIn = group(false)
  const total = member.sales + walkIn.sales

  const billsPerMember = new Map()
  for (const r of rows) {
    if (!r.customer) continue
    if (!billsPerMember.has(r.customer)) billsPerMember.set(r.customer, new Set())
    billsPerMember.get(r.customer).add(r.orderId)
  }
  const repeaters = [...billsPerMember.values()].filter((s) => s.size >= 2).length

  return {
    member: { ...member, share: total ? (member.sales / total) * 100 : 0 },
    walkIn: { ...walkIn, share: total ? (walkIn.sales / total) * 100 : 0 },
    repeatRate: billsPerMember.size ? (repeaters / billsPerMember.size) * 100 : 0,
  }
}

// RFM thresholds (from the data: median bills per member = 5)
export const RFM_FREQUENT_BILLS = 5
export const RFM_ACTIVE_DAYS = 60

/**
 * Member segments with RFM (Recency, Frequency, Monetary)
 *   R = days since last purchase (counted from asOf = last day of the selected range)
 *   F = number of bills   M = total spend
 * Split into 4 groups:
 *   loyal    = F ≥ 5 and bought within 60 days
 *   atRisk   = F ≥ 5 but hasn't bought in over 60 days (used to be regular, now gone quiet)
 *   new      = F < 5 and bought within 60 days
 *   lost     = F < 5 and hasn't bought in over 60 days
 */
export function rfmSegments(rows, asOf) {
  const members = new Map()
  for (const r of rows) {
    if (!r.customer) continue
    let m = members.get(r.customer)
    if (!m) members.set(r.customer, (m = { last: r.date, orders: new Set(), sales: 0 }))
    if (r.date > m.last) m.last = r.date
    m.orders.add(r.orderId)
    m.sales += r.amount
  }
  const segments = { loyal: [], atRisk: [], new: [], lost: [] }
  for (const m of members.values()) {
    const frequent = m.orders.size >= RFM_FREQUENT_BILLS
    const active = daysBetween(m.last, asOf) <= RFM_ACTIVE_DAYS
    const key = frequent ? (active ? 'loyal' : 'atRisk') : active ? 'new' : 'lost'
    segments[key].push(m)
  }
  const total = members.size
  return Object.entries(segments).map(([key, list]) => {
    const sales = list.reduce((s, m) => s + m.sales, 0)
    return {
      key,
      count: list.length,
      share: total ? (list.length / total) * 100 : 0,
      sales,
      avgSpend: list.length ? sales / list.length : 0,
    }
  })
}

// ---------- Frequently bought together ----------

/**
 * Product pairs that most often appear in the same bill
 * 1) group products by order_id (distinct only)  2) only bills with 2+ products
 * 3) count every pair (A,B) in the bill  4) sort by count high to low
 * share = % of multi-item bills that contain this pair
 */
export function basketPairs(rows, n = 10) {
  const productsByOrder = new Map()
  for (const r of rows) {
    if (!productsByOrder.has(r.orderId)) productsByOrder.set(r.orderId, new Set())
    productsByOrder.get(r.orderId).add(r.product)
  }
  const pairCounts = new Map()
  let multiItemOrders = 0
  for (const set of productsByOrder.values()) {
    if (set.size < 2) continue
    multiItemOrders++
    const items = [...set].sort()
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const key = `${items[i]} + ${items[j]}`
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
    }
  }
  const pairs = [...pairCounts]
    .map(([pair, count]) => ({ pair, count, share: multiItemOrders ? (count / multiItemOrders) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
  return { pairs, multiItemOrders }
}

// ---------- Everything together ----------

/**
 * Compute every metric for the selected range/filters, plus the comparison period's KPIs
 * rows = output from prepareRows (unfiltered), filters = { from, to, branch, channel }
 */
export function computeDashboard(rows, filters, minDate) {
  const current = filterRows(rows, filters)
  const prevRange = filters.compare ? previousPeriod(filters, minDate) : null
  const previous = prevRange ? filterRows(rows, { ...filters, ...prevRange }) : null
  const monthly = monthlySales(current, filters)

  return {
    rowCount: current.length,
    kpis: computeKpis(current),
    prevKpis: previous ? computeKpis(previous) : null,
    prevRange,
    daily: withMovingAverage(dailySales(current, filters), 7),
    monthly,
    forecast: forecastNextMonth(monthly),
    byBranch: salesByBranch(current),
    topProducts: topProducts(current, 10),
    byHour: salesByHour(current),
    heatmap: weekdayHourMatrix(current),
    byChannel: shareBy(current, 'channel'),
    byPayment: shareBy(current, 'payment'),
    members: memberComparison(current),
    rfm: rfmSegments(current, filters.to),
    basket: basketPairs(current, 10),
  }
}
