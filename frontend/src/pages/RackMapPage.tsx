import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Edit3, PackagePlus, Plus } from 'lucide-react'
import {
  useAssignOrderToStorage,
  useCreateStorageLocation,
  useRackMap,
  useReleaseOrderFromStorage,
  useStorageLocations,
  useUpdateStorageLocation,
} from '../hooks/queries'
import { STORAGE_LOCATION_TYPES, STORAGE_LOCATION_TYPE_LABELS } from '../lib/constants'
import { formatDate, relativeTime } from '../lib/format'
import { Badge, Button, Card, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, Select } from '../components/ui'
import { Money } from '../components/money'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/toast'
import { cn } from '../lib/cn'
import { isManager } from '../lib/constants'
import type { StorageLocation, StorageLocationType, StoredItem } from '../types/api'

export function RackMapPage() {
  const toast = useToast()
  const { role } = useAuth()
  const manager = isManager(role ?? undefined)
  const { data, isLoading, isError, error, refetch } = useRackMap()
  const locationsQuery = useStorageLocations(manager)
  const assign = useAssignOrderToStorage()
  const release = useReleaseOrderFromStorage()

  const [assignTarget, setAssignTarget] = useState<StoredItem | null>(null)
  const [assignLocationId, setAssignLocationId] = useState('')
  const [editing, setEditing] = useState<StorageLocation | 'new' | null>(null)

  const availableLocations = useMemo(
    () => (data?.locations ?? []).filter((l) => l.is_active === 1 && l.occupied < l.capacity),
    [data],
  )

  const occupiedLookup = useMemo(() => {
    const map = new Map<string, { occupied: number; items: StoredItem[] }>()
    for (const l of data?.locations ?? []) map.set(l.id, { occupied: l.occupied, items: l.items })
    return map
  }, [data])

  const doAssign = async () => {
    if (!assignTarget || !assignLocationId) return
    const location = data?.locations.find((l) => l.id === assignLocationId)
    try {
      await assign.mutateAsync({ orderId: assignTarget.order_id, storageLocationId: assignLocationId })
      toast.success(`${assignTarget.order_number} stored in ${location?.code ?? 'location'}.`)
      setAssignTarget(null)
      setAssignLocationId('')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not assign storage.')
    }
  }

  const doRelease = async (orderId: string, orderNumber: string) => {
    try {
      await release.mutateAsync(orderId)
      toast.success(`${orderNumber} released.`)
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not release order.')
    }
  }

  const displayLocations = manager ? (locationsQuery.data ?? []) : (data?.locations ?? [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Rack map</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {data ? `${data.locations.length} location(s) · ${data.unstored.length} item(s) waiting to be stored` : 'Live storage tracker'}
          </p>
        </div>
        {manager ? (
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Add location
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading rack map…" />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load rack map.'} onRetry={() => void refetch()} />
      ) : displayLocations.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Boxes className="h-10 w-10" />}
            title="No storage locations"
            description="Add racks and shelves to start tracking where orders are stored."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayLocations.map((location) => {
            const rack = occupiedLookup.get(location.id) ?? { occupied: 0, items: [] }
            const occupied = rack.occupied
            const percentage = location.capacity > 0 ? Math.round((occupied / location.capacity) * 100) : 0
            const full = occupied >= location.capacity
            const isActive = location.is_active === 1
            return (
              <Card
                key={location.id}
                className={cn('p-4', !isActive && 'opacity-60')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold',
                        full ? 'bg-rose-100 text-rose-700' : isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {location.code}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{location.label}</p>
                      <p className="text-xs text-slate-500">
                        {STORAGE_LOCATION_TYPE_LABELS[location.type] ?? location.type}
                        {!isActive ? ' · inactive' : ''}
                      </p>
                    </div>
                  </div>
                  {manager ? (
                    <button
                      type="button"
                      onClick={() => setEditing(location)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Edit location"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Capacity</span>
                    <span className="font-semibold">
                      {occupied}/{location.capacity}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full transition-all', full ? 'bg-rose-500' : 'bg-brand-500')}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                {rack.items && rack.items.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {rack.items.map((item) => (
                      <li key={item.order_id} className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <Link to={`/orders/${item.order_id}`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                            {item.order_number}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void doRelease(item.order_id, item.order_number)}
                            className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Release
                          </button>
                        </div>
                        <p className="truncate text-xs text-slate-600">{item.customer_name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {item.item_count} item(s) · in rack since {item.storage_assigned_at ? relativeTime(item.storage_assigned_at) : '—'}
                        </p>
                        {item.balance_minor > 0 ? (
                          <p className="mt-0.5 text-[11px] font-semibold text-rose-600">
                            Due <Money minor={item.balance_minor} />
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">Empty</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {data && data.unstored.length > 0 ? (
        <Card>
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Waiting to be stored <Badge className="ml-1">{data.unstored.length}</Badge>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Ready orders that have not been placed on a rack yet</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.unstored.map((item) => (
              <li key={item.order_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <Link to={`/orders/${item.order_id}`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                    {item.order_number}
                  </Link>
                  <p className="truncate text-sm text-slate-700">{item.customer_name}</p>
                  <p className="text-xs text-slate-500">
                    Ready {item.storage_assigned_at ? `since ${formatDate(item.storage_assigned_at)}` : ''} · {item.item_count} item(s)
                  </p>
                </div>
                <div className="text-right">
                  {item.balance_minor > 0 ? (
                    <p className="text-xs font-semibold text-rose-600">
                      Due <Money minor={item.balance_minor} />
                    </p>
                  ) : null}
                  <Button variant="secondary" size="sm" className="mt-1" onClick={() => setAssignTarget(item)}>
                    <PackagePlus className="h-4 w-4" /> Assign
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={Boolean(assignTarget)}
        onClose={() => {
          setAssignTarget(null)
          setAssignLocationId('')
        }}
        title={`Store ${assignTarget?.order_number ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button loading={assign.isPending} disabled={!assignLocationId} onClick={() => void doAssign()}>
              Store here
            </Button>
          </>
        }
      >
        <Field label="Storage location" required>
          <Select value={assignLocationId} onChange={(e) => setAssignLocationId(e.target.value)}>
            <option value="">Select a location with free space</option>
            {availableLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} — {l.label} ({l.occupied}/{l.capacity})
              </option>
            ))}
          </Select>
        </Field>
        {availableLocations.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">All locations are full right now. Release a spot first.</p>
        ) : null}
      </Modal>

      <LocationModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        location={editing === 'new' ? null : editing}
      />
    </div>
  )
}

function LocationModal({
  open,
  onClose,
  location,
}: {
  open: boolean
  onClose: () => void
  location: StorageLocation | null
}) {
  const toast = useToast()
  const create = useCreateStorageLocation()
  const update = useUpdateStorageLocation()
  const [code, setCode] = useState(location?.code ?? '')
  const [label, setLabel] = useState(location?.label ?? '')
  const [type, setType] = useState<StorageLocationType>(location?.type ?? 'RACK')
  const [capacity, setCapacity] = useState(String(location?.capacity ?? 1))
  const [position, setPosition] = useState(String(location?.position ?? 0))
  const [isActive, setIsActive] = useState(location ? location.is_active === 1 : true)

  useEffect(() => {
    if (!open) return
    setCode(location?.code ?? '')
    setLabel(location?.label ?? '')
    setType(location?.type ?? 'RACK')
    setCapacity(String(location?.capacity ?? 1))
    setPosition(String(location?.position ?? 0))
    setIsActive(location ? location.is_active === 1 : true)
  }, [open, location])

  if (!open) return null

  const submit = async () => {
    if (!code.trim()) {
      toast.error('Location code is required.')
      return
    }
    const payload = {
      code: code.trim().toUpperCase(),
      label: label.trim() || code.trim().toUpperCase(),
      type,
      capacity: Math.max(1, Number(capacity) || 1),
      position: Number(position) || 0,
    }
    try {
      if (location) {
        await update.mutateAsync({ id: location.id, input: { ...payload, is_active: isActive } })
        toast.success(`${payload.code} updated.`)
      } else {
        await create.mutateAsync(payload)
        toast.success(`${payload.code} added.`)
      }
      onClose()
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not save location.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location ? `Edit ${location.code}` : 'New storage location'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={create.isPending || update.isPending} onClick={() => void submit()}>
            Save location
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code" required>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="A1" />
          </Field>
          <Field label="Capacity">
            <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} inputMode="numeric" placeholder="8" />
          </Field>
        </div>
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Rack beside washing bay" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as StorageLocationType)}>
              {STORAGE_LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {STORAGE_LOCATION_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Position">
            <Input value={position} onChange={(e) => setPosition(e.target.value)} inputMode="numeric" placeholder="0" />
          </Field>
        </div>
        {location ? (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Active (visible on rack map)
          </label>
        ) : null}
      </div>
    </Modal>
  )
}