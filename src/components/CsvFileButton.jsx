const styles = {
  primary:
    'bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-stone-950',
  subtle:
    'border border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800',
}

/** CSV file-picker button (uses a label wrapping a hidden input so it's keyboard accessible) */
function CsvFileButton({ onFile, variant = 'primary', children }) {
  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = '' // allow picking the same file again
  }

  return (
    <label
      className={`inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-amber-500 ${styles[variant]}`}
    >
      {children}
      <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleChange} />
    </label>
  )
}

export default CsvFileButton
