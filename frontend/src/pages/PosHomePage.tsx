import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Boxes,
  HandCoins,
  Keyboard,
  LayoutGrid,
  Lock,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Store,
  Truck,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDashboard, useSettings } from '../hooks/queries'
import { useKeyboard } from '../components/OnScreenKeyboard'
import { cn } from '../lib/cn'
import { formatMoney } from '../lib/format'
import { isManager } from '../lib/constants'
import { useToast } from '../components/toast'

interface Tile {
  key: string
  label: string
  description: string
  icon: ReactNode
  to?: string
  accent: string
  highlight?: boolean
  locked?: boolean
  onClick?: () => void
}

export function PosHomePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, role } = useAuth()
  const { data: settings } = useSettings()
  const { data: dashboard } = useDashboard()
  const { enabled: keyboardOn, setEnabled } = useKeyboard()

  const manager = isManager(role ?? undefined)
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const currency = settings?.business.currency ?? 'INR'
  const today = dashboard?.today

  const tiles: Tile[] = [
    {
      key: 'sale',
      label: 'SALE / NEW BILL',
      description: 'Create a new order',
      icon: <Plus className="h-6 w-6" />,
      to: '/orders/new',
      accent: 'bg-brand-600 text-white',
      highlight: true,
    },
    {
      key: 'receipts',
      label: 'Sales receipts',
      description: 'View & re-print',
      icon: <ReceiptText className="h-6 w-6" />,
      to: '/receipts',
      accent: 'bg-sky-100 text-sky-700',
    },
    {
      key: 'status',
      label: 'Sale status',
      description: 'Track orders & update',
      icon: <Activity className="h-6 w-6" />,
      to: '/sale-status',
      accent: 'bg-violet-100 text-violet-700',
    },
    {
      key: 'customer',
      label: 'Customer',
      description: 'Quick search',
      icon: <Search className="h-6 w-6" />,
      to: '/pos/customer',
      accent: 'bg-indigo-100 text-indigo-700',
    },
    {
      key: 'reports',
      label: 'Reports',
      description: 'Business insights',
      icon: <BarChart3 className="h-6 w-6" />,
      to: '/reports',
      accent: 'bg-amber-100 text-amber-700',
    },
    {
      key: 'rack',
      label: 'Rack map',
      description: 'Stored items tracker',
      icon: <Boxes className="h-6 w-6" />,
      to: '/rack-map',
      accent: 'bg-teal-100 text-teal-700',
    },
    {
      key: 'credits',
      label: 'Credit collection',
      description: 'Collect outstanding',
      icon: <HandCoins className="h-6 w-6" />,
      to: '/credits',
      accent: 'bg-rose-100 text-rose-700',
    },
    {
      key: 'backoffice',
      label: 'Back office',
      description: manager ? 'Manage the business' : 'Manager access only',
      icon: manager ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />,
      to: manager ? '/back-office' : undefined,
      accent: 'bg-slate-100 text-slate-700',
      locked: !manager,
      onClick: manager ? undefined : () => toast.error('Back office is for managers. Ask an admin for access.'),
    },
    {
      key: 'keyboard',
      label: 'On-screen keyboard',
      description: keyboardOn ? 'ON — tap to disable' : 'OFF — tap to enable',
      icon: <Keyboard className="h-6 w-6" />,
      accent: keyboardOn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700',
      onClick: () => setEnabled(!keyboardOn),
    },
  ]

  const handleClick = (tile: Tile) => {
    if (tile.onClick) {
      tile.onClick()
      return
    }
    if (tile.to) navigate(tile.to)
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300">{greeting}{firstName ? `, ${firstName}` : ''}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {settings?.business.name ?? 'Laundry CRM'}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/orders/new')}
            className="flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-5 text-base font-semibold text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-400 active:scale-95"
          >
            <Plus className="h-5 w-5" /> New bill
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Today's revenue" value={formatMoney(today?.revenue_payments_minor ?? 0, currency)} />
          <Stat label="Today's orders" value={String(today?.orders_count ?? 0)} />
          <Stat label="Ready now" value={String(today?.ready_count ?? 0)} />
          <Stat label="Outstanding" value={formatMoney(today?.outstanding_minor ?? 0, currency)} tone="rose" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => handleClick(tile)}
            className={cn(
              'group flex flex-col items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:p-5',
              tile.highlight && 'bg-gradient-to-br from-brand-600 to-teal-700 text-white ring-brand-700/40',
              tile.locked && 'opacity-80',
            )}
          >
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                tile.accent,
                tile.highlight && 'bg-white/15 text-white',
              )}
            >
              {tile.icon}
            </span>
            <span className="min-w-0">
              <span className={cn('block text-sm font-bold leading-tight', tile.highlight ? 'text-white' : 'text-slate-900')}>
                {tile.label}
              </span>
              <span
                className={cn(
                  'mt-0.5 block text-xs leading-snug',
                  tile.highlight ? 'text-teal-50' : tile.locked ? 'text-slate-400' : 'text-slate-500',
                )}
              >
                {tile.description}
              </span>
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => navigate('/deliveries')}
          className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-left transition hover:border-brand-400 hover:bg-white active:scale-[0.98] sm:p-5"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200">
            <Truck className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-tight text-slate-900">Home delivery</span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">
              {today?.deliveries_count ? `${today.deliveries_count} due today` : 'Schedules & out for delivery'}
            </span>
          </span>
        </button>
      </div>

      <div className="grid gap-3 text-sm text-slate-500 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-card ring-1 ring-slate-900/5">
          <Store className="h-4 w-4 text-brand-600" />
          <span className="truncate">Staff mode: {role?.toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-card ring-1 ring-slate-900/5">
          <Users className="h-4 w-4 text-indigo-600" />
          <span className="truncate">{today?.outstanding_minor ? 'Some customers have outstanding dues' : 'No outstanding dues today'}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-card ring-1 ring-slate-900/5">
          <LayoutGrid className="h-4 w-4 text-teal-600" />
          <span className="truncate">Rack map — live storage</span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'rose' }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-inset ring-white/10">
      <p className="text-[11px] uppercase tracking-wide text-slate-300">{label}</p>
      <p className={cn('mt-0.5 truncate text-base font-bold tabular-nums text-white sm:text-lg', tone === 'rose' && 'text-rose-300')}>
        {value}
      </p>
    </div>
  )
}