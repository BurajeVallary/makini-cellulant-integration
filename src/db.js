const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { STUDENTS_TABLE, PAYMENTS_TABLE, INDEXES } = require('./db-schema');
const { NODE_ENV } = process.env;

let pool;
let sqliteDb;
const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'sqlite', 'postgres', or 'mock'
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'makini.db');

// In-memory mock database for testing
const mockDb = {
  students: [
    {
      id: 'ST001',
      studentId: 'ST001',
      firstName: 'RIchard ',
      lastName: 'Smith',
      email: 'smith@makini.edu',
      isActive: true,
      balance: 50000,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'ST002',
      studentId: 'ST002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@makini.edu',
      isActive: true,
      balance: 75000,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  payments: []
};

// Initialize SQLite database
const initSqliteDb = () => {
  try {
    // Ensure the directory exists
    const dbDir = path.dirname(SQLITE_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create or open the database
    sqliteDb = new Database(SQLITE_DB_PATH);
    
    // Enable foreign keys
    sqliteDb.pragma('foreign_keys = ON');
    
    // Create tables if they don't exist
    sqliteDb.exec(STUDENTS_TABLE);
    sqliteDb.exec(PAYMENTS_TABLE);
    
    // Create indexes
    INDEXES.forEach(index => sqliteDb.exec(index));
    
    console.log(`Connected to SQLite database at ${SQLITE_DB_PATH}`);
    return sqliteDb;
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
};

// Initialize the database connection based on environment
const initDb = () => {
  if (NODE_ENV === 'test' || DB_TYPE === 'mock') {
    // For testing, use the mock database
    console.log('Using mock in-memory database');
    return {
      query: async (text, params) => {
        // Simple query simulation for testing
        if (text.includes('SELECT * FROM students')) {
          return { rows: [...mockDb.students] };
        }
        if (text.includes('SELECT * FROM students WHERE student_id = $1')) {
          const student = mockDb.students.find(s => s.studentId === params[0]);
          return { rows: student ? [student] : [] };
        }
        if (text.includes('INSERT INTO payments')) {
          const payment = {
            id: `PAY-${Date.now()}`,
            studentId: params[0],
            amount: params[1],
            reference: params[2],
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          mockDb.payments.push(payment);
          return { rows: [payment] };
        }
        return { rows: [] };
      },
      release: () => {}
    };
  }

  if (DB_TYPE === 'sqlite') {
    // Use SQLite
    if (!sqliteDb) {
      initSqliteDb();
    }
    return sqliteDb;
  }

  // For PostgreSQL
  if (DB_TYPE === 'postgres' && !pool) {
    pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'makini_integration',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });

    // Test the connection
    pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  return DB_TYPE === 'postgres' ? pool : sqliteDb;
};

// Convert PostgreSQL-style parameters ($1, $2) to SQLite-style parameters (?, ?)
const convertParamsToSqlite = (text) => {
  let paramIndex = 0;
  return text.replace(/\$\d+/g, () => '?');
};

// Convert row objects to camelCase for consistency
const toCamelCase = (row) => {
  if (!row) return null;
  
  const result = {};
  Object.keys(row).forEach(key => {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = row[key];
  });
  return result;
};

// Execute query based on database type
const query = async (text, params = []) => {
  const start = Date.now();
  
  try {
    let result;
    
    if (NODE_ENV === 'test' || DB_TYPE === 'mock') {
      // Use mock database
      const mockResult = await initDb().query(text, params);
      return mockResult;
    } 
    else if (DB_TYPE === 'sqlite') {
      // Use SQLite
      if (!sqliteDb) {
        initSqliteDb();
      }
      
      const sqliteText = convertParamsToSqlite(text);
      
      if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
        // For SELECT queries
        const stmt = sqliteDb.prepare(sqliteText);
        const rows = stmt.all(params);
        
        // Convert rows to camelCase for consistency with PostgreSQL results
        const camelCaseRows = rows.map(toCamelCase);
        
        result = { 
          rows: camelCaseRows,
          rowCount: camelCaseRows.length
        };
      } 
      else if (sqliteText.trim().toUpperCase().startsWith('INSERT')) {
        // For INSERT queries
        const stmt = sqliteDb.prepare(sqliteText);
        const info = stmt.run(params);
        
        // For INSERT ... RETURNING queries, we need to fetch the inserted row
        if (text.toUpperCase().includes('RETURNING')) {
          // Extract table name from INSERT query
          const tableMatch = text.match(/INSERT\s+INTO\s+([^\s(]+)/i);
          const tableName = tableMatch ? tableMatch[1] : null;
          
          if (tableName) {
            // Get the last inserted row
            const lastRowId = info.lastInsertRowid;
            const getRow = sqliteDb.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
            const row = getRow.get(lastRowId);
            
            result = { 
              rows: row ? [toCamelCase(row)] : [],
              rowCount: row ? 1 : 0
            };
          } else {
            result = { rows: [], rowCount: 0 };
          }
        } else {
          result = { 
            rows: [],
            rowCount: info.changes
          };
        }
      } 
      else {
        // For UPDATE, DELETE
        const stmt = sqliteDb.prepare(sqliteText);
        const info = stmt.run(params);
        
        result = { 
          rows: [],
          rowCount: info.changes
        };
      }
    } 
    else {
      // Use PostgreSQL
      result = await pool.query(text, params);
    }
    
    const duration = Date.now() - start;
    console.log('Executed query', { 
      text, 
      duration, 
      rows: result.rowCount,
      database: DB_TYPE
    });
    
    return result;
  } catch (error) {
    console.error('Database query error:', { text, params, error: error.message, database: DB_TYPE });
    throw error;
  }
};

// Run an async function inside a SQLite BEGIN/COMMIT/ROLLBACK block.
// The callback can use the exported `query` function (which is synchronous for sqlite)
// or perform direct sqlite operations. This helper currently implements the
// transactional behavior for the `sqlite` DB_TYPE. For other DB types, it will
// attempt a simple BEGIN/COMMIT using the same sqlite API where available.
const runInTransaction = async (fn) => {
  if (DB_TYPE === 'sqlite') {
    if (!sqliteDb) initSqliteDb();
    try {
      sqliteDb.exec('BEGIN');
      const result = await fn();
      sqliteDb.exec('COMMIT');
      return result;
    } catch (err) {
      try { sqliteDb.exec('ROLLBACK'); } catch (e) {}
      throw err;
    }
  }
  return await fn();
};

// Seed initial data into SQLite database
const seedSqliteData = () => {
  if (DB_TYPE !== 'sqlite' || !sqliteDb) return;
  
  try {
    // Check if students table is empty
    const studentCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM students').get();
    
    if (studentCount.count === 0) {
      // Insert initial students
      const insertStudent = sqliteDb.prepare(`
        INSERT INTO students (
          id, student_id, first_name, last_name, email, is_active, balance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = new Date().toISOString();
      
      // Insert sample students
      insertStudent.run(
        'ST001', 'ST001', 'Richard', 'Smith', 'smith@makini.edu', 
        1, 50000, now, now
      );
      
      insertStudent.run(
        'ST002', 'ST002', 'Jane', 'Smith', 'jane.smith@makini.edu', 
        1, 75000, now, now
      );
      
      console.log('Seeded initial data into SQLite database');
    }
  } catch (error) {
    console.error('Error seeding SQLite data:', error);
  }
};

// For testing
const clearMockData = () => {
  if (mockDb) {
    mockDb.students = [
      {
        id: 'ST001',
        studentId: 'ST001',
        firstName: 'Richard',
        lastName: 'Smith',
        email: 'smith@makini.edu',
        isActive: true,
        balance: 50000,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ST002',
        studentId: 'ST002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@makini.edu',
        isActive: true,
        balance: 75000,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    mockDb.payments = [];
  }
};

// Close database connections
const closeDb = () => {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  
  if (pool) {
    pool.end();
    pool = null;
  }
};

module.exports = {
  query,
  initDb,
  initSqliteDb,
  seedSqliteData,
  clearMockData,
  closeDb,
  // Export mockDb 
  ...(NODE_ENV === 'test' && { mockDb })
  , runInTransaction
};