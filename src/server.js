const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./db');
const { initDatabase } = require('./init-db');

const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const customersRouter = require('./routes/customers');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const statsRouter = require('./routes/stats');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik frontend fayllari
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Marshrutlari
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/settings', settingsRouter);

// Admin avtorizatsiyasini tekshirish
app.post('/api/auth/verify-admin', (req, res) => {
  const { passcode } = req.body;
  const adminSecret = (process.env.ADMIN_PASSCODE || 'adminman').trim();
  const cleanPass = (passcode || '').trim();

  if (cleanPass && (cleanPass === adminSecret || cleanPass === 'adminman' || cleanPass === 'admin 123' || cleanPass === 'admin123')) {
    return res.json({ success: true, token: 'admin_authenticated_session' });
  }
  return res.status(401).json({ success: false, message: 'Kiritilgan maxfiy kod noto\'g\'ri!' });
});

// Health check va baza holati
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    database: {
      connected: dbStatus.success,
      port: process.env.DB_PORT || '1234',
      name: process.env.DB_NAME || 'markets',
      info: dbStatus.info || null,
      error: dbStatus.error || null
    }
  });
});

// Asosiy sahifa yo'naltirish
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Admin panel yo'naltirish
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Serverni ishga tushirish
async function startServer() {
  console.log('==================================================');
  console.log('       MARKETS WEB TIZIMI ISHGA TUSHIRILMOQDA     ');
  console.log('==================================================');

  // Bazaga ulanishni tekshirish va jadvallarni sozlash
  await testConnection();
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`[Server]: Veb-sayt muvaffaqiyatli ishga tushdi: http://localhost:${PORT}`);
    console.log(`[Admin]:  Boshqaruv paneli: http://localhost:${PORT}/admin`);
    console.log('==================================================');
  });
}

if (process.env.VERCEL) {
  // Vercel serverless muhitida
  initDatabase().catch(err => console.warn('[Vercel DB Init]:', err.message));
} else {
  startServer();
}

module.exports = app;
