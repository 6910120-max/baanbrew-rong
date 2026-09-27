/**
 * Gradient definitions for charts (place inside <defs> of a Recharts chart)
 * direction: 'x' = left→right (horizontal bars), 'y' = top→bottom (vertical bars/area)
 */
function GradientDefs({ id, direction = 'y', from = 'var(--c1)', to = 'var(--c1-soft)', fromOpacity = 1, toOpacity = 1 }) {
  const coords = direction === 'x' ? { x1: 0, y1: 0, x2: 1, y2: 0 } : { x1: 0, y1: 0, x2: 0, y2: 1 }
  const [start, end] = direction === 'x' ? [to, from] : [from, to]
  return (
    <linearGradient id={id} {...coords}>
      <stop offset="0%" style={{ stopColor: start, stopOpacity: direction === 'x' ? toOpacity : fromOpacity }} />
      <stop offset="100%" style={{ stopColor: end, stopOpacity: direction === 'x' ? fromOpacity : toOpacity }} />
    </linearGradient>
  )
}

export default GradientDefs
