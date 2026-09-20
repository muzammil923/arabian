import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Boxes,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings as SettingsIcon,
  Shirt,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/queries'
import { initials } from '../lib/format'
import { isAdmin, isManager } from '../lib/constants'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  managerOnly?: boolean
  adminOnly?: boolean
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'POS', icon: <Store className="h-5 w-5" />, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/orders', label: 'Orders', icon: <Package className="h-5 w-5" /> },
  { to: '/receipts', label: 'Sales receipts', icon: <ReceiptText className="h-5 w-5" /> },
  { to: '/sale-status', label: 'Sale status', icon: <Activity className="h-5 w-5" /> },
  { to: '/rack-map', label: 'Rack map', icon: <Boxes className="h-5 w-5" /> },
  { to: '/credits', label: 'Credit collection', icon: <HandCoins className="h-5 w-5" /> },
  { to: '/customers', label: 'Customers', icon: <Users className="h-5 w-5" /> },
  { to: '/pickups', label: 'Pickups', icon: <Search className="h-5 w-5" /> },
  { to: '/deliveries', label: 'Deliveries', icon: <Truck className="h-5 w-5" /> },
  { to: '/reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
  { to: '/pricing', label: 'Services & Pricing', icon: <Shirt className="h-5 w-5" />, managerOnly: true },
  { to: '/staff', label: 'Staff', icon: <Users className="h-5 w-5" />, managerOnly: true },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5" />, adminOnly: true },
]

function visibleItems(role: string | null | undefined) {
  return NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin(role as never)) return false
    if (item.managerOnly && !isManager(role as never)) return false
    return true
  })
}

function NavRow({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
          isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
        )
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, logout } = useAuth()
  const { data: settings } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const items = visibleItems(role)
  const businessName = settings?.business.name ?? 'Laundry CRM'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-slate-900 lg:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            LQ
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{businessName}</p>
            <p className="text-xs capitalize text-slate-400">{role?.toLowerCase()}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => (
            <NavRow key={item.to} item={item} />
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
              {initials(user?.name ?? '?')}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-[11px] font-bold text-white">
            LQ
          </div>
          <span className="max-w-[50vw] truncate text-sm font-semibold text-slate-900">{businessName}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile slide-over menu */}
      {sidebarOpen ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50" />
          <div
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-white">{businessName}</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {items.map((item) => (
                <NavRow key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:pb-10">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-5">
          <BottomLink to="/" end label="POS" icon={<Store className="h-5 w-5" />} />
          <BottomLink to="/orders" label="Orders" icon={<Package className="h-5 w-5" />} />
          <div className="flex items-center justify-center">
            <Link
              to="/orders/new"
              className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-slate-50 transition active:scale-95"
              aria-label="New order"
            >
              <Plus className="h-6 w-6" />
            </Link>
          </div>
          <BottomLink to="/customers" label="Customers" icon={<Users className="h-5 w-5" />} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
              moreOpen || !['/', '/orders', '/customers', '/orders/new'].includes(location.pathname)
                ? 'text-brand-700'
                : 'text-slate-500',
            )}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile more sheet */}
      {moreOpen ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="grid grid-cols-3 gap-2">
              {items
                .filter((item) =>
                  [
                    '/dashboard',
                    '/receipts',
                    '/sale-status',
                    '/rack-map',
                    '/credits',
                    '/pickups',
                    '/deliveries',
                    '/reports',
                    '/pricing',
                    '/staff',
                    '/settings',
                  ].includes(item.to),
                )
                .map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 px-2 py-4 text-center text-xs font-medium text-slate-700 transition active:scale-95"
                  >
                    <span className="text-slate-500">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function BottomLink({ to, label, icon, end }: { to: string; label: string; icon: ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
          isActive ? 'text-brand-700' : 'text-slate-500',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
