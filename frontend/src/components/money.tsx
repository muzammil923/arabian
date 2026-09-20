import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { formatMoney } from '../lib/format'
import { statusLabel, statusTone } from '../lib/constants'
import { useSettings } from '../hooks/queries'

/* ----------------------------- Currency ------------------------------- */

const CurrencyContext = createContext<string>('INR')

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data } = useSettings()
  const currency = data?.business.currency || 'INR'
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): string {
  return useContext(CurrencyContext)
}

export function Money({
  minor,
  className,
  signed,
}: {
  minor: number
  className?: string
  signed?: boolean
}) {
  const currency = useCurrency()
  const text = formatMoney(minor, currency)
  return <span className={cn('tabular-nums', className)}>{signed && minor > 0 ? `+${text}` : text}</span>
}

/* --------------------------- Status badge ----------------------------- */

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        statusTone(status),
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

export function useCurrencySymbol(): string {
  const { data } = useSettings()
  return useMemo(() => data?.business.currency_symbol || data?.business.currency || '₹', [data])
}
