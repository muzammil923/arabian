-- 010_storage.sql
-- Rack/Storage map: configurable locations, order assignments and history.
-- Orders are assigned a storage location (e.g. rack "A1") once READY and
-- auto-released when delivered or sent out for delivery.

CREATE TABLE IF NOT EXISTS storage_locations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'RACK'
    CHECK (type IN ('RACK','SHELF','HANGING','LARGE','OTHER')),
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (business_id, code)
);

ALTER TABLE orders ADD COLUMN storage_location_id TEXT REFERENCES storage_locations(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN storage_assigned_at TEXT;
ALTER TABLE orders ADD COLUMN storage_released_at TEXT;

CREATE TABLE IF NOT EXISTS storage_history (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  storage_location_id TEXT REFERENCES storage_locations(id) ON DELETE SET NULL,
  action TEXT NOT NULL
    CHECK (action IN ('ASSIGN','RELEASE')),
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_storage_locations_business ON storage_locations (business_id);
CREATE INDEX IF NOT EXISTS idx_storage_history_order ON storage_history (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_storage_loc ON orders (storage_location_id);