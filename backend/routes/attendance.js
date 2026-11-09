const express = require('express');
const router = express.Router();
const getDb = (req) => req.app.get('dbService');

// GET /api/attendance?empId=
router.get('/', async (req, res) => {
  const { empId } = req.query;
  if (!empId) return res.status(400).json({ success: false, message: 'empId is required' });

  try {
    const db = getDb(req);
    const result = await db.execute(
            `SELECT attendance_id, emp_id,
              TO_CHAR(attendance_date, 'YYYY-MM-DD') AS date_col,
              TO_CHAR(time_in, 'HH24:MI') AS check_in,
              TO_CHAR(time_out, 'HH24:MI') AS check_out, status
             FROM attendance WHERE emp_id = ? ORDER BY attendance_date DESC`,
      [empId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
