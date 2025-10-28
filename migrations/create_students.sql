DROP TABLE IF EXISTS students;

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  parent_phone_number VARCHAR(50),
  year INT,
  enrollment_status VARCHAR(50) DEFAULT 'ENROLLED',
  is_active BOOLEAN DEFAULT true,
  balance INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
