-- 009_indexes.sql
-- Frequently used query paths. All tenant-scoped lookups include business_id.

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (business_id, phone_e164);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (business_id, name);

CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses (customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_business_customer ON customer_addresses (business_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_business_created ON orders (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON orders (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (business_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (business_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_ready_at ON orders (business_id, ready_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history (order_id, changed_at);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_business_date ON payments (business_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_pickups_date ON pickups (business_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups (business_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_pickups_staff ON pickups (assigned_staff_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries (business_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries (business_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_staff ON deliveries (assigned_staff_id);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_business_date ON audit_logs (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prices_lookup ON service_prices (business_id, service_id, garment_type_id);