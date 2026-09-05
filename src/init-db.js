const { query, pool } = require('./db');

async function initDatabase() {
  console.log('[Init DB]: Ma\'lumotlar bazasi tuzilmasi tekshirilmoqda...');
  try {
    // 1. Asosiy jadvallarni yaratish (yangi bulutli baza bo'lsa ham avtomatik yaratiladi)
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC NOT NULL,
        stock INTEGER DEFAULT 0,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        description TEXT,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS carts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER UNIQUE REFERENCES customers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER CHECK (quantity > 0),
        UNIQUE(cart_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        total_amount NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'Yangi',
        delivery_address TEXT,
        customer_name VARCHAR(100),
        customer_phone VARCHAR(20)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER CHECK (quantity > 0),
        unit_price NUMERIC NOT NULL
      );

      ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Yangi';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
    `);

    // Xavfsiz o'chirish uchun order_items dagi foreign key ni ON DELETE SET NULL qilish
    try {
      await query(`
        ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
        ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
      `);
    } catch (conErr) {
      // ignore
    }

    // Sozlamalar jadvali (do'kon nomi va h.k.)
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT
      );
      INSERT INTO settings (key, value) VALUES ('store_name', 'MARKETS') ON CONFLICT (key) DO NOTHING;
      INSERT INTO settings (key, value) VALUES ('store_tagline', 'Sarxil va Sifatli Mahsulotlar Do''koni') ON CONFLICT (key) DO NOTHING;
    `);

    console.log('[Init DB]: Jadval ustunlari va sozlamalar tekshirildi va yangilandi.');

    // 2. Kategoriyalarni tekshirish
    const catCheck = await query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      console.log('[Init DB]: Boshlang\'ich kategoriyalar kiritilmoqda...');
      const categories = [
        'Mevalar',
        'Sabzavotlar',
        'Sut mahsulotlari',
        'Ichimliklar',
        'Non va qandolat',
        'Go\'sht va baliq',
        'Bakaleya va donlar'
      ];
      for (const cat of categories) {
        await query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [cat]);
      }
      console.log('[Init DB]: 7 ta yangi kategoriya qo\'shildi.');
    }

    // Kategoriyalar xaritasini olish
    const catRows = await query('SELECT id, name FROM categories');
    const catMap = {};
    catRows.rows.forEach(r => {
      catMap[r.name] = r.id;
    });

    // 3. Mahsulotlarni tekshirish
    const prodCheck = await query('SELECT COUNT(*) FROM products');
    if (parseInt(prodCheck.rows[0].count, 10) === 0) {
      console.log('[Init DB]: Boshlang\'ich tovarlar kiritilmoqda...');
      const sampleProducts = [
        {
          name: 'Qizil Olma (Golden / Fuji)',
          price: 18000,
          stock: 45,
          category: 'Mevalar',
          description: 'Shirin, qarsildoq va vitaminlarga boy sarxil qizil olma. 1 kg.',
          image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Banan (Ekvador)',
          price: 24000,
          stock: 30,
          category: 'Mevalar',
          description: 'Yangi keltirilgan shirin va sifatli bananlar. 1 kg.',
          image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Apelsin (Navel)',
          price: 26000,
          stock: 25,
          category: 'Mevalar',
          description: 'Sershira va nordon-shirin tabiiy apelsinlar. 1 kg.',
          image_url: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Pomidor (Yusupov)',
          price: 22000,
          stock: 40,
          category: 'Sabzavotlar',
          description: 'Go\'shtdor, xushbo\'y va tabiiy Toshkent pomidorlari. 1 kg.',
          image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Bodring (Muxlis)',
          price: 15000,
          stock: 35,
          category: 'Sabzavotlar',
          description: 'Qarsildoq, barra va toza mahalliy bodringlar. 1 kg.',
          image_url: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Kartoshka (Qizil)',
          price: 7000,
          stock: 120,
          category: 'Sabzavotlar',
          description: 'Sifatli va qovurishga ajoyib mahalliy kartoshka. 1 kg.',
          image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Sut (Musaffo 3.2%)',
          price: 14500,
          stock: 50,
          category: 'Sut mahsulotlari',
          description: 'Pasterizatsiyalangan toza va tabiiy sut, 1 litr.',
          image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Sariyog\' (Prezident 82%)',
          price: 34000,
          stock: 20,
          category: 'Sut mahsulotlari',
          description: 'Tabiiy qaymoqli sariyog\', 200 gr.',
          image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Tvorog (Kamilka 9%)',
          price: 19000,
          stock: 15,
          category: 'Sut mahsulotlari',
          description: 'Yangi va parhezbop tvorog, 300 gr.',
          image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Coca-Cola Classic (1.5L)',
          price: 13500,
          stock: 60,
          category: 'Ichimliklar',
          description: 'Tetislashtiruvchi salqin ichimlik Coca-Cola 1.5 litr.',
          image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Tabiiy Olma Sharbati (Rich 1L)',
          price: 18000,
          stock: 25,
          category: 'Ichimliklar',
          description: '100% tabiiy olma sharbati, 1 litr.',
          image_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Mineral Suv (Tashkent 1.5L)',
          price: 4500,
          stock: 100,
          category: 'Ichimliklar',
          description: 'Gazlanmagan tog\' suvi, 1.5 litr.',
          image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Samarqand Non (Patir)',
          price: 12000,
          stock: 18,
          category: 'Non va qandolat',
          description: 'Tandirda yopilgan an\'anaviy saryog\'li patir non.',
          image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Qora Shokolad (Ritter Sport 100g)',
          price: 28000,
          stock: 35,
          category: 'Non va qandolat',
          description: 'Butun yong\'oqli haqiqiy sifatli nemis shokoladi.',
          image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Mol Go\'shti (Lohma Laxta)',
          price: 98000,
          stock: 15,
          category: 'Go\'sht va baliq',
          description: 'Yangi so\'yilgan mol go\'shtining saralangan lahm qismi. 1 kg.',
          image_url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Guruch (Lazer Toshkent)',
          price: 27000,
          stock: 70,
          category: 'Bakaleya va donlar',
          description: 'Palov uchun birinchi navli saralangan Lazer guruchi. 1 kg.',
          image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80'
        }
      ];

      for (const p of sampleProducts) {
        const catId = catMap[p.category] || null;
        await query(
          'INSERT INTO products (name, price, stock, category_id, description, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
          [p.name, p.price, p.stock, catId, p.description, p.image_url]
        );
      }
      console.log('[Init DB]: 16 ta namunaviy tovar muvaffaqiyatli kiritildi.');
    }

    // 4. Standart demo mijozni tekshirish
    const custCheck = await query('SELECT COUNT(*) FROM customers');
    if (parseInt(custCheck.rows[0].count, 10) === 0) {
      await query(
        'INSERT INTO customers (full_name, phone) VALUES ($1, $2)',
        ['Alisher Usmonov', '+998 90 123 45 67']
      );
      console.log('[Init DB]: Standart demo mijoz (Alisher Usmonov) kiritildi.');
    }

    console.log('[Init DB]: Baza to\'liq tayyor!');
  } catch (err) {
    console.error('[Init DB Error]:', err.message);
  }
}

if (require.main === module) {
  initDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = { initDatabase };
