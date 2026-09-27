import { FileIcon } from './Icons'

const styles = {
  primary: 'bg-grad text-white shadow-sm hover:brightness-110',
  glass: 'bg-white/15 text-white hover:bg-white/25',
}

/** CSV file-picker button (uses a label wrapping a hidden input so it's keyboard accessible) */
function CsvFileButton({ onFile, variant = 'primary', iconOnly = false, children }) {
  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = '' // allow picking the same file again
  }

  return (
    <label
      title={typeof children === 'string' ? children : undefined}
      className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-within:ring-2 focus-within:ring-white ${styles[variant]}`}
    >
      <FileIcon />
      <span className={iconOnly ? 'sr-only sm:not-sr-only' : ''}>{children}</span>
      <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleChange} />
    </label>
  )
}

export default CsvFileButton
