import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { useCreateCustomer, useCustomers, useSettings } from '../hooks/queries'
import { formatPhoneDisplay, countryOptions } from '../lib/phone'
import { relativeTime } from '../lib/format'
import { Button, Card, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../components/ui'
import { Money } from '../components/money'
import { useToast } from '../components/toast'

const LIMIT = 20

export function CustomersPage() {
  const toast = useToast()
  const { data: settings } = useSettings()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('IN')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (settings?.business.default_calling_country) setCountry(settings.business.default_calling_country)
  }, [settings?.business.default_calling_country])

  const params = useMemo(() => ({ search: debounced || undefined, page, limit: LIMIT }), [debounced, page])
  const { data, isLoading, isError, error, refetch, isFetching } = useCustomers(params)
  const createCustomer = useCreateCustomer()
  const rows = data?.rows ?? []

  const resetForm = () => {
    setName('')
    setPhone('')
    setEmail('')
    setNotes('')
  }

  const submit = async () => {
    if (!name.trim() || phone.trim().length < 4) return toast.error('Enter a name and phone number.')
    try {
      await createCustomer.mutateAsync({
        name: name.trim(),
        phone: { raw: phone.trim(), country },
        email: email.trim() || null,
        notes: notes.trim() || null,
      })
      toast.success('Customer created.')
      setOpen(false)
      resetForm()
    } catch (err) {
      const e = err as { code?: string; message?: string; details?: { existing_customer_id?: string } }
      toast.error(e.message ?? 'Could not create customer.')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        subtitle={data ? `${data.total} customer(s)` : undefined}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New customer
          </Button>
        }
      />

      <Card className="p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone…" className="pl-9" />
        </div>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load customers.'} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No customers yet"
            description="Add your first customer to start creating orders."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> New customer
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className={isFetching ? 'opacity-70 transition' : undefined}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Last order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => (
                  <tr key={customer.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/customers/${customer.id}`} className="font-medium text-brand-700 hover:text-brand-800">
                        {customer.name}
                      </Link>
                      {customer.email ? <div className="text-xs text-slate-500">{customer.email}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatPhoneDisplay(customer.phone_e164)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{customer.total_orders}</td>
                    <td className="px-4 py-3 text-right">
                      <Money
                        minor={customer.outstanding_minor}
                        className={customer.outstanding_minor > 0 ? 'font-semibold text-rose-600' : 'text-slate-500'}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{relativeTime(customer.last_order_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((customer) => (
              <li key={customer.id}>
                <Link to={`/customers/${customer.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{customer.name}</span>
                    <Money
                      minor={customer.outstanding_minor}
                      className={customer.outstanding_minor > 0 ? 'text-sm font-semibold text-rose-600' : 'text-sm text-slate-500'}
                    />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{formatPhoneDisplay(customer.phone_e164)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {customer.total_orders} order(s) · {relativeTime(customer.last_order_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={createCustomer.isPending} onClick={submit}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" autoFocus />
          </Field>
          <div className="grid grid-cols-[120px_1fr] gap-2">
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
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" />
            </Field>
          </div>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
