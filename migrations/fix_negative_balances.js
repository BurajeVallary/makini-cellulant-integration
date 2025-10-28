const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'makini.db');

function migrate() {
  const dbPath = path.resolve(SQLITE_DB_PATH);
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file does not exist: ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    db.exec('BEGIN');

    // Fix negative balances 
    const sql = `UPDATE students SET balance = ABS(balance) WHERE balance < 0`;
    db.exec(sql);
    console.log('Fixed negative balances to positive');

    db.exec('COMMIT');
    console.log('Migration fix_negative_balances completed');
  } catch (err) {
    console.error('Migration failed:', err.message);
    try { db.exec('ROLLBACK'); } catch (e) {}
    process.exit(1);
  } finally {
    db.close();
  }
}

if (require.main === module) migrate();

module.exports = { migrate };