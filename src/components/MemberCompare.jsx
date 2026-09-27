import { formatBaht, formatNumber, formatPercent } from '../lib/format'
import { useI18n } from '../lib/i18n'

/** Members vs walk-ins: a 100% share bar + side-by-side figures + repeat-purchase rate */
function MemberCompare({ data }) {
  const { t } = useI18n()
  const groups = [
    { key: 'member', label: t('member'), color: 'var(--c1)', ...data.member },
    { key: 'walkIn', label: t('walkIn'), color: 'var(--c2)', ...data.walkIn },
  ]

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1.5 text-sm text-ink-2">{t('salesShare')}</p>
        {/* 2px gap between the two parts so they read clearly as separate segments */}
        <div className="flex h-7 gap-0.5 overflow-hidden rounded-lg">
          {groups.map((g) => (
            <div
              key={g.key}
              className="flex items-center justify-center text-xs font-semibold text-white"
              style={{ width: `${g.share}%`, background: g.color }}
            >
              {g.share >= 12 && formatPercent(g.share)}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {groups.map((g) => (
          <div key={g.key} className="rounded-xl bg-surface-2 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
              {g.label}
            </p>
            <dl className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">{t('colSales')}</dt>
                <dd className="font-semibold tabular-nums text-ink">{formatBaht(g.sales)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">{t('colOrders')}</dt>
                <dd className="tabular-nums text-ink">{formatNumber(g.orders)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">{t('colAov')}</dt>
                <dd className="tabular-nums text-ink">{formatBaht(g.aov, 2)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
        <p className="text-sm text-ink-2">{t('repeatRate')}</p>
        <p className="text-xl font-semibold tabular-nums text-brand">{formatPercent(data.repeatRate)}</p>
      </div>
    </div>
  )
}

export default MemberCompare
