const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function startDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return formatDate(date);
}

async function select(sql, replacements = {}) {
  return sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT
  });
}

async function providerDashboard(providerId) {
  const weekStart = startDate(7);
  const [
    todayOrders,
    pendingOrders,
    monthRevenue,
    monthCheckins,
    ratingRows,
    pendingCheckins,
    trend,
    serviceSales,
    recentOrders,
    orderStatus
  ] = await Promise.all([
    select(
      `SELECT COUNT(*) AS total FROM appointments
       WHERE provider_id = :providerId AND appointment_date = CURDATE()`,
      { providerId }
    ),
    select(
      `SELECT COUNT(*) AS total FROM appointments
       WHERE provider_id = :providerId AND status = 'pending'`,
      { providerId }
    ),
    select(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS orders
       FROM appointments
       WHERE provider_id = :providerId AND status = 'completed'
         AND appointment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
      { providerId }
    ),
    select(
      `SELECT COUNT(*) AS total FROM checkin_records
       WHERE provider_id = :providerId AND status = 'approved'
         AND checkin_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
      { providerId }
    ),
    select(
      `SELECT COUNT(*) AS total, ROUND(AVG(rating), 1) AS average
       FROM reviews WHERE provider_id = :providerId AND status = 'approved'`,
      { providerId }
    ),
    select(
      `SELECT COUNT(*) AS total FROM checkin_records
       WHERE provider_id = :providerId AND status = 'pending'`,
      { providerId }
    ),
    select(
      `SELECT appointment_date AS date, COUNT(*) AS orders, COALESCE(SUM(amount), 0) AS revenue
       FROM appointments
       WHERE provider_id = :providerId AND appointment_date >= :weekStart
       GROUP BY appointment_date ORDER BY appointment_date ASC`,
      { providerId, weekStart }
    ),
    select(
      `SELECT s.id, s.name, s.sales, s.price,
              COUNT(a.id) AS order_count, COALESCE(SUM(a.amount), 0) AS revenue
       FROM services s
       LEFT JOIN appointments a ON a.service_id = s.id AND a.status = 'completed'
       WHERE s.provider_id = :providerId
       GROUP BY s.id ORDER BY order_count DESC, revenue DESC LIMIT 5`,
      { providerId }
    ),
    select(
      `SELECT a.id, a.appointment_no, a.appointment_date, a.time_slot, a.status, a.amount,
              u.nickname AS user_name, s.name AS service_name, c.name AS coach_name
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       JOIN services s ON s.id = a.service_id
       LEFT JOIN coaches c ON c.id = a.coach_id
       WHERE a.provider_id = :providerId
       ORDER BY a.created_at DESC LIMIT 6`,
      { providerId }
    ),
    select(
      `SELECT status, COUNT(*) AS total FROM appointments
       WHERE provider_id = :providerId GROUP BY status`,
      { providerId }
    )
  ]);

  return {
    stats: {
      todayOrders: Number(todayOrders[0].total),
      pendingOrders: Number(pendingOrders[0].total),
      monthRevenue: Number(monthRevenue[0].total),
      monthOrders: Number(monthRevenue[0].orders),
      monthCheckins: Number(monthCheckins[0].total),
      rating: Number(ratingRows[0].average || 5),
      reviewCount: Number(ratingRows[0].total),
      pendingCheckins: Number(pendingCheckins[0].total)
    },
    trend,
    serviceSales,
    recentOrders,
    orderStatus
  };
}

async function providerBusiness(providerId, days) {
  const start = startDate(days);
  const [trend, categoryStats, serviceRank, statusStats, customerStats, hourStats, totals] =
    await Promise.all([
      select(
        `SELECT appointment_date AS date, COUNT(*) AS orders,
                COALESCE(SUM(amount), 0) AS revenue
         FROM appointments
         WHERE provider_id = :providerId AND appointment_date >= :start
         GROUP BY appointment_date ORDER BY appointment_date ASC`,
        { providerId, start }
      ),
      select(
        `SELECT c.name, COUNT(a.id) AS orders, COALESCE(SUM(a.amount), 0) AS revenue
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN service_categories c ON c.id = s.category_id
         WHERE a.provider_id = :providerId AND a.status = 'completed' AND a.appointment_date >= :start
         GROUP BY c.id ORDER BY revenue DESC`,
        { providerId, start }
      ),
      select(
        `SELECT s.name, s.sales, COUNT(a.id) AS orders,
                COALESCE(SUM(a.amount), 0) AS revenue
         FROM services s
         LEFT JOIN appointments a ON a.service_id = s.id
           AND a.status = 'completed' AND a.appointment_date >= :start
         WHERE s.provider_id = :providerId
         GROUP BY s.id ORDER BY revenue DESC LIMIT 10`,
        { providerId, start }
      ),
      select(
        `SELECT status, COUNT(*) AS total FROM appointments
         WHERE provider_id = :providerId AND appointment_date >= :start
         GROUP BY status`,
        { providerId, start }
      ),
      select(
        `SELECT COUNT(DISTINCT user_id) AS total_users,
                COUNT(DISTINCT CASE WHEN visit_count > 1 THEN user_id END) AS returning_users
         FROM (
           SELECT user_id, COUNT(*) AS visit_count
           FROM appointments
           WHERE provider_id = :providerId AND status = 'completed' AND appointment_date >= :start
           GROUP BY user_id
         ) t`,
        { providerId, start }
      ),
      select(
        `SELECT SUBSTRING_INDEX(time_slot, '-', 1) AS hour, COUNT(*) AS total
         FROM appointments
         WHERE provider_id = :providerId AND appointment_date >= :start
         GROUP BY hour ORDER BY hour ASC`,
        { providerId, start }
      ),
      select(
        `SELECT COUNT(*) AS orders, COALESCE(SUM(amount), 0) AS revenue,
                COALESCE(AVG(amount), 0) AS avg_amount
         FROM appointments
         WHERE provider_id = :providerId AND status = 'completed' AND appointment_date >= :start`,
        { providerId, start }
      )
    ]);

  return {
    days,
    trend,
    categoryStats,
    serviceRank,
    statusStats,
    customerStats: customerStats[0],
    hourStats,
    totals: totals[0]
  };
}

async function adminDashboard() {
  const weekStart = startDate(7);
  const [
    userCount,
    providerCount,
    pendingProviders,
    todayOrders,
    monthRevenue,
    pendingReviews,
    trend,
    categoryStats,
    topProviders,
    recentApplications,
    checkinStats
  ] = await Promise.all([
    select("SELECT COUNT(*) AS total FROM users WHERE role = 'user'"),
    select("SELECT COUNT(*) AS total FROM providers WHERE status = 'approved'"),
    select("SELECT COUNT(*) AS total FROM providers WHERE status = 'pending'"),
    select('SELECT COUNT(*) AS total FROM appointments WHERE DATE(created_at) = CURDATE()'),
    select(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS orders
       FROM appointments WHERE status = 'completed'
         AND appointment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
    ),
    select("SELECT COUNT(*) AS total FROM reviews WHERE status = 'pending'"),
    select(
      `SELECT d.date,
              (SELECT COUNT(*) FROM appointments a WHERE DATE(a.created_at) = d.date) AS orders,
              (SELECT COALESCE(SUM(a.amount), 0) FROM appointments a
               WHERE DATE(a.created_at) = d.date AND a.status = 'completed') AS revenue,
              (SELECT COUNT(*) FROM users u WHERE DATE(u.created_at) = d.date AND u.role = 'user') AS new_users
       FROM (
         SELECT DATE_SUB(CURDATE(), INTERVAL n DAY) AS date
         FROM (
           SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
           UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
         ) numbers
       ) d
       ORDER BY d.date ASC`
    ),
    select(
      `SELECT c.name, COUNT(s.id) AS service_count,
              (SELECT COUNT(*) FROM appointments a
               JOIN services s2 ON s2.id = a.service_id
               WHERE s2.category_id = c.id) AS order_count
       FROM service_categories c
       LEFT JOIN services s ON s.category_id = c.id
       GROUP BY c.id ORDER BY order_count DESC LIMIT 8`
    ),
    select(
      `SELECT p.id, p.name, p.rating, COUNT(a.id) AS orders,
              COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.amount ELSE 0 END), 0) AS revenue
       FROM providers p
       LEFT JOIN appointments a ON a.provider_id = p.id
       WHERE p.status = 'approved'
       GROUP BY p.id ORDER BY revenue DESC LIMIT 5`
    ),
    select(
      `SELECT p.id, p.name, p.address, p.license_no, p.created_at,
              u.nickname AS owner_name, u.phone AS owner_phone
       FROM providers p JOIN users u ON u.id = p.user_id
       WHERE p.status = 'pending'
       ORDER BY p.created_at ASC LIMIT 5`
    ),
    select(
      `SELECT COUNT(*) AS total_checkins, COALESCE(SUM(calories), 0) AS calories,
              COUNT(DISTINCT user_id) AS active_users
       FROM checkin_records
       WHERE status = 'approved' AND checkin_date >= :weekStart`,
      { weekStart }
    )
  ]);

  return {
    stats: {
      users: Number(userCount[0].total),
      providers: Number(providerCount[0].total),
      pendingProviders: Number(pendingProviders[0].total),
      todayOrders: Number(todayOrders[0].total),
      monthRevenue: Number(monthRevenue[0].total),
      monthOrders: Number(monthRevenue[0].orders),
      pendingReviews: Number(pendingReviews[0].total),
      weekCheckins: Number(checkinStats[0].total_checkins),
      weekCalories: Number(checkinStats[0].calories),
      activeUsers: Number(checkinStats[0].active_users)
    },
    trend,
    categoryStats,
    topProviders,
    recentApplications
  };
}

async function platformStats(days) {
  const start = startDate(days);
  const [trend, categoryStats, topProviders, userRoles, orderStatus, checkinTrend, totals] =
    await Promise.all([
      select(
        `SELECT appointment_date AS date, COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS revenue
         FROM appointments WHERE appointment_date >= :start
         GROUP BY appointment_date ORDER BY appointment_date ASC`,
        { start }
      ),
      select(
        `SELECT c.name, COUNT(a.id) AS orders, COALESCE(SUM(a.amount), 0) AS revenue
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN service_categories c ON c.id = s.category_id
         WHERE a.status = 'completed' AND a.appointment_date >= :start
         GROUP BY c.id ORDER BY revenue DESC`,
        { start }
      ),
      select(
        `SELECT p.id, p.name, p.rating, COUNT(a.id) AS orders,
                COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.amount ELSE 0 END), 0) AS revenue
         FROM providers p LEFT JOIN appointments a ON a.provider_id = p.id
           AND a.appointment_date >= :start
         WHERE p.status = 'approved'
         GROUP BY p.id ORDER BY revenue DESC LIMIT 10`,
        { start }
      ),
      select('SELECT role, COUNT(*) AS total FROM users GROUP BY role'),
      select(
        `SELECT status, COUNT(*) AS total FROM appointments
         WHERE appointment_date >= :start GROUP BY status`,
        { start }
      ),
      select(
        `SELECT checkin_date AS date, COUNT(*) AS checkins, COALESCE(SUM(calories), 0) AS calories
         FROM checkin_records
         WHERE status = 'approved' AND checkin_date >= :start
         GROUP BY checkin_date ORDER BY checkin_date ASC`,
        { start }
      ),
      select(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE role = 'user') AS total_users,
           (SELECT COUNT(*) FROM providers WHERE status = 'approved') AS total_providers,
           (SELECT COUNT(*) FROM appointments WHERE appointment_date >= :start) AS total_orders,
           (SELECT COALESCE(SUM(amount), 0) FROM appointments
            WHERE status = 'completed' AND appointment_date >= :start) AS total_revenue,
           (SELECT COUNT(*) FROM checkin_records
            WHERE status = 'approved' AND checkin_date >= :start) AS total_checkins`,
        { start }
      )
    ]);

  return {
    days,
    trend,
    categoryStats,
    topProviders,
    userRoles,
    orderStatus,
    checkinTrend,
    totals: totals[0]
  };
}

module.exports = { providerDashboard, providerBusiness, adminDashboard, platformStats };
