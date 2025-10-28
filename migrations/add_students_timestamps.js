const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'makini.db');

function addColumnIfMissing(db, table, columnName, columnDef) {
  const cols = db.prepare(`PRAGMA table_info('${table}')`).all();
  const exists = cols.some(c => c.name === columnName);
  if (exists) {
    console.log(`Column ${columnName} already exists on ${table}`);
    return false;
  }

  const sql = `ALTER TABLE ${table} ADD COLUMN ${columnName} ${columnDef}`;
  console.log(`Adding column: ${sql}`);
  db.exec(sql);
  return true;
}

function migrate() {
  const dbPath = path.resolve(SQLITE_DB_PATH);
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file does not exist: ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    db.exec('BEGIN');

    addColumnIfMissing(db, 'students', 'created_at', "TEXT");
    addColumnIfMissing(db, 'students', 'updated_at', "TEXT");

    db.exec('COMMIT');
    console.log('Migration add_students_timestamps completed');
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
