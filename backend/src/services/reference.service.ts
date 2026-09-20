import { forbidden, HttpError } from '../utils/http'
import {
  createGarment as repoCreateGarment,
  createService as repoCreateService,
  deletePrice as repoDeletePrice,
  findGarment,
  findService,
  listGarments,
  listPrices,
  listServices,
  updateGarment as repoUpdateGarment,
  updateService as repoUpdateService,
  upsertPrices,
} from '../repositories/reference'
import { q } from '../lib/turso'
import { newId, nowIso } from '../utils/helpers'
import type { AuthUser, GarmentType, Service, ServicePrice } from '../types'

export function isConfigManager(auth: AuthUser): boolean {
  return auth.role === 'OWNER' || auth.role === 'ADMIN' || auth.role === 'MANAGER'
}

export async function getAllServices(businessId: string, includeInactive = false): Promise<Array<Service & { prices: ServicePrice[] }>> {
  const services = await listServices(businessId, includeInactive)
  const prices = await listPrices(businessId)
  const byService = new Map<string, ServicePrice[]>()
  for (const p of prices) {
    const arr = byService.get(p.service_id)
    if (arr) arr.push(p)
    else byService.set(p.service_id, [p])
  }
  return services.map((s) => ({ ...s, prices: byService.get(s.id) ?? [] }))
}

export async function addService(auth: AuthUser, data: { name: string; description?: string | null; sort_order?: number; is_active?: boolean }): Promise<Service> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can manage services.')
  const service = await repoCreateService(auth.businessId, data)
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'service_created', 'service', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, service.id, JSON.stringify({ name: service.name }), nowIso()],
  )
  return service
}

export async function patchService(auth: AuthUser, id: string, data: { name?: string; description?: string | null; sort_order?: number; is_active?: boolean }): Promise<Service | null> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can manage services.')
  const updated = await repoUpdateService(auth.businessId, id, data)
  if (!updated) throw new HttpError(404, 'Service not found.')
  return updated
}

export async function getAllGarments(businessId: string, includeInactive = false): Promise<GarmentType[]> {
  return listGarments(businessId, includeInactive)
}

export async function addGarment(auth: AuthUser, data: { name: string; sort_order?: number; is_active?: boolean }): Promise<GarmentType> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can manage garment types.')
  const garment = await repoCreateGarment(auth.businessId, data)
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'garment_created', 'garment_type', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, garment.id, JSON.stringify({ name: garment.name }), nowIso()],
  )
  return garment
}

export async function patchGarment(auth: AuthUser, id: string, data: { name?: string; sort_order?: number; is_active?: boolean }): Promise<GarmentType | null> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can manage garment types.')
  const updated = await repoUpdateGarment(auth.businessId, id, data)
  if (!updated) throw new HttpError(404, 'Garment type not found.')
  return updated
}

export async function getAllPrices(businessId: string): Promise<ServicePrice[]> {
  return listPrices(businessId)
}

export async function setPrices(auth: AuthUser, entries: Array<{ service_id: string; garment_type_id: string; price_minor: number }>): Promise<ServicePrice[]> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can configure pricing.')
  for (const entry of entries) {
    const service = await findService(auth.businessId, entry.service_id)
    const garment = await findGarment(auth.businessId, entry.garment_type_id)
    if (!service || !garment) throw new HttpError(400, 'Invalid service or garment type in price list.', 'INVALID_PRICE_ENTRY')
  }
  await upsertPrices(auth.businessId, entries)
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'pricing_updated', 'service_price', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, auth.businessId, JSON.stringify({ entries: entries.length }), nowIso()],
  )
  return listPrices(auth.businessId)
}

export async function removePrice(auth: AuthUser, serviceId: string, garmentTypeId: string): Promise<void> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can configure pricing.')
  await repoDeletePrice(auth.businessId, serviceId, garmentTypeId)
}