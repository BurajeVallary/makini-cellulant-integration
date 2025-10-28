const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'makini.db');

const desiredCols = ['student_id', 'first_name', 'last_name', 'year', 'gender'];

function backupDb(dbPath) {
  const absPath = path.resolve(dbPath);
  if (!fs.existsSync(absPath)) {
    console.log(`DB file not found at ${absPath} — nothing to back up.`);
    return null;
  }

  const dir = path.dirname(absPath);
  const base = path.basename(absPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bakName = `${base}.bak.${stamp}`;
  const bakPath = path.join(dir, bakName);
  fs.copyFileSync(absPath, bakPath);
  console.log(`Created DB backup at ${bakPath}`);
  return bakPath;
}

function migrate() {
  console.log('Starting migration to minimal students schema...');
  const dbPath = path.resolve(SQLITE_DB_PATH);

  if (!fs.existsSync(dbPath)) {
    console.error(`Database file does not exist: ${dbPath}`);
    process.exit(1);
  }

  const bak = backupDb(dbPath);
  const db = new Database(dbPath);

  // Get existing columns
  const cols = db.prepare("PRAGMA table_info('students')").all();
  if (!cols || cols.length === 0) {
    console.log('No students table found. Creating a new students table with desired columns.');

    const createSql = `CREATE TABLE students (
      student_id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      year INTEGER,
      gender TEXT
    );`;

    db.exec('BEGIN');
    db.exec(createSql);
    db.exec('COMMIT');

    console.log('Created new students table with desired columns.');
    db.close();
    return;
  }

  const existingCols = cols.map(c => c.name);
  console.log('Existing columns:', existingCols.join(', '));

  // Check if all columns are present
  const existingSet = new Set(existingCols);
  const desiredSet = new Set(desiredCols);
  const same = existingCols.length === desiredCols.length && desiredCols.every(c => existingSet.has(c));
  if (same) {
    console.log('Students table already has exactly the desired columns. No migration needed.');
    db.close();
    return;
  }

  // Prepare SQL statements
  const selectParts = desiredCols.map(col => existingSet.has(col) ? col : `NULL as ${col}`);
  const selectSql = `SELECT ${selectParts.join(', ')} FROM students`;

  const createSql = `CREATE TABLE students_new (
    student_id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    year INTEGER,
    gender TEXT
  );`;

  console.log('Beginning transaction and creating new table...');

  try {
    // Disable foreign keys during migration
    db.pragma('foreign_keys = OFF');

    db.exec('BEGIN');
    db.exec(createSql);

    // Copy data from old table to new table
    const insertSql = `INSERT INTO students_new (${desiredCols.join(', ')}) ${selectSql}`;
    console.log('Copying data using:', insertSql);
    db.exec(insertSql);

    // Drop old table and rename
    db.exec('DROP TABLE students');
    db.exec('ALTER TABLE students_new RENAME TO students');

    db.exec('COMMIT');

    // Re-enable foreign keys and validate
    db.pragma('foreign_keys = ON');
    const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
    if (fkCheck && fkCheck.length > 0) {
      throw new Error('Foreign key check failed after migration: ' + JSON.stringify(fkCheck));
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    console.error('Rolling back...');
    try { db.exec('ROLLBACK'); } catch (e) {}
    if (bak) {
      console.log('Restoring backup...');
      fs.copyFileSync(bak, dbPath);
      console.log('Backup restored.');
    }
    process.exit(1);
  } finally {
    db.close();
  }
}

if (require.main === module) migrate();

module.exports = { migrate };
