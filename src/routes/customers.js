const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Mijozlar ro'yxati
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mijozni topish yoki yangi yaratish
router.post('/', async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ success: false, message: 'Ism va telefon raqami kiritilishi shart' });
    }

    const cleanPhone = phone.trim();
    const cleanName = full_name.trim();

    // Avval mavjudligini tekshirish
    const existing = await query('SELECT * FROM customers WHERE phone = $1', [cleanPhone]);
    if (existing.rows.length > 0) {
      return res.json({ success: true, data: existing.rows[0], existing: true });
    }

    const result = await query(
      'INSERT INTO customers (full_name, phone) VALUES ($1, $2) RETURNING *',
      [cleanName, cleanPhone]
    );
    res.status(201).json({ success: true, data: result.rows[0], existing: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
