import { Link } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Shirt,
  Truck,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/queries'
import { isAdmin } from '../lib/constants'
import { Card } from '../components/ui'

interface OfficeLink {
  to: string
  label: string
  description: string
  icon: React.ReactNode
}

export function BackOfficePage() {
  const { role } = useAuth()
  const { data: settings } = useSettings()
  const admin = isAdmin(role ?? undefined)

  const links: OfficeLink[] = [
    { to: '/dashboard', label: 'Dashboard', description: 'Business metrics at a glance', icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: '/orders', label: 'Orders', description: 'Full order list & filters', icon: <Package className="h-5 w-5" /> },
    { to: '/customers', label: 'Customers', description: 'Manage customer profiles', icon: <Users className="h-5 w-5" /> },
    { to: '/pickups', label: 'Pickups', description: 'Home pickups & routes', icon: <Search className="h-5 w-5" /> },
    { to: '/deliveries', label: 'Deliveries', description: 'Schedule round trips', icon: <Truck className="h-5 w-5" /> },
    { to: '/reports', label: 'Reports', description: 'Revenue & operations insights', icon: <BarChart3 className="h-5 w-5" /> },
    { to: '/pricing', label: 'Services & pricing', description: 'Price list & service catalog', icon: <Shirt className="h-5 w-5" /> },
    { to: '/staff', label: 'Staff', description: 'Team members & roles', icon: <Users className="h-5 w-5" /> },
  ]
  if (admin) {
    links.push({ to: '/settings', label: 'Settings', description: 'Business profile & preferences', icon: <SettingsIcon className="h-5 w-5" /> })
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <ShieldCheck className="h-6 w-6 text-brand-300" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Back office</h1>
            <p className="text-sm text-slate-300">
              {settings?.business.name ?? 'Laundry CRM'} · {role?.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group flex items-start gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              {link.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-900 group-hover:text-brand-700">{link.label}</span>
              <span className="mt-0.5 block text-sm text-slate-500">{link.description}</span>
            </span>
          </Link>
        ))}
      </div>

      <Card className="p-4 text-sm text-slate-500">
        Back office is restricted to Owner, Admin and Manager roles. Counter staff use the POS home screen for day-to-day sales.
      </Card>
    </div>
  )
}