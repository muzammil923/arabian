-- 004_orders.sql
-- Orders, order items and status history.
-- All monetary columns are stored in minor units (pennies/cents).

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'RECEIVED'
    CHECK (status IN ('RECEIVED','WASHING','DRYING','IRONING','READY','DELIVERED','CANCELLED')),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID','PARTIALLY_PAID','PAID','REFUNDED')),
  intake_method TEXT NOT NULL
    CHECK (intake_method IN ('STORE_DROPOFF','HOME_PICKUP')),
  return_method TEXT NOT NULL
    CHECK (return_method IN ('CUSTOMER_PICKUP','HOME_DELIVERY')),
  pickup_id TEXT REFERENCES pickups(id) ON DELETE SET NULL,
  delivery_id TEXT REFERENCES deliveries(id) ON DELETE SET NULL,
  discount_type TEXT NOT NULL DEFAULT 'NONE'
    CHECK (discount_type IN ('NONE','FIXED','PERCENTAGE')),
  discount_value_minor INTEGER NOT NULL DEFAULT 0,
  discount_percent_bp INTEGER NOT NULL DEFAULT 0,
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  amount_paid_minor INTEGER NOT NULL DEFAULT 0,
  balance_minor INTEGER NOT NULL DEFAULT 0,
  expected_completion_at TEXT,
  ready_at TEXT,
  delivered_at TEXT,
  customer_notified_at TEXT,
  customer_notified_by TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  client_request_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (business_id, order_number),
  UNIQUE (business_id, client_request_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  garment_type_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  line_total_minor INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL
);