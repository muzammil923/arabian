import { normalizePhone } from '../utils/phone'
import { conflict, notFound } from '../utils/http'
import { findCustomerByPhone, listCustomers, createCustomer as repoCreate, findCustomerById, updateCustomer as repoUpdate, createAddress as repoCreateAddress, listAddresses, updateAddress as repoUpdateAddress, deleteAddress as repoDeleteAddress, findAddress as repoFindAddress, customerSummary as repoSummary } from '../repositories/customers'
import { findBusiness } from './business.helper'
import { q } from '../lib/turso'
import { newId, nowIso } from '../utils/helpers'
import type { AuthUser } from '../types'

export async function searchCustomers(businessId: string, opts: { search?: string; page?: number; limit?: number }) {
  return listCustomers(businessId, opts)
}

export async function createCustomer(auth: AuthUser, data: { name: string; phone: { raw: string; country: string }; email?: string | null; notes?: string | null }) {
  const parsed = normalizePhone(data.phone.raw, data.phone.country)
  const existing = await findCustomerByPhone(auth.businessId, parsed.e164)
  if (existing) {
    throw conflict('A customer with this phone number already exists.', 'DUPLICATE_CUSTOMER', { existing_customer_id: existing.id })
  }
  const customer = await repoCreate({ businessId: auth.businessId, name: data.name, phone: parsed, email: data.email, notes: data.notes })
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'customer_created', 'customer', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, customer.id, JSON.stringify({ name: customer.name }), nowIso()],
  )
  return customer
}

export async function updateCustomer(auth: AuthUser, customerId: string, data: { name?: string; email?: string | null; notes?: string | null; phone?: { raw: string; country: string } }) {
  let phoneData: { country: string; countryCode: string; national: string; e164: string } | undefined
  if (data.phone && data.phone.raw) {
    const parsed = normalizePhone(data.phone.raw, data.phone.country)
    const existing = await findCustomerByPhone(auth.businessId, parsed.e164)
    if (existing && existing.id !== customerId) {
      throw conflict('Another customer with this phone number already exists.', 'DUPLICATE_CUSTOMER')
    }
    phoneData = parsed
  }
  const updated = await repoUpdate(auth.businessId, customerId, { name: data.name, email: data.email, notes: data.notes, phone: phoneData })
  if (!updated) throw notFound('Customer not found.')
  return updated
}

export async function getCustomerProfile(auth: AuthUser, customerId: string) {
  const customer = await findCustomerById(auth.businessId, customerId)
  if (!customer) throw notFound('Customer not found.')
  const summary = await repoSummary(auth.businessId, customerId)
  const addresses = await listAddresses(auth.businessId, customerId)
  const orders = await q(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_minor, o.amount_paid_minor, o.balance_minor, o.created_at, o.expected_completion_at
     FROM orders o WHERE o.customer_id = ? AND o.business_id = ? ORDER BY o.created_at DESC LIMIT 50`,
    [customerId, auth.businessId],
  )
  const payments = await q(
    `SELECT p.id, p.amount_minor, p.method, p.type, p.recorded_at, p.note, o.order_number
     FROM payments p JOIN orders o ON o.id = p.order_id
     WHERE o.customer_id = ? AND o.business_id = ?
     ORDER BY p.recorded_at DESC LIMIT 50`,
    [customerId, auth.businessId],
  )
  const pickups = await q(
    `SELECT p.id, p.status, p.scheduled_date, p.scheduled_slot, p.address_snapshot, p.created_at
     FROM pickups p WHERE p.customer_id = ? AND p.business_id = ? ORDER BY p.created_at DESC LIMIT 20`,
    [customerId, auth.businessId],
  )
  const deliveries = await q(
    `SELECT d.id, d.status, d.scheduled_date, d.scheduled_slot, d.address_snapshot, d.created_at
     FROM deliveries d WHERE d.customer_id = ? AND d.business_id = ? ORDER BY d.created_at DESC LIMIT 20`,
    [customerId, auth.businessId],
  )

  return {
    customer,
    summary,
    addresses,
    orders: orders.rows.map((r) => r as Record<string, unknown>),
    payments: payments.rows.map((r) => r as Record<string, unknown>),
    pickups: pickups.rows.map((r) => r as Record<string, unknown>),
    deliveries: deliveries.rows.map((r) => r as Record<string, unknown>),
  }
}

export async function addCustomerAddress(
  auth: AuthUser,
  customerId: string,
  data: { label: string; address_line_1: string; address_line_2?: string | null; landmark?: string | null; city?: string | null; state_region?: string | null; postal_code?: string | null; country_code: string; is_default?: boolean },
) {
  const customer = await findCustomerById(auth.businessId, customerId)
  if (!customer) throw notFound('Customer not found.')
  return repoCreateAddress(auth.businessId, customerId, data)
}

export async function updateCustomerAddress(
  auth: AuthUser,
  customerId: string,
  addressId: string,
  data: Partial<{ label: string; address_line_1: string; address_line_2: string | null; landmark: string | null; city: string | null; state_region: string | null; postal_code: string | null; country_code: string; is_default: boolean }>,
) {
  const address = await repoFindAddress(auth.businessId, addressId)
  if (!address || address.customer_id !== customerId) throw notFound('Address not found.')
  return repoUpdateAddress(auth.businessId, addressId, data)
}

export async function removeCustomerAddress(auth: AuthUser, customerId: string, addressId: string) {
  const address = await repoFindAddress(auth.businessId, addressId)
  if (!address || address.customer_id !== customerId) throw notFound('Address not found.')
  await repoDeleteAddress(auth.businessId, addressId)
  const business = await findBusiness(auth.businessId)
  if (business) {
    await q(
      `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'address_deleted', 'customer_address', ?, ?, ?)`,
      [newId(), auth.businessId, auth.id, addressId, JSON.stringify({ customer_id: customerId }), nowIso()],
    )
  }
  return { deleted: true }
}