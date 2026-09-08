const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { getFallbackOrders } = require('./orders');
const { getFallbackProducts } = require('./products');

// Admin panel statistikasi
router.get('/', async (req, res) => {
  try {
    const [revRes, ordRes, prodRes, lowStockRes, recentOrdersRes] = await Promise.all([
      query('SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE status != $1', ['Bekor qilindi']),
      query('SELECT COUNT(*) AS total_orders FROM orders'),
      query('SELECT COUNT(*) AS total_products FROM products'),
      query('SELECT COUNT(*) AS low_stock_count FROM products WHERE stock <= 5'),
      query(`
        SELECT o.id, o.total_amount, o.status, o.created_at, o.customer_name, o.customer_phone
        FROM orders o
        ORDER BY o.created_at DESC
        LIMIT 6
      `)
    ]);

    res.json({
      success: true,
      stats: {
        totalRevenue: parseFloat(revRes.rows[0].total_revenue),
        totalOrders: parseInt(ordRes.rows[0].total_orders, 10),
        totalProducts: parseInt(prodRes.rows[0].total_products, 10),
        lowStockCount: parseInt(lowStockRes.rows[0].low_stock_count, 10),
        recentOrders: recentOrdersRes.rows
      }
    });
  } catch (err) {
    console.warn('[Stats GET fallback]:', err.message);
    const orders = (getFallbackOrders && getFallbackOrders()) || [];
    const products = (getFallbackProducts && getFallbackProducts()) || [];

    let totalRevenue = 0;
    orders.forEach(o => {
      if (o.status !== 'Bekor qilindi') totalRevenue += parseFloat(o.total_amount || 0);
    });

    const lowStockCount = products.filter(p => p.stock <= 5).length;

    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        lowStockCount,
        recentOrders: orders.slice(0, 6)
      },
      offline: true
    });
  }
});

module.exports = router;
