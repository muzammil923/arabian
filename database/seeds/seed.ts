import { db, q, execBatch } from '../../backend/src/lib/turso'
import { hashPassword } from '../../backend/src/lib/security'
import { newId, nowIso } from '../../backend/src/utils/helpers'
import { pathToFileURL } from 'url'

const B = {
  name: process.env.SEED_BUSINESS_NAME || 'Demo Laundry',
  country: process.env.SEED_BUSINESS_COUNTRY || 'IN',
  currency: process.env.SEED_BUSINESS_CURRENCY || 'INR',
  timezone: process.env.SEED_BUSINESS_TIMEZONE || 'Asia/Kolkata',
  callingCountry: process.env.SEED_DEFAULT_CALLING_COUNTRY || 'IN',
  taxName: process.env.SEED_TAX_NAME || 'GST',
  taxBp: Number(process.env.SEED_TAX_BP || 500),
}

const USERS = [
  { email: (process.env.SEED_OWNER_EMAIL || 'owner@demo.laundry').toLowerCase(), password: process.env.SEED_OWNER_PASSWORD || 'Owner@1234', name: 'Owner', role: 'OWNER' as const },
  { email: (process.env.SEED_ADMIN_EMAIL || 'admin@demo.laundry').toLowerCase(), password: process.env.SEED_ADMIN_PASSWORD || 'Admin@1234', name: 'Admin', role: 'ADMIN' as const },
  { email: (process.env.SEED_MANAGER_EMAIL || 'manager@demo.laundry').toLowerCase(), password: process.env.SEED_MANAGER_PASSWORD || 'Manager@1234', name: 'Manager', role: 'MANAGER' as const },
  { email: (process.env.SEED_STAFF_EMAIL || 'staff@demo.laundry').toLowerCase(), password: process.env.SEED_STAFF_PASSWORD || 'Staff@1234', name: 'Staff', role: 'STAFF' as const },
]

const SERVICES = ['Wash', 'Wash & Iron', 'Iron Only', 'Dry Cleaning', 'Express Cleaning']
const GARMENTS = ['Shirt', 'T-Shirt', 'Pant', 'Jeans', 'Suit', 'Jacket', 'Saree', 'Dress', 'Bedsheet', 'Blanket', 'Curtain', 'Towel', 'Other']

// prices minor units: [Shirt, T-Shirt, Pant, Jeans, Suit, Jacket, Saree, Dress, Bedsheet, Blanket, Curtain, Towel, Other]
const PRICE_MATRIX: Record<string, number[]> = {
  'Wash': [25, 20, 25, 35, 150, 120, 60, 50, 40, 100, 60, 15, 30],
  'Wash & Iron': [40, 30, 40, 50, 200, 160, 80, 70, 60, 150, 80, 25, 45],
  'Iron Only': [15, 12, 15, 20, 80, 60, 40, 35, 30, 60, 35, 10, 20],
  'Dry Cleaning': [80, 60, 90, 100, 250, 220, 200, 180, 150, 300, 180, 50, 120],
  'Express Cleaning': [120, 90, 120, 140, 350, 300, 280, 250, 200, 380, 240, 70, 160],
}

