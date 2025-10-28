const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');


//fetch a student by student_id
const fetchStudent = async (studentId) => {
  const result = await query(
    'SELECT student_id as "studentId", first_name as "firstName", last_name as "lastName", year, gender, balance, created_at as "createdAt", updated_at as "updatedAt" FROM students WHERE student_id = ?',
    [studentId]
  );

  if (!result || result.rows.length === 0) {
    throw new NotFoundError('Student not found');
  }

  return result.rows[0];
};

// GET /students - list all students
router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT student_id as "studentId", first_name as "firstName", last_name as "lastName", year, gender, balance, created_at as "createdAt", updated_at as "updatedAt" FROM students');
    res.json({ status: 'success', data: result.rows, count: result.rowCount });
  } catch (err) {
    next(err);
  }
});

// GET /students/:studentId - get specific student
router.get('/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!studentId) throw new ValidationError({ studentId: 'Student ID is required' });

    const student = await fetchStudent(studentId);
    res.json({ status: 'success', data: student });
  } catch (err) {
    next(err);
  }
});

// GET /students/validate?student_id=ST001  - validate by query
router.get('/validate', async (req, res, next) => {
  try {
    const studentId = req.query.student_id || req.query.studentId;
    if (!studentId) throw new ValidationError({ studentId: 'Student ID is required' });

    const student = await fetchStudent(studentId);
    res.json({ status: 'success', data: { isValid: true, student } });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ status: 'error', message: err.message, data: { isValid: false } });
    }
    next(err);
  }
});

// POST /students - create a student
router.post('/', async (req, res, next) => {
  try {
    // Accept both snake_case and camelCase
    const body = req.body || {};
    const student_id = body.student_id || body.studentId;
    const first_name = body.first_name || body.firstName;
    const last_name = body.last_name || body.lastName;
    const year = body.year;
    const gender = body.gender;

    if (!student_id || !first_name || !last_name) {
      throw new ValidationError({ message: 'student_id, first_name, and last_name are required' });
    }

    // check exists
    const exists = await query('SELECT student_id FROM students WHERE student_id = ?', [student_id]);
    if (exists.rows && exists.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Student ID already exists' });
    }

    const now = new Date().toISOString();
    await query('INSERT INTO students (student_id, first_name, last_name, year, gender, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, first_name, last_name, year || null, gender || null, 0, now, now]
    );

    const created = await fetchStudent(student_id);

    res.status(201).json({ status: 'success', message: 'Student created', data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /students/:studentId - update student fields
router.put('/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!studentId) throw new ValidationError({ studentId: 'Student ID is required' });

    const updates = req.body || {};
    const allowed = ['first_name', 'last_name', 'year', 'gender'];
    const set = [];
    const values = [];

    for (const [k, v] of Object.entries(updates)) {
      const snake = k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
      if (allowed.includes(snake)) {
        set.push(`${snake} = ?`);
        values.push(v);
      }
    }

    if (set.length === 0) {
      throw new ValidationError({ message: 'No valid fields to update' });
    }
    // add updated_at timestamp
    const now = new Date().toISOString();
    set.push('updated_at = ?');
    values.push(now);

    values.push(studentId);
    const sql = `UPDATE students SET ${set.join(', ')} WHERE student_id = ?`;
    const result = await query(sql, values);

    if (result.rowCount === 0) {
      throw new NotFoundError('Student not found');
    }

    const updated = await query('SELECT student_id as "studentId", first_name as "firstName", last_name as "lastName", year, gender, balance, created_at as "createdAt", updated_at as "updatedAt" FROM students WHERE student_id = ?', [studentId]);
    res.json({ status: 'success', data: updated.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;