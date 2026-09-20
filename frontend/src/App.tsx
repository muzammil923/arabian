import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './hooks/useAuth'
import { AppShell } from './components/layout'
import { CurrencyProvider } from './components/money'
import { KeyboardProvider } from './components/OnScreenKeyboard'
import { LoadingBlock } from './components/ui'
import { isAdmin, isManager } from './lib/constants'
import { LoginPage } from './pages/LoginPage'
import { PosHomePage } from './pages/PosHomePage'
import { DashboardPage } from './pages/DashboardPage'
import { OrdersPage } from './pages/OrdersPage'
import { NewOrderPage } from './pages/NewOrderPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerDetailPage } from './pages/CustomerDetailPage'
import { PickupsPage } from './pages/PickupsPage'
import { DeliveriesPage } from './pages/DeliveriesPage'
import { ReportsPage } from './pages/ReportsPage'
import { PricingPage } from './pages/PricingPage'
import { StaffPage } from './pages/StaffPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReceiptsPage } from './pages/ReceiptsPage'
import { SaleStatusPage } from './pages/SaleStatusPage'
import { PosCustomerSearchPage } from './pages/PosCustomerSearchPage'
import { RackMapPage } from './pages/RackMapPage'
import { CreditCollectionPage } from './pages/CreditCollectionPage'
import { BackOfficePage } from './pages/BackOfficePage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <LoadingBlock label="Checking session…" />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

function RequireManager({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  if (!isManager(role ?? undefined)) return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  if (!isAdmin(role ?? undefined)) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <CurrencyProvider>
              <KeyboardProvider>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<PosHomePage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/new" element={<NewOrderPage />} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailPage />} />
                    <Route path="/pickups" element={<PickupsPage />} />
                    <Route path="/deliveries" element={<DeliveriesPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/receipts" element={<ReceiptsPage />} />
                    <Route path="/sale-status" element={<SaleStatusPage />} />
                    <Route path="/pos/customer" element={<PosCustomerSearchPage />} />
                    <Route path="/rack-map" element={<RackMapPage />} />
                    <Route path="/credits" element={<CreditCollectionPage />} />
                    <Route
                      path="/back-office"
                      element={
                        <RequireManager>
                          <BackOfficePage />
                        </RequireManager>
                      }
                    />
                    <Route
                      path="/pricing"
                      element={
                        <RequireManager>
                          <PricingPage />
                        </RequireManager>
                      }
                    />
                    <Route
                      path="/staff"
                      element={
                        <RequireManager>
                          <StaffPage />
                        </RequireManager>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <RequireAdmin>
                          <SettingsPage />
                        </RequireAdmin>
                      }
                    />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </AppShell>
              </KeyboardProvider>
            </CurrencyProvider>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
