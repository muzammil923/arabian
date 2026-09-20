import { useEffect, useMemo, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import {
  useCreateGarment,
  useCreateService,
  useServices,
  useUpdateGarment,
  useUpdateService,
  useUpsertPricing,
} from '../hooks/queries'
import { formatMoney, fromMinor, parseMoneyInput } from '../lib/format'
import { Button, Card, CardHeader, EmptyState, ErrorBlock, Input, LoadingBlock, PageHeader } from '../components/ui'
import { useCurrency } from '../components/money'
import { useToast } from '../components/toast'

export function PricingPage() {
  const toast = useToast()
  const currency = useCurrency()
  const { data, isLoading, isError, error, refetch } = useServices(true)
  const createService = useCreateService()
  const updateService = useUpdateService()
  const createGarment = useCreateGarment()
  const updateGarment = useUpdateGarment()
  const upsertPricing = useUpsertPricing()

  const [newService, setNewService] = useState('')
  const [newGarment, setNewGarment] = useState('')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  const services = data?.services ?? []
  const garments = data?.garment_types ?? []

  const keyOf = (serviceId: string, garmentId: string) => `${serviceId}:${garmentId}`

  useEffect(() => {
    if (!data) return
    const next: Record<string, string> = {}
    for (const service of data.services) {
      for (const price of service.prices) {
        next[keyOf(price.service_id, price.garment_type_id)] = String(fromMinor(price.price_minor))
      }
    }
    setPrices(next)
    setDirty(new Set())
  }, [data])

  const setCell = (serviceId: string, garmentId: string, value: string) => {
    const key = keyOf(serviceId, garmentId)
    setPrices((prev) => ({ ...prev, [key]: value }))
    setDirty((prev) => new Set(prev).add(key))
  }

  const save = async () => {
    const entries: Array<{ service_id: string; garment_type_id: string; price_minor: number }> = []
    for (const key of dirty) {
      const [serviceId, garmentId] = key.split(':')
      const raw = prices[key]
      const minor = raw?.trim() ? parseMoneyInput(raw) : 0
      entries.push({ service_id: serviceId, garment_type_id: garmentId, price_minor: minor ?? 0 })
    }
    if (entries.length === 0) return toast.error('No changes to save.')
    try {
      await upsertPricing.mutateAsync(entries)
      toast.success('Pricing saved.')
      setDirty(new Set())
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not save pricing.')
    }
  }

  const addService = async () => {
    if (!newService.trim()) return
    try {
      await createService.mutateAsync({ name: newService.trim() })
      toast.success('Service added.')
      setNewService('')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not add service.')
    }
  }

  const addGarment = async () => {
    if (!newGarment.trim()) return
    try {
      await createGarment.mutateAsync({ name: newGarment.trim() })
      toast.success('Garment added.')
      setNewGarment('')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not add garment.')
    }
  }

  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services])

  if (isLoading) return <LoadingBlock />
  if (isError) return <ErrorBlock message={(error as Error)?.message ?? 'Failed to load pricing.'} onRetry={() => void refetch()} />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Services & Pricing"
        subtitle="Manage services, garments and the price matrix"
        action={
          <Button loading={upsertPricing.isPending} disabled={dirty.size === 0} onClick={save}>
            <Save className="h-4 w-4" /> Save changes{dirty.size > 0 ? ` (${dirty.size})` : ''}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Services" />
          <ul className="divide-y divide-slate-100">
            {services.length === 0 ? <EmptyState title="No services" /> : null}
            {services.map((service) => (
              <li key={service.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <span className={service.is_active ? 'text-sm font-medium text-slate-800' : 'text-sm text-slate-400 line-through'}>
                  {service.name}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateService.mutate(
                      { id: service.id, input: { is_active: service.is_active ? 0 : 1 } },
                      { onError: (e) => toast.error(e.message) },
                    )
                  }
                >
                  {service.is_active ? 'Disable' : 'Enable'}
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 border-t border-slate-100 p-3">
            <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="New service name" />
            <Button size="sm" loading={createService.isPending} onClick={addService}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Garments" />
          <ul className="divide-y divide-slate-100">
            {garments.length === 0 ? <EmptyState title="No garments" /> : null}
            {garments.map((garment) => (
              <li key={garment.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <span className={garment.is_active ? 'text-sm font-medium text-slate-800' : 'text-sm text-slate-400 line-through'}>
                  {garment.name}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateGarment.mutate(
                      { id: garment.id, input: { is_active: garment.is_active ? 0 : 1 } },
                      { onError: (e) => toast.error(e.message) },
                    )
                  }
                >
                  {garment.is_active ? 'Disable' : 'Enable'}
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 border-t border-slate-100 p-3">
            <Input value={newGarment} onChange={(e) => setNewGarment(e.target.value)} placeholder="New garment name" />
            <Button size="sm" loading={createGarment.isPending} onClick={addGarment}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Price matrix" subtitle={`Prices in ${currency}. Leave blank to clear.`} />
        {activeServices.length === 0 || garments.length === 0 ? (
          <EmptyState title="Add services and garments first" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="sticky left-0 z-10 bg-white px-4 py-2.5">Garment</th>
                  {activeServices.map((service) => (
                    <th key={service.id} className="px-3 py-2.5 text-center">
                      {service.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {garments.map((garment) => (
                  <tr key={garment.id} className="border-b border-slate-50 last:border-0">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-slate-700">{garment.name}</td>
                    {activeServices.map((service) => {
                      const key = keyOf(service.id, garment.id)
                      const value = prices[key] ?? ''
                      const existing = service.prices.find((p) => p.garment_type_id === garment.id)
                      return (
                        <td key={service.id} className="px-2 py-1.5">
                          <Input
                            value={value}
                            inputMode="decimal"
                            placeholder="—"
                            title={existing ? formatMoney(existing.price_minor, currency) : 'No price'}
                            onChange={(e) => setCell(service.id, garment.id, e.target.value)}
                            className={dirty.has(key) ? 'ring-2 ring-brand-500' : ''}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
