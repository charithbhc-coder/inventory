
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function debug() {
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_NAME:', process.env.DB_NAME);
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    console.log('\n--- Checking audit_logs columns ---');
    const auditCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
    `);
    console.table(auditCols.rows);

    console.log('\n--- Checking item_events columns ---');
    const itemCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'item_events'
    `);
    console.table(itemCols.rows);

    console.log('\n--- Attempting Recent Activity Query ---');
    const limit = 10;
    const reportActions = [
      'CREATE_SEND_EMAIL', 'CREATE_SCHEDULED', 'UPDATE_SCHEDULED', 'DELETE_SCHEDULED',
      'CREATE_SCHEDULES', 'UPDATE_SCHEDULES', 'DELETE_SCHEDULES',
      'SEND_EMAIL', 'UPDATE_SCHEDULED_REPORTS', 'CREATE_SCHEDULED_REPORTS',
      'GENERATE_EXCEL', 'GENERATE_PDF'
    ];
    const actionsList = reportActions.map(a => `'${a}'`).join(', ');

    const query = `
      SELECT * FROM (
        (SELECT 
          ie."eventType"::text    AS "eventType",
          ie."createdAt"::timestamptz AS "createdAt",
          ie.notes::text          AS notes,
          ie."toPersonName"::text AS "toPersonName",
          ie."fromPersonName"::text AS "fromPersonName",
          i.name::text            AS "itemName",
          i.barcode::text         AS barcode,
          COALESCE(u."firstName" || ' ' || u."lastName", 'Unknown') AS "performedBy",
          'item'::text            AS "source"
        FROM item_events ie
        INNER JOIN items i ON i.id = ie."itemId"
        LEFT JOIN users u ON u.id = ie."performedByUserId"
        ORDER BY ie."createdAt" DESC
        LIMIT 10)
        
        UNION ALL
        
        (SELECT 
          al.action::text         AS "eventType",
          al."createdAt"::timestamptz AS "createdAt",
          al.action::text         AS notes,
          NULL::text              AS "toPersonName",
          NULL::text              AS "fromPersonName",
          'System'::text          AS "itemName",
          NULL::text              AS barcode,
          COALESCE(u."firstName" || ' ' || u."lastName", 'System') AS "performedBy",
          'audit'::text           AS "source"
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al."userId"
        WHERE al.action IN (${actionsList})
        ORDER BY al."createdAt" DESC
        LIMIT 10)
      ) sub
      ORDER BY sub."createdAt" DESC
      LIMIT 10
    `;

    const res = await client.query(query);
    console.log('Query successful, rows found:', res.rowCount);
  } catch (err: any) {
    console.error('ERROR:', err.message);
    if (err.hint) console.log('HINT:', err.hint);
  } finally {
    await client.end();
  }
}

debug();
