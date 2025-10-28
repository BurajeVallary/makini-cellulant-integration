CREATE TABLE IF NOT EXISTS payments (
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

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(payment_reference);
