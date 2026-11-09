const express = require('express');
const router = express.Router();
const getDb = (req) => req.app.get('dbService');

// GET /api/shifts?empId=
router.get('/', async (req, res) => {
  const { empId } = req.query;
  if (!empId) return res.status(400).json({ success: false, message: 'empId is required' });

  try {
    const db = getDb(req);
    const result = await db.execute(
            `SELECT shift_id, emp_id, type AS shift_type,
              TO_CHAR(start_time, 'YYYY-MM-DD') AS shift_date,
              TO_CHAR(start_time, 'HH24:MI') AS start_time,
              TO_CHAR(end_time, 'HH24:MI') AS end_time
             FROM shift WHERE emp_id = ? ORDER BY start_time DESC`,
      [empId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
