# SQLite Database Integration

This project now supports SQLite as a database option, which makes it easier to run the application without setting up PostgreSQL.

## Configuration

The database type is configured in the `.env` file:

```
# Database configuration
# Options: 'sqlite', 'postgres', 'mock'
DB_TYPE=sqlite
SQLITE_DB_PATH=./makini.db
```

- `DB_TYPE`: Set to `sqlite` to use SQLite, `postgres` to use PostgreSQL, or `mock` to use the in-memory mock database
- `SQLITE_DB_PATH`: Path to the SQLite database file (default: `./makini.db`)

## Database Management

The following npm scripts are available for managing the SQLite database:

```bash
# Initialize the database (creates tables and seeds initial data)
npm run db:sqlite:init

# Reset the database (drops all tables, recreates them, and seeds initial data)
npm run db:sqlite:reset

# View database tables and data
npm run db:sqlite:view
```

You can also use the `sqlite-tools.js` script directly:

```bash
# Initialize the database
node sqlite-tools.js init

# Reset the database
node sqlite-tools.js reset

# View database tables and data
node sqlite-tools.js view

# Show help
node sqlite-tools.js help
```

## Database Schema

The SQLite database has the following tables:

### Students Table

```sql
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  balance REAL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
)
```

### Payments Table

```sql
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  student_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'KES',
  status TEXT,
  payment_method TEXT,
  merchant_reference TEXT,
  message TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(student_id)
)
```

## Usage

When the application starts, it automatically initializes the database based on the `DB_TYPE` setting in the `.env` file. If you're using SQLite, it will create the database file if it doesn't exist and set up the necessary tables.

To manually initialize or reset the database, use the npm scripts mentioned above.

## Switching Between Database Types

You can switch between database types by changing the `DB_TYPE` setting in the `.env` file:

- `sqlite`: Uses SQLite database (file-based)
- `postgres`: Uses PostgreSQL database (requires PostgreSQL server)
- `mock`: Uses in-memory mock database (data is lost when the application restarts)

After changing the database type, restart the application for the changes to take effect.