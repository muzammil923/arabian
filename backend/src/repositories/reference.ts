import { q, execBatch } from '../lib/turso'
import { newId, nowIso } from '../utils/helpers'
import type { GarmentType, Service, ServicePrice } from '../types'

export async function listServices(businessId: string, includeInactive = false): Promise<Service[]> {
  const res = await q(
    `SELECT * FROM services WHERE business_id = ? ${includeInactive ? '' : 'AND is_active = 1'} ORDER BY sort_order ASC, name ASC`,
    [businessId],
  )
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      business_id: String(row.business_id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      sort_order: Number(row.sort_order ?? 0),
      is_active: Number(row.is_active ?? 1),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }
  })
}

export async function findService(businessId: string, id: string): Promise<Service | null> {
  const res = await q('SELECT * FROM services WHERE id = ? AND business_id = ?', [id, businessId])
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Number(row.is_active ?? 1),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function createService(businessId: string, data: { name: string; description?: string | null; sort_order?: number; is_active?: boolean }): Promise<Service> {
  const id = newId()
  const ts = nowIso()
  await q(
    `INSERT INTO services (id, business_id, name, description, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, businessId, data.name, data.description ?? null, data.sort_order ?? 0, data.is_active === false ? 0 : 1, ts, ts],
  )
  const created = await findService(businessId, id)
  if (!created) throw new Error('Service not created')
  return created
}

export async function updateService(businessId: string, id: string, data: Partial<{ name: string; description: string | null; sort_order: number; is_active: boolean }>): Promise<Service | null> {
  const existing = await findService(businessId, id)
  if (!existing) return null
  const merged = {
    name: data.name ?? existing.name,
    description: data.description === undefined ? existing.description : data.description,
    sort_order: data.sort_order ?? existing.sort_order,
    is_active: data.is_active === undefined ? existing.is_active === 1 : data.is_active,
  }
  await q(
    `UPDATE services SET name = ?, description = ?, sort_order = ?, is_active = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
    [merged.name, merged.description, merged.sort_order, merged.is_active ? 1 : 0, nowIso(), id, businessId],
  )
  return (await findService(businessId, id)) as Service
}

export async function listGarments(businessId: string, includeInactive = false): Promise<GarmentType[]> {
  const res = await q(
    `SELECT * FROM garment_types WHERE business_id = ? ${includeInactive ? '' : 'AND is_active = 1'} ORDER BY sort_order ASC, name ASC`,
    [businessId],
  )
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      business_id: String(row.business_id),
      name: String(row.name),
      sort_order: Number(row.sort_order ?? 0),
      is_active: Number(row.is_active ?? 1),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }
  })
}

export async function findGarment(businessId: string, id: string): Promise<GarmentType | null> {
  const res = await q('SELECT * FROM garment_types WHERE id = ? AND business_id = ?', [id, businessId])
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Number(row.is_active ?? 1),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function createGarment(businessId: string, data: { name: string; sort_order?: number; is_active?: boolean }): Promise<GarmentType> {
  const id = newId()
  const ts = nowIso()
  await q(
    `INSERT INTO garment_types (id, business_id, name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, businessId, data.name, data.sort_order ?? 0, data.is_active === false ? 0 : 1, ts, ts],
  )
  const created = await findGarment(businessId, id)
  if (!created) throw new Error('Garment not created')
  return created
}

export async function updateGarment(businessId: string, id: string, data: Partial<{ name: string; sort_order: number; is_active: boolean }>): Promise<GarmentType | null> {
  const existing = await findGarment(businessId, id)
  if (!existing) return null
  const merged = {
    name: data.name ?? existing.name,
    sort_order: data.sort_order ?? existing.sort_order,
    is_active: data.is_active === undefined ? existing.is_active === 1 : data.is_active,
  }
  await q(
    `UPDATE garment_types SET name = ?, sort_order = ?, is_active = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
    [merged.name, merged.sort_order, merged.is_active ? 1 : 0, nowIso(), id, businessId],
  )
  return (await findGarment(businessId, id)) as GarmentType
}

export async function listPrices(businessId: string): Promise<ServicePrice[]> {
  const res = await q('SELECT * FROM service_prices WHERE business_id = ?', [businessId])
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      business_id: String(row.business_id),
      service_id: String(row.service_id),
      garment_type_id: String(row.garment_type_id),
      price_minor: Number(row.price_minor ?? 0),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }
  })
}

export async function findPricesForItems(businessId: string, pairs: Array<{ serviceId: string; garmentTypeId: string }>): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  for (const p of pairs) {
    const res = await q('SELECT price_minor FROM service_prices WHERE business_id = ? AND service_id = ? AND garment_type_id = ?', [
      businessId,
      p.serviceId,
      p.garmentTypeId,
    ])
    if (res.rows[0]) result.set(`${p.serviceId}:${p.garmentTypeId}`, Number((res.rows[0] as Record<string, unknown>).price_minor))
  }
  return result
}

export async function upsertPrices(businessId: string, entries: Array<{ service_id: string; garment_type_id: string; price_minor: number }>): Promise<void> {
  const ts = nowIso()
  const statements = entries.map((entry) => ({
    sql: `INSERT INTO service_prices (id, business_id, service_id, garment_type_id, price_minor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(business_id, service_id, garment_type_id) DO UPDATE SET price_minor = excluded.price_minor, updated_at = excluded.updated_at`,
    args: [newId(), businessId, entry.service_id, entry.garment_type_id, entry.price_minor, ts, ts],
  }))
  await execBatch(statements, 'write')
}

export async function deletePrice(businessId: string, serviceId: string, garmentTypeId: string): Promise<void> {
  await q('DELETE FROM service_prices WHERE business_id = ? AND service_id = ? AND garment_type_id = ?', [businessId, serviceId, garmentTypeId])
}