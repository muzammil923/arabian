import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react'
import {
  useCreateOrder,
  useCustomer,
  useServices,
  useSettings,
} from '../hooks/queries'
import { canApplyDiscount } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'
import { formatMoney, parseMoneyInput } from '../lib/format'
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from '../components/ui'
import { CustomerPicker } from '../components/CustomerPicker'
import { useToast } from '../components/toast'
import type { Customer } from '../types/api'

interface ItemDraft {
  key: string
  serviceId: string
  garmentId: string
  quantity: number
  notes: string
}

let itemCounter = 0
function blankItem(): ItemDraft {
  itemCounter += 1
  return { key: `item-${itemCounter}`, serviceId: '', garmentId: '', quantity: 1, notes: '' }
}

export function NewOrderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedCustomerId = searchParams.get('customer') ?? undefined
  const toast = useToast()
  const { role } = useAuth()
  const { data: reference, isLoading } = useServices()
  const { data: settings } = useSettings()
  const createOrder = useCreateOrder()
  const requestIdRef = useRef<string>(crypto.randomUUID())

  const [customer, setCustomer] = useState<Customer | null>(null)
  const requestedProfile = useCustomer(requestedCustomerId)
  const [intakeMethod, setIntakeMethod] = useState('STORE_DROPOFF')
  const [returnMethod, setReturnMethod] = useState('CUSTOMER_PICKUP')
  const [items, setItems] = useState<ItemDraft[]>([blankItem()])
  const [discountType, setDiscountType] = useState('NONE')
  const [discountValue, setDiscountValue] = useState('')
  const [percentValue, setPercentValue] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceMethod, setAdvanceMethod] = useState('CASH')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (requestedProfile?.data?.customer && requestedCustomerId && !customer) {
      setCustomer(requestedProfile.data.customer)
    }
  }, [requestedProfile, requestedCustomerId, customer])

  const services = reference?.services ?? []
  const garments = reference?.garment_types ?? []

  const priceMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const service of services) {
      for (const price of service.prices) {
        map.set(`${price.service_id}:${price.garment_type_id}`, price.price_minor)
      }
    }
    return map
  }, [services])

  const totals = useMemo(() => {
    let subtotal = 0
    let missing = 0
    for (const item of items) {
      if (!item.serviceId || !item.garmentId) continue
      const price = priceMap.get(`${item.serviceId}:${item.garmentId}`)
      if (price === undefined) {
        missing += 1
        continue
      }
      subtotal += price * item.quantity
    }
    let discount = 0
    if (discountType === 'FIXED') {
      discount = Math.min(parseMoneyInput(discountValue) ?? 0, subtotal)
    } else if (discountType === 'PERCENTAGE') {
      const bp = Math.max(0, Math.min(Math.round((Number(percentValue) || 0) * 100), 10000))
      discount = Math.round((subtotal * bp) / 10000)
    }
    const afterDiscount = subtotal - discount
    const taxBp = settings?.business.tax_bp ?? 0
    const tax = Math.round((afterDiscount * taxBp) / 10000)
    return { subtotal, discount, tax, total: afterDiscount + tax, missing }
  }, [items, priceMap, discountType, discountValue, percentValue, settings?.business.tax_bp])

  const updateItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const submit = async () => {
    if (!customer) {
      toast.error('Select or create a customer.')
      return
    }
    const payloadItems = items
      .filter((item) => item.serviceId && item.garmentId && item.quantity > 0)
      .map((item) => ({
        garment_type_id: item.garmentId,
        service_id: item.serviceId,
        quantity: item.quantity,
        notes: item.notes.trim() || null,
      }))
    if (payloadItems.length === 0) {
      toast.error('Add at least one item.')
      return
    }
    if (totals.missing > 0) {
      toast.error('Some items do not have a configured price.')
      return
    }
    const advanceMinor = parseMoneyInput(advanceAmount) ?? 0
    if (advanceMinor > totals.total) {
      toast.error('Advance cannot exceed the order total.')
      return
    }

    const discountPayload =
      discountType === 'FIXED'
        ? { type: 'FIXED', value_minor: parseMoneyInput(discountValue) ?? 0 }
        : discountType === 'PERCENTAGE'
          ? { type: 'PERCENTAGE', percent_bp: Math.round((Number(percentValue) || 0) * 100) }
          : { type: 'NONE' }

    try {
      const order = await createOrder.mutateAsync({
        customer_id: customer.id,
        intake_method: intakeMethod,
        return_method: returnMethod,
        items: payloadItems,
        discount: discountPayload,
        advance: advanceMinor > 0 ? { amount_minor: advanceMinor, method: advanceMethod } : undefined,
        notes: notes.trim() || null,
        client_request_id: requestIdRef.current,
      })
      toast.success(`Order ${order.order_number} created.`)
      navigate(`/orders/${order.id}`)
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not create order.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader title="New order" subtitle="Create a new laundry order" className="flex-1" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Customer" />
            <div className="p-4 sm:p-5">
              <CustomerPicker value={customer} onChange={setCustomer} autoFocus />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Items"
              action={
                <Button type="button" variant="secondary" size="sm" onClick={() => setItems((prev) => [...prev, blankItem()])}>
                  <Plus className="h-4 w-4" /> Add item
                </Button>
              }
            />
            <div className="space-y-3 p-4 sm:p-5">
              {isLoading ? <p className="text-sm text-slate-500">Loading services…</p> : null}
              {items.map((item) => {
                const price = item.serviceId && item.garmentId ? priceMap.get(`${item.serviceId}:${item.garmentId}`) : undefined
                const priced = price !== undefined
                return (
                  <div key={item.key} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Service">
                        <Select value={item.serviceId} onChange={(e) => updateItem(item.key, { serviceId: e.target.value })}>
                          <option value="">Select service</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Garment">
                        <Select value={item.garmentId} onChange={(e) => updateItem(item.key, { garmentId: e.target.value })}>
                          <option value="">Select garment</option>
                          {garments.map((garment) => (
                            <option key={garment.id} value={garment.id}>
                              {garment.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">Qty</span>
                        <div className="flex items-center rounded-lg ring-1 ring-inset ring-slate-300">
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center text-slate-500 hover:text-slate-800"
                            onClick={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className="h-9 w-14 border-0 bg-transparent text-center text-sm focus:outline-none"
                          />
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center text-slate-500 hover:text-slate-800"
                            onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        {item.serviceId && item.garmentId ? (
                          priced ? (
                            <p className="text-sm font-semibold text-slate-900">
                              {formatMoney((price ?? 0) * item.quantity, settings?.business.currency ?? 'INR')}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-rose-600">No price set</p>
                          )
                        ) : null}
                      </div>
                      {items.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Order details" />
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Intake method">
                <Select value={intakeMethod} onChange={(e) => setIntakeMethod(e.target.value)}>
                  <option value="STORE_DROPOFF">Store drop-off</option>
                  <option value="HOME_PICKUP">Home pickup</option>
                </Select>
              </Field>
              <Field label="Return method">
                <Select value={returnMethod} onChange={(e) => setReturnMethod(e.target.value)}>
                  <option value="CUSTOMER_PICKUP">Customer pickup</option>
                  <option value="HOME_DELIVERY">Home delivery</option>
                </Select>
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions…" />
              </Field>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-5 lg:sticky lg:top-6">
            <Card>
              <CardHeader title="Summary" />
              <div className="space-y-2.5 p-4 text-sm sm:p-5">
                <Row label="Subtotal" value={formatMoney(totals.subtotal, settings?.business.currency ?? 'INR')} />
                {totals.discount > 0 ? (
                  <Row label="Discount" value={`− ${formatMoney(totals.discount, settings?.business.currency ?? 'INR')}`} />
                ) : null}
                <Row label={settings?.business.tax_name ?? 'Tax'} value={formatMoney(totals.tax, settings?.business.currency ?? 'INR')} />
                <div className="border-t border-slate-100 pt-2.5">
                  <Row
                    label="Total"
                    value={formatMoney(totals.total, settings?.business.currency ?? 'INR')}
                    strong
                  />
                </div>
                {totals.missing > 0 ? (
                  <p className="rounded-lg bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-700">
                    {totals.missing} item(s) missing a price.
                  </p>
                ) : null}
              </div>
            </Card>

            {canApplyDiscount(role ?? undefined) ? (
              <Card>
                <CardHeader title="Discount" />
                <div className="space-y-3 p-4 sm:p-5">
                  <Field label="Type">
                    <Select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                      <option value="NONE">None</option>
                      <option value="FIXED">Fixed amount</option>
                      <option value="PERCENTAGE">Percentage</option>
                    </Select>
                  </Field>
                  {discountType === 'FIXED' ? (
                    <Field label="Amount">
                      <Input
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </Field>
                  ) : null}
                  {discountType === 'PERCENTAGE' ? (
                    <Field label="Percent">
                      <Input
                        value={percentValue}
                        onChange={(e) => setPercentValue(e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                      />
                    </Field>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <Card>
              <CardHeader title="Advance payment" />
              <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
                <Field label="Amount">
                  <Input value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
                </Field>
                <Field label="Method">
                  <Select value={advanceMethod} onChange={(e) => setAdvanceMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </Field>
              </div>
            </Card>

            <Button size="lg" className="w-full" loading={createOrder.isPending} onClick={submit} disabled={totals.missing > 0 || totals.total <= 0}>
              Create order
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={strong ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={strong ? 'text-base font-bold text-slate-900 tabular-nums' : 'font-medium text-slate-800 tabular-nums'}>
        {value}
      </span>
    </div>
  )
}
