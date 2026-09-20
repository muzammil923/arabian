-- 006_logistics.sql
-- Home pickups and home deliveries. Addresses are snapshotted at scheduling time
-- so later edits to the customer's address book do not change logistics records.

CREATE TABLE IF NOT EXISTS pickups (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED','ASSIGNED','OUT_FOR_PICKUP','PICKED_UP','ARRIVED_AT_STORE','CANCELLED')),
  address_snapshot TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_slot TEXT,
  instructions TEXT,
  assigned_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  picked_up_at TEXT,
  arrived_at TEXT,
  cancelled_at TEXT,
  cancelled_by TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED','ASSIGNED','OUT_FOR_DELIVERY','DELIVERED','FAILED','CANCELLED')),
  address_snapshot TEXT NOT NULL,
  scheduled_date TEXT,
  scheduled_slot TEXT,
  instructions TEXT,
  assigned_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  delivered_at TEXT,
  failed_at TEXT,
  failure_reason TEXT,
  cancelled_at TEXT,
  cancelled_by TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);