const express = require('express');
const router = express.Router();
const getDb = (req) => req.app.get('dbService');

// GET /api/leaves?empId=
router.get('/', async (req, res) => {
  const { empId } = req.query;
  if (!empId) return res.status(400).json({ success: false, message: 'empId is required' });

  try {
    const db = getDb(req);
    const result = await db.execute(
      `SELECT leave_id, emp_id, leave_type,
              TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
              TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
              reason, status
       FROM leave_request WHERE emp_id = ? ORDER BY start_date DESC`,
      [empId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/leaves
router.post('/', async (req, res) => {
  const { emp_id, leave_type, start_date, end_date, reason } = req.body;
  if (!emp_id || !leave_type || !start_date || !end_date)
    return res.status(400).json({ success: false, message: 'Missing required fields' });

  try {
    const db = getDb(req);
    await db.execute(
      `INSERT INTO leave_request (emp_id, leave_type, start_date, end_date, reason, status)
       VALUES (?, ?, TO_DATE(?, 'YYYY-MM-DD'), TO_DATE(?, 'YYYY-MM-DD'), ?, 'Pending')`,
      [emp_id, leave_type, start_date, end_date, reason || '']
    );
    res.status(201).json({ success: true, message: 'Leave application submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
