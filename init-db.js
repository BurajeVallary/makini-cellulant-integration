const { initDb, query, initSqliteDb, seedSqliteData } = require('./src/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'sqlite', 'postgres', or 'mock'

async function initializeDatabase() {
  try {
    console.log(`Initializing ${DB_TYPE} database...`);
    
    // Initialize the database
    if (DB_TYPE === 'sqlite') {
      // Initialize SQLite database
      initSqliteDb();
      
      // Seed initial data
      seedSqliteData();
      
      console.log('SQLite database initialized and seeded successfully!');
    } else if (DB_TYPE === 'postgres') {
      // Initialize PostgreSQL database
      await initDb();
      
      // Read and execute the seed data
      const seedSql = fs.readFileSync(path.join(__dirname, 'seed_students.sql'), 'utf8');
      const statements = seedSql.split(';').filter(statement => statement.trim() !== '');
      
      for (const statement of statements) {
        if (statement.trim()) {
          await query(statement + ';');
        }
      }
      
      console.log('PostgreSQL database initialized and seeded successfully!');
    } else {
      console.log('Using mock database, no initialization needed.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`Error initializing ${DB_TYPE} database:`, error);
    process.exit(1);
  }
}

initializeDatabase();
