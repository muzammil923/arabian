import { q } from '../lib/turso'
import { verifyPassword, signToken } from '../lib/security'
import { unauthorized } from '../utils/http'
import { Role } from '../types'

export interface AvailableBusiness {
  id: string
  name: string
  role: Role
}

export interface LoginResult {
  token: string
  user: { id: string; name: string; email: string }
  businessId: string
  role: Role
  branchId: string | null
  businesses: AvailableBusiness[]
}

export async function login(email: string, password: string, preferredBusinessId?: string): Promise<LoginResult> {
  const userRes = await q('SELECT id, email, name, password_hash, is_active FROM users WHERE email = ? COLLATE NOCASE', [email])
  const userRow = userRes.rows[0] as Record<string, unknown> | undefined
  if (!userRow || Number(userRow.is_active ?? 1) !== 1) {
    throw unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS')
  }
  const ok = await verifyPassword(password, String(userRow.password_hash))
  if (!ok) throw unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS')

  const membershipsRes = await q(
    `SELECT bu.business_id, bu.role, bu.branch_id, bu.is_active, b.name, b.is_active AS business_active
     FROM business_users bu JOIN businesses b ON b.id = bu.business_id
     WHERE bu.user_id = ?`,
    [String(userRow.id)],
  )
  const memberships = membershipsRes.rows
    .map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row.business_id),
        name: String(row.name),
        role: String(row.role) as Role,
        branchId: row.branch_id ? String(row.branch_id) : null,
        membershipActive: Number(row.is_active ?? 1) === 1,
        businessActive: Number(row.business_active ?? 1) === 1,
      }
    })
    .filter((m) => m.membershipActive && m.businessActive)

  if (memberships.length === 0) throw unauthorized('Your account is not associated with an active business.', 'NO_BUSINESS')

  const selected = preferredBusinessId && memberships.some((m) => m.id === preferredBusinessId)
    ? memberships.find((m) => m.id === preferredBusinessId) as (typeof memberships)[number]
    : memberships[0]

  const token = signToken(String(userRow.id), selected.id, selected.role)
  return {
    token,
    user: { id: String(userRow.id), name: String(userRow.name), email: String(userRow.email) },
    businessId: selected.id,
    role: selected.role,
    branchId: selected.branchId,
    businesses: memberships.map((m) => ({ id: m.id, name: m.name, role: m.role })),
  }
}