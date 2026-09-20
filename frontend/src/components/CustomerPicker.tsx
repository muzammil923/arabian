import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search, UserPlus } from 'lucide-react'
import { useCreateCustomer, useCustomers, useSettings } from '../hooks/queries'
import { countryOptions } from '../lib/phone'
import { formatPhoneDisplay } from '../lib/phone'
import { cn } from '../lib/cn'
import { Button, Field, Input, Select, Spinner } from './ui'
import { useToast } from './toast'
import type { Customer, CustomerListItem } from '../types/api'

export function CustomerPicker({
  value,
  onChange,
  autoFocus = false,
}: {
  value: Customer | null
  onChange: (customer: Customer | null) => void
  autoFocus?: boolean
}) {
  const { data: settings } = useSettings()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [creating, setCreating] = useState(false)

  const [name, setName] = useState('')
  const [country, setCountry] = useState(settings?.business.default_calling_country || 'IN')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const createCustomer = useCreateCustomer()

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (settings?.business.default_calling_country) setCountry(settings.business.default_calling_country)
  }, [settings?.business.default_calling_country])

  const params = useMemo(() => ({ search: debounced || undefined, limit: 8 }), [debounced])
  const { data, isFetching } = useCustomers(params)
  const results: CustomerListItem[] = data?.rows ?? []

  const submitNew = async () => {
    if (!name.trim() || phone.trim().length < 4) {
      toast.error('Enter a name and phone number.')
      return
    }
    try {
      const created = await createCustomer.mutateAsync({
        name: name.trim(),
        phone: { raw: phone.trim(), country },
        email: email.trim() || null,
      })
      toast.success('Customer created.')
      onChange(created)
      setCreating(false)
      setName('')
      setPhone('')
      setEmail('')
    } catch (err) {
      const e = err as { code?: string; message?: string; details?: { existing_customer_id?: string } }
      toast.error(e.message ?? 'Could not create customer.')
      if (e.code === 'DUPLICATE_CUSTOMER' && e.details?.existing_customer_id) {
        const existing = results.find((r) => r.id === e.details?.existing_customer_id)
        if (existing) onChange(existing)
      }
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{value.name}</p>
          <p className="truncate text-xs text-slate-500">{formatPhoneDisplay(value.phone_e164)}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    )
  }

  if (creating) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <UserPlus className="h-4 w-4" /> New customer
        </div>
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" autoFocus />
        </Field>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <Field label="Country">
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>
              {countryOptions().map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Phone" required>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="98765 43210"
            />
          </Field>
        </div>
        <Field label="Email (optional)">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@example.com" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setCreating(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" loading={createCustomer.isPending} onClick={submitNew}>
            Save customer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className="pl-9"
          autoFocus={autoFocus}
        />
        {isFetching ? <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" /> : null}
      </div>
      {debounced ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
          {results.length === 0 && !isFetching ? (
            <p className="px-3 py-4 text-center text-sm text-slate-500">No customers found.</p>
          ) : (
            results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => onChange(customer)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{customer.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {formatPhoneDisplay(customer.phone_e164)}
                  </span>
                </span>
                <Check className="h-4 w-4 text-slate-300" />
              </button>
            ))
          )}
        </div>
      ) : null}
      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => setCreating(true)}>
        <Plus className="h-4 w-4" /> New customer
      </Button>
    </div>
  )
}
