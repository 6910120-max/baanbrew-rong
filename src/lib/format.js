const numberFormats = new Map()

/** Number with thousands separators, e.g. 4466821 -> "4,466,821" */
export function formatNumber(value, decimals = 0) {
  if (!numberFormats.has(decimals)) {
    numberFormats.set(
      decimals,
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    )
  }
  return numberFormats.get(decimals).format(value)
}

/** Amount in baht, e.g. 128.39 -> "฿128.39" */
export function formatBaht(value, decimals = 0) {
  return `฿${formatNumber(value, decimals)}`
}

// YYYY-MM-DD strings are already Thai dates, so format them in UTC to keep the date from shifting
const longDate = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  weekday: 'short',
  timeZone: 'UTC',
})
const axisDate = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
})
const shortDate = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const toDate = (date) => new Date(`${date}T00:00:00Z`)

export const formatLongDate = (date) => longDate.format(toDate(date))
/** Short date for the axis, e.g. "2025-04-01" -> "1 เม.ย. 68" */
export const formatAxisDate = (date) => axisDate.format(toDate(date))
export const formatShortDate = (date) => shortDate.format(toDate(date))
