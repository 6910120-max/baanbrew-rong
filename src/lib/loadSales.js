import Papa from 'papaparse'

// Columns metrics.js needs
const REQUIRED_COLUMNS = ['order_id', 'datetime', 'branch', 'qty', 'unit_price', 'customer_id']

/** Error when the data file can't be found (Vercel returns 404, Vite dev returns index.html instead) */
export class SalesFileMissingError extends Error {
  constructor() {
    super('sales.csv not found')
    this.name = 'SalesFileMissingError'
  }
}

/** Error when the file is missing required columns (keeps the column list so the UI can show it in either language) */
export class MissingColumnsError extends Error {
  constructor(columns) {
    super(`Missing columns: ${columns.join(', ')}`)
    this.name = 'MissingColumnsError'
    this.columns = columns
  }
}

/** Convert CSV text into an array of rows and check the required columns are all present */
export function parseSalesCsv(text) {
  return parseCsv(text, REQUIRED_COLUMNS)
}

/** Parse any CSV: header row, skip blank lines, trim column names; throws MissingColumnsError if required columns are missing */
export function parseCsv(text, requiredColumns = []) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(), // trim() also strips the BOM (U+FEFF) Excel adds to the first column name
  })
  const fields = result.meta.fields ?? []
  const missing = requiredColumns.filter((col) => !fields.includes(col))
  if (missing.length > 0) throw new MissingColumnsError(missing)
  return result.data
}

/** Load the CSV from a URL on the server (e.g. /sales.csv) */
export async function loadSalesFromUrl(url) {
  const res = await fetch(url)
  const isHtml = res.headers.get('content-type')?.includes('text/html')
  if (!res.ok || isHtml) throw new SalesFileMissingError()
  return parseSalesCsv(await res.text())
}

/** Load the CSV from a file the user picks (read in the browser only, never uploaded) */
export async function loadSalesFromFile(file) {
  return parseSalesCsv(await file.text())
}

/**
 * Load an extra CSV (customers.csv, branches.csv); returns null if the file isn't there
 * so the matching section just hides instead of breaking the whole page
 */
export async function loadOptionalCsv(url, requiredColumns) {
  try {
    const res = await fetch(url)
    const isHtml = res.headers.get('content-type')?.includes('text/html')
    if (!res.ok || isHtml) return null
    return parseCsv(await res.text(), requiredColumns)
  } catch {
    return null
  }
}
