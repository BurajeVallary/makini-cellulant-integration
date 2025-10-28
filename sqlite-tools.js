/**
 * SQLite Database Management Tools
 * 
 * This script provides utilities for managing the SQLite database:
 * - Initialize and seed the database
 * - Reset the database (clear all data)
 * - View database tables and data
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { STUDENTS_TABLE, PAYMENTS_TABLE, INDEXES } = require('./src/db-schema');

// Get database path from environment 
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, 'makini.db');

// Command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Initialize the database
function initializeDatabase() {
  try {
    console.log(`Initializing SQLite database at ${SQLITE_DB_PATH}...`);
    
    // Ensure the directory exists
    const dbDir = path.dirname(SQLITE_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Create or open the database
    const db = new Database(SQLITE_DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables if they don't exist
    db.exec(STUDENTS_TABLE);
    db.exec(PAYMENTS_TABLE);
    
    // Create indexes
    INDEXES.forEach(index => db.exec(index));
    
    // Check if students table is empty
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get();
    
    if (studentCount.count === 0) {
      // Insert initial students
      const insertStudent = db.prepare(`
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
        'ST002', 'ST002', 'Jayden', 'Dalvin', 'dalvin@makini.edu', 
        1, 75000, now, now
      );
      
      console.log('Seeded initial data into SQLite database');
    } else {
      console.log(`Database already contains ${studentCount.count} students`);
    }
    
    console.log('SQLite database initialized successfully!');
    db.close();
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    process.exit(1);
  }
}

// Reset the database 
function resetDatabase() {
  try {
    console.log(`Resetting SQLite database at ${SQLITE_DB_PATH}...`);
    
    // Check if database file exists
    if (!fs.existsSync(SQLITE_DB_PATH)) {
      console.log('Database file does not exist. Creating new database...');
      return initializeDatabase();
    }
    
    // Open the database
    const db = new Database(SQLITE_DB_PATH);
    
    // Drop tables if they exist
    db.exec('DROP TABLE IF EXISTS payments');
    db.exec('DROP TABLE IF EXISTS students');
    
    // Recreate tables
    db.exec(STUDENTS_TABLE);
    db.exec(PAYMENTS_TABLE);
    
    // Recreate indexes
    INDEXES.forEach(index => db.exec(index));
    
    // Seed initial data
    const insertStudent = db.prepare(`
      INSERT INTO students (
        id, student_id, first_name, last_name, email, is_active, balance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    
    // Insert sample students
    insertStudent.run(
      'ST001', 'ST001', 'Richard', 'Smith', 'richard@makini.edu', 
      1, 50000, now, now
    );
    
    insertStudent.run(
      'ST002', 'ST002', 'Jayden', 'Dalvin', 'Dalvin@makini.edu', 
      1, 75000, now, now
    );
    
    console.log('Database reset and seeded with initial data');
    db.close();
  } catch (error) {
    console.error('Error resetting SQLite database:', error);
    process.exit(1);
  }
}

// View database tables and data
function viewDatabase() {
  try {
    console.log(`Viewing SQLite database at ${SQLITE_DB_PATH}...`);
    
    // Check if database file exists
    if (!fs.existsSync(SQLITE_DB_PATH)) {
      console.log('Database file does not exist. Run "node sqlite-tools.js init" to create it.');
      return;
    }
    
    // Open the database
    const db = new Database(SQLITE_DB_PATH);
    
    // Get list of tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    
    console.log('Database Tables:');
    console.log('----------------');
    
    tables.forEach(table => {
      console.log(`\nTable: ${table.name}`);
      
      // Get table schema
      const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log('Schema:');
      schema.forEach(col => {
        console.log(`  ${col.name} (${col.type})${col.pk ? ' PRIMARY KEY' : ''}`);
      });
      
      
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`\nRow count: ${count.count}`);
      
     
      if (count.count > 0) {
        console.log('\nSample data:');
        const rows = db.prepare(`SELECT * FROM ${table.name} LIMIT 5`).all();
        rows.forEach(row => {
          console.log(row);
        });
      }
      
      console.log('----------------');
    });
    
    db.close();
  } catch (error) {
    console.error('Error viewing SQLite database:', error);
    process.exit(1);
  }
}


function showHelp() {
  console.log(`
SQLite Database Management Tools

Usage:
  node sqlite-tools.js <command>

Commands:
  init    Initialize and seed the database
  reset   Reset the database (clear all data and reseed)
  view    View database tables and data
  help    Show this help message

Examples:
  node sqlite-tools.js init
  node sqlite-tools.js reset
  node sqlite-tools.js view
  `);
}


switch (command) {
  case 'init':
    initializeDatabase();
    break;
  case 'reset':
    resetDatabase();
    break;
  case 'view':
    viewDatabase();
    break;
  case 'help':
  default:
    showHelp();
    break;
}