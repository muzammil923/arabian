import { useState } from 'react'
import { Printer } from 'lucide-react'
import { api } from '../lib/api'
import { OrderReceipt } from './OrderReceipt'
import { Button } from './ui'
import type { Business, BusinessSettings, OrderWithRelations } from '../types/api'

export function PrintReceiptButton({
  orderId,
  business,
  settings,
  label = 'Receipt',
}: {
  orderId: string
  business: Business | undefined
  settings: BusinessSettings | undefined
  label?: string
}) {
  const [order, setOrder] = useState<OrderWithRelations | null>(null)
  const [loading, setLoading] = useState(false)

  const print = async () => {
    if (loading) return
    setLoading(true)
    try {
      const data = await api.get<OrderWithRelations>(`/orders/${orderId}`)
      setOrder(data)
      requestAnimationFrame(() => window.setTimeout(() => window.print(), 120))
    } catch (err) {
      console.error('Failed to load order for receipt', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" loading={loading} onClick={() => void print()}>
        <Printer className="h-4 w-4" /> {label}
      </Button>
      {order ? <OrderReceipt order={order} business={business} settings={settings} /> : null}
    </>
  )
}