const express = require('express');
const router = express.Router();
const getDb = (req) => req.app.get('dbService');

// GET /api/reports/employee/:id
router.get('/employee/:id', async (req, res) => {
  const id = req.params.id;
  const db = getDb(req);

  try {
    const empResult = await db.execute(
      `SELECT e.emp_id, e.name, el.username, e.department, e.designation, e.status
       FROM employee e
       JOIN employee_login el ON e.emp_id = el.emp_id
       WHERE e.emp_id = ?`,
      [id]
    );
    if (!empResult.rows.length)
      return res.status(404).json({ success: false, message: 'Employee not found' });

    const attResult = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
              SUM(CASE WHEN status = 'Underground' THEN 1 ELSE 0 END) AS underground
       FROM attendance WHERE emp_id = ?`,
      [id]
    );

    const shiftResult = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN type = 'Night' THEN 1 ELSE 0 END) AS night
       FROM shift WHERE emp_id = ?`,
      [id]
    );

    const leaveResult = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending
       FROM leave_request WHERE emp_id = ?`,
      [id]
    );

    const emp = empResult.rows[0];
    const att = attResult.rows[0];
    const shft = shiftResult.rows[0];
    const lv = leaveResult.rows[0];

    res.json({
      emp_id: emp.emp_id,
      name: emp.name,
      username: emp.username,
      department: emp.department,
      designation: emp.designation,
      status: emp.status,
      attendance: { total: att.total || 0, present: att.present || 0, absent: att.absent || 0, underground: att.underground || 0 },
      shifts: { total: shft.total || 0, night: shft.night || 0 },
      leaves: { total: lv.total || 0, approved: lv.approved || 0, pending: lv.pending || 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
