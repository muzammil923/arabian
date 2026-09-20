import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import { useOrders, useSettings } from '../hooks/queries'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, statusLabel } from '../lib/constants'
import { formatDate, todayIso } from '../lib/format'
import { Card, EmptyState, ErrorBlock, Input, LoadingBlock, Pagination, Select } from '../components/ui'
import { Money, StatusBadge } from '../components/money'
import { PrintReceiptButton } from '../components/PrintReceiptButton'

const LIMIT = 20

export function ReceiptsPage() {
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [dateFrom, setDateFrom] = useState(todayIso())
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const { data: settings } = useSettings()

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      payment_method: paymentMethod || undefined,
      payment_status: paymentStatus || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      limit: LIMIT,
    }),
    [search, paymentMethod, paymentStatus, dateFrom, dateTo, page],
  )

  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(params)
  const rows = data?.rows ?? []

  const resetPage = () => setPage(1)

  return (
    <div className="no-print space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Sales receipts</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Search completed bills and re-print receipts{data ? ` · ${data.total} result(s)` : ''}
          </p>
        </div>
      </div>

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
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value)
              resetPage()
            }}
          >
            <option value="">All payment methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
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
            <option value="">All payment statuses</option>
            <option value="PAID">{statusLabel('PAID')}</option>
            <option value="PARTIALLY_PAID">{statusLabel('PARTIALLY_PAID')}</option>
            <option value="UNPAID">{statusLabel('UNPAID')}</option>
            <option value="REFUNDED">{statusLabel('REFUNDED')}</option>
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
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load receipts.'} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Download className="h-10 w-10" />}
            title="No receipts found"
            description="Adjust the date range or filters, or create a new bill from the POS home screen."
          />
        </Card>
      ) : (
        <Card className={isFetching ? 'opacity-70 transition' : undefined}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Bill</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Date</th>
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
                      {paymentMethod ? (
                        <div className="text-xs uppercase text-slate-400">via {PAYMENT_METHOD_LABELS[paymentMethod]}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{order.customer_name}</div>
                      <div className="text-xs text-slate-500">{order.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      <Money minor={order.total_minor} />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      <Money minor={order.amount_paid_minor} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money
                        minor={order.balance_minor}
                        className={order.balance_minor > 0 ? 'font-semibold text-rose-600' : 'text-slate-500'}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <PrintReceiptButton
                        orderId={order.id}
                        business={settings?.business}
                        settings={settings?.settings}
                      />
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
                  <StatusBadge status={order.payment_status} />
                </div>
                <p className="mt-1 truncate text-sm text-slate-700">{order.customer_name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{formatDate(order.created_at)}</span>
                  <Money minor={order.total_minor} className="font-semibold text-slate-800" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <PrintReceiptButton
                    orderId={order.id}
                    business={settings?.business}
                    settings={settings?.settings}
                    label="Receipt"
                  />
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