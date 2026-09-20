import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HandCoins, Phone } from 'lucide-react'
import { useOrders, useRecordPayment, useSettings } from '../hooks/queries'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, statusLabel } from '../lib/constants'
import { formatMoney, formatDate, parseMoneyInput } from '../lib/format'
import { formatPhoneDisplay, whatsappLink } from '../lib/phone'
import { Button, Card, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, Select, Textarea } from '../components/ui'
import { Money, StatusBadge } from '../components/money'
import { useToast } from '../components/toast'
import type { OrderListItem } from '../types/api'

const LIMIT = 200

interface CustomerGroup {
  customer_id: string
  customer_name: string
  customer_phone: string
  outstanding_minor: number
  orders: OrderListItem[]
}

function groupByCustomer(rows: OrderListItem[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>()
  for (const order of rows) {
    const existing = map.get(order.customer_id)
    if (existing) {
      existing.orders.push(order)
      existing.outstanding_minor += order.balance_minor
    } else {
      map.set(order.customer_id, {
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        outstanding_minor: order.balance_minor,
        orders: [order],
      })
    }
  }
  return [...map.values()].sort((a, b) => b.outstanding_minor - a.outstanding_minor)
}

export function CreditCollectionPage() {
  const { data: settings } = useSettings()
  const unpaid = useOrders({ payment_status: 'UNPAID', limit: LIMIT })
  const partial = useOrders({ payment_status: 'PARTIALLY_PAID', limit: LIMIT })
  const [payingOrder, setPayingOrder] = useState<OrderListItem | null>(null)

  const loading = unpaid.isLoading || partial.isLoading
  const error = unpaid.error ?? partial.error

  const groups = useMemo(() => {
    const merged = new Map<string, OrderListItem>()
    for (const row of unpaid.data?.rows ?? []) merged.set(row.id, row)
    for (const row of partial.data?.rows ?? []) if (!merged.has(row.id)) merged.set(row.id, row)
    return groupByCustomer([...merged.values()])
  }, [unpaid.data, partial.data])

  const currency = settings?.business.currency ?? 'INR'
  const totalOutstanding = groups.reduce((sum, g) => sum + g.outstanding_minor, 0)
  const whatsappNotes = settings?.settings.whatsapp_notes

  const reminderMessage = (group: CustomerGroup) => {
    const numbers = group.orders.map((o) => o.order_number).join(', ')
    const base = `Hi ${group.customer_name}, you have an outstanding balance of ${formatMoney(
      group.outstanding_minor,
      currency,
    )} on order(s) ${numbers} at ${settings?.business.name ?? 'our store'}. Please clear the pending payment at your earliest convenience. Thank you!`
    return whatsappNotes ? `${base}\n\n${whatsappNotes}` : base
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Credit collection</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {groups.length > 0
              ? `${groups.length} customer(s) owe ${formatMoney(totalOutstanding, currency)} in total`
              : 'Collect dues and send reminders from the counter'}
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading outstanding…" />
      ) : error ? (
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load outstanding.'} />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HandCoins className="h-10 w-10" />}
            title="Nothing outstanding"
            description="Every customer is settled up. New unpaid bills will appear here automatically."
          />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.customer_id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/customers/${group.customer_id}`} className="font-semibold text-slate-900 hover:text-brand-700">
                    {group.customer_name}
                  </Link>
                  <p className="text-sm text-slate-500">{formatPhoneDisplay(group.customer_phone)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Outstanding</p>
                  <p className="text-lg font-bold tabular-nums text-rose-600">
                    <Money minor={group.outstanding_minor} />
                  </p>
                </div>
              </div>

              <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
                {group.orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <Link to={`/orders/${order.id}`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                        {order.order_number}
                      </Link>
                      <span className="ml-2 text-xs text-slate-400">{formatDate(order.created_at)}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <StatusBadge status={order.payment_status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        <Money minor={order.balance_minor} />
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => setPayingOrder(order)}>
                        Collect
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={whatsappLink(group.customer_phone, reminderMessage(group))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Send WhatsApp reminder
                </a>
                <a
                  href={`tel:${group.customer_phone}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
                <span className="inline-flex h-9 items-center rounded-lg bg-slate-100 px-3.5 text-xs font-medium text-slate-500">
                  {group.orders.length} open bill(s)
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CollectModal order={payingOrder} onClose={() => setPayingOrder(null)} />
    </div>
  )
}

function CollectModal({ order, onClose }: { order: OrderListItem | null; onClose: () => void }) {
  const toast = useToast()
  const record = useRecordPayment(order?.id ?? '')
  const { data: settings } = useSettings()
  const currency = settings?.business.currency ?? 'INR'
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [note, setNote] = useState('')

  const submit = async () => {
    if (!order) return
    const amountMinor = parseMoneyInput(amount)
    if (!amountMinor || amountMinor <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    if (amountMinor > order.balance_minor) {
      toast.error('Amount exceeds the outstanding balance.')
      return
    }
    try {
      await record.mutateAsync({ amount_minor: amountMinor, method, note: note.trim() || null })
      toast.success(`Collected ${formatMoney(amountMinor, currency)} on ${order.order_number}.`)
      onClose()
      setAmount('')
      setNote('')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not record payment.')
    }
  }

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title={`Collect payment — ${order?.order_number ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={record.isPending} onClick={() => void submit()}>
            Record payment
          </Button>
        </>
      }
    >
      {order ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Customer:</span>{' '}
            <span className="font-medium text-slate-900">{order.customer_name}</span>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Outstanding:</span>{' '}
            <span className="font-semibold text-rose-600">
              <Money minor={order.balance_minor} />
            </span>
          </div>
          <Field label={order.balance_minor > 0 ? 'Amount received' : 'Amount'} required>
            <Input
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder={formatMoney(order.balance_minor, currency)}
            />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. collected at counter" />
          </Field>
          <p className="text-xs text-slate-500">
            Payment status for {order.order_number} is currently {statusLabel(order.payment_status)}.
          </p>
        </div>
      ) : null}
    </Modal>
  )
}