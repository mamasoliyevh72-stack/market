const express = require('express');
const router = express.Router();
const { pool, query } = require('../db');

// Barcha buyurtmalarni olish
router.get('/', async (req, res) => {
  try {
    const { customer_id } = req.query;
    let sql = `
      SELECT o.id, o.customer_id, o.total_amount, o.created_at, o.status,
             o.delivery_address, o.customer_name, o.customer_phone,
             c.full_name AS registered_customer_name, c.phone AS registered_customer_phone,
             COUNT(oi.id) AS items_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    const params = [];

    if (customer_id) {
      params.push(customer_id);
      sql += ` WHERE o.customer_id = $${params.length}`;
    }

    sql += ` GROUP BY o.id, c.full_name, c.phone ORDER BY o.created_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.warn('[Orders GET fallback]:', err.message);
    res.json({ success: true, data: [], offline: true });
  }
});

// Bitta buyurtma tafsilotlari (tarkibidagi mahsulotlar bilan)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderRes = await query(
      `SELECT o.*, c.full_name AS registered_name, c.phone AS registered_phone
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }

    const itemsRes = await query(
      `SELECT oi.*, COALESCE(p.name, 'Mahsulot (katalogdan o''chirilgan)') AS product_name, p.image_url
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...orderRes.rows[0],
        items: itemsRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Savatchadan buyurtma rasmiylashtirish (Checkout transaction)
router.post('/checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    const { customer_id, customer_name, customer_phone, delivery_address } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Mijoz aniqlanmadi' });
    }

    // Tranzaksiyani boshlash
    await client.query('BEGIN');

    // 1. Savatni va undagi tovarlarni olish
    const cartRes = await client.query('SELECT id FROM carts WHERE customer_id = $1', [customer_id]);
    if (cartRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Savatcha bo\'sh' });
    }

    const cartId = cartRes.rows[0].id;
    const itemsRes = await client.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       FOR UPDATE OF p`,
      [cartId]
    );

    if (itemsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Savatchangizda tovarlar yo\'q' });
    }

    // Omborda yetarli ekanini tekshirish va umumiy summani hisoblash
    let totalAmount = 0;
    for (const item of itemsRes.rows) {
      if (item.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `"${item.name}" mahsulotidan omborda yetarli emas. Mavjud: ${item.stock} ta`
        });
      }
      totalAmount += parseFloat(item.price) * item.quantity;
    }

    // 2. Buyurtmani yaratish
    const orderRes = await client.query(
      `INSERT INTO orders (customer_id, total_amount, status, delivery_address, customer_name, customer_phone)
       VALUES ($1, $2, 'Yangi', $3, $4, $5)
       RETURNING *`,
      [
        customer_id,
        totalAmount,
        delivery_address || 'Do\'kondan olib ketish',
        customer_name || 'Hurmatli Mijoz',
        customer_phone || ''
      ]
    );

    const orderId = orderRes.rows[0].id;

    // 3. Order items ga yozish va ombordan qoldiqni ayirish
    for (const item of itemsRes.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // 4. Savatchani tozalash
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    // Tranzaksiyani tasdiqlash
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Buyurtmangiz muvaffaqiyatli qabul qilindi!',
      orderId,
      totalAmount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Checkout error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// Buyurtma holatini yangilash (Admin uchun)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Yangi', 'Tayyorlanmoqda', 'Yetkazilmoqda', 'Yetkazildi', 'Bekor qilindi'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri status' });
    }

    const result = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
