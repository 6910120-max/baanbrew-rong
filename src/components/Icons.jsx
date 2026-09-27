// Small icons (inline SVG, colored with currentColor)
const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const SunIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
export const MoonIcon = () => (
  <svg {...base}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)
export const AutoIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18" />
    <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" />
  </svg>
)
export const ChartIcon = () => (
  <svg {...base}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)
export const TableIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M3 15h18M9 4v16" />
  </svg>
)
export const DownloadIcon = () => (
  <svg {...base}>
    <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
  </svg>
)
export const PrintIcon = () => (
  <svg {...base}>
    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="7" />
  </svg>
)
export const FileIcon = () => (
  <svg {...base}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6M12 18v-6M9 15l3 3 3-3" />
  </svg>
)
export const ArrowUpIcon = () => (
  <svg {...base} width={12} height={12} strokeWidth={3}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)
export const ArrowDownIcon = () => (
  <svg {...base} width={12} height={12} strokeWidth={3}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
)
export const CoffeeIcon = () => (
  <svg {...base} width={22} height={22}>
    <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
    <path d="M6 2v2M10 2v2M14 2v2" />
  </svg>
)
