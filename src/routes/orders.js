const express = require('express');
const router = express.Router();
const { pool, query } = require('../db');
const { getFallbackCart, clearFallbackCart } = require('./cart');

// Fallback buyurtmalar ro'yxati (baza oflayn bo'lgan holatlar uchun)
let fallbackOrders = [
  {
    id: 1,
    customer_id: 1,
    total_amount: 36000,
    created_at: new Date().toISOString(),
    status: 'Yangi',
    delivery_address: 'Toshkent, Chilonzor 9',
    customer_name: 'Alisher Usmonov',
    customer_phone: '+998 90 123 45 67',
    items_count: 1,
    items: [
      {
        id: 1,
        order_id: 1,
        product_id: 1,
        quantity: 2,
        unit_price: 18000,
        product_name: 'Qizil Olma (Golden / Fuji)',
        image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80'
      }
    ]
  }
];

// Barcha buyurtmalarni olish
router.get('/', async (req, res) => {
  const { customer_id } = req.query;
  try {
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
    let list = [...fallbackOrders];
    if (customer_id) {
      list = list.filter(o => String(o.customer_id) === String(customer_id));
    }
    res.json({ success: true, data: list, offline: true });
  }
});

// Bitta buyurtma tafsilotlari
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
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
    console.warn('[Orders GET :id fallback]:', err.message);
    const order = fallbackOrders.find(o => String(o.id) === String(id));
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }
    res.json({ success: true, data: order, offline: true });
  }
});

// Savatchadan buyurtma rasmiylashtirish
router.post('/checkout', async (req, res) => {
  const { customer_id, customer_name, customer_phone, delivery_address } = req.body;
  const cid = parseInt(customer_id, 10) || 1;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const cartRes = await client.query('SELECT id FROM carts WHERE customer_id = $1', [cid]);
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

    const orderRes = await client.query(
      `INSERT INTO orders (customer_id, total_amount, status, delivery_address, customer_name, customer_phone)
       VALUES ($1, $2, 'Yangi', $3, $4, $5)
       RETURNING *`,
      [
        cid,
        totalAmount,
        delivery_address || 'Do\'kondan olib ketish',
        customer_name || 'Hurmatli Mijoz',
        customer_phone || ''
      ]
    );

    const orderId = orderRes.rows[0].id;

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

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Buyurtmangiz muvaffaqiyatli qabul qilindi!',
      orderId,
      totalAmount
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.warn('[Checkout DB error, running fallback]:', err.message);

    // Fallback: Xotiradagi savatchadan buyurtma yaratish
    const cartItems = (getFallbackCart && getFallbackCart(cid)) || [];
    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Savatchangizda tovarlar yo\'q' });
    }

    let totalAmount = 0;
    cartItems.forEach(item => {
      totalAmount += item.quantity * item.price;
    });

    const newOrderId = fallbackOrders.length + 100;
    const newOrder = {
      id: newOrderId,
      customer_id: cid,
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
      status: 'Yangi',
      delivery_address: delivery_address || 'Do\'kondan olib ketish',
      customer_name: customer_name || 'Hurmatli Mijoz',
      customer_phone: customer_phone || '',
      items_count: cartItems.length,
      items: cartItems.map(it => ({
        id: Date.now() + Math.random(),
        order_id: newOrderId,
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.price,
        product_name: it.name,
        image_url: it.image_url
      }))
    };

    fallbackOrders.unshift(newOrder);
    if (clearFallbackCart) clearFallbackCart(cid);

    res.status(201).json({
      success: true,
      message: 'Buyurtmangiz muvaffaqiyatli qabul qilindi!',
      orderId: newOrderId,
      totalAmount,
      offline: true
    });
  } finally {
    if (client) client.release();
  }
});

// Buyurtma holatini yangilash
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.warn('[Orders PUT status fallback]:', err.message);
    const order = fallbackOrders.find(o => String(o.id) === String(id));
    if (order) {
      order.status = status;
      return res.json({ success: true, data: order, offline: true });
    }
    res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
  }
});

module.exports = router;
module.exports.getFallbackOrders = () => fallbackOrders;
