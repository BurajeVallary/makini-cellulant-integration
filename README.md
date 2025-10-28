#  Makini University – Payment Integration API

This project implements a RESTful API that integrates Makini University's student management system with payment processing services.
It provides robust student management, payment processing and webhook handling using SQLite for data persistence and Express.js for the API layer.

##  Project Overview

This integration provides a comprehensive payment processing system with the following features:

* Student Management: Complete CRUD operations for student records
* Payment Processing: Secure webhook-based payment handling
* Transaction Support: ACID-compliant operations for payment processing
* Balance Tracking: Automated student balance management
* Data Persistence:SQLite database with proper schema management
* Security: Webhook signature verification and input validation

##  Project Structure

```
makini-integration/
├─ src/
│  ├─ server.js          # Application entry point
│  ├─ db.js             # Database configuration
│  ├─ db-schema.js      # Database schema definitions
│  ├─ routes/
│  │  ├─ health.js      # Health check endpoints
│  │  ├─ students.js    # Student management API
│  │  └─ webhooks.js    # Payment webhook handlers
│  ├─ middleware/
│  │  └─ errorHandler.js # Error handling middleware
│  └─ utils/
│     └─ verifySignature.js # Webhook signature verification
├─ migrations/
│  ├─ create_students.sql        # Students table schema
│  ├─ create_payments.sql        # Payments table schema
│  └─ add_balance_and_payment_method.js # Schema updates
├─ .env                 # Environment configuration
├─ .gitignore          # Git ignore rules
└─ README.md           # Project documentation
```

##  Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/BurajeVallary/makini-cellulant-integration.git
cd makini-integration
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following settings:

```env
PORT=3000
DB_TYPE=sqlite
SQLITE_DB_PATH=./makini.db
WEBHOOK_SECRET=supersecret_webhook_key
```

### 4. Run Database Migrations

Initialize the database schema:

```bash
node migrations/create_students.sql
node migrations/create_payments.sql
node migrations/add_balance_and_payment_method.js
```

### 5. Start the Server

```bash
npm run dev
```

The server will start at `http://localhost:3000` by default.

##  API Documentation

You can explore and test the Makini–Cellulant Integration endpoints directly using Postman:

👉 [View Full API Documentation on Postman](https://documenter.getpostman.com/view/28066032/2sB3WmThhK#7d0be731-640b-4dfb-83a8-2298c0742aa2)

Endpoints covered:
- `GET /health` – Check service health
- `GET /students` – Fetch all enrolled students
- `POST /students/validate` – Validate student existence
- `POST /webhooks/payments` – Record payment and update student balance


### Base URL

All API endpoints are prefixed with `/api`

### Health Check

**GET** `/api/health`

Health check endpoint to verify API status.

```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2025-10-27T10:00:00.000Z",
  "environment": "development"
}
```

### Student Management

#### List All Students
**GET** `/api/students`

```json
{
  "status": "success",
  "data": [
    {
      "studentId": "ST001",
      "firstName": "Richard",
      "lastName": "Smith",
      "year": 5,
      "gender": "male",
      "balance": 1234,
      "createdAt": "2025-10-27T13:03:06.585Z",
      "updatedAt": "2025-10-27T13:03:06.585Z"
    }
  ],
  "count": 1
}
```

#### Get Student by ID
**GET** `/api/students/:studentId`

```json
{
  "status": "success",
  "data": {
    "studentId": "ST001",
    "firstName": "Richard",
    "lastName": "Smith",
    "year": 5,
    "gender": "male",
    "balance": 1234,
    "createdAt": "2025-10-27T13:03:06.585Z",
    "updatedAt": "2025-10-27T13:03:06.585Z"
  }
}
```

#### Validate Student
**GET** `/api/students/validate?student_id=ST001`

```json
{
  "status": "success",
  "data": {
    "isValid": true,
    "student": {
      "studentId": "ST001",
      "firstName": "Richard",
      "lastName": "Smith",
      "year": 5,
      "balance": 1234
    }
  }
}
```

### Payment Processing

#### Process Payment
**POST** `/api/webhooks/payments`

Process a new payment and update student balance.

Headers:
```
Content-Type: application/json
x-callback-signature: <HMAC SHA256 signature>
```

Request:
```json
{
  "transaction_id": "TXN123456",
  "student_id": "ST001",
  "amount": 50000.00,
  "payment_method": "mobile_money",
  "currency": "KES",
  "status": "completed"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "paymentId": "123",
    "transactionId": "TXN123456",
    "status": "completed",
    "processedAt": "2025-10-27T13:03:06.585Z"
  }
}
```

#### Check Payment Status
**GET** `/api/webhooks/payments/status/:transactionId`

```json
{
  "status": "success",
  "data": {
    "transactionId": "TXN123456",
    "studentId": "ST001",
    "amount": 50000.00,
    "currency": "KES",
    "status": "completed",
    "paymentMethod": "mobile_money",
    "createdAt": "2025-10-27T13:03:06.585Z"
  }
}
```

## Database Schema

### Students Repository Structure

```sql
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
```

### Payments Repository Structure

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference VARCHAR(128) UNIQUE NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) DEFAULT 'KES',
  payment_method VARCHAR(50),
  payment_status VARCHAR(50),
  raw_payload JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_reference ON payments(payment_reference);
```

## Security Features

1. **Webhook Verification**: All payment webhooks require signature verification
2. **Input Validation**: Comprehensive validation for all API inputs
3. **Transaction Support**: ACID compliance for payment processing
4. **Error Handling**: Structured error responses with appropriate HTTP status codes
5. **Environment Configuration**: Secure configuration management via .env

## Error Handling

The API uses standard HTTP status codes and returns structured error responses:

```json
{
  "status": "error",
  "message": "Validation Error",
  "errors": {
    "amount": "Amount must be a valid number"
  }
}
```

