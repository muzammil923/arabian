import { q } from '../lib/turso'

export interface DashboardData {
  today: {
    revenue_orders_minor: number
    revenue_payments_minor: number
    orders_count: number
    ready_count: number
    outstanding_minor: number
    pickups_count: number
    deliveries_count: number
  }
  status_overview: Array<{ status: string; count: number }>
  payment_status_overview: Array<{ payment_status: string; count: number }>
  recent_orders: Array<{
    id: string
    order_number: string
    customer_name: string
    status: string
    payment_status: string
    total_minor: number
    balance_minor: number
    created_at: string
  }>
  next_pickups: Array<{ id: string; customer_name: string; scheduled_date: string; scheduled_slot: string | null; status: string }>
  next_deliveries: Array<{ id: string; order_number: string; customer_name: string; scheduled_date: string | null; scheduled_slot: string | null; status: string }>
  outstanding: Array<{ id: string; order_number: string; customer_name: string; balance_minor: number; created_at: string }>
  attention: Array<{ id: string; order_number: string; customer_name: string; status: string; expected_completion_at: string | null }>
}

export async function getDashboard(businessId: string, ctx: { startIso: string; endIso: string; today: string; nowIso: string }): Promise<DashboardData> {
  const statsRes = await q(
    `SELECT
       (SELECT COALESCE(SUM(total_minor), 0) FROM orders WHERE business_id = ? AND created_at >= ? AND created_at <= ? AND status != 'CANCELLED') AS revenue_orders_minor,
       (SELECT COALESCE(SUM(amount_minor), 0) FROM payments WHERE business_id = ? AND recorded_at >= ? AND recorded_at <= ? AND type = 'PAYMENT') AS revenue_payments_minor,
       (SELECT COUNT(*) FROM orders WHERE business_id = ? AND created_at >= ? AND created_at <= ?) AS orders_count,
       (SELECT COUNT(*) FROM orders WHERE business_id = ? AND status = 'READY' AND ready_at >= ? AND ready_at <= ?) AS ready_count,
       (SELECT COALESCE(SUM(balance_minor), 0) FROM orders WHERE business_id = ? AND payment_status IN ('UNPAID','PARTIALLY_PAID') AND status != 'CANCELLED') AS outstanding_minor,
       (SELECT COUNT(*) FROM pickups WHERE business_id = ? AND scheduled_date = ? AND status != 'CANCELLED') AS pickups_count,
       (SELECT COUNT(*) FROM deliveries WHERE business_id = ? AND scheduled_date = ? AND status NOT IN ('DELIVERED','CANCELLED','FAILED')) AS deliveries_count`,
    [businessId, ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId, ctx.today, businessId, ctx.today],
  )
  const stats = statsRes.rows[0] as Record<string, unknown>

  const statusRes = await q(
    `SELECT status, COUNT(*) AS count FROM orders WHERE business_id = ? AND status != 'CANCELLED' GROUP BY status`,
    [businessId],
  )
  const statusOverview = statusRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return { status: String(row.status), count: Number(row.count) }
  })

  const paymentStatusRes = await q(
    `SELECT payment_status, COUNT(*) AS count FROM orders WHERE business_id = ? AND status != 'CANCELLED' GROUP BY payment_status`,
    [businessId],
  )
  const paymentStatusOverview = paymentStatusRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return { payment_status: String(row.payment_status), count: Number(row.count) }
  })

  const recentRes = await q(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_minor, o.balance_minor, o.created_at, c.name AS customer_name
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.business_id = ?
     ORDER BY o.created_at DESC LIMIT 6`,
    [businessId],
  )
  const recentOrders = recentRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      order_number: String(row.order_number),
      customer_name: String(row.customer_name ?? ''),
      status: String(row.status),
      payment_status: String(row.payment_status),
      total_minor: Number(row.total_minor ?? 0),
      balance_minor: Number(row.balance_minor ?? 0),
      created_at: String(row.created_at),
    }
  })

  const pickupsRes = await q(
    `SELECT p.id, p.scheduled_date, p.scheduled_slot, p.status, c.name AS customer_name
     FROM pickups p JOIN customers c ON c.id = p.customer_id
     WHERE p.business_id = ? AND p.scheduled_date >= ? AND p.status NOT IN ('CANCELLED','ARRIVED_AT_STORE','PICKED_UP')
     ORDER BY p.scheduled_date ASC LIMIT 5`,
    [businessId, ctx.today],
  )
  const nextPickups = pickupsRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      customer_name: String(row.customer_name ?? ''),
      scheduled_date: String(row.scheduled_date),
      scheduled_slot: row.scheduled_slot ? String(row.scheduled_slot) : null,
      status: String(row.status),
    }
  })

  const deliveriesRes = await q(
    `SELECT d.id, d.scheduled_date, d.scheduled_slot, d.status, o.order_number, c.name AS customer_name
     FROM deliveries d
     JOIN customers c ON c.id = d.customer_id
     JOIN orders o ON o.id = d.order_id
     WHERE d.business_id = ? AND COALESCE(d.scheduled_date, '9999') >= ? AND d.status NOT IN ('DELIVERED','CANCELLED','FAILED')
     ORDER BY COALESCE(d.scheduled_date, '9999') ASC LIMIT 5`,
    [businessId, ctx.today],
  )
  const nextDeliveries = deliveriesRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      order_number: String(row.order_number ?? ''),
      customer_name: String(row.customer_name ?? ''),
      scheduled_date: row.scheduled_date ? String(row.scheduled_date) : null,
      scheduled_slot: row.scheduled_slot ? String(row.scheduled_slot) : null,
      status: String(row.status),
    }
  })

  const outstandingRes = await q(
    `SELECT o.id, o.order_number, o.balance_minor, o.created_at, c.name AS customer_name
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.business_id = ? AND o.balance_minor > 0 AND o.status != 'CANCELLED'
     ORDER BY o.created_at DESC LIMIT 8`,
    [businessId],
  )
  const outstanding = outstandingRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      order_number: String(row.order_number),
      customer_name: String(row.customer_name ?? ''),
      balance_minor: Number(row.balance_minor ?? 0),
      created_at: String(row.created_at),
    }
  })

  const attentionRes = await q(
    `SELECT o.id, o.order_number, o.status, o.expected_completion_at, c.name AS customer_name
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.business_id = ? AND o.status NOT IN ('DELIVERED','CANCELLED') AND o.expected_completion_at IS NOT NULL AND o.expected_completion_at < ?
     ORDER BY o.expected_completion_at ASC LIMIT 8`,
    [businessId, ctx.nowIso],
  )
  const attention = attentionRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      order_number: String(row.order_number),
      customer_name: String(row.customer_name ?? ''),
      status: String(row.status),
      expected_completion_at: row.expected_completion_at ? String(row.expected_completion_at) : null,
    }
  })

  return {
    today: {
      revenue_orders_minor: Number(stats.revenue_orders_minor ?? 0),
      revenue_payments_minor: Number(stats.revenue_payments_minor ?? 0),
      orders_count: Number(stats.orders_count ?? 0),
      ready_count: Number(stats.ready_count ?? 0),
      outstanding_minor: Number(stats.outstanding_minor ?? 0),
      pickups_count: Number(stats.pickups_count ?? 0),
      deliveries_count: Number(stats.deliveries_count ?? 0),
    },
    status_overview: statusOverview,
    payment_status_overview: paymentStatusOverview,
    recent_orders: recentOrders,
    next_pickups: nextPickups,
    next_deliveries: nextDeliveries,
    outstanding,
    attention,
  }
}

export interface RevenueSeriesPoint {
  date: string
  revenue_minor: number
  orders: number
}

export interface RevenueReport {
  summary: {
    total_revenue_minor: number
    total_payments_minor: number
    paid_orders: number
    total_orders: number
    outstanding_minor: number
  }
  series: RevenueSeriesPoint[]
  payment_breakdown: Array<{ method: string; amount_minor: number; count: number }>
  branch_breakdown: Array<{ branch_id: string | null; branch_name: string; revenue_minor: number; orders: number }>
  service_breakdown: Array<{ service_id: string; service_name: string; revenue_minor: number; quantity: number }>
  garment_breakdown: Array<{ garment_type_id: string; garment_type_name: string; quantity: number; revenue_minor: number }>
}

export async function getRevenueReport(businessId: string, ctx: { startIso: string; endIso: string }): Promise<RevenueReport> {
  const summaryRes = await q(
    `SELECT
       (SELECT COALESCE(SUM(total_minor), 0) FROM orders WHERE business_id = ? AND created_at >= ? AND created_at <= ? AND status != 'CANCELLED') AS total_revenue_minor,
       (SELECT COALESCE(SUM(amount_minor), 0) FROM payments WHERE business_id = ? AND recorded_at >= ? AND recorded_at <= ? AND type = 'PAYMENT') AS total_payments_minor,
       (SELECT COUNT(*) FROM orders WHERE business_id = ? AND created_at >= ? AND created_at <= ? AND payment_status = 'PAID') AS paid_orders,
       (SELECT COUNT(*) FROM orders WHERE business_id = ? AND created_at >= ? AND created_at <= ?) AS total_orders,
       (SELECT COALESCE(SUM(balance_minor), 0) FROM orders WHERE business_id = ? AND status != 'CANCELLED') AS outstanding_minor`,
    [businessId, ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId],
  )
  const summary = summaryRes.rows[0] as Record<string, unknown>

  const seriesRes = await q(
    `SELECT SUBSTR(created_at, 1, 10) AS date,
            COALESCE(SUM(total_minor), 0) AS revenue_minor,
            COUNT(*) AS orders
     FROM orders
     WHERE business_id = ? AND created_at >= ? AND created_at <= ? AND status != 'CANCELLED'
     GROUP BY SUBSTR(created_at, 1, 10)
     ORDER BY date ASC`,
    [businessId, ctx.startIso, ctx.endIso],
  )
  const series = seriesRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return { date: String(row.date), revenue_minor: Number(row.revenue_minor ?? 0), orders: Number(row.orders ?? 0) }
  })

  const paymentBreakdownRes = await q(
    `SELECT method, COALESCE(SUM(amount_minor), 0) AS amount_minor, COUNT(*) AS count
     FROM payments WHERE business_id = ? AND recorded_at >= ? AND recorded_at <= ? AND type = 'PAYMENT'
     GROUP BY method`,
    [businessId, ctx.startIso, ctx.endIso],
  )
  const payment_breakdown = paymentBreakdownRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return { method: String(row.method), amount_minor: Number(row.amount_minor ?? 0), count: Number(row.count ?? 0) }
  })

  const branchRes = await q(
    `SELECT o.branch_id, b.name AS branch_name, COALESCE(SUM(o.total_minor), 0) AS revenue_minor, COUNT(*) AS orders
     FROM orders o LEFT JOIN branches b ON b.id = o.branch_id
     WHERE o.business_id = ? AND o.created_at >= ? AND o.created_at <= ? AND o.status != 'CANCELLED'
     GROUP BY o.branch_id`,
    [businessId, ctx.startIso, ctx.endIso],
  )
  const branch_breakdown = branchRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      branch_id: row.branch_id ? String(row.branch_id) : null,
      branch_name: row.branch_name ? String(row.branch_name) : 'Unassigned',
      revenue_minor: Number(row.revenue_minor ?? 0),
      orders: Number(row.orders ?? 0),
    }
  })

  const serviceRes = await q(
    `SELECT oi.service_id, s.name AS service_name, COALESCE(SUM(oi.line_total_minor), 0) AS revenue_minor, COALESCE(SUM(oi.quantity), 0) AS quantity
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN services s ON s.id = oi.service_id
     WHERE o.business_id = ? AND o.created_at >= ? AND o.created_at <= ? AND o.status != 'CANCELLED'
     GROUP BY oi.service_id ORDER BY revenue_minor DESC`,
    [businessId, ctx.startIso, ctx.endIso],
  )
  const service_breakdown = serviceRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      service_id: String(row.service_id),
      service_name: row.service_name ? String(row.service_name) : 'Unknown',
      revenue_minor: Number(row.revenue_minor ?? 0),
      quantity: Number(row.quantity ?? 0),
    }
  })

  const garmentRes = await q(
    `SELECT oi.garment_type_id, g.name AS garment_type_name, COALESCE(SUM(oi.quantity), 0) AS quantity, COALESCE(SUM(oi.line_total_minor), 0) AS revenue_minor
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN garment_types g ON g.id = oi.garment_type_id
     WHERE o.business_id = ? AND o.created_at >= ? AND o.created_at <= ? AND o.status != 'CANCELLED'
     GROUP BY oi.garment_type_id ORDER BY quantity DESC`,
    [businessId, ctx.startIso, ctx.endIso],
  )
  const garment_breakdown = garmentRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      garment_type_id: String(row.garment_type_id),
      garment_type_name: row.garment_type_name ? String(row.garment_type_name) : 'Unknown',
      quantity: Number(row.quantity ?? 0),
      revenue_minor: Number(row.revenue_minor ?? 0),
    }
  })

  return {
    summary: {
      total_revenue_minor: Number(summary.total_revenue_minor ?? 0),
      total_payments_minor: Number(summary.total_payments_minor ?? 0),
      paid_orders: Number(summary.paid_orders ?? 0),
      total_orders: Number(summary.total_orders ?? 0),
      outstanding_minor: Number(summary.outstanding_minor ?? 0),
    },
    series,
    payment_breakdown,
    branch_breakdown,
    service_breakdown,
    garment_breakdown,
  }
}

export interface PickupReport {
  pickup_breakdown: Array<{ status: string; count: number }>
  total: number
  today_count: number
}

export async function getPickupReport(businessId: string, ctx: { startIso: string; endIso: string; today: string }): Promise<PickupReport> {
  const res = await q(
    `SELECT status, COUNT(*) AS count FROM pickups WHERE business_id = ? AND created_at >= ? AND created_at <= ? GROUP BY status`,
    [businessId, ctx.startIso, ctx.endIso],
  )
  const pickup_breakdown = res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return { status: String(row.status), count: Number(row.count ?? 0) }
  })
  const totalRes = await q(`SELECT COUNT(*) AS total FROM pickups WHERE business_id = ? AND created_at >= ? AND created_at <= ?`, [
    businessId,
    ctx.startIso,
    ctx.endIso,
  ])
  const todayRes = await q(`SELECT COUNT(*) AS c FROM pickups WHERE business_id = ? AND scheduled_date = ?`, [businessId, ctx.today])
  return {
    pickup_breakdown,
    total: Number(totalRes.rows[0]?.total ?? 0),
    today_count: Number(todayRes.rows[0]?.c ?? 0),
  }
}

export interface DeliveryReport {
  delivery_breakdown: Array<{ status: string; count: number }>
  total: number
  today_count: number
}

export async function getDeliveryReport(businessId: string, ctx: { startIso: string; endIso: string; today: string }): Promise<DeliveryReport> {
  const res = await q(
    `SELECT status, COUNT(*) AS count FROM deliveries WHERE business_id = ? AND created_at >= ? AND created_at <= ? GROUP BY status`,
    [businessId, ctx.startIso, ctx.endIso],
  )
  const delivery_breakdown = res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return { status: String(row.status), count: Number(row.count ?? 0) }
  })
  const totalRes = await q(`SELECT COUNT(*) AS total FROM deliveries WHERE business_id = ? AND created_at >= ? AND created_at <= ?`, [
    businessId,
    ctx.startIso,
    ctx.endIso,
  ])
  const todayRes = await q(`SELECT COUNT(*) AS c FROM deliveries WHERE business_id = ? AND scheduled_date = ?`, [businessId, ctx.today])
  return {
    delivery_breakdown,
    total: Number(totalRes.rows[0]?.total ?? 0),
    today_count: Number(todayRes.rows[0]?.c ?? 0),
  }
}

export interface StaffActivityRow {
  user_id: string
  user_name: string
  orders_created: number
  total_sales_minor: number
  payments_recorded: number
  payment_amount_minor: number
}

export async function getStaffActivity(businessId: string, ctx: { startIso: string; endIso: string }): Promise<StaffActivityRow[]> {
  const res = await q(
    `SELECT
       COALESCE(u.id, 'unknown') AS user_id,
       COALESCE(u.name, 'Unknown') AS user_name,
       (SELECT COUNT(*) FROM orders o WHERE o.created_by = u.id AND o.created_at >= ? AND o.created_at <= ? AND o.business_id = ?) AS orders_created,
       (SELECT COALESCE(SUM(o.total_minor), 0) FROM orders o WHERE o.created_by = u.id AND o.created_at >= ? AND o.created_at <= ? AND o.business_id = ? AND o.status != 'CANCELLED') AS total_sales_minor,
       (SELECT COUNT(*) FROM payments p WHERE p.recorded_by = u.id AND p.recorded_at >= ? AND p.recorded_at <= ? AND p.business_id = ? AND p.type = 'PAYMENT') AS payments_recorded,
       (SELECT COALESCE(SUM(p.amount_minor), 0) FROM payments p WHERE p.recorded_by = u.id AND p.recorded_at >= ? AND p.recorded_at <= ? AND p.business_id = ? AND p.type = 'PAYMENT') AS payment_amount_minor
     FROM business_users bu
     JOIN users u ON u.id = bu.user_id
     WHERE bu.business_id = ?`,
    [ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId, ctx.startIso, ctx.endIso, businessId, businessId],
  )
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      user_id: String(row.user_id),
      user_name: String(row.user_name),
      orders_created: Number(row.orders_created ?? 0),
      total_sales_minor: Number(row.total_sales_minor ?? 0),
      payments_recorded: Number(row.payments_recorded ?? 0),
      payment_amount_minor: Number(row.payment_amount_minor ?? 0),
    }
  })
}

export interface OrdersListStats {
  total_orders: number
  total_revenue_minor: number
  paid_minor: number
  outstanding_minor: number
}

export async function getOrdersStats(businessId: string, ctx: { startIso: string; endIso: string }): Promise<OrdersListStats> {
  const res = await q(
    `SELECT
       COUNT(*) AS total_orders,
       COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_minor ELSE 0 END), 0) AS total_revenue_minor,
       COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN amount_paid_minor ELSE 0 END), 0) AS paid_minor,
       COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN balance_minor ELSE 0 END), 0) AS outstanding_minor
     FROM orders WHERE business_id = ? AND created_at >= ? AND created_at <= ?`,
    [businessId, ctx.startIso, ctx.endIso],
  )
  const row = res.rows[0] as Record<string, unknown>
  return {
    total_orders: Number(row.total_orders ?? 0),
    total_revenue_minor: Number(row.total_revenue_minor ?? 0),
    paid_minor: Number(row.paid_minor ?? 0),
    outstanding_minor: Number(row.outstanding_minor ?? 0),
  }
}