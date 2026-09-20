import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  IndianRupee,
  Package,
  Search,
  ShoppingBag,
  Truck,
  Wallet,
} from 'lucide-react'
import { useDashboard } from '../hooks/queries'
import { Card, CardHeader, EmptyState, ErrorBlock, LoadingBlock } from '../components/ui'
import { Money, StatusBadge } from '../components/money'
import { PageHeader } from '../components/ui'
import { formatDateTime, formatTime } from '../lib/format'

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard()

  if (isLoading) return <LoadingBlock />
  if (isError || !data) return <ErrorBlock message={(error as Error)?.message ?? 'Failed to load dashboard.'} onRetry={() => void refetch()} />

  const stats = [
    { label: "Today's orders", value: String(data.today.orders_count), icon: <ShoppingBag className="h-5 w-5" />, tone: 'text-sky-600 bg-sky-50' },
    { label: "Today's revenue", value: <Money minor={data.today.revenue_orders_minor} />, icon: <IndianRupee className="h-5 w-5" />, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Ready for pickup', value: String(data.today.ready_count), icon: <Package className="h-5 w-5" />, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Outstanding', value: <Money minor={data.today.outstanding_minor} />, icon: <Wallet className="h-5 w-5" />, tone: 'text-rose-600 bg-rose-50' },
    { label: 'Pickups today', value: String(data.today.pickups_count), icon: <Search className="h-5 w-5" />, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Deliveries today', value: String(data.today.deliveries_count), icon: <Truck className="h-5 w-5" />, tone: 'text-violet-600 bg-violet-50' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle="Today at a glance" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-3.5">
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${stat.tone}`}>
              {stat.icon}
            </div>
            <p className="text-lg font-bold text-slate-900">{stat.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent orders"
            action={
              <Link to="/orders" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            }
          />
          {data.recent_orders.length === 0 ? (
            <EmptyState title="No orders yet" description="Create your first order to see it here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_orders.map((order) => (
                <li key={order.id}>
                  <Link to={`/orders/${order.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{order.order_number}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {order.customer_name} · {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Money minor={order.total_minor} className="text-sm font-semibold text-slate-900" />
                      <div className="mt-0.5">
                        <StatusBadge status={order.payment_status} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Orders by status" />
          <div className="space-y-2 p-4">
            {data.status_overview.length === 0 ? (
              <p className="text-sm text-slate-500">No active orders.</p>
            ) : (
              data.status_overview.map((row) => (
                <div key={row.status} className="flex items-center justify-between gap-2">
                  <StatusBadge status={row.status} />
                  <span className="text-sm font-semibold text-slate-700">{row.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Next pickups" action={<Link to="/pickups" className="text-xs font-medium text-brand-700">All</Link>} />
          {data.next_pickups.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.next_pickups.map((pickup) => (
                <li key={pickup.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{pickup.customer_name}</p>
                    <p className="text-xs text-slate-500">
                      {pickup.scheduled_date} {pickup.scheduled_slot ? `· ${pickup.scheduled_slot}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={pickup.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Next deliveries" action={<Link to="/deliveries" className="text-xs font-medium text-brand-700">All</Link>} />
          {data.next_deliveries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.next_deliveries.map((delivery) => (
                <li key={delivery.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{delivery.order_number}</p>
                    <p className="truncate text-xs text-slate-500">{delivery.customer_name}</p>
                  </div>
                  <StatusBadge status={delivery.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Needs attention" action={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
          {data.attention.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">All caught up.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.attention.map((order) => (
                <li key={order.id}>
                  <Link to={`/orders/${order.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{order.order_number}</p>
                      <p className="truncate text-xs text-slate-500">{order.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={order.status} />
                      {order.expected_completion_at ? (
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3" /> {formatTime(order.expected_completion_at)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Outstanding balances" />
        {data.outstanding.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">No outstanding balances.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.outstanding.map((order) => (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{order.order_number}</p>
                    <p className="truncate text-xs text-slate-500">{order.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money minor={order.balance_minor} className="text-sm font-semibold text-rose-600" />
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
