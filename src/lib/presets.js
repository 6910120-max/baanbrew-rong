// Period presets for the filter (days = count back from the last day in the data)
export const PRESETS = [
  { key: 'all', label: 'presetAll' },
  { key: '7', label: 'preset7', days: 7 },
  { key: '30', label: 'preset30', days: 30 },
  { key: '90', label: 'preset90', days: 90 },
  { key: '365', label: 'preset365', days: 365 },
  { key: 'custom', label: 'presetCustom' },
]
