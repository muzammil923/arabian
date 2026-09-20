import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  useAddAddress,
  useCustomer,
  useDeleteAddress,
  useUpdateAddress,
  useUpdateCustomer,
} from '../hooks/queries'
import { formatDateTime, formatMoney, relativeTime } from '../lib/format'
import { formatPhoneDisplay, whatsappLink } from '../lib/phone'
import { statusLabel } from '../lib/constants'
import { Button, Card, CardHeader, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Textarea } from '../components/ui'
import { Money, StatusBadge, useCurrency } from '../components/money'
import { AddressFields } from '../components/AddressFields'
import { useToast } from '../components/toast'
import type { AddressSnapshot, CustomerAddress } from '../types/api'

const emptyAddress: AddressSnapshot = {
  label: 'Home',
  address_line_1: '',
  address_line_2: '',
  landmark: '',
  city: '',
  state_region: '',
  postal_code: '',
  country_code: 'IN',
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: profile, isLoading, isError, error, refetch } = useCustomer(id)
  const currency = useCurrency()
  const updateCustomer = useUpdateCustomer(id ?? '')
  const addAddress = useAddAddress(id ?? '')
  const updateAddress = useUpdateAddress(id ?? '')
  const deleteAddress = useDeleteAddress(id ?? '')

  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const [addressOpen, setAddressOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [address, setAddress] = useState<AddressSnapshot>(emptyAddress)

  const customer = profile?.customer

  useEffect(() => {
    if (customer) {
      setName(customer.name)
      setEmail(customer.email ?? '')
      setNotes(customer.notes ?? '')
    }
  }, [customer])

  if (isLoading) return <LoadingBlock />
  if (isError || !profile) {
    return <ErrorBlock message={(error as Error)?.message ?? 'Customer not found.'} onRetry={() => void refetch()} />
  }

  const summary = profile.summary

  const openAddress = (existing?: CustomerAddress) => {
    if (existing) {
      setEditingAddressId(existing.id)
      setAddress({
        label: existing.label,
        address_line_1: existing.address_line_1,
        address_line_2: existing.address_line_2 ?? '',
        landmark: existing.landmark ?? '',
        city: existing.city ?? '',
        state_region: existing.state_region ?? '',
        postal_code: existing.postal_code ?? '',
        country_code: existing.country_code,
      })
    } else {
      setEditingAddressId(null)
      setAddress(emptyAddress)
    }
    setAddressOpen(true)
  }

  const submitAddress = async () => {
    if (!address.address_line_1) return toast.error('Address line 1 is required.')
    try {
      if (editingAddressId) {
        await updateAddress.mutateAsync({ addressId: editingAddressId, input: address })
      } else {
        await addAddress.mutateAsync(address)
      }
      toast.success('Address saved.')
      setAddressOpen(false)
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not save address.')
    }
  }

  const removeAddress = async (addressId: string) => {
    try {
      await deleteAddress.mutateAsync(addressId)
      toast.success('Address removed.')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not remove address.')
    }
  }

  const submitCustomer = async () => {
    try {
      await updateCustomer.mutateAsync({ name: name.trim(), email: email.trim() || null, notes: notes.trim() || null })
      toast.success('Customer updated.')
      setEditOpen(false)
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not update customer.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader title={profile.customer.name} subtitle={formatPhoneDisplay(profile.customer.phone_e164)} className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button size="sm" onClick={() => navigate(`/orders/new`)}>
          <Plus className="h-4 w-4" /> Order
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orders" value={String(summary.total_orders)} />
        <StatCard label="Total spent" value={formatMoney(summary.total_spending_minor, currency)} />
        <StatCard label="Outstanding" value={formatMoney(summary.outstanding_minor, currency)} tone={summary.outstanding_minor > 0 ? 'text-rose-600' : undefined} />
        <StatCard label="Last visit" value={relativeTime(summary.last_visit)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Orders" />
            {profile.orders.length === 0 ? (
              <EmptyState title="No orders" description="This customer has no orders yet." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {profile.orders.map((order) => (
                  <li key={order.id}>
                    <Link to={`/orders/${order.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-700">{order.order_number}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <Money minor={order.total_minor} className="text-sm font-medium text-slate-800" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Payments" />
            {profile.payments.length === 0 ? (
              <EmptyState title="No payments" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {profile.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div>
                      <p className="text-sm text-slate-700">{payment.order_number}</p>
                      <p className="text-xs text-slate-500">
                        {payment.method} · {formatDateTime(payment.recorded_at)}
                      </p>
                    </div>
                    <span className={payment.type === 'REFUND' ? 'text-sm font-semibold text-rose-600' : 'text-sm font-semibold text-emerald-600'}>
                      {payment.type === 'REFUND' ? '-' : '+'}
                      <Money minor={payment.amount_minor} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Addresses"
              action={
                <Button size="sm" variant="secondary" onClick={() => openAddress()}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
            />
            {profile.addresses.length === 0 ? (
              <EmptyState icon={<MapPin className="h-6 w-6" />} title="No addresses" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {profile.addresses.map((addr) => (
                  <li key={addr.id} className="flex items-start justify-between gap-2 px-4 py-3">
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-slate-700">
                        {addr.label}
                        {addr.is_default ? <span className="ml-1 text-xs text-brand-600">Default</span> : null}
                      </p>
                      <p className="text-slate-500">
                        {addr.address_line_1}
                        {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                      </p>
                      <p className="text-slate-500">
                        {[addr.city, addr.state_region, addr.postal_code].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openAddress(addr)} aria-label="Edit address">
                        <Pencil className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeAddress(addr.id)} aria-label="Delete address">
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Logistics" />
            <div className="space-y-3 p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Pickups</p>
                {profile.pickups.length === 0 ? (
                  <p className="text-slate-500">None</p>
                ) : (
                  profile.pickups.slice(0, 5).map((pickup) => (
                    <div key={pickup.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-slate-600">{statusLabel(pickup.status)}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(pickup.scheduled_date)}</span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Deliveries</p>
                {profile.deliveries.length === 0 ? (
                  <p className="text-slate-500">None</p>
                ) : (
                  profile.deliveries.slice(0, 5).map((delivery) => (
                    <div key={delivery.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-slate-600">{statusLabel(delivery.status)}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(delivery.scheduled_date)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {profile.customer.phone_e164 ? (
            <a href={whatsappLink(profile.customer.phone_e164)} target="_blank" rel="noreferrer">
              <Button variant="subtle" className="w-full">
                Message on WhatsApp
              </Button>
            </a>
          ) : null}
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button loading={updateCustomer.isPending} onClick={submitCustomer}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        title={editingAddressId ? 'Edit address' : 'Add address'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddressOpen(false)}>
              Cancel
            </Button>
            <Button loading={addAddress.isPending || updateAddress.isPending} onClick={submitAddress}>
              Save
            </Button>
          </>
        }
      >
        <AddressFields value={address} onChange={setAddress} />
      </Modal>
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${tone ?? 'text-slate-900'}`}>{value}</p>
    </Card>
  )
}
