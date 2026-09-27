const numberFormats = new Map()

/** Number with thousands separators, e.g. 4466821 -> "4,466,821" */
export function formatNumber(value, decimals = 0) {
  if (!numberFormats.has(decimals)) {
    numberFormats.set(
      decimals,
      new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    )
  }
  return numberFormats.get(decimals).format(value)
}

/** Amount in baht, e.g. 128.39 -> "฿128.39" */
export function formatBaht(value, decimals = 0) {
  return `฿${formatNumber(value, decimals)}`
}

/** Short baht for chart axes, e.g. 250000 -> "฿250k" */
export function formatBahtCompact(value) {
  if (Math.abs(value) >= 1_000_000) return `฿${formatNumber(value / 1_000_000, 1)}M`
  if (Math.abs(value) >= 1000) return `฿${formatNumber(value / 1000, 0)}k`
  return formatBaht(value)
}

/** Percent, e.g. 46.4467 -> "46.4%" */
export function formatPercent(value, decimals = 1) {
  return `${formatNumber(value, decimals)}%`
}

const toDate = (date) => new Date(`${date.length === 7 ? `${date}-01` : date}T00:00:00Z`)

/**
 * Date formatters for each language. YYYY-MM-DD strings are already Thai dates,
 * so format them in UTC to keep the date from shifting.
 * th uses the Buddhist calendar (2568), en uses the Gregorian calendar (2025)
 */
function buildDateFormatters(lang) {
  const locale = lang === 'th' ? 'th-TH' : 'en-GB'
  const make = (options) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options })
  const axis = make({ day: 'numeric', month: 'short', year: '2-digit' })
  const long = make({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const short = make({ day: 'numeric', month: 'short', year: 'numeric' })
  const month = make({ month: 'short', year: '2-digit' })
  const monthLong = make({ month: 'long', year: 'numeric' })
  return {
    axisDate: (d) => axis.format(toDate(d)), //   th "1 เม.ย. 68"   en "1 Apr 25"
    longDate: (d) => long.format(toDate(d)), //   th "อ. 1 เม.ย. 2568"
    shortDate: (d) => short.format(toDate(d)), // th "1 เม.ย. 2568"
    month: (m) => month.format(toDate(m)), //     th "เม.ย. 68"      en "Apr 25"
    monthLong: (m) => monthLong.format(toDate(m)),
  }
}

const dateFormatters = { th: buildDateFormatters('th'), en: buildDateFormatters('en') }

export function getDateFormatters(lang) {
  return dateFormatters[lang] ?? dateFormatters.th
}
