import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Truck } from 'lucide-react'
import { useChangeOrderStatusById, useDashboard, useDeliveries, useOrders, useSettings } from '../hooks/queries'
import { statusLabel, ORDER_TRANSITIONS } from '../lib/constants'
import { formatDate, formatTime } from '../lib/format'
import { Button, Card, EmptyState, ErrorBlock, LoadingBlock, Pagination } from '../components/ui'
import { Money, StatusBadge } from '../components/money'
import { PrintReceiptButton } from '../components/PrintReceiptButton'
import { useToast } from '../components/toast'
import { cn } from '../lib/cn'
import type { OrderStatus } from '../types/api'

const LIMIT = 20

const ACTIVE_STATUSES: OrderStatus[] = ['RECEIVED', 'WASHING', 'DRYING', 'IRONING', 'READY']
type Tab = 'ALL' | OrderStatus | 'OUT_FOR_DELIVERY'

export function SaleStatusPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('ALL')
  const [page, setPage] = useState(1)
  const { data: dashboard } = useDashboard()
  const { data: settings } = useSettings()

  const statusParam = tab === 'ALL' || tab === 'OUT_FOR_DELIVERY' ? undefined : tab
  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(
    useMemo(
      () => ({ status: statusParam, limit: LIMIT, page }),
      [statusParam, page],
    ),
  )

  const deliveriesQuery = useDeliveries({ filter: 'out', limit: 50 })

  const changeStatus = useChangeOrderStatusById()
  const rows = tab === 'OUT_FOR_DELIVERY' ? [] : (data?.rows ?? [])

  const advancement = (status: OrderStatus) => ORDER_TRANSITIONS[status]?.filter((s) => s !== 'CANCELLED') ?? []

  const advanceTo = async (orderId: string, target: OrderStatus) => {
    try {
      await changeStatus.mutateAsync({ orderId, status: target })
      toast.success(`Order marked ${statusLabel(target)}.`)
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not update status.')
    }
  }

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of dashboard?.status_overview ?? []) map.set(entry.status, entry.count)
    return map
  }, [dashboard])

  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'ALL', label: 'All orders' },
    ...ACTIVE_STATUSES.map((s) => ({ key: s as Tab, label: statusLabel(s), count: counts.get(s) ?? 0 })),
    { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', count: deliveriesQuery.data?.total ?? 0 },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Sale status</h1>
        <p className="mt-0.5 text-sm text-slate-500">Track order progress and move work through the line</p>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key)
              setPage(1)
            }}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition',
              tab === t.key ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
            )}
          >
            {t.label}
            {typeof t.count === 'number' ? (
              <span className={cn('rounded-full px-1.5 text-xs font-bold', tab === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'OUT_FOR_DELIVERY' ? (
        <Card>
          {deliveriesQuery.isLoading ? (
            <LoadingBlock />
          ) : deliveriesQuery.isError ? (
            <ErrorBlock
              message={(deliveriesQuery.error as Error)?.message ?? 'Failed to load deliveries.'}
              onRetry={() => void deliveriesQuery.refetch()}
            />
          ) : (deliveriesQuery.data?.rows?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Truck className="h-10 w-10" />}
              title="Nothing out for delivery right now"
              description="Orders on their way to customers will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {deliveriesQuery.data?.rows.map((delivery) => (
                <li key={delivery.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 shrink-0 text-brand-600" />
                      {delivery.order_id ? (
                        <Link to={`/orders/${delivery.order_id}`} className="font-semibold text-brand-700 hover:text-brand-800">
                          {delivery.order_number ?? 'Order'}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-700">{delivery.order_number ?? 'Delivery'}</span>
                      )}
                      <StatusBadge status={delivery.status} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {delivery.customer_name}
                      {delivery.customer_phone ? ` · ${delivery.customer_phone}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {delivery.scheduled_date ? `Due ${formatDate(delivery.scheduled_date)}` : 'Scheduled'}
                      {delivery.scheduled_slot ? ` · ${delivery.scheduled_slot}` : ''}
                      {delivery.staff_name ? ` · by ${delivery.staff_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {delivery.order_id ? (
                      <PrintReceiptButton
                        orderId={delivery.order_id}
                        business={settings?.business}
                        settings={settings?.settings}
                      />
                    ) : null}
                    <Button variant="secondary" size="sm" onClick={() => delivery.order_id && window.open(`/orders/${delivery.order_id}`, '_blank')}>
                      View order
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load orders.'} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Activity className="h-10 w-10" />}
            title={statusParam ? `No orders in ${statusLabel(statusParam).toLowerCase()}` : 'No active orders'}
            description="New bills appear here as soon as they are created at the counter."
          />
        </Card>
      ) : (
        <Card className={isFetching ? 'opacity-70 transition' : undefined}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/orders/${order.id}`} className="font-semibold text-brand-700 hover:text-brand-800">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{order.customer_name}</div>
                      <div className="text-xs text-slate-500">{order.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money
                        minor={order.balance_minor}
                        className={order.balance_minor > 0 ? 'font-semibold text-rose-600' : 'text-slate-500'}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(order.updated_at)} {order.updated_at ? formatTime(order.updated_at) : ''}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {advancement(order.status).length > 0 ? (
                          <select
                            value=""
                            onChange={(e) => e.target.value && void advanceTo(order.id, e.target.value as OrderStatus)}
                            className="h-8 rounded-lg bg-brand-50 px-2 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200"
                          >
                            <option value="">Move to…</option>
                            {advancement(order.status).map((next) => (
                              <option key={next} value={next}>
                                {statusLabel(next)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400">Final</span>
                        )}
                        <PrintReceiptButton
                          orderId={order.id}
                          business={settings?.business}
                          settings={settings?.settings}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((order) => (
              <li key={order.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/orders/${order.id}`} className="font-semibold text-brand-700">
                    {order.order_number}
                  </Link>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 truncate text-sm text-slate-700">{order.customer_name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{formatDate(order.updated_at)} · {formatTime(order.updated_at)}</span>
                  <Money minor={order.balance_minor} className={order.balance_minor > 0 ? 'font-semibold text-rose-600' : ''} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {advancement(order.status).length > 0 ? (
                    <select
                      value=""
                      onChange={(e) => e.target.value && void advanceTo(order.id, e.target.value as OrderStatus)}
                      className="h-8 rounded-lg bg-brand-50 px-2 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200"
                    >
                      <option value="">Move to…</option>
                      {advancement(order.status).map((next) => (
                        <option key={next} value={next}>
                          {statusLabel(next)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-400">Final</span>
                  )}
                  {order.status === 'READY' && order.return_method === 'HOME_DELIVERY' ? (
                    <Link
                      to={`/orders/${order.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200"
                    >
                      <Truck className="h-3.5 w-3.5" /> Schedule delivery
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
        </Card>
      )}
    </div>
  )
}