import { q, execBatch } from '../lib/turso'
import { newId, nowIso } from '../utils/helpers'
import type { Customer, CustomerAddress } from '../types'

export interface CustomerSummary {
  total_orders: number
  total_spending_minor: number
  outstanding_minor: number
  last_visit: string | null
}

export interface CustomerListResult {
  rows: Array<Customer & { total_orders: number; outstanding_minor: number; last_order_at: string | null }>
  total: number
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    phone_country: String(row.phone_country),
    phone_country_code: String(row.phone_country_code),
    phone_national: String(row.phone_national),
    phone_e164: String(row.phone_e164),
    email: row.email ? String(row.email) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function listCustomers(
  businessId: string,
  opts: { search?: string; page?: number; limit?: number },
): Promise<CustomerListResult> {
  const page = opts.page ?? 1
  const limit = opts.limit ?? 20
  const offset = (page - 1) * limit
  const where: string[] = ['c.business_id = ?']
  const args: unknown[] = [businessId]
  if (opts.search) {
    where.push('(c.name LIKE ? OR c.phone_national LIKE ? OR c.phone_e164 LIKE ? OR c.id LIKE ?)')
    const like = `%${opts.search}%`
    args.push(like, like, like, like)
  }
  const whereSql = where.join(' AND ')
  const countRes = await q(`SELECT COUNT(*) AS total FROM customers c WHERE ${whereSql}`, args)
  const total = Number(countRes.rows[0]?.total ?? 0)
  const res = await q(
    `SELECT c.*,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS total_orders,
            (SELECT COALESCE(SUM(o.balance_minor), 0) FROM orders o WHERE o.customer_id = c.id AND o.payment_status IN ('UNPAID','PARTIALLY_PAID')) AS outstanding_minor,
            (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order_at
     FROM customers c
     WHERE ${whereSql}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, offset],
  )
  const rows = res.rows.map((r) => ({
    ...mapCustomer(r as Record<string, unknown>),
    total_orders: Number((r as Record<string, unknown>).total_orders ?? 0),
    outstanding_minor: Number((r as Record<string, unknown>).outstanding_minor ?? 0),
    last_order_at: (r as Record<string, unknown>).last_order_at ? String((r as Record<string, unknown>).last_order_at) : null,
  }))
  return { rows, total }
}

export async function findCustomerById(businessId: string, customerId: string): Promise<Customer | null> {
  const res = await q('SELECT * FROM customers WHERE id = ? AND business_id = ?', [customerId, businessId])
  if (!res.rows[0]) return null
  return mapCustomer(res.rows[0] as Record<string, unknown>)
}

export async function findCustomerByPhone(businessId: string, e164: string): Promise<Customer | null> {
  const res = await q('SELECT * FROM customers WHERE phone_e164 = ? AND business_id = ?', [e164, businessId])
  if (!res.rows[0]) return null
  return mapCustomer(res.rows[0] as Record<string, unknown>)
}

export async function createCustomer(data: {
  businessId: string
  name: string
  phone: { country: string; countryCode: string; national: string; e164: string }
  email?: string | null
  notes?: string | null
}): Promise<Customer> {
  const id = newId()
  const ts = nowIso()
  await q(
    `INSERT INTO customers (id, business_id, name, phone_country, phone_country_code, phone_national, phone_e164, email, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.businessId,
      data.name,
      data.phone.country,
      data.phone.countryCode,
      data.phone.national,
      data.phone.e164,
      data.email ?? null,
      data.notes ?? null,
      ts,
      ts,
    ],
  )
  return (await findCustomerById(data.businessId, id)) as Customer
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  data: { name?: string; email?: string | null; notes?: string | null; phone?: Partial<{ country: string; countryCode: string; national: string; e164: string }> },
): Promise<Customer | null> {
  const existing = await findCustomerById(businessId, customerId)
  if (!existing) return null
  const merged = {
    name: data.name ?? existing.name,
    email: data.email === undefined ? existing.email : data.email,
    notes: data.notes === undefined ? existing.notes : data.notes,
    phone: data.phone
      ? { country: data.phone.country ?? existing.phone_country, countryCode: data.phone.countryCode ?? existing.phone_country_code, national: data.phone.national ?? existing.phone_national, e164: data.phone.e164 ?? existing.phone_e164 }
      : { country: existing.phone_country, countryCode: existing.phone_country_code, national: existing.phone_national, e164: existing.phone_e164 },
  }
  await q(
    `UPDATE customers SET name = ?, email = ?, notes = ?,
       phone_country = ?, phone_country_code = ?, phone_national = ?, phone_e164 = ?,
       updated_at = ?
     WHERE id = ? AND business_id = ?`,
    [merged.name, merged.email, merged.notes, merged.phone.country, merged.phone.countryCode, merged.phone.national, merged.phone.e164, nowIso(), customerId, businessId],
  )
  return (await findCustomerById(businessId, customerId)) as Customer
}

export async function customerSummary(businessId: string, customerId: string): Promise<CustomerSummary | null> {
  const res = await q(
    `SELECT
       (SELECT COUNT(*) FROM orders WHERE customer_id = ?) AS total_orders,
       (SELECT COALESCE(SUM(total_minor), 0) FROM orders WHERE customer_id = ? AND status != 'CANCELLED') AS total_spending_minor,
       (SELECT COALESCE(SUM(balance_minor), 0) FROM orders WHERE customer_id = ? AND payment_status IN ('UNPAID','PARTIALLY_PAID')) AS outstanding_minor,
       (SELECT MAX(created_at) FROM orders WHERE customer_id = ?) AS last_visit
     WHERE EXISTS (SELECT 1 FROM customers WHERE id = ? AND business_id = ?)`,
    [customerId, customerId, customerId, customerId, customerId, businessId],
  )
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return {
    total_orders: Number(row.total_orders ?? 0),
    total_spending_minor: Number(row.total_spending_minor ?? 0),
    outstanding_minor: Number(row.outstanding_minor ?? 0),
    last_visit: row.last_visit ? String(row.last_visit) : null,
  }
}

// ----- Addresses -----

function mapAddress(row: Record<string, unknown>): CustomerAddress {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    customer_id: String(row.customer_id),
    label: String(row.label),
    address_line_1: String(row.address_line_1),
    address_line_2: row.address_line_2 ? String(row.address_line_2) : null,
    landmark: row.landmark ? String(row.landmark) : null,
    city: row.city ? String(row.city) : null,
    state_region: row.state_region ? String(row.state_region) : null,
    postal_code: row.postal_code ? String(row.postal_code) : null,
    country_code: String(row.country_code),
    is_default: Number(row.is_default ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function listAddresses(businessId: string, customerId: string): Promise<CustomerAddress[]> {
  const res = await q(
    'SELECT * FROM customer_addresses WHERE business_id = ? AND customer_id = ? ORDER BY is_default DESC, created_at DESC',
    [businessId, customerId],
  )
  return res.rows.map((r) => mapAddress(r as Record<string, unknown>))
}

export async function findAddress(businessId: string, id: string): Promise<CustomerAddress | null> {
  const res = await q('SELECT * FROM customer_addresses WHERE id = ? AND business_id = ?', [id, businessId])
  return res.rows[0] ? mapAddress(res.rows[0] as Record<string, unknown>) : null
}

export async function createAddress(
  businessId: string,
  customerId: string,
  data: {
    label: string
    address_line_1: string
    address_line_2?: string | null
    landmark?: string | null
    city?: string | null
    state_region?: string | null
    postal_code?: string | null
    country_code: string
    is_default?: boolean
  },
): Promise<CustomerAddress> {
  const id = newId()
  const ts = nowIso()
  await execBatch(
    [
      {
        sql: `UPDATE customer_addresses SET is_default = 0 WHERE business_id = ? AND customer_id = ? AND is_default = 1`,
        args: [businessId, customerId],
      },
      {
        sql: `INSERT INTO customer_addresses (id, business_id, customer_id, label, address_line_1, address_line_2, landmark, city, state_region, postal_code, country_code, is_default, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          businessId,
          customerId,
          data.label,
          data.address_line_1,
          data.address_line_2 ?? null,
          data.landmark ?? null,
          data.city ?? null,
          data.state_region ?? null,
          data.postal_code ?? null,
          data.country_code,
          data.is_default ? 1 : 0,
          ts,
          ts,
        ],
      },
    ],
    'write',
  )
  return (await findAddress(businessId, id)) as CustomerAddress
}

export async function updateAddress(
  businessId: string,
  id: string,
  data: Partial<{
    label: string
    address_line_1: string
    address_line_2: string | null
    landmark: string | null
    city: string | null
    state_region: string | null
    postal_code: string | null
    country_code: string
    is_default: boolean
  }>,
): Promise<CustomerAddress | null> {
  const existing = await findAddress(businessId, id)
  if (!existing) return null
  const merged = {
    label: data.label ?? existing.label,
    address_line_1: data.address_line_1 ?? existing.address_line_1,
    address_line_2: data.address_line_2 === undefined ? existing.address_line_2 : data.address_line_2,
    landmark: data.landmark === undefined ? existing.landmark : data.landmark,
    city: data.city === undefined ? existing.city : data.city,
    state_region: data.state_region === undefined ? existing.state_region : data.state_region,
    postal_code: data.postal_code === undefined ? existing.postal_code : data.postal_code,
    country_code: data.country_code ?? existing.country_code,
    is_default: data.is_default ?? existing.is_default === 1,
  }
  await execBatch(
    [
      {
        sql: `UPDATE customer_addresses SET is_default = 0 WHERE business_id = ? AND customer_id = ? AND id != ?`,
        args: [businessId, existing.customer_id, id],
      },
      {
        sql: `UPDATE customer_addresses SET label = ?, address_line_1 = ?, address_line_2 = ?, landmark = ?, city = ?, state_region = ?, postal_code = ?, country_code = ?, is_default = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
        args: [
          merged.label,
          merged.address_line_1,
          merged.address_line_2,
          merged.landmark,
          merged.city,
          merged.state_region,
          merged.postal_code,
          merged.country_code,
          merged.is_default ? 1 : 0,
          nowIso(),
          id,
          businessId,
        ],
      },
    ],
    'write',
  )
  return (await findAddress(businessId, id)) as CustomerAddress
}

export async function deleteAddress(businessId: string, id: string): Promise<boolean> {
  const res = await q('DELETE FROM customer_addresses WHERE id = ? AND business_id = ?', [id, businessId])
  return Number(res.rowsAffected) > 0
}