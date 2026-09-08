const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { getFallbackProducts } = require('./products');

// Fallback xotiradagi savatcha (baza oflayn bo'lgan holatlar uchun)
let fallbackCarts = {};

function getFallbackCartResponse(customerId) {
  const cid = parseInt(customerId, 10) || 1;
  const items = fallbackCarts[cid] || [];
  let totalAmount = 0;
  let itemCount = 0;
  items.forEach(it => {
    it.total_item_price = it.quantity * it.price;
    totalAmount += it.total_item_price;
    itemCount += it.quantity;
  });

  return {
    success: true,
    cartId: 1,
    customerId: cid,
    items,
    totalAmount,
    itemCount,
    offline: true
  };
}

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
  const customerId = parseInt(req.params.customerId, 10) || 1;
  try {
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
    res.json(getFallbackCartResponse(customerId));
  }
});

// Savatchaga mahsulot qo'shish
router.post('/add', async (req, res) => {
  const { customer_id, product_id, quantity = 1 } = req.body;
  if (!customer_id || !product_id) {
    return res.status(400).json({ success: false, message: 'customer_id va product_id shart' });
  }

  const cid = parseInt(customer_id, 10) || 1;
  const pid = parseInt(product_id, 10);
  const qty = parseInt(quantity, 10) || 1;

  try {
    const productCheck = await query('SELECT id, name, stock, price FROM products WHERE id = $1', [pid]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }

    const cartId = await getOrCreateCart(cid);

    const existing = await query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, pid]
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
        [cartId, pid, qty]
      );
    }

    res.json({ success: true, message: 'Mahsulot savatchaga qo\'shildi' });
  } catch (err) {
    console.warn('[Cart ADD fallback]:', err.message);

    const prods = (getFallbackProducts && getFallbackProducts()) || [];
    const prod = prods.find(p => p.id === pid);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }

    if (!fallbackCarts[cid]) fallbackCarts[cid] = [];
    const existing = fallbackCarts[cid].find(item => item.product_id === pid);
    if (existing) {
      existing.quantity += qty;
      existing.total_item_price = existing.quantity * existing.price;
    } else {
      fallbackCarts[cid].push({
        id: Date.now(),
        cart_id: 1,
        product_id: pid,
        quantity: qty,
        name: prod.name,
        price: parseFloat(prod.price),
        stock: prod.stock,
        image_url: prod.image_url,
        total_item_price: qty * parseFloat(prod.price)
      });
    }

    res.json({ success: true, message: 'Mahsulot savatchaga qo\'shildi', offline: true });
  }
});

// Miqdorni o'zgartirish
router.post('/update', async (req, res) => {
  const { customer_id, product_id, quantity } = req.body;
  const cid = parseInt(customer_id, 10) || 1;
  const pid = parseInt(product_id, 10);
  const qty = parseInt(quantity, 10);

  try {
    const cartId = await getOrCreateCart(cid);

    if (qty <= 0) {
      await query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cartId, pid]);
      return res.json({ success: true, message: 'Mahsulot savatdan olib tashlandi' });
    }

    const productCheck = await query('SELECT stock FROM products WHERE id = $1', [pid]);
    if (productCheck.rows.length > 0 && qty > productCheck.rows[0].stock) {
      return res.status(400).json({
        success: false,
        message: `Omborda yetarli mahsulot yo'q. Maksimal: ${productCheck.rows[0].stock} ta`
      });
    }

    await query(
      'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3',
      [qty, cartId, pid]
    );

    res.json({ success: true, message: 'Miqdor yangilandi' });
  } catch (err) {
    console.warn('[Cart UPDATE fallback]:', err.message);
    if (!fallbackCarts[cid]) fallbackCarts[cid] = [];

    if (qty <= 0) {
      fallbackCarts[cid] = fallbackCarts[cid].filter(it => it.product_id !== pid);
    } else {
      const it = fallbackCarts[cid].find(item => item.product_id === pid);
      if (it) {
        it.quantity = qty;
        it.total_item_price = it.quantity * it.price;
      }
    }
    res.json({ success: true, message: 'Miqdor yangilandi', offline: true });
  }
});

// Savatchadan bitta mahsulotni olib tashlash
router.post('/remove', async (req, res) => {
  const { customer_id, product_id } = req.body;
  const cid = parseInt(customer_id, 10) || 1;
  const pid = parseInt(product_id, 10);

  try {
    const cartId = await getOrCreateCart(cid);
    await query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cartId, pid]);
    res.json({ success: true, message: 'Mahsulot savatdan olib tashlandi' });
  } catch (err) {
    console.warn('[Cart REMOVE fallback]:', err.message);
    if (fallbackCarts[cid]) {
      fallbackCarts[cid] = fallbackCarts[cid].filter(it => it.product_id !== pid);
    }
    res.json({ success: true, message: 'Mahsulot savatdan olib tashlandi', offline: true });
  }
});

// Savatchani tozalash
router.post('/clear', async (req, res) => {
  const { customer_id } = req.body;
  const cid = parseInt(customer_id, 10) || 1;

  try {
    const cartId = await getOrCreateCart(cid);
    await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    res.json({ success: true, message: 'Savatcha tozalandi' });
  } catch (err) {
    console.warn('[Cart CLEAR fallback]:', err.message);
    fallbackCarts[cid] = [];
    res.json({ success: true, message: 'Savatcha tozalandi', offline: true });
  }
});

module.exports = router;
module.exports.getFallbackCart = (cid) => fallbackCarts[cid] || [];
module.exports.clearFallbackCart = (cid) => { fallbackCarts[cid] = []; };
