const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Barcha kategoriyalarni olish (har bir toifadagi tovarlar soni bilan)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.id, c.name, COUNT(p.id)::int AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.id ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Yangi kategoriya qo'shish
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Kategoriya nomi kiritilmadi' });
    }
    const result = await query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Bu kategoriya allaqachon mavjud' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kategoriyani o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategoriya topilmadi' });
    }
    res.json({ success: true, message: 'Kategoriya o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
