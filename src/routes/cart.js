const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Mijoz savatini olish yoki yaratish
async function getOrCreateCart(customerId) {
  let cartRes = await query('SELECT id FROM carts WHERE customer_id = $1', [customerId]);
  if (cartRes.rows.length === 0) {
    cartRes = await query('INSERT INTO carts (customer_id) VALUES ($1) RETURNING id', [customerId]);
  }
  return cartRes.rows[0].id;
}

// Savatchani ko'rish
router.get('/:customerId', async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customerId talab qilinadi' });
    }

    const cartId = await getOrCreateCart(customerId);

    const itemsRes = await query(
      `SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity,
              p.name, p.price, p.stock, p.image_url,
              (ci.quantity * p.price) AS total_item_price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.id ASC`,
      [cartId]
    );

    let totalAmount = 0;
    itemsRes.rows.forEach(item => {
      totalAmount += parseFloat(item.total_item_price);
    });

    res.json({
      success: true,
      cartId,
      customerId,
      items: itemsRes.rows,
      totalAmount,
      itemCount: itemsRes.rows.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (err) {
    console.warn('[Cart GET fallback]:', err.message);
    res.json({
      success: true,
      cartId: 1,
      customerId: parseInt(req.params.customerId, 10) || 1,
      items: [],
      totalAmount: 0,
      itemCount: 0,
      offline: true
    });
  }
});

// Savatchaga mahsulot qo'shish
router.post('/add', async (req, res) => {
  try {
    const { customer_id, product_id, quantity = 1 } = req.body;
    if (!customer_id || !product_id) {
      return res.status(400).json({ success: false, message: 'customer_id va product_id shart' });
    }

    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      return res.status(400).json({ success: false, message: 'Miqdor 0 dan katta bo\'lishi kerak' });
    }

    // Mahsulot mavjudligini va ombor zaxirasini tekshirish
    const productCheck = await query('SELECT id, name, stock, price FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }

    const cartId = await getOrCreateCart(customer_id);

    // Savatda allaqachon bormi?
    const existing = await query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, product_id]
    );

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + qty;
      if (newQty > productCheck.rows[0].stock) {
        return res.status(400).json({
          success: false,
          message: `Omborda yetarli mahsulot yo'q. Mavjud: ${productCheck.rows[0].stock} ta`
        });
      }
      await query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2',
        [newQty, existing.rows[0].id]
      );
    } else {
      if (qty > productCheck.rows[0].stock) {
        return res.status(400).json({
          success: false,
          message: `Omborda yetarli mahsulot yo'q. Mavjud: ${productCheck.rows[0].stock} ta`
        });
      }
      await query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
        [cartId, product_id, qty]
      );
    }

    res.json({ success: true, message: 'Mahsulot savatchaga qo\'shildi' });
  } catch (err) {
    console.error('Cart ADD error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Miqdorni o'zgartirish
router.post('/update', async (req, res) => {
  try {
    const { customer_id, product_id, quantity } = req.body;
    const cartId = await getOrCreateCart(customer_id);
    const qty = parseInt(quantity, 10);

    if (qty <= 0) {
      await query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cartId, product_id]);
      return res.json({ success: true, message: 'Mahsulot savatdan olib tashlandi' });
    }

    const productCheck = await query('SELECT stock FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length > 0 && qty > productCheck.rows[0].stock) {
      return res.status(400).json({
        success: false,
        message: `Omborda yetarli mahsulot yo'q. Maksimal: ${productCheck.rows[0].stock} ta`
      });
    }

    await query(
      'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3',
      [qty, cartId, product_id]
    );

    res.json({ success: true, message: 'Miqdor yangilandi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Savatchadan bitta mahsulotni olib tashlash
router.post('/remove', async (req, res) => {
  try {
    const { customer_id, product_id } = req.body;
    const cartId = await getOrCreateCart(customer_id);
    await query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cartId, product_id]);
    res.json({ success: true, message: 'Mahsulot savatdan olib tashlandi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Savatchani tozalash
router.post('/clear', async (req, res) => {
  try {
    const { customer_id } = req.body;
    const cartId = await getOrCreateCart(customer_id);
    await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    res.json({ success: true, message: 'Savatcha tozalandi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
