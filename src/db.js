const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1234', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'markets',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL Error]: Kutilmagan baza xatoligi:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

async function testConnection() {
  try {
    const res = await pool.query('SELECT current_database(), current_user, inet_server_port();');
    console.log(`[PostgreSQL]: Muvaffaqiyatli ulandi! Baza: "${res.rows[0].current_database}", Foydalanuvchi: "${res.rows[0].current_user}", Port: ${res.rows[0].inet_server_port}`);
    return { success: true, info: res.rows[0] };
  } catch (error) {
    console.warn('[PostgreSQL Connection Error]:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  pool,
  query,
  testConnection
};
