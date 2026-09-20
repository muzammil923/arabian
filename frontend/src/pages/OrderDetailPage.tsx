import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BellRing, IndianRupee, MessageCircle, Printer, RotateCcw, Truck } from 'lucide-react'
import {
  useChangeOrderStatus,
  useCreateDelivery,
  useMarkOrderNotified,
  useOrder,
  useRecordPayment,
  useRecordRefund,
  useSettings,
} from '../hooks/queries'
import {
  INTAKE_LABELS,
  ORDER_TRANSITIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  RETURN_LABELS,
  statusLabel,
} from '../lib/constants'
import { formatDateTime, formatMoney, parseMoneyInput } from '../lib/format'
import { formatPhoneDisplay, whatsappLink } from '../lib/phone'
import { Button, Card, CardHeader, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Select } from '../components/ui'
import { Money, StatusBadge } from '../components/money'
import { AddressFields } from '../components/AddressFields'
import { OrderReceipt } from '../components/OrderReceipt'
import { useToast } from '../components/toast'
import type { AddressSnapshot, OrderStatus } from '../types/api'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: order, isLoading, isError, error, refetch } = useOrder(id)
  const { data: settings } = useSettings()
  const changeStatus = useChangeOrderStatus(id ?? '')
  const recordPayment = useRecordPayment(id ?? '')
  const recordRefund = useRecordRefund(id ?? '')
  const markNotified = useMarkOrderNotified(id ?? '')
  const createDelivery = useCreateDelivery()

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [payReference, setPayReference] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState('CASH')
  const [refundNote, setRefundNote] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliverySlot, setDeliverySlot] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState<AddressSnapshot>({
    label: 'Home',
    address_line_1: '',
    city: '',
    postal_code: '',
    country_code: 'IN',
  })

  const transitions = useMemo(() => (order ? ORDER_TRANSITIONS[order.status] ?? [] : []), [order])

  if (isLoading) return <LoadingBlock />
  if (isError || !order) {
    return <ErrorBlock message={(error as Error)?.message ?? 'Order not found.'} onRetry={() => void refetch()} />
  }

  const currency = settings?.business.currency ?? 'INR'
  const taxName = settings?.business.tax_name ?? 'Tax'
  const customer = order.customer
  const canCancel = transitions.includes('CANCELLED')
  const advances = transitions.filter((s) => s !== 'CANCELLED')

  const handleStatus = async (status: OrderStatus) => {
    try {
      await changeStatus.mutateAsync({ status })
      toast.success(`Marked as ${statusLabel(status)}.`)
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not update status.')
    }
  }

  const submitPayment = async () => {
    const amount = parseMoneyInput(payAmount) ?? 0
    if (amount <= 0) return toast.error('Enter a valid amount.')
    try {
      await recordPayment.mutateAsync({
        amount_minor: amount,
        method: payMethod,
        reference: payReference.trim() || null,
        client_request_id: crypto.randomUUID(),
      })
      toast.success('Payment recorded.')
      setPaymentOpen(false)
      setPayAmount('')
      setPayReference('')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not record payment.')
    }
  }

  const submitRefund = async () => {
    const amount = parseMoneyInput(refundAmount) ?? 0
    if (amount <= 0) return toast.error('Enter a valid amount.')
    try {
      await recordRefund.mutateAsync({ amount_minor: amount, method: refundMethod, note: refundNote.trim() || null })
      toast.success('Refund recorded.')
      setRefundOpen(false)
      setRefundAmount('')
      setRefundNote('')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not record refund.')
    }
  }

  const submitDelivery = async () => {
    if (!deliveryAddress.address_line_1) return toast.error('Enter a delivery address.')
    try {
      await createDelivery.mutateAsync({
        order_id: order.id,
        scheduled_date: deliveryDate || null,
        scheduled_slot: deliverySlot || null,
        address: deliveryAddress as unknown as Record<string, unknown>,
      })
      toast.success('Delivery scheduled.')
      setDeliveryOpen(false)
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not schedule delivery.')
    }
  }

  const waMessage = `Hi ${customer?.name ?? ''}, your order ${order.order_number} is now ${statusLabel(order.status)}. Balance due: ${formatMoney(order.balance_minor, currency)}.`

  return (
    <div className="space-y-5">
      <div className="no-print flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader title={order.order_number} subtitle={formatDateTime(order.created_at)} className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Receipt
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="no-print">
            <div className="flex flex-wrap items-center gap-2 p-4 sm:p-5">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.payment_status} />
              {order.customer_notified_at ? (
                <span className="text-xs text-slate-500">Notified {formatDateTime(order.customer_notified_at)}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
              {advances.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="secondary"
                  loading={changeStatus.isPending}
                  onClick={() => handleStatus(status)}
                >
                  {statusLabel(status)}
                </Button>
              ))}
              {canCancel ? (
                <Button size="sm" variant="danger" loading={changeStatus.isPending} onClick={() => handleStatus('CANCELLED')}>
                  Cancel order
                </Button>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Items" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5 text-right">Rate</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800">{item.garment_name ?? 'Garment'}</div>
                        <div className="text-xs text-slate-500">{item.service_name ?? 'Service'}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        <Money minor={item.unit_price_minor} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                        <Money minor={item.line_total_minor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 border-t border-slate-100 p-4 text-sm sm:p-5">
              <SummaryRow label="Subtotal" value={formatMoney(order.subtotal_minor, currency)} />
              {order.discount_minor > 0 ? (
                <SummaryRow label="Discount" value={`- ${formatMoney(order.discount_minor, currency)}`} />
              ) : null}
              <SummaryRow label={taxName} value={formatMoney(order.tax_minor, currency)} />
              <div className="border-t border-slate-100 pt-2">
                <SummaryRow label="Total" value={formatMoney(order.total_minor, currency)} strong />
              </div>
              <SummaryRow label="Paid" value={formatMoney(order.amount_paid_minor, currency)} />
              <SummaryRow
                label="Balance"
                value={formatMoney(order.balance_minor, currency)}
                tone={order.balance_minor > 0 ? 'text-rose-600' : 'text-emerald-600'}
              />
            </div>
          </Card>

          <Card className="no-print">
            <CardHeader
              title="Payments"
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={order.amount_paid_minor <= 0} onClick={() => setRefundOpen(true)}>
                    <RotateCcw className="h-4 w-4" /> Refund
                  </Button>
                  <Button size="sm" disabled={order.balance_minor <= 0} onClick={() => setPaymentOpen(true)}>
                    <IndianRupee className="h-4 w-4" /> Payment
                  </Button>
                </div>
              }
            />
            {(order.payments ?? []).length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No payments recorded.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(order.payments ?? []).map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {payment.type === 'REFUND' ? 'Refund' : 'Payment'} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDateTime(payment.recorded_at)}
                        {payment.note ? ` · ${payment.note}` : ''}
                      </p>
                    </div>
                    <span className={payment.type === 'REFUND' ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-600'}>
                      {payment.type === 'REFUND' ? '-' : '+'}
                      <Money minor={payment.amount_minor} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(order.status_history ?? []).length > 0 ? (
            <Card className="no-print">
              <CardHeader title="History" />
              <ul className="divide-y divide-slate-100">
                {(order.status_history ?? []).map((entry, index) => (
                  <li key={index} className="flex items-center justify-between gap-3 px-4 py-2 text-sm sm:px-5">
                    <span className="text-slate-600">
                      {statusLabel(entry.previous_status)} → <span className="font-medium text-slate-800">{statusLabel(entry.new_status)}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {entry.changed_by_name ?? 'System'} · {formatDateTime(entry.changed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card className="no-print">
            <CardHeader title="Customer" />
            <div className="space-y-2 p-4 sm:p-5">
              <Link to={`/customers/${order.customer_id}`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                {customer?.name ?? 'Customer'}
              </Link>
              <p className="text-sm text-slate-600">{formatPhoneDisplay(customer?.phone_e164)}</p>
              {customer?.email ? <p className="text-sm text-slate-600">{customer.email}</p> : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {customer?.phone_e164 ? (
                  <a href={whatsappLink(customer.phone_e164, waMessage)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="subtle">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                  </a>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  loading={markNotified.isPending}
                  onClick={async () => {
                    try {
                      await markNotified.mutateAsync(!order.customer_notified_at)
                      toast.success('Updated.')
                    } catch (err) {
                      toast.error((err as { message?: string }).message ?? 'Could not update.')
                    }
                  }}
                >
                  <BellRing className="h-4 w-4" /> {order.customer_notified_at ? 'Unmark' : 'Mark'} notified
                </Button>
              </div>
            </div>
          </Card>

          <Card className="no-print">
            <CardHeader title="Fulfilment" />
            <div className="space-y-2 p-4 text-sm sm:p-5">
              <InfoRow label="Intake" value={INTAKE_LABELS[order.intake_method] ?? order.intake_method} />
              <InfoRow label="Return" value={RETURN_LABELS[order.return_method] ?? order.return_method} />
              {order.expected_completion_at ? <InfoRow label="Expected" value={formatDateTime(order.expected_completion_at)} /> : null}
              {order.pickup ? <InfoRow label="Pickup" value={statusLabel(order.pickup.status)} /> : null}
              {order.delivery ? (
                <InfoRow label="Delivery" value={statusLabel(order.delivery.status)} />
              ) : order.return_method === 'HOME_DELIVERY' ? (
                <Button size="sm" variant="secondary" className="mt-1" onClick={() => setDeliveryOpen(true)}>
                  <Truck className="h-4 w-4" /> Schedule delivery
                </Button>
              ) : null}
              {order.notes ? <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{order.notes}</p> : null}
            </div>
          </Card>
        </div>
      </div>

      <OrderReceipt order={order} business={settings?.business} settings={settings?.settings} />

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Record payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button loading={recordPayment.isPending} onClick={submitPayment}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Balance</span>
            <Money minor={order.balance_minor} className="font-semibold text-slate-800" />
          </div>
          <Field label="Amount" required>
            <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
          </Field>
          <Field label="Method">
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference">
            <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="Txn / receipt no." />
          </Field>
          <Button variant="ghost" size="sm" onClick={() => setPayAmount(formatMoney(order.balance_minor, currency).replace(/[^0-9.]/g, ''))}>
            Pay full balance
          </Button>
        </div>
      </Modal>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Record refund"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={recordRefund.isPending} onClick={submitRefund}>
              Refund
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Amount" required>
            <Input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
          </Field>
          <Field label="Method">
            <Select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note">
            <Input value={refundNote} onChange={(e) => setRefundNote(e.target.value)} placeholder="Reason…" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={deliveryOpen}
        onClose={() => setDeliveryOpen(false)}
        title="Schedule delivery"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeliveryOpen(false)}>
              Cancel
            </Button>
            <Button loading={createDelivery.isPending} onClick={submitDelivery}>
              Schedule
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </Field>
            <Field label="Slot">
              <Input value={deliverySlot} onChange={(e) => setDeliverySlot(e.target.value)} placeholder="e.g. 5–7 PM" />
            </Field>
          </div>
          <AddressFields value={deliveryAddress} onChange={setDeliveryAddress} />
        </div>
      </Modal>
    </div>
  )
}

function SummaryRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={strong ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={`tabular-nums ${tone ?? (strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-800')}`}>{value}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}
