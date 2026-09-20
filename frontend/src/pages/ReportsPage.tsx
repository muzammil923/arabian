import { useMemo, useState } from 'react'
import { useDeliveryReport, usePickupReport, useRevenueReport, useStaffReport } from '../hooks/queries'
import { REPORT_RANGES, PAYMENT_METHOD_LABELS, statusLabel } from '../lib/constants'
import { formatDate, formatMoney } from '../lib/format'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../components/money'
import { Card, CardHeader, EmptyState, ErrorBlock, Field, Input, LoadingBlock, PageHeader } from '../components/ui'
import { cn } from '../lib/cn'
import type { ReportRange } from '../types/api'

export function ReportsPage() {
  const { role } = useAuth()
  const currency = useCurrency()
  const [range, setRange] = useState<ReportRange>('last7')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const params = useMemo(
    () => (range === 'custom' ? { range, from, to } : { range }),
    [range, from, to],
  )

  const revenue = useRevenueReport(params)
  const pickups = usePickupReport(params)
  const deliveries = useDeliveryReport(params)
  const staff = useStaffReport(params)
  const canSeeStaff = role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER'

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Sales and operational analytics" />

      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-2">
          {REPORT_RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition',
                range === option.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
              )}
            >
              {option.label}
            </button>
          ))}
          {range === 'custom' ? (
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2">
              <Field label="From">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
          ) : null}
        </div>
      </Card>

      {revenue.isLoading ? (
        <LoadingBlock />
      ) : revenue.isError || !revenue.data ? (
        <ErrorBlock message={(revenue.error as Error)?.message ?? 'Failed to load reports.'} onRetry={() => void revenue.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Revenue" value={formatMoney(revenue.data.summary.total_revenue_minor, currency)} />
            <Stat label="Payments" value={formatMoney(revenue.data.summary.total_payments_minor, currency)} />
            <Stat label="Orders" value={`${revenue.data.summary.paid_orders}/${revenue.data.summary.total_orders} paid`} />
            <Stat
              label="Outstanding"
              value={formatMoney(revenue.data.summary.outstanding_minor, currency)}
              tone={revenue.data.summary.outstanding_minor > 0 ? 'text-rose-600' : undefined}
            />
          </div>

          <Card>
            <CardHeader title="Revenue by day" />
            {revenue.data.series.length === 0 ? (
              <EmptyState title="No data for this period" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {revenue.data.series.map((point) => {
                  const max = Math.max(...revenue.data.series.map((p) => p.revenue_minor), 1)
                  return (
                    <li key={point.date} className="px-4 py-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{formatDate(point.date)}</span>
                        <span className="font-medium text-slate-800">{formatMoney(point.revenue_minor, currency)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((point.revenue_minor / max) * 100)}%` }} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{point.orders} order(s)</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard title="Payment methods" rows={revenue.data.payment_breakdown.map((p) => ({ label: PAYMENT_METHOD_LABELS[p.method] ?? p.method, value: formatMoney(p.amount_minor, currency), extra: `${p.count}` }))} />
            <BreakdownCard title="Branches" rows={revenue.data.branch_breakdown.map((b) => ({ label: b.branch_name, value: formatMoney(b.revenue_minor, currency), extra: `${b.orders}` }))} />
            <BreakdownCard title="Services" rows={revenue.data.service_breakdown.map((s) => ({ label: s.service_name, value: formatMoney(s.revenue_minor, currency), extra: `${s.quantity}` }))} />
            <BreakdownCard title="Garments" rows={revenue.data.garment_breakdown.map((g) => ({ label: g.garment_type_name, value: formatMoney(g.revenue_minor, currency), extra: `${g.quantity}` }))} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <LogisticsCard
              title="Pickups"
              report={pickups.data}
              loading={pickups.isLoading}
              breakdownKey="pickup_breakdown"
            />
            <LogisticsCard
              title="Deliveries"
              report={deliveries.data}
              loading={deliveries.isLoading}
              breakdownKey="delivery_breakdown"
            />
          </div>

          {canSeeStaff ? (
            <Card>
              <CardHeader title="Staff performance" />
              {staff.isLoading ? (
                <LoadingBlock />
              ) : (staff.data ?? []).length === 0 ? (
                <EmptyState title="No staff activity for this period" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2.5">Staff</th>
                        <th className="px-4 py-2.5 text-right">Orders</th>
                        <th className="px-4 py-2.5 text-right">Sales</th>
                        <th className="px-4 py-2.5 text-right">Payments</th>
                        <th className="px-4 py-2.5 text-right">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(staff.data ?? []).map((row) => (
                        <tr key={row.user_id} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-2.5 font-medium text-slate-800">{row.user_name}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{row.orders_created}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{formatMoney(row.total_sales_minor, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{row.payments_recorded}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{formatMoney(row.payment_amount_minor, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-3 sm:p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${tone ?? 'text-slate-900'}`}>{value}</p>
    </Card>
  )
}

function BreakdownCard({ title, rows }: { title: string; rows: Array<{ label: string; value: string; extra?: string }> }) {
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <EmptyState title="No data" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span className="truncate text-slate-600">
                {row.label}
                {row.extra ? <span className="ml-1 text-xs text-slate-400">({row.extra})</span> : null}
              </span>
              <span className="font-medium tabular-nums text-slate-800">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function LogisticsCard({
  title,
  report,
  loading,
  breakdownKey,
}: {
  title: string
  report: import('../types/api').LogisticsReport | undefined
  loading: boolean
  breakdownKey: 'pickup_breakdown' | 'delivery_breakdown'
}) {
  const rows = report?.[breakdownKey] ?? []
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={report ? `${report.total} total · ${report.today_count} today` : undefined}
      />
      {loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No data" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.status} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-slate-600">{statusLabel(row.status)}</span>
              <span className="font-medium text-slate-800">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
