const { Client } = require('pg');
require('dotenv').config();

async function resetDb() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'inventory_user',
    password: process.env.DB_PASSWORD || 'inventory_pass_2025',
    database: process.env.DB_NAME || 'inventory_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('DROP SCHEMA public CASCADE;');
    console.log('Dropped schema public');
    await client.query('CREATE SCHEMA public;');
    console.log('Created schema public');
  } catch (err) {
    console.error('Error resetting DB', err);
  } finally {
    await client.end();
  }
}

resetDb();
