const express = require('express');
const router = express.Router();
const { query } = require('../db');

let fallbackSettings = {
  store_name: 'MARKETS',
  store_tagline: 'Sarxil va Sifatli Mahsulotlar Do\'koni'
};

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
    console.warn('[Settings GET fallback]:', err.message);
    res.json({
      success: true,
      data: fallbackSettings,
      offline: true
    });
  }
});

// Sozlamalarni yangilash
router.put('/', async (req, res) => {
  const { store_name, store_tagline } = req.body;
  try {
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
    console.warn('[Settings PUT fallback]:', err.message);
    if (store_name) fallbackSettings.store_name = store_name.trim();
    if (store_tagline) fallbackSettings.store_tagline = store_tagline.trim();

    res.json({
      success: true,
      message: 'Sozlamalar muvaffaqiyatli saqlandi!',
      data: fallbackSettings,
      offline: true
    });
  }
});

module.exports = router;
