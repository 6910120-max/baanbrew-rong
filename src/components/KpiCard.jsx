function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs text-stone-500 sm:text-sm dark:text-stone-400">{label}</p>
      <p className="mt-1 text-xl font-semibold sm:mt-2 sm:text-3xl tabular-nums text-stone-900 dark:text-stone-50">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">{hint}</p>}
    </div>
  )
}

export default KpiCard
