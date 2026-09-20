/**
 * WhatsApp Click-to-Chat helpers.
 *
 * MVP behavior: the app PREPARES the message and opens WhatsApp with the
 * customer's number pre-filled. The employee presses SEND manually. Nothing in
 * this file claims a message was actually delivered.
 */

export function buildWhatsAppUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export type ReturnMethod = 'CUSTOMER_PICKUP' | 'HOME_DELIVERY'

export interface OrderMessageContext {
  customerName: string
  orderNumber: string
  itemCount: number
  totalLabel: string
  balanceLabel: string
  businessName: string
  returnMethod: ReturnMethod
  expectedCompletionLabel?: string
}

export interface PickupMessageContext {
  customerName: string
  pickupDate: string
  pickupTime: string
  shortAddress: string
  businessName: string
}

export interface GenericMessageContext {
  customerName: string
  orderNumber?: string
  balanceLabel?: string
  pickUpdate?: string
  deliveryDate?: string
  deliverySlot?: string
  businessName: string
  customText?: string
}

export function buildOrderReceivedMessage(ctx: OrderMessageContext): string {
  const lines = [
    `Hi ${ctx.customerName} 👋`,
    '',
    `Your laundry order ${ctx.orderNumber} has been received.`,
    `Items: ${ctx.itemCount}`,
    `Total: ${ctx.totalLabel}`,
  ]
  if (ctx.expectedCompletionLabel) lines.push(`Expected completion: ${ctx.expectedCompletionLabel}`)
  if (ctx.balanceLabel && ctx.balanceLabel !== ctx.totalLabel) lines.push(`Balance: ${ctx.balanceLabel}`)
  lines.push('')
  lines.push(`Thank you!`)
  return lines.join('\n')
}

export function buildOrderReadyMessage(ctx: OrderMessageContext): string {
  if (ctx.returnMethod === 'HOME_DELIVERY') {
    return [
      `Hi ${ctx.customerName} 👋`,
      '',
      `Your laundry order ${ctx.orderNumber} is ready.`,
      `Items: ${ctx.itemCount}`,
      `Total: ${ctx.totalLabel}`,
      ctx.balanceLabel ? `Balance: ${ctx.balanceLabel}` : null,
      '',
      `Your order is ready for home delivery. We'll update you regarding the delivery.`,
      '',
      `— ${ctx.businessName}`,
    ].filter((line): line is string => line !== null).join('\n')
  }
  return [
    `Hi ${ctx.customerName} 👋`,
    '',
    `Your laundry order ${ctx.orderNumber} is ready for pickup.`,
    `Items: ${ctx.itemCount}`,
    `Total: ${ctx.totalLabel}`,
    ctx.balanceLabel ? `Balance: ${ctx.balanceLabel}` : null,
    '',
    `You can collect your clothes from ${ctx.businessName}.`,
    '',
    `Thank you!`,
  ].filter((line): line is string => line !== null).join('\n')
}

export function buildPickupScheduledMessage(ctx: PickupMessageContext): string {
  return [
    `Hi ${ctx.customerName} 👋`,
    '',
    `Your laundry pickup has been scheduled.`,
    `Date: ${ctx.pickupDate}`,
    `Time: ${ctx.pickupTime}`,
    '',
    `Pickup address:`,
    `${ctx.shortAddress}`,
    '',
    `Our team will collect your clothes during this time.`,
    '',
    `— ${ctx.businessName}`,
  ].join('\n')
}

export function buildPickupReminderMessage(ctx: PickupMessageContext): string {
  return [
    `Hi ${ctx.customerName} 👋`,
    '',
    `This is a reminder that we're picking up your laundry.`,
    `Date: ${ctx.pickupDate}`,
    `Time: ${ctx.pickupTime}`,
    '',
    `Pickup address:`,
    `${ctx.shortAddress}`,
    '',
    `Please keep your clothes ready.`,
    '',
    `— ${ctx.businessName}`,
  ].join('\n')
}

export function buildDeliveryMessage(ctx: GenericMessageContext): string {
  const lines = [
    `Hi ${ctx.customerName} 👋`,
    '',
    ctx.orderNumber ? `Your laundry order ${ctx.orderNumber}` : 'Your laundry order',
    ctx.deliveryDate ? `Delivery date: ${ctx.deliveryDate}` : null,
    ctx.deliverySlot ? `Time: ${ctx.deliverySlot}` : null,
    ctx.balanceLabel ? `Balance: ${ctx.balanceLabel}` : null,
    '',
    `Please keep your payment ready if there's an outstanding balance.`,
    '',
    `— ${ctx.businessName}`,
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}

export function buildPaymentReminderMessage(ctx: GenericMessageContext): string {
  return [
    `Hi ${ctx.customerName} 👋`,
    '',
    `This is a reminder regarding your laundry order${ctx.orderNumber ? ` ${ctx.orderNumber}` : ''}.`,
    ctx.balanceLabel ? `Outstanding balance: ${ctx.balanceLabel}` : null,
    '',
    `Kindly clear the balance at your earliest convenience.`,
    '',
    `— ${ctx.businessName}`,
  ].filter((line): line is string => line !== null).join('\n')
}

export function buildOrderStatusUpdateMessage(ctx: OrderMessageContext): string {
  return [
    `Hi ${ctx.customerName} 👋`,
    '',
    `Your laundry order ${ctx.orderNumber} is being processed.`,
    `Items: ${ctx.itemCount}`,
    `Total: ${ctx.totalLabel}`,
    ctx.balanceLabel ? `Balance: ${ctx.balanceLabel}` : null,
    '',
    `We'll keep you updated.`,
    '',
    `— ${ctx.businessName}`,
  ].filter((line): line is string => line !== null).join('\n')
}

export function buildCustomMessage(ctx: GenericMessageContext): string {
  const prefix = ctx.customText?.trim()
  const lines = [prefix]
  if (ctx.balanceLabel) lines.push(`Outstanding balance: ${ctx.balanceLabel}`)
  lines.push('')
  lines.push(`— ${ctx.businessName}`)
  return lines.filter((line) => line && line.trim()).join('\n')
}

export const WHATSAPP_TEMPLATES = [
  { value: 'ORDER_RECEIVED', label: 'Order Received' },
  { value: 'ORDER_READY', label: 'Order Ready' },
  { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
  { value: 'PICKUP_REMINDER', label: 'Pickup Reminder' },
  { value: 'DELIVERY_UPDATE', label: 'Delivery Update' },
  { value: 'PAYMENT_REMINDER', label: 'Payment Reminder' },
  { value: 'ORDER_STATUS_UPDATE', label: 'Order Status Update' },
  { value: 'CUSTOM', label: 'Custom Message' },
] as const

export type WhatsAppTemplate = (typeof WHATSAPP_TEMPLATES)[number]['value']