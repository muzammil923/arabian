import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useOrders } from '../hooks/queries'
import { ORDER_STATUSES, statusLabel } from '../lib/constants'
import { formatDate } from '../lib/format'
import { Button, Card, EmptyState, ErrorBlock, Input, LoadingBlock, PageHeader, Pagination, Select } from '../components/ui'
import { Money, StatusBadge } from '../components/money'

const LIMIT = 20
const PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED']

export function OrdersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      limit: LIMIT,
    }),
    [search, status, paymentStatus, dateFrom, dateTo, page],
  )

  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(params)
  const rows = data?.rows ?? []

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        subtitle={data ? `${data.total} order(s)` : undefined}
        action={
          <Button onClick={() => navigate('/orders/new')}>
            <Plus className="h-4 w-4" /> New order
          </Button>
        }
      />

      <Card className="p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                resetPage()
              }}
              placeholder="Search order #, customer, phone…"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              resetPage()
            }}
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
          <Select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value)
              resetPage()
            }}
          >
            <option value="">All payments</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                resetPage()
              }}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                resetPage()
              }}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load orders.'} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No orders found"
            description="Try adjusting the filters or create a new order."
            action={
              <Button onClick={() => navigate('/orders/new')}>
                <Plus className="h-4 w-4" /> New order
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className={isFetching ? 'opacity-70 transition' : undefined}>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Created</th>
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
                    <td className="px-4 py-3 text-slate-600">{order.item_count}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      <Money minor={order.total_minor} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money minor={order.balance_minor} className={order.balance_minor > 0 ? 'font-semibold text-rose-600' : 'text-slate-500'} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((order) => (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-brand-700">{order.order_number}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-700">{order.customer_name}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{formatDate(order.created_at)} · {order.item_count} item(s)</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={order.payment_status} />
                      <Money minor={order.total_minor} className="font-semibold text-slate-800" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
        </Card>
      )}
    </div>
  )
}
