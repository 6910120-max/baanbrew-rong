// Calculation logic for the sales dashboard.
// Each row in sales.csv is one line item; several rows can share an order_id.

/** Revenue for one row = qty × unit_price */
export function lineTotal(row) {
  return Number(row.qty) * Number(row.unit_price)
}

/** Total revenue: sum of lineTotal across every row */
export function totalSales(rows) {
  return rows.reduce((sum, row) => sum + lineTotal(row), 0)
}

/** Number of bills = count of unique order_id values (not row count) */
export function countOrders(rows) {
  return new Set(rows.map((row) => row.order_id)).size
}

/** Average per bill = total revenue ÷ number of bills */
export function averageOrderValue(rows) {
  const orders = countOrders(rows)
  return orders === 0 ? 0 : totalSales(rows) / orders
}

/** Unique members = count of distinct customer_id, skipping blanks (walk-in customers) */
export function countUniqueMembers(rows) {
  const members = new Set()
  for (const row of rows) {
    const id = row.customer_id?.trim()
    if (id) members.add(id)
  }
  return members.size
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
function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Daily revenue: sum lineTotal grouped by Thai date,
 * then fill days with no sales as 0 so the line doesn't skip over gaps.
 * Returns [{ date: "2025-04-01", sales: 12345 }, ...] in date order.
 */
export function dailySales(rows) {
  const byDate = new Map()
  for (const row of rows) {
    const date = thaiDate(row.datetime)
    byDate.set(date, (byDate.get(date) ?? 0) + lineTotal(row))
  }
  if (byDate.size === 0) return []

  const dates = [...byDate.keys()].sort()
  const last = dates[dates.length - 1]
  const result = []
  for (let date = dates[0]; date <= last; date = addDays(date, 1)) {
    result.push({ date, sales: byDate.get(date) ?? 0 })
  }
  return result
}

/**
 * Trailing moving average: average of `sales` over the current day and the (window − 1) days before it.
 * Days without a full window yet (the first 6 days for a 7-day window) get null so the chart doesn't draw
 * a misleading partial average.
 * Takes output from dailySales (already zero-filled, so a 7-row window = 7 calendar days)
 * and returns the same array with an extra `avg` field.
 */
export function withMovingAverage(daily, window = 7) {
  let runningSum = 0
  return daily.map((day, i) => {
    runningSum += day.sales
    if (i >= window) runningSum -= daily[i - window].sales // drop the day that slid out of the window
    return { ...day, avg: i >= window - 1 ? runningSum / window : null }
  })
}

/**
 * Revenue by branch: sum lineTotal grouped by branch, sorted highest to lowest.
 * Returns [{ branch: "สยาม", sales: 12345 }, ...]
 */
export function salesByBranch(rows) {
  const byBranch = new Map()
  for (const row of rows) {
    const branch = row.branch?.trim() || 'ไม่ระบุ'
    byBranch.set(branch, (byBranch.get(branch) ?? 0) + lineTotal(row))
  }
  return [...byBranch]
    .map(([branch, sales]) => ({ branch, sales }))
    .sort((a, b) => b.sales - a.sales)
}

/** Bundle every metric the dashboard needs into a single object */
export function computeDashboard(rows) {
  const daily = withMovingAverage(dailySales(rows), 7)
  return {
    totalSales: totalSales(rows),
    orderCount: countOrders(rows),
    averageOrderValue: averageOrderValue(rows),
    memberCount: countUniqueMembers(rows),
    daily,
    byBranch: salesByBranch(rows),
    dateRange: daily.length ? { from: daily[0].date, to: daily[daily.length - 1].date } : null,
  }
}
