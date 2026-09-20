import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  useChangePickupStatus,
  useCreatePickup,
  usePickups,
  useStaff,
} from '../hooks/queries'
import { PICKUP_TRANSITIONS, statusLabel } from '../lib/constants'
import { formatDate, formatDateTime } from '../lib/format'
import { formatPhoneDisplay } from '../lib/phone'
import { cn } from '../lib/cn'
import { Button, Card, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Pagination } from '../components/ui'
import { StatusBadge } from '../components/money'
import { CustomerPicker } from '../components/CustomerPicker'
import { AddressFields } from '../components/AddressFields'
import { useToast } from '../components/toast'
import type { AddressSnapshot, Customer, PickupRow } from '../types/api'

const LIMIT = 20

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

function parseAddress(snapshot: string): AddressSnapshot | null {
  try {
    return JSON.parse(snapshot) as AddressSnapshot
  } catch {
    return null
  }
}

export function PickupsPage() {
  const toast = useToast()
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError, error, refetch } = usePickups({ filter: filter || undefined, page, limit: LIMIT })
  const changeStatus = useChangePickupStatus()

  const rows = data?.rows ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pickups"
        subtitle={data ? `${data.total} pickup(s)` : undefined}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New pickup
          </Button>
        }
      />

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
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load pickups.'} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="No pickups" description="Schedule a pickup to see it here." />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {rows.map((pickup) => (
              <PickupItem
                key={pickup.id}
                pickup={pickup}
                onStatus={async (status) => {
                  try {
                    await changeStatus.mutateAsync({ id: pickup.id, status })
                    toast.success(`Marked as ${statusLabel(status)}.`)
                  } catch (err) {
                    toast.error((err as { message?: string }).message ?? 'Could not update pickup.')
                  }
                }}
              />
            ))}
          </ul>
          <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
        </Card>
      )}

      <NewPickupModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function PickupItem({
  pickup,
  onStatus,
}: {
  pickup: PickupRow
  onStatus: (status: PickupRow['status']) => void
}) {
  const address = parseAddress(pickup.address_snapshot)
  const next = PICKUP_TRANSITIONS[pickup.status] ?? []

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{pickup.customer_name ?? 'Customer'}</p>
          <p className="text-xs text-slate-500">{formatPhoneDisplay(pickup.customer_phone)}</p>
          {address ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {address.address_line_1}
              {address.city ? `, ${address.city}` : ''}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-400">
            {formatDate(pickup.scheduled_date)}
            {pickup.scheduled_slot ? ` · ${pickup.scheduled_slot}` : ''}
            {pickup.staff_name ? ` · ${pickup.staff_name}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={pickup.status} />
          <span className="text-[11px] text-slate-400">{formatDateTime(pickup.created_at)}</span>
        </div>
      </div>
      {next.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {next.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={status === 'CANCELLED' ? 'danger' : 'secondary'}
              onClick={() => onStatus(status)}
            >
              {statusLabel(status)}
            </Button>
          ))}
        </div>
      ) : null}
    </li>
  )
}

function NewPickupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const { data: staff } = useStaff()
  const createPickup = useCreatePickup()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [instructions, setInstructions] = useState('')
  const [staffId, setStaffId] = useState('')
  const [address, setAddress] = useState<AddressSnapshot>({ label: 'Home', address_line_1: '', city: '', postal_code: '', country_code: 'IN' })

  const activeStaff = useMemo(() => (staff ?? []).filter((s) => s.is_active), [staff])

  const submit = async () => {
    if (!customer) return toast.error('Select a customer.')
    if (!date) return toast.error('Select a date.')
    if (!address.address_line_1) return toast.error('Enter a pickup address.')
    try {
      await createPickup.mutateAsync({
        customer_id: customer.id,
        scheduled_date: date,
        scheduled_slot: slot || null,
        instructions: instructions || null,
        assigned_staff_id: staffId || null,
        address: address as unknown as Record<string, unknown>,
      })
      toast.success('Pickup scheduled.')
      setCustomer(null)
      setDate('')
      setSlot('')
      setInstructions('')
      setStaffId('')
      setAddress({ label: 'Home', address_line_1: '', city: '', postal_code: '', country_code: 'IN' })
      onClose()
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not schedule pickup.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New pickup"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={createPickup.isPending} onClick={submit}>
            Schedule
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <CustomerPicker value={customer} onChange={setCustomer} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Slot">
            <Input value={slot} onChange={(e) => setSlot(e.target.value)} placeholder="e.g. 9–11 AM" />
          </Field>
        </div>
        <Field label="Assign staff">
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="block h-10 w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
          >
            <option value="">Unassigned</option>
            {activeStaff.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Instructions">
          <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Gate code, notes…" />
        </Field>
        <AddressFields value={address} onChange={setAddress} />
      </div>
    </Modal>
  )
}
