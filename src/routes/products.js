const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Barcha mahsulotlarni olish (filter, qidiruv va kategoriya bilan)
router.get('/', async (req, res) => {
  try {
    const { category_id, search, sort } = req.query;
    let sql = `
      SELECT p.id, p.name, p.price, p.stock, p.category_id, p.description, p.image_url,
             c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id && category_id !== 'all') {
      params.push(category_id);
      sql += ` AND p.category_id = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND LOWER(p.name) LIKE $${params.length}`;
    }

    if (sort === 'price_asc') {
      sql += ' ORDER BY p.price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY p.price DESC';
    } else if (sort === 'name') {
      sql += ' ORDER BY p.name ASC';
    } else {
      sql += ' ORDER BY p.id DESC';
    }

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Products GET error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bitta mahsulot
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT p.*, c.name AS category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Yangi mahsulot qo'shish
router.post('/', async (req, res) => {
  try {
    const { name, price, stock, category_id, description, image_url } = req.body;
    if (!name || name.trim() === '' || price === undefined || price === null || price === '') {
      return res.status(400).json({ success: false, message: 'Mahsulot nomi va narxi kiritilishi shart!' });
    }

    const numPrice = parseFloat(price);
    const numStock = parseInt(stock || 0, 10);

    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: 'Mahsulot narxi noto\'g\'ri kiritildi!' });
    }

    const result = await query(
      `INSERT INTO products (name, price, stock, category_id, description, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        numPrice,
        isNaN(numStock) || numStock < 0 ? 0 : numStock,
        category_id ? parseInt(category_id, 10) : null,
        description ? description.trim() : '',
        image_url && image_url.trim() ? image_url.trim() : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Products POST error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mahsulotni tahrirlash
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, category_id, description, image_url } = req.body;

    const numPrice = price !== undefined && price !== null && price !== '' ? parseFloat(price) : null;
    const numStock = stock !== undefined && stock !== null && stock !== '' ? parseInt(stock, 10) : null;

    const result = await query(
      `UPDATE products
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           stock = COALESCE($3, stock),
           category_id = $4,
           description = COALESCE($5, description),
           image_url = COALESCE($6, image_url)
       WHERE id = $7
       RETURNING *`,
      [
        name && name.trim() ? name.trim() : null,
        numPrice !== null && !isNaN(numPrice) ? numPrice : null,
        numStock !== null && !isNaN(numStock) ? numStock : null,
        category_id ? parseInt(category_id, 10) : null,
        description !== undefined ? description : null,
        image_url !== undefined && image_url.trim() ? image_url.trim() : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Products PUT error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mahsulotni o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Savatchalardan olib tashlash
    await query('DELETE FROM cart_items WHERE product_id = $1', [id]);

    // O'tmishdagi buyurtmalar buzilmasligi uchun order_items dagi bog'liqlikni NULL qilish
    await query('UPDATE order_items SET product_id = NULL WHERE product_id = $1', [id]);

    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }
    res.json({ success: true, message: 'Mahsulot muvaffaqiyatli o\'chirildi' });
  } catch (err) {
    console.error('Products DELETE error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
