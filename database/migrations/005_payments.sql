-- 005_payments.sql
-- Individual payment transactions (advance, partial, full, refund).

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'PAYMENT'
    CHECK (type IN ('PAYMENT','REFUND')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  method TEXT NOT NULL
    CHECK (method IN ('CASH','UPI','CARD','BANK_TRANSFER','OTHER')),
  reference TEXT,
  note TEXT,
  recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  client_request_id TEXT,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (order_id, client_request_id)
);