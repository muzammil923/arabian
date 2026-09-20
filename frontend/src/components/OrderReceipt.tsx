import { formatDateTime, formatMoney } from '../lib/format'
import { formatPhoneDisplay } from '../lib/phone'
import { statusLabel } from '../lib/constants'
import type { Business, BusinessSettings, OrderWithRelations } from '../types/api'

export function OrderReceipt({
  order,
  business,
  settings,
}: {
  order: OrderWithRelations
  business: Business | undefined
  settings: BusinessSettings | undefined
}) {
  const currency = business?.currency ?? 'INR'
  const customer = order.customer

  return (
    <div className="print-only mx-auto max-w-md p-6 text-sm text-slate-900">
      <div className="text-center">
        <h1 className="text-lg font-bold">{business?.name ?? 'Laundry'}</h1>
        {business?.address ? <p className="text-xs text-slate-600">{business.address}</p> : null}
        {business?.phone_e164 ? <p className="text-xs text-slate-600">{formatPhoneDisplay(business.phone_e164)}</p> : null}
      </div>

      <div className="mt-4 flex justify-between border-y border-slate-300 py-2 text-xs">
        <span>Order {order.order_number}</span>
        <span>{formatDateTime(order.created_at)}</span>
      </div>

      <div className="mt-3 text-xs">
        <p className="font-semibold">{customer?.name ?? 'Customer'}</p>
        {customer?.phone_e164 ? <p>{formatPhoneDisplay(customer.phone_e164)}</p> : null}
        <p className="mt-1">
          Status: {statusLabel(order.status)} · Payment: {statusLabel(order.payment_status)}
        </p>
      </div>

      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-1">Item</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Rate</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(order.items ?? []).map((item) => (
            <tr key={item.id} className="border-b border-slate-100">
              <td className="py-1">
                {item.garment_name ?? 'Garment'}
                <span className="block text-[10px] text-slate-500">{item.service_name ?? ''}</span>
              </td>
              <td className="py-1 text-right">{item.quantity}</td>
              <td className="py-1 text-right">{formatMoney(item.unit_price_minor, currency)}</td>
              <td className="py-1 text-right">{formatMoney(item.line_total_minor, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 space-y-1 text-xs">
        <Line label="Subtotal" value={formatMoney(order.subtotal_minor, currency)} />
        {order.discount_minor > 0 ? <Line label="Discount" value={`- ${formatMoney(order.discount_minor, currency)}`} /> : null}
        <Line label={business?.tax_name ?? 'Tax'} value={formatMoney(order.tax_minor, currency)} />
        <Line label="Total" value={formatMoney(order.total_minor, currency)} strong />
        <Line label="Paid" value={formatMoney(order.amount_paid_minor, currency)} />
        <Line label="Balance" value={formatMoney(order.balance_minor, currency)} strong />
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        {settings?.receipt_footer ?? 'Thank you for your business!'}
      </p>
    </div>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
