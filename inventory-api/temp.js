require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
pool.query(`UPDATE users SET permissions = ARRAY['MANAGE_COMPANIES','MANAGE_DEPARTMENTS','MANAGE_USERS','ADD_ITEMS','EDIT_ITEMS','DELETE_ITEMS','ASSIGN_ITEMS','MANAGE_REPAIRS','MANAGE_DISPOSALS','VIEW_WAREHOUSE','MANAGE_CATEGORIES','VIEW_REPORTS','EXPORT_DATA','GENERATE_BARCODES','VIEW_AUDIT_LOGS']::text[] WHERE role = 'ADMIN'`).then(() => { process.exit(0); });
