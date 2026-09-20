import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useChangeDeliveryStatus, useDeliveries } from '../hooks/queries'
import { DELIVERY_TRANSITIONS, statusLabel } from '../lib/constants'
import { formatDate, formatDateTime } from '../lib/format'
import { formatPhoneDisplay } from '../lib/phone'
import { cn } from '../lib/cn'
import { Button, Card, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Pagination } from '../components/ui'
import { Money, StatusBadge } from '../components/money'
import { useToast } from '../components/toast'
import type { AddressSnapshot, DeliveryRow } from '../types/api'

const LIMIT = 20

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'out', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

function parseAddress(snapshot: string): AddressSnapshot | null {
  try {
    return JSON.parse(snapshot) as AddressSnapshot
  } catch {
    return null
  }
}

export function DeliveriesPage() {
  const toast = useToast()
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [failTarget, setFailTarget] = useState<DeliveryRow | null>(null)
  const [failureReason, setFailureReason] = useState('')
  const { data, isLoading, isError, error, refetch } = useDeliveries({ filter: filter || undefined, page, limit: LIMIT })
  const changeStatus = useChangeDeliveryStatus()

  const rows = data?.rows ?? []

  const updateStatus = async (id: string, status: DeliveryRow['status'], reason?: string) => {
    try {
      await changeStatus.mutateAsync({ id, status, failure_reason: reason ?? null })
      toast.success(`Marked as ${statusLabel(status)}.`)
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not update delivery.')
    }
  }

  const submitFailure = async () => {
    if (!failTarget) return
    if (!failureReason.trim()) return toast.error('Enter a failure reason.')
    await updateStatus(failTarget.id, 'FAILED', failureReason.trim())
    setFailTarget(null)
    setFailureReason('')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Deliveries" subtitle={data ? `${data.total} delivery(ies)` : undefined} />

      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setFilter(option.value)
              setPage(1)
            }}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
              filter === option.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load deliveries.'} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="No deliveries" description="Deliveries scheduled from orders will appear here." />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {rows.map((delivery) => {
              const address = parseAddress(delivery.address_snapshot)
              const next = DELIVERY_TRANSITIONS[delivery.status] ?? []
              return (
                <li key={delivery.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {delivery.order_number ? (
                        <Link
                          to={`/orders/${delivery.order_id}`}
                          className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                        >
                          {delivery.order_number}
                        </Link>
                      ) : null}
                      <p className="truncate text-sm text-slate-700">{delivery.customer_name ?? 'Customer'}</p>
                      <p className="text-xs text-slate-500">{formatPhoneDisplay(delivery.customer_phone)}</p>
                      {address ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {address.address_line_1}
                          {address.city ? `, ${address.city}` : ''}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(delivery.scheduled_date)}
                        {delivery.scheduled_slot ? ` · ${delivery.scheduled_slot}` : ''}
                        {delivery.staff_name ? ` · ${delivery.staff_name}` : ''}
                      </p>
                      {delivery.order_balance_minor !== undefined ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Balance: <Money minor={delivery.order_balance_minor} />
                        </p>
                      ) : null}
                      {delivery.failure_reason ? (
                        <p className="mt-1 text-xs text-rose-600">Failed: {delivery.failure_reason}</p>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-slate-400">{formatDateTime(delivery.created_at)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <StatusBadge status={delivery.status} />
                    {next.length > 0 ? (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {next.map((status) =>
                          status === 'FAILED' ? (
                            <Button key={status} size="sm" variant="danger" onClick={() => setFailTarget(delivery)}>
                              {statusLabel(status)}
                            </Button>
                          ) : (
                            <Button
                              key={status}
                              size="sm"
                              variant={status === 'CANCELLED' ? 'danger' : 'secondary'}
                              onClick={() => updateStatus(delivery.id, status)}
                            >
                              {statusLabel(status)}
                            </Button>
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
        </Card>
      )}

      <Modal
        open={Boolean(failTarget)}
        onClose={() => setFailTarget(null)}
        title="Mark delivery failed"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFailTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={changeStatus.isPending} onClick={submitFailure}>
              Mark failed
            </Button>
          </>
        }
      >
        <Field label="Failure reason" required>
          <Input value={failureReason} onChange={(e) => setFailureReason(e.target.value)} placeholder="Customer unavailable…" autoFocus />
        </Field>
      </Modal>
    </div>
  )
}
