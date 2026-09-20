import { forbidden, HttpError } from '../utils/http'
import { q } from '../lib/turso'
import { newId, nowIso } from '../utils/helpers'
import {
  createBranch as repoCreateBranch,
  createStaff as repoCreateStaff,
  deleteStaffFromBusiness as repoDeleteStaff,
  getBusiness,
  getSettings,
  listBranches,
  listStaff,
  updateBranch as repoUpdateBranch,
  updateBusinessSettings,
  updateStaff as repoUpdateStaff,
} from '../repositories/settings'
import { isConfigManager } from './reference.service'
import type { AuthUser, Role, StaffUser } from '../types'

export async function getSettingsBundle(businessId: string) {
  const business = await getBusiness(businessId)
  const settings = await getSettings(businessId)
  if (!business || !settings) throw new HttpError(404, 'Business not found.')
  return {
    business,
    settings,
    branches: await listBranches(businessId, true),
  }
}

export async function saveSettings(
  auth: AuthUser,
  data: Record<string, unknown>,
): Promise<{ business: Awaited<ReturnType<typeof getBusiness>>; settings: Awaited<ReturnType<typeof getSettings>> }> {
  if (auth.role !== 'OWNER' && auth.role !== 'ADMIN') throw forbidden('Only owners and admins can change business settings.')
  const result = await updateBusinessSettings(auth.businessId, data)
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'settings_changed', 'business_settings', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, auth.businessId, JSON.stringify({ fields: Object.keys(data) }), nowIso()],
  )
  return result
}

export async function getStaff(businessId: string, includeInactive = false): Promise<StaffUser[]> {
  return listStaff(businessId, includeInactive)
}

export async function addStaff(auth: AuthUser, data: { name: string; email: string; password: string; role: Role; branch_id?: string | null; phone_e164?: string | null }): Promise<StaffUser> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can add staff.')
  const staff = await repoCreateStaff(auth.businessId, data)
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'staff_created', 'user', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, staff.user_id, JSON.stringify({ name: staff.name, role: staff.role }), nowIso()],
  )
  return staff
}

export async function modifyStaff(
  auth: AuthUser,
  userId: string,
  data: Partial<{ name: string; role: Role; branch_id: string | null; phone_e164: string | null; is_active: boolean; password: string }>,
): Promise<StaffUser | null> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can edit staff.')
  if (userId === auth.id && data.is_active === false) {
    throw new HttpError(400, 'You cannot deactivate your own account.', 'SELF_DEACTIVATE')
  }
  if (userId === auth.id && data.role && data.role !== auth.role && ![auth.role].includes('OWNER')) {
    throw new HttpError(400, 'You cannot change your own role.', 'SELF_ROLE')
  }
  const updated = await repoUpdateStaff(auth.businessId, userId, data)
  if (!updated) throw new HttpError(404, 'Staff member not found.')
  return updated
}

export async function removeStaff(auth: AuthUser, userId: string): Promise<{ removed: boolean }> {
  if (!isConfigManager(auth)) throw forbidden('Only managers can remove staff.')
  if (userId === auth.id) throw new HttpError(400, 'You cannot remove your own account.', 'SELF_REMOVE')
  const removed = await repoDeleteStaff(auth.businessId, userId)
  return { removed }
}

export async function getBranches(businessId: string, includeInactive = false) {
  return listBranches(businessId, includeInactive)
}

export async function createBranchFn(auth: AuthUser, data: { name: string; address?: string | null; phone_e164?: string | null }) {
  if (!isConfigManager(auth)) throw forbidden('Only managers can manage branches.')
  return repoCreateBranch(auth.businessId, data)
}

export async function patchBranch(auth: AuthUser, id: string, data: { name?: string; address?: string | null; phone_e164?: string | null; is_active?: boolean }) {
  if (!isConfigManager(auth)) throw forbidden('Only managers can manage branches.')
  const updated = await repoUpdateBranch(auth.businessId, id, data)
  if (!updated) throw new HttpError(404, 'Branch not found.')
  return updated
}