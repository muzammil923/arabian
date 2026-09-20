import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, Plus, Search, User } from 'lucide-react'
import { useCustomers } from '../hooks/queries'
import { formatPhoneDisplay, whatsappLink } from '../lib/phone'
import { Card, EmptyState, ErrorBlock, Input, LoadingBlock } from '../components/ui'
import { Money } from '../components/money'
import { useToast } from '../components/toast'

const LIMIT = 30

export function PosCustomerSearchPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch } = useCustomers({ search: search.trim() || undefined, limit: LIMIT })
  const rows = data?.rows ?? []

  const startBilling = (customerId: string) => {
    toast.toast('Select the customer on the new bill screen.', 'info')
    navigate(`/orders/new?customer=${customerId}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Customer search</h1>
        <p className="mt-0.5 text-sm text-slate-500">Find a customer by name or phone in seconds</p>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone number…"
            className="h-12 pl-10 text-base"
            autoFocus
          />
        </div>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load customers.'} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<User className="h-10 w-10" />}
            title={search ? 'No matching customers' : 'Type to search customers'}
            description={search ? 'Try a different name or phone number.' : 'Create a new customer when you make the next bill.'}
            action={
              <button
                type="button"
                onClick={() => navigate('/orders/new')}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" /> New bill
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((customer) => (
            <Card key={customer.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {customer.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? '')
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{customer.name}</p>
                    <p className="truncate text-sm text-slate-500">{formatPhoneDisplay(customer.phone_e164)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">{customer.total_orders} order(s)</span>
                <span className="text-slate-500">
                  Dues:{' '}
                  <Money
                    minor={customer.outstanding_minor}
                    className={customer.outstanding_minor > 0 ? 'font-semibold text-rose-600' : 'text-slate-700'}
                  />
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startBilling(customer.id)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> New bill
                </button>
                <a
                  href={`tel:${customer.phone_e164}`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
                <a
                  href={whatsappLink(customer.phone_e164)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  WhatsApp
                </a>
                <Link
                  to={`/customers/${customer.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Profile
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}