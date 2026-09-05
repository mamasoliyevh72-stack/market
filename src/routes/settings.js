const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Barcha sozlamalarni olish
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settings = {
      store_name: 'MARKETS',
      store_tagline: 'Sarxil va Sifatli Mahsulotlar Do\'koni'
    };
    result.rows.forEach(r => {
      settings[r.key] = r.value;
    });
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Settings GET error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sozlamalarni yangilash
router.put('/', async (req, res) => {
  try {
    const { store_name, store_tagline } = req.body;

    if (store_name !== undefined && store_name.trim() !== '') {
      await query(
        `INSERT INTO settings (key, value) VALUES ('store_name', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [store_name.trim()]
      );
    }

    if (store_tagline !== undefined) {
      await query(
        `INSERT INTO settings (key, value) VALUES ('store_tagline', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [store_tagline.trim()]
      );
    }

    const result = await query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(r => {
      settings[r.key] = r.value;
    });

    res.json({
      success: true,
      message: 'Sozlamalar muvaffaqiyatli saqlandi!',
      data: settings
    });
  } catch (err) {
    console.error('Settings PUT error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