export async function seed(): Promise<void> {
  const check = await q("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
  if (check.rows.length === 0) {
    throw new Error('[seed] schema not migrated yet. Run: npm run db:migrate')
  }

  const ts = nowIso()
  const businessId = newId()
  await q(
    `INSERT INTO businesses (id, name, address, country_code, currency, currency_symbol, timezone, default_calling_country, language, tax_name, tax_bp, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en', ?, ?, 1, ?, ?)`,
    [businessId, B.name, '123 Main Street', B.country, B.currency, '', B.timezone, B.callingCountry, B.taxName, B.taxBp, ts, ts],
  )
  await q(
    `INSERT INTO business_settings (id, business_id, invoice_prefix, order_prefix, order_number_min_digits, receipt_footer, expected_turnaround_hours, pickup_enabled, delivery_enabled, delivery_charge_minor, enable_prepaid_checkout, whatsapp_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 4, ?, 24, 1, 1, 0, 1, NULL, ?, ?)`,
    [businessId, businessId, 'INV-', 'LND-', 'Thank you for your business!', ts, ts],
  )
  const branchId = newId()
  await q(
    `INSERT INTO branches (id, business_id, name, address, is_active, created_at, updated_at) VALUES (?, ?, 'Main Branch', '123 Main Street', 1, ?, ?)`,
    [branchId, businessId, ts, ts],
  )

  for (const u of USERS) {
    const userId = newId()
    await q(`INSERT INTO users (id, email, password_hash, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`, [
      userId,
      u.email,
      await hashPassword(u.password),
      u.name,
      ts,
      ts,
    ])
    await q(`INSERT INTO business_users (id, business_id, user_id, branch_id, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`, [
      newId(),
      businessId,
      userId,
      branchId,
      u.role,
      ts,
      ts,
    ])
    console.log(`[seed] user ${u.email} (${u.role})`)
  }

  const serviceIds = new Map<string, string>()
  for (const [i, name] of SERVICES.entries()) {
    const id = newId()
    serviceIds.set(name, id)
    await q(`INSERT INTO services (id, business_id, name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`, [id, businessId, name, i, ts, ts])
  }

  const garmentIds = new Map<string, string>()
  for (const [i, name] of GARMENTS.entries()) {
    const id = newId()
    garmentIds.set(name, id)
    await q(`INSERT INTO garment_types (id, business_id, name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`, [id, businessId, name, i, ts, ts])
  }

  const priceStatements: Array<{ sql: string; args: unknown[] }> = []
  for (const [serviceName, prices] of Object.entries(PRICE_MATRIX)) {
    const serviceId = serviceIds.get(serviceName)
    if (!serviceId) continue
    GARMENTS.forEach((garmentName, gi) => {
      const garmentId = garmentIds.get(garmentName)
      if (!garmentId) return
      priceStatements.push({
        sql: `INSERT INTO service_prices (id, business_id, service_id, garment_type_id, price_minor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [newId(), businessId, serviceId, garmentId, prices[gi], ts, ts],
      })
    })
  }
  await execBatch(priceStatements, 'write')
  console.log(`[seed] business "${B.name}" seeded with ${SERVICES.length} services, ${GARMENTS.length} garment types, ${priceStatements.length} price rows.`)
  // Rack/Storage locations for the rack map.
  const rackDefs: Array<{ code: string; label: string; type: string; capacity: number; position: number }> = []
  const racks = ['A', 'B']
  for (const letter of racks) {
    for (let n = 1; n <= 4; n += 1) {
      rackDefs.push({ code: `${letter}${n}`, label: `Rack ${letter}${n}`, type: 'RACK', capacity: 8, position: rackDefs.length })
    }
  }
  rackDefs.push({ code: 'H-GEN', label: 'Hanging Racks (General)', type: 'HANGING', capacity: 20, position: rackDefs.length })
  rackDefs.push({ code: 'H-NS', label: 'Hanging Racks (New Arrivals)', type: 'HANGING', capacity: 20, position: rackDefs.length })
  rackDefs.push({ code: 'L-S', label: 'Large Items (Sheets & Blankets)', type: 'LARGE', capacity: 15, position: rackDefs.length })
  rackDefs.push({ code: 'O-MISC', label: 'Miscellaneous / Other', type: 'OTHER', capacity: 10, position: rackDefs.length })
  const storageStatements = rackDefs.map((r) => ({
    sql: `INSERT INTO storage_locations (id, business_id, code, label, type, capacity, position, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [newId(), businessId, r.code, r.label, r.type, r.capacity, r.position, ts, ts],
  }))
  await execBatch(storageStatements, 'write')
  console.log(`[seed] ${rackDefs.length} storage locations.`)

  await q(`INSERT INTO counters (business_id, name, value) VALUES (?, 'ORDER', 0)`, [businessId])
  console.log('[seed] done.')
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  seed().catch((err) => {
    console.error('[seed] failed:', err)
    process.exit(1)
  })
}