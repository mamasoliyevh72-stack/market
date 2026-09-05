const express = require('express');
const router = express.Router();
const { query } = require('../db');

let fallbackProducts = [
  {
    id: 1,
    name: 'Qizil Olma (Golden / Fuji)',
    price: 18000,
    stock: 45,
    category_id: 1,
    category_name: 'Mevalar',
    description: 'Shirin, qarsildoq va vitaminlarga boy sarxil qizil olma. 1 kg.',
    image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    name: 'Banan (Ekvador)',
    price: 24000,
    stock: 30,
    category_id: 1,
    category_name: 'Mevalar',
    description: 'Yangi keltirilgan shirin va sifatli bananlar. 1 kg.',
    image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    name: 'Apelsin (Navel)',
    price: 26000,
    stock: 25,
    category_id: 1,
    category_name: 'Mevalar',
    description: 'Sershira va nordon-shirin tabiiy apelsinlar. 1 kg.',
    image_url: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    name: 'Pomidor (Yusupov)',
    price: 22000,
    stock: 40,
    category_id: 2,
    category_name: 'Sabzavotlar',
    description: 'Go\'shtdor, xushbo\'y va tabiiy Toshkent pomidorlari. 1 kg.',
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    name: 'Bodring (Muxlis)',
    price: 15000,
    stock: 35,
    category_id: 2,
    category_name: 'Sabzavotlar',
    description: 'Qarsildoq, barra va toza mahalliy bodringlar. 1 kg.',
    image_url: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 6,
    name: 'Kartoshka (Qizil)',
    price: 7000,
    stock: 120,
    category_id: 2,
    category_name: 'Sabzavotlar',
    description: 'Sifatli va qovurishga ajoyib mahalliy kartoshka. 1 kg.',
    image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 7,
    name: 'Sut (Musaffo 3.2%)',
    price: 14500,
    stock: 50,
    category_id: 3,
    category_name: 'Sut mahsulotlari',
    description: 'Pasterizatsiyalangan toza va tabiiy sut, 1 litr.',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 8,
    name: 'Sariyog\' (Prezident 82%)',
    price: 34000,
    stock: 20,
    category_id: 3,
    category_name: 'Sut mahsulotlari',
    description: 'Tabiiy qaymoqli sariyog\', 200 gr.',
    image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 9,
    name: 'Tvorog (Kamilka 9%)',
    price: 19000,
    stock: 15,
    category_id: 3,
    category_name: 'Sut mahsulotlari',
    description: 'Yangi va parhezbop tvorog, 300 gr.',
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 10,
    name: 'Coca-Cola Classic (1.5L)',
    price: 13500,
    stock: 60,
    category_id: 4,
    category_name: 'Ichimliklar',
    description: 'Tetislashtiruvchi salqin ichimlik Coca-Cola 1.5 litr.',
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 11,
    name: 'Tabiiy Olma Sharbati (Rich 1L)',
    price: 18000,
    stock: 25,
    category_id: 4,
    category_name: 'Ichimliklar',
    description: '100% tabiiy olma sharbati, 1 litr.',
    image_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 12,
    name: 'Mineral Suv (Tashkent 1.5L)',
    price: 4500,
    stock: 100,
    category_id: 4,
    category_name: 'Ichimliklar',
    description: 'Gazlanmagan tog\' suvi, 1.5 litr.',
    image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 13,
    name: 'Samarqand Non (Patir)',
    price: 12000,
    stock: 18,
    category_id: 5,
    category_name: 'Non va qandolat',
    description: 'Tandirda yopilgan an\'anaviy saryog\'li patir non.',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 14,
    name: 'Qora Shokolad (Ritter Sport 100g)',
    price: 28000,
    stock: 35,
    category_id: 5,
    category_name: 'Non va qandolat',
    description: 'Butun yong\'oqli haqiqiy sifatli nemis shokoladi.',
    image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 15,
    name: 'Mol Go\'shti (Lohma Laxta)',
    price: 98000,
    stock: 15,
    category_id: 6,
    category_name: 'Go\'sht va baliq',
    description: 'Yangi so\'yilgan mol go\'shtining saralangan lahm qismi. 1 kg.',
    image_url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 16,
    name: 'Guruch (Lazer Toshkent)',
    price: 27000,
    stock: 70,
    category_id: 7,
    category_name: 'Bakaleya va donlar',
    description: 'Palov uchun birinchi navli saralangan Lazer guruchi. 1 kg.',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80'
  }
];

