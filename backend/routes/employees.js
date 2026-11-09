const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const oracledb = require('oracledb');
const getDb = (req) => req.app.get('dbService');

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const result = await db.execute(
            `SELECT e.emp_id, e.name, el.username, e.email, e.phone_no,
              e.department, e.designation,
              TO_CHAR(e.joining_date, 'YYYY-MM-DD') AS joining_date, e.status
      FROM employee e
       JOIN employee_login el ON e.emp_id = el.emp_id
       WHERE e.emp_id = ?`,
      [req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employees
router.post('/', async (req, res) => {
  const { name, username, email, password, phone_no, department, designation, joining_date, status } = req.body;
  const db = getDb(req);
  let conn;
  try {
    conn = await db.getConnection();

    const empResult = await conn.execute(
      `INSERT INTO employee (name, email, phone_no, department, designation, joining_date, status)
       VALUES (:name, :email, :phoneNo, :department, :designation, TO_DATE(:joiningDate, 'YYYY-MM-DD'), :status)
       RETURNING emp_id INTO :empId`,
      {
        name,
        email,
        phoneNo: phone_no,
        department,
        designation,
        joiningDate: joining_date,
        status,
        empId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    const empId = empResult.outBinds.empId[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO employee_login (emp_id, username, password) VALUES (?, ?, ?)`,
      [empId, username, hashedPassword],
      conn
    );

    await conn.commit();
    res.status(201).json({ success: true, message: 'Employee created successfully', emp_id: empId, name });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  const db = getDb(req);
  let conn;
  try {
    conn = await db.getConnection();
    const id = req.params.id;

    await db.execute('DELETE FROM attendance WHERE emp_id = ?', [id], conn);
    await db.execute('DELETE FROM leave_request WHERE emp_id = ?', [id], conn);
    await db.execute('DELETE FROM shift WHERE emp_id = ?', [id], conn);
    await db.execute('DELETE FROM employee_login WHERE emp_id = ?', [id], conn);
    await db.execute('DELETE FROM employee WHERE emp_id = ?', [id], conn);

    await conn.commit();
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET /api/employees/:id/stats
router.get('/:id/stats', async (req, res) => {
  try {
    const db = getDb(req);
    const id = req.params.id;

    const attResult = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present
       FROM attendance WHERE emp_id = ?`,
      [id]
    );
    const leaveResult = await db.execute(
      `SELECT COUNT(*) AS pending FROM leave_request WHERE emp_id = ? AND status = 'Pending'`,
      [id]
    );

    const row = attResult.rows[0];
    const total = row.total || 0;
    const present = row.present || 0;
    res.json({
      attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
      pendingLeaves: leaveResult.rows[0].pending || 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/:id/attendance
router.get('/:id/attendance', async (req, res) => {
  try {
    const db = getDb(req);
    const result = await db.execute(
            `SELECT attendance_id, emp_id,
              TO_CHAR(attendance_date, 'YYYY-MM-DD') AS date_col,
              TO_CHAR(time_in, 'HH24:MI') AS check_in,
              TO_CHAR(time_out, 'HH24:MI') AS check_out, status
             FROM attendance WHERE emp_id = ? ORDER BY attendance_date DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/:id/shifts
router.get('/:id/shifts', async (req, res) => {
  try {
    const db = getDb(req);
    const result = await db.execute(
            `SELECT shift_id, emp_id, type AS shift_type,
              TO_CHAR(start_time, 'YYYY-MM-DD') AS shift_date,
              TO_CHAR(start_time, 'HH24:MI') AS start_time,
              TO_CHAR(end_time, 'HH24:MI') AS end_time
             FROM shift WHERE emp_id = ? ORDER BY start_time DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
