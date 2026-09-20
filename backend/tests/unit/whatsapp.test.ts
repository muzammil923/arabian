import { describe, expect, it } from 'vitest'
import {
  buildWhatsAppUrl,
  buildOrderReceivedMessage,
  buildOrderReadyMessage,
  buildPickupScheduledMessage,
  buildDeliveryMessage,
  buildPaymentReminderMessage,
  buildCustomMessage,
} from '../../src/utils/whatsapp'

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me link with only digits', () => {
    expect(buildWhatsAppUrl('+91 98765 43210', 'Hello')).toBe('https://wa.me/919876543210?text=Hello')
  })

  it('percent-encodes the message', () => {
    const url = buildWhatsAppUrl('+919876543210', 'Hello & thanks, order #LND-0001')
    expect(url).toBe('https://wa.me/919876543210?text=Hello%20%26%20thanks%2C%20order%20%23LND-0001')
  })
})

describe('message templates', () => {
  const ctx = {
    customerName: 'Rahul',
    orderNumber: 'LND-0001',
    itemCount: 3,
    totalLabel: '₹126.00',
    balanceLabel: '₹26.00',
    businessName: 'Demo Laundry',
    returnMethod: 'CUSTOMER_PICKUP' as const,
    expectedCompletionLabel: 'Tomorrow',
  }

  it('order received mentions number, items, balance', () => {
    const msg = buildOrderReceivedMessage(ctx)
    expect(msg).toContain('LND-0001')
    expect(msg).toContain('Items: 3')
    expect(msg).toContain('Balance: ₹26.00')
  })

  it('omits balance line when fully paid', () => {
    const msg = buildOrderReceivedMessage({ ...ctx, balanceLabel: ctx.totalLabel })
    expect(msg).not.toContain('Balance:')
  })

  it('order ready differs for delivery vs pickup', () => {
    const pickup = buildOrderReadyMessage(ctx)
    expect(pickup).toContain('ready for pickup')
    const delivery = buildOrderReadyMessage({ ...ctx, returnMethod: 'HOME_DELIVERY' })
    expect(delivery).toContain('home delivery')
    expect(delivery).not.toContain('ready for pickup')
  })

  it('scheduled pickup and reminders include date/address', () => {
    const pctx = { customerName: 'Rahul', pickupDate: '20 Sep', pickupTime: '10-12 AM', shortAddress: '41 A, MG Road', businessName: 'Demo Laundry' }
    expect(buildPickupScheduledMessage(pctx)).toContain('41 A, MG Road')
    expect(buildPickupScheduledMessage(pctx)).toContain('20 Sep')
  })

  it('custom message includes custom text and signature', () => {
    const msg = buildCustomMessage({ customerName: 'Rahul', businessName: 'Demo Laundry', customText: 'Hi, please call us.' })
    expect(msg).toContain('Hi, please call us.')
    expect(msg).toContain('Demo Laundry')
  })

  it('delivery and payment reminder include balance when set', () => {
    const base = { customerName: 'Rahul', orderNumber: 'LND-0001', balanceLabel: '₹26.00', businessName: 'Demo Laundry' }
    expect(buildDeliveryMessage(base)).toContain('₹26.00')
    expect(buildDeliveryMessage({ ...base, balanceLabel: undefined })).not.toContain('Outstanding')
    expect(buildPaymentReminderMessage(base)).toContain('₹26.00')
  })
})