import { q, execBatch } from '../lib/turso'
import { hashPassword } from '../lib/security'
import { HttpError } from '../utils/http'
import { newId, nowIso } from '../utils/helpers'
import type { Branch, Business, BusinessSettings, Role, StaffUser } from '../types'

export async function getBusiness(businessId: string): Promise<Business | null> {
  const res = await q('SELECT * FROM businesses WHERE id = ?', [businessId])
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return {
    id: String(row.id),
    name: String(row.name),
    logo_url: row.logo_url ? String(row.logo_url) : null,
    address: row.address ? String(row.address) : null,
    phone_e164: row.phone_e164 ? String(row.phone_e164) : null,
    country_code: String(row.country_code),
    currency: String(row.currency),
    currency_symbol: String(row.currency_symbol ?? ''),
    timezone: String(row.timezone),
    default_calling_country: String(row.default_calling_country),
    language: String(row.language),
    tax_name: String(row.tax_name),
    tax_bp: Number(row.tax_bp ?? 0),
    is_active: Number(row.is_active ?? 1),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function getSettings(businessId: string): Promise<BusinessSettings | null> {
  const res = await q('SELECT * FROM business_settings WHERE business_id = ?', [businessId])
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    invoice_prefix: String(row.invoice_prefix),
    order_prefix: String(row.order_prefix),
    order_number_min_digits: Number(row.order_number_min_digits ?? 4),
    receipt_footer: String(row.receipt_footer),
    expected_turnaround_hours: Number(row.expected_turnaround_hours ?? 24),
    pickup_enabled: Number(row.pickup_enabled ?? 1),
    delivery_enabled: Number(row.delivery_enabled ?? 1),
    delivery_charge_minor: Number(row.delivery_charge_minor ?? 0),
    enable_prepaid_checkout: Number(row.enable_prepaid_checkout ?? 1),
    whatsapp_notes: row.whatsapp_notes ? String(row.whatsapp_notes) : null,
  }
}

export async function updateBusinessSettings(
  businessId: string,
  data: Partial<Business> & Partial<BusinessSettings>,
): Promise<{ business: Business; settings: BusinessSettings }> {
  const business = await getBusiness(businessId)
  const settings = await getSettings(businessId)
  if (!business || !settings) throw new HttpError(404, 'Business not found.')

  const now = nowIso()
  await execBatch(
    [
      {
        sql: `UPDATE businesses SET
               name = ?, logo_url = ?, address = ?, phone_e164 = ?, country_code = ?, currency = ?,
               currency_symbol = ?, timezone = ?, default_calling_country = ?, language = ?, tax_name = ?, tax_bp = ?, updated_at = ?
             WHERE id = ?`,
        args: [
          data.name ?? business.name,
          data.logo_url === undefined ? business.logo_url : data.logo_url,
          data.address === undefined ? business.address : data.address,
          data.phone_e164 === undefined ? business.phone_e164 : data.phone_e164,
          data.country_code ?? business.country_code,
          data.currency ?? business.currency,
          data.currency_symbol ?? business.currency_symbol,
          data.timezone ?? business.timezone,
          data.default_calling_country ?? business.default_calling_country,
          data.language ?? business.language,
          data.tax_name ?? business.tax_name,
          data.tax_bp ?? business.tax_bp,
          now,
          businessId,
        ],
      },
      {
        sql: `UPDATE business_settings SET
               invoice_prefix = ?, order_prefix = ?, order_number_min_digits = ?, receipt_footer = ?,
               expected_turnaround_hours = ?, pickup_enabled = ?, delivery_enabled = ?, delivery_charge_minor = ?,
               enable_prepaid_checkout = ?, whatsapp_notes = ?, updated_at = ?
             WHERE business_id = ?`,
        args: [
          data.invoice_prefix ?? settings.invoice_prefix,
          data.order_prefix ?? settings.order_prefix,
          data.order_number_min_digits ?? settings.order_number_min_digits,
          data.receipt_footer ?? settings.receipt_footer,
          data.expected_turnaround_hours ?? settings.expected_turnaround_hours,
          data.pickup_enabled === undefined ? settings.pickup_enabled : data.pickup_enabled ? 1 : 0,
          data.delivery_enabled === undefined ? settings.delivery_enabled : data.delivery_enabled ? 1 : 0,
          data.delivery_charge_minor ?? settings.delivery_charge_minor,
          data.enable_prepaid_checkout === undefined ? settings.enable_prepaid_checkout : data.enable_prepaid_checkout ? 1 : 0,
          data.whatsapp_notes === undefined ? settings.whatsapp_notes : data.whatsapp_notes,
          now,
          businessId,
        ],
      },
    ],
    'write',
  )
  return { business: (await getBusiness(businessId)) as Business, settings: (await getSettings(businessId)) as BusinessSettings }
}

// ----- Branches -----

export async function listBranches(businessId: string, includeInactive = false): Promise<Branch[]> {
  const res = await q(`SELECT * FROM branches WHERE business_id = ? ${includeInactive ? '' : 'AND is_active = 1'} ORDER BY name ASC`, [businessId])
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      business_id: String(row.business_id),
      name: String(row.name),
      address: row.address ? String(row.address) : null,
      phone_e164: row.phone_e164 ? String(row.phone_e164) : null,
      is_active: Number(row.is_active ?? 1),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }
  })
}

