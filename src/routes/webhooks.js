const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, runInTransaction } = require('../db');
const { ValidationError, ApiError } = require('../middleware/errorHandler');

// webhook signature
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-callback-signature'];
  const secret = process.env.WEBHOOK_SECRET || 'makini-secret-key';
  
  if (!signature) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError('Missing webhook signature', 401);
    }
    return next();
  }


  
  next();
};

const handlePaymentRequest = async (req, res, next) => {
  try {
    const body = req.body;
    const transactionId = body.transaction_id || body.transactionId;
    const studentId = body.student_id || body.studentId || body.customer_id || body.customerId;
    const amount = body.amount;
    const statusRaw = body.status || body.payment_status || 'completed';
    const paymentMethod = body.payment_method || body.method || 'mobile_money';
    const currency = body.currency || 'KES';
    const merchantReference = body.merchant_reference || body.merchantReference || null;
    const message = body.message || null;

    if (!transactionId || !studentId || amount === undefined || amount === null) {
      throw new ValidationError({
        transactionId: !transactionId ? 'Transaction ID is required' : undefined,
        studentId: !studentId ? 'Student ID is required' : undefined,
        amount: amount === undefined || amount === null ? 'Amount is required' : undefined
      });
    }

    const amountValue = Number(amount);

    if (Number.isNaN(amountValue)) {
      throw new ValidationError({ amount: 'Amount must be a valid number' });
    }

    const studentResult = await query(
      'SELECT student_id FROM students WHERE student_id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      throw new ApiError('Student not found', 400);
    }

    const student = studentResult.rows[0];

    const existingPayment = await query(
      'SELECT id FROM payments WHERE transaction_id = $1',
      [transactionId]
    );

    if (existingPayment.rows.length > 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Payment already processed',
        data: {
          transactionId,
          status: 'duplicate'
        }
      });
    }

    const statusValue = String(statusRaw);
    const normalizedStatus = statusValue.toLowerCase();

    const now = new Date().toISOString();

    // payment method always set to a non-null value
    const trxResult = await runInTransaction(async () => {
      // Insert payment record (ensure payment_method is always set)
      const paymentInsert = await query(
        `INSERT INTO payments (
          transaction_id, student_id, amount, currency, status,
          payment_method, merchant_reference, message, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, transaction_id as "transactionId", status, created_at as "createdAt"`,
        [
          transactionId,
          studentId,
          amountValue,
          currency,
          statusValue,
          paymentMethod || 'UNKNOWN',
          merchantReference,
          message,
          now,
          now
        ]
      );

      // If payment completed, update the student's balance by adding the amount
      if (normalizedStatus === 'completed') {
        await query(
          'UPDATE students SET balance = COALESCE(balance, 0) + $1, updated_at = $2 WHERE student_id = $3',
          [amountValue, now, studentId]
        );
      }

      return paymentInsert.rows[0];
    });

    const payment = trxResult;

    res.status(200).json({
      status: 'success',
      data: {
        paymentId: payment.id,
        transactionId: payment.transactionId,
        status: payment.status,
        processedAt: payment.createdAt
      }
    });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    next(error);
  }
};

router.post('/payments', verifyWebhookSignature, handlePaymentRequest);

/**
 * @route   POST /api/webhooks/payments/callback
 * @desc    Handle payment callback from Cellulant
 * @access  Public
 */
router.post('/payments/callback', verifyWebhookSignature, handlePaymentRequest);

/**
 * @route   GET /api/webhooks/payments/status/:transactionId
 * @desc    Check payment status
 * @access  Public
 */
router.get('/payments/status/:transactionId', async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      throw new ValidationError({ transactionId: 'Transaction ID is required' });
    }

    const result = await query(
      `SELECT 
        id, 
        transaction_id as "transactionId",
        student_id as "studentId",
        amount,
        currency,
        status,
        payment_method as "paymentMethod",
        merchant_reference as "merchantReference",
        message,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM payments 
      WHERE transaction_id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }

    const payment = result.rows[0];
    
    res.json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;