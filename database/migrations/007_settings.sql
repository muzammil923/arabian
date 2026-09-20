-- 007_settings.sql
-- Business settings (document/labels, expectations) and the concurrency-safe
-- sequence counters used for human-readable order/invoice numbers.

CREATE TABLE IF NOT EXISTS business_settings (
  id TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL UNIQUE,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  order_prefix TEXT NOT NULL DEFAULT 'LND-',
  order_number_min_digits INTEGER NOT NULL DEFAULT 4,
  receipt_footer TEXT NOT NULL DEFAULT 'Thank you for your business!',
  expected_turnaround_hours INTEGER NOT NULL DEFAULT 24,
  pickup_enabled INTEGER NOT NULL DEFAULT 1,
  delivery_enabled INTEGER NOT NULL DEFAULT 1,
  delivery_charge_minor INTEGER NOT NULL DEFAULT 0,
  enable_prepaid_checkout INTEGER NOT NULL DEFAULT 1,
  whatsapp_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, name)
);