export async function findBranch(businessId: string, id: string): Promise<Branch | null> {
  const res = await q('SELECT * FROM branches WHERE id = ? AND business_id = ?', [id, businessId])
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    address: row.address ? String(row.address) : null,
    phone_e164: row.phone_e164 ? String(row.phone_e164) : null,
    is_active: Number(row.is_active ?? 1),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function createBranch(businessId: string, data: { name: string; address?: string | null; phone_e164?: string | null }): Promise<Branch> {
  const id = newId()
  const ts = nowIso()
  await q(`INSERT INTO branches (id, business_id, name, address, phone_e164, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`, [
    id,
    businessId,
    data.name,
    data.address ?? null,
    data.phone_e164 ?? null,
    ts,
    ts,
  ])
  return (await findBranch(businessId, id)) as Branch
}

export async function updateBranch(businessId: string, id: string, data: Partial<Omit<Branch, 'is_active'>> & { is_active?: number | boolean }): Promise<Branch | null> {
  const existing = await findBranch(businessId, id)
  if (!existing) return null
  await q(`UPDATE branches SET name = ?, address = ?, phone_e164 = ?, is_active = ?, updated_at = ? WHERE id = ? AND business_id = ?`, [
    data.name ?? existing.name,
    data.address === undefined ? existing.address : data.address,
    data.phone_e164 === undefined ? existing.phone_e164 : data.phone_e164,
    data.is_active === undefined ? existing.is_active : data.is_active ? 1 : 0,
    nowIso(),
    id,
    businessId,
  ])
  return (await findBranch(businessId, id)) as Branch
}

// ----- Staff -----

export async function listStaff(businessId: string, includeInactive = false): Promise<StaffUser[]> {
  const res = await q(
    `SELECT bu.id AS business_user_id, bu.role, bu.is_active, bu.created_at, u.id AS user_id, u.email, u.name, u.phone_e164
     FROM business_users bu
     JOIN users u ON u.id = bu.user_id
     WHERE bu.business_id = ?
     ORDER BY bu.created_at ASC`,
    [businessId],
  )
  const rows: StaffUser[] = res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      business_user_id: String(row.business_user_id),
      user_id: String(row.user_id),
      email: String(row.email),
      name: String(row.name),
      role: String(row.role) as Role,
      phone_e164: row.phone_e164 ? String(row.phone_e164) : null,
      is_active: Number(row.is_active ?? 1),
      created_at: String(row.created_at),
    }
  })
  return includeInactive ? rows : rows.filter((r) => r.is_active === 1)
}

export async function findStaffByEmail(email: string): Promise<{ id: string; email: string; name: string } | null> {
  const res = await q('SELECT id, email, name FROM users WHERE email = ? COLLATE NOCASE', [email])
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return { id: String(row.id), email: String(row.email), name: String(row.name) }
}

export async function createStaff(
  businessId: string,
  data: { name: string; email: string; password: string; role: Role; branch_id?: string | null; phone_e164?: string | null },
): Promise<StaffUser> {
  const existingUser = await findStaffByEmail(data.email)
  const passwordHash = await hashPassword(data.password)
  const ts = nowIso()
  let userId: string
  if (existingUser) {
    userId = existingUser.id
    const membership = await q('SELECT id FROM business_users WHERE business_id = ? AND user_id = ?', [businessId, userId])
    if (membership.rows[0]) throw new HttpError(409, 'A user with this email already exists in your business.')
    await q('UPDATE users SET name = ?, updated_at = ? WHERE id = ?', [data.name, ts, userId])
  } else {
    userId = newId()
    await q(`INSERT INTO users (id, email, password_hash, name, phone_e164, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`, [
      userId,
      data.email.toLowerCase(),
      passwordHash,
      data.name,
      data.phone_e164 ?? null,
      ts,
      ts,
    ])
  }
  const businessUserId = newId()
  await q(
    `INSERT INTO business_users (id, business_id, user_id, branch_id, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [businessUserId, businessId, userId, data.branch_id ?? null, data.role, ts, ts],
  )
  const created = await listStaff(businessId).then((l) => l.find((s) => s.user_id === userId))
  if (!created) throw new Error('Staff not created.')
  return created
}

export async function updateStaff(
  businessId: string,
  userId: string,
  data: Partial<{ name: string; role: Role; branch_id: string | null; phone_e164: string | null; is_active: boolean; password: string }>,
): Promise<StaffUser | null> {
  const membership = await q('SELECT * FROM business_users WHERE business_id = ? AND user_id = ?', [businessId, userId])
  if (!membership.rows[0]) return null
  const bu = membership.rows[0] as Record<string, unknown>
  const userRes = await q('SELECT * FROM users WHERE id = ?', [userId])
  const user = userRes.rows[0] as Record<string, unknown>
  const name = data.name ?? String(user.name)
  if (data.password) {
    const passwordHash = await hashPassword(data.password)
    await q('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, nowIso(), userId])
  }
  await q('UPDATE users SET name = ?, phone_e164 = ?, updated_at = ? WHERE id = ?', [name, data.phone_e164 === undefined ? user.phone_e164 : data.phone_e164, nowIso(), userId])
  await q(
    `UPDATE business_users SET role = ?, branch_id = ?, is_active = ?, updated_at = ? WHERE business_id = ? AND user_id = ?`,
    [
      data.role ?? String(bu.role),
      data.branch_id === undefined ? bu.branch_id : data.branch_id,
      data.is_active === undefined ? bu.is_active : data.is_active ? 1 : 0,
      nowIso(),
      businessId,
      userId,
    ],
  )
  const updated = await listStaff(businessId, true).then((l) => l.find((s) => s.user_id === userId))
  return updated ?? null
}

export async function deleteStaffFromBusiness(businessId: string, userId: string): Promise<boolean> {
  const res = await q('DELETE FROM business_users WHERE business_id = ? AND user_id = ?', [businessId, userId])
  return Number(res.rowsAffected) > 0
}