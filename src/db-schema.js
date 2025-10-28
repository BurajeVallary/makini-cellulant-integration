

const STUDENTS_TABLE = `
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  year INT,
  gender TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  balance REAL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
)`;

const PAYMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  student_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'KES',
  status TEXT,
  payment_method TEXT NOT NULL DEFAULT 'UNKNOWN',
  merchant_reference TEXT,
  message TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(student_id)
)`;


const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id)`
  , `CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method)`
];

module.exports = {
  STUDENTS_TABLE,
  PAYMENTS_TABLE,
  INDEXES
};