// Barcha mahsulotlarni olish
router.get('/', async (req, res) => {
  const { category_id, search, sort } = req.query;
  try {
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
    console.warn('[Products GET fallback]:', err.message);
    let filtered = [...fallbackProducts];
    if (category_id && category_id !== 'all') {
      filtered = filtered.filter(p => String(p.category_id) === String(category_id));
    }
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    if (sort === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => b.id - a.id);
    }
    res.json({ success: true, data: filtered, offline: true });
  }
});

// Bitta mahsulot
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
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
    const item = fallbackProducts.find(p => String(p.id) === String(id));
    if (!item) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    res.json({ success: true, data: item, offline: true });
  }
});

// Yangi mahsulot qo'shish
router.post('/', async (req, res) => {
  const { name, price, stock, category_id, description, image_url } = req.body;
  if (!name || name.trim() === '' || price === undefined || price === null || price === '') {
    return res.status(400).json({ success: false, message: 'Mahsulot nomi va narxi kiritilishi shart!' });
  }

  const numPrice = parseFloat(price);
  const numStock = parseInt(stock || 0, 10);

  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ success: false, message: 'Mahsulot narxi noto\'g\'ri kiritildi!' });
  }

  try {
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
    console.warn('[Products POST fallback]:', err.message);
    const newProduct = {
      id: Date.now(),
      name: name.trim(),
      price: numPrice,
      stock: isNaN(numStock) || numStock < 0 ? 0 : numStock,
      category_id: category_id ? parseInt(category_id, 10) : null,
      description: description ? description.trim() : '',
      image_url: image_url && image_url.trim() ? image_url.trim() : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'
    };
    fallbackProducts.unshift(newProduct);
    res.status(201).json({ success: true, data: newProduct, offline: true });
  }
});

// Mahsulotni tahrirlash
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, stock, category_id, description, image_url } = req.body;

  const numPrice = price !== undefined && price !== null && price !== '' ? parseFloat(price) : null;
  const numStock = stock !== undefined && stock !== null && stock !== '' ? parseInt(stock, 10) : null;

  try {
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
    console.warn('[Products PUT fallback]:', err.message);
    const idx = fallbackProducts.findIndex(p => String(p.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });

    if (name) fallbackProducts[idx].name = name.trim();
    if (numPrice !== null && !isNaN(numPrice)) fallbackProducts[idx].price = numPrice;
    if (numStock !== null && !isNaN(numStock)) fallbackProducts[idx].stock = numStock;
    if (category_id) fallbackProducts[idx].category_id = parseInt(category_id, 10);
    if (description !== undefined) fallbackProducts[idx].description = description;
    if (image_url !== undefined) fallbackProducts[idx].image_url = image_url;

    res.json({ success: true, data: fallbackProducts[idx], offline: true });
  }
});

// Mahsulotni o'chirish
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM cart_items WHERE product_id = $1', [id]);
    await query('UPDATE order_items SET product_id = NULL WHERE product_id = $1', [id]);

    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }
    res.json({ success: true, message: 'Mahsulot muvaffaqiyatli o\'chirildi' });
  } catch (err) {
    console.warn('[Products DELETE fallback]:', err.message);
    fallbackProducts = fallbackProducts.filter(p => String(p.id) !== String(id));
    res.json({ success: true, message: 'Mahsulot muvaffaqiyatli o\'chirildi' });
  }
});

module.exports = router;
