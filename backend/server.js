require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const admin = require('firebase-admin');
const DatabaseService = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Configuration
// ======================
const config = {
  auth: {
    jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '4h',
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3,
    loginDelay: parseInt(process.env.LOGIN_DELAY_MS) || 2000
  }
};

// Initialize Firebase Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (err) {
    console.error('Firebase initialization failed:', err.message);
  }
}

const dbService = new DatabaseService();

// ======================
// Authentication Service
// ======================
async function verifyAndUpgradePassword(password, storedPassword, updateHash) {
  const isBcryptHash = typeof storedPassword === 'string' && /^\$2[aby]\$\d{2}\$/.test(storedPassword);
  let passwordMatches = false;

  if (isBcryptHash) {
    passwordMatches = await bcrypt.compare(password, storedPassword);
  } else if (typeof storedPassword === 'string') {
    const suppliedBuffer = Buffer.from(password, 'utf8');
    const storedBuffer = Buffer.from(storedPassword, 'utf8');
    passwordMatches = suppliedBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(suppliedBuffer, storedBuffer);
  }

  if (!passwordMatches) return false;
  if (!isBcryptHash) await updateHash(await bcrypt.hash(password, 10));
  return true;
}

class AuthService {
  constructor(db) { this.db = db; }

  async authenticateAdmin(username, password) {
    try {
      const result = await this.db.execute(
        'SELECT admin_id AS id, username, password, role FROM admin WHERE username = ?',
        [username]
      );
      if (result.rows.length === 0) return { success: false, error: 'Invalid credentials' };

      const adminUser = result.rows[0];
      const storedPassword = adminUser.password;
      const passwordMatches = await verifyAndUpgradePassword(password, storedPassword, hashedPassword =>
        this.db.execute(
          'UPDATE admin SET password = ? WHERE admin_id = ? AND password = ?',
          [hashedPassword, adminUser.id, storedPassword]
        )
      );
      if (!passwordMatches)
        return { success: false, error: 'Invalid credentials' };

      const token = jwt.sign(
        { id: adminUser.id, username: adminUser.username, role: adminUser.role },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
      );
      return { success: true, token, user: { id: adminUser.id, username: adminUser.username, role: adminUser.role } };
    } catch (err) {
      console.error('Admin auth error:', err);
      return { success: false, error: 'Service unavailable' };
    }
  }

  async authenticateEmployee(identifier, password) {
    try {
      const result = await this.db.execute(
        `SELECT e.emp_id, e.name, el.username, e.email, el.password
         FROM employee e
         JOIN employee_login el ON e.emp_id = el.emp_id
         WHERE (el.username = ? OR e.email = ?) AND e.status = 'Active'`,
        [identifier, identifier]
      );
      if (result.rows.length === 0) return { success: false, error: 'Invalid credentials' };

      const emp = result.rows[0];
      const passwordMatches = await verifyAndUpgradePassword(password, emp.password, hashedPassword =>
        this.db.execute(
          'UPDATE employee_login SET password = ? WHERE emp_id = ? AND password = ?',
          [hashedPassword, emp.emp_id, emp.password]
        )
      );
      if (!passwordMatches)
        return { success: false, error: 'Invalid credentials' };

      const token = jwt.sign(
        { id: emp.emp_id, username: emp.username, role: 'employee' },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
      );
      const { password: _, ...empData } = emp;
      return { success: true, token, user: empData };
    } catch (err) {
      console.error('Employee auth error:', err);
      return { success: false, error: 'Service unavailable' };
    }
  }

  async verifyFirebaseToken(idToken) {
    try {
      if (!admin.apps.length) throw new Error('Firebase Admin not initialized');
      const decoded = await admin.auth().verifyIdToken(idToken);
      return { success: true, user: { id: decoded.uid, email: decoded.email, name: decoded.name || '', role: 'firebase-user' } };
    } catch (err) {
      return { success: false, error: 'Invalid Firebase token' };
    }
  }
}

const authService = new AuthService(dbService);

// ======================
// Middleware
// ======================
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many API requests. Please try again shortly.', code: 'API_RATE_LIMITED' }
}));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many sign-in attempts. Please wait before trying again.', code: 'AUTH_RATE_LIMITED' }
}));

const requireDbHealth = async (req, res, next) => {
  const health = await dbService.checkHealth();
  if (!health.healthy) {
    return res.status(503).json({ success: false, message: 'Database service unavailable', code: 'DATABASE_UNAVAILABLE' });
  }
  next();
};

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Authentication token required', code: 'AUTH_TOKEN_MISSING' });

  jwt.verify(token, config.auth.jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    req.user = user;
    next();
  });
};

const authenticateFirebaseToken = async (req, res, next) => {
  const idToken = req.headers['authorization']?.split(' ')[1];
  if (!idToken) return res.status(401).json({ success: false, message: 'Firebase ID token required', code: 'FIREBASE_TOKEN_MISSING' });

  const result = await authService.verifyFirebaseToken(idToken);
  if (!result.success) return res.status(403).json({ success: false, message: result.error, code: 'INVALID_FIREBASE_TOKEN' });
  req.user = result.user;
  next();
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, message: 'Unauthorized access', code: 'UNAUTHORIZED_ACCESS' });
  next();
};

// ======================
// Routes
// ======================
app.use('/api', requireDbHealth);

const employeesRouter = require('./routes/employees');
const attendanceRouter = require('./routes/attendance');
const leavesRouter = require('./routes/leaves');
const shiftsRouter = require('./routes/shifts');
const reportsRouter = require('./routes/reports');

app.use('/api/employees', authenticateToken, employeesRouter);
app.use('/api/attendance', authenticateToken, attendanceRouter);
app.use('/api/leaves', authenticateToken, leavesRouter);
app.use('/api/shifts', authenticateToken, shiftsRouter);
app.use('/api/reports', authenticateToken, reportsRouter);

// Auth routes
app.post('/api/auth/admin', [
  body('username').trim().notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password } = req.body;
  let attempts = 0;
  while (attempts < config.auth.maxLoginAttempts) {
    attempts++;
    try {
      const result = await authService.authenticateAdmin(username, password);
      if (!result.success) {
        if (result.error === 'Invalid credentials')
          return res.status(401).json({ success: false, message: result.error, code: 'INVALID_CREDENTIALS' });
        throw new Error(result.error);
      }
      return res.json({ success: true, token: result.token, admin: result.user, expiresIn: config.auth.jwtExpiresIn });
    } catch (err) {
      if (attempts >= config.auth.maxLoginAttempts)
        return res.status(503).json({ success: false, message: 'Authentication service temporarily unavailable', code: 'AUTH_SERVICE_UNAVAILABLE' });
      await new Promise(r => setTimeout(r, config.auth.loginDelay));
    }
  }
});

app.post('/api/auth/employee', [
  body('emailOrUsername').trim().notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { emailOrUsername, password } = req.body;
  let attempts = 0;
  while (attempts < config.auth.maxLoginAttempts) {
    attempts++;
    try {
      const result = await authService.authenticateEmployee(emailOrUsername, password);
      if (!result.success) {
        if (result.error === 'Invalid credentials')
          return res.status(401).json({ success: false, message: result.error, code: 'INVALID_CREDENTIALS' });
        throw new Error(result.error);
      }
      return res.json({ success: true, token: result.token, employee: result.user, expiresIn: config.auth.jwtExpiresIn });
    } catch (err) {
      if (attempts >= config.auth.maxLoginAttempts)
        return res.status(503).json({ success: false, message: 'Authentication service temporarily unavailable', code: 'AUTH_SERVICE_UNAVAILABLE' });
      await new Promise(r => setTimeout(r, config.auth.loginDelay));
    }
  }
});

app.post('/api/auth/firebase', [body('idToken').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const result = await authService.verifyFirebaseToken(req.body.idToken);
  if (!result.success) return res.status(401).json({ success: false, message: result.error, code: 'FIREBASE_AUTH_FAILED' });

  const token = jwt.sign(
    { id: result.user.id, email: result.user.email, role: result.user.role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
  res.json({ success: true, token, user: result.user, expiresIn: config.auth.jwtExpiresIn });
});

app.get('/api/firebase-protected', authenticateFirebaseToken, (req, res) => {
  res.json({ success: true, message: 'Access granted to Firebase-authenticated user', user: req.user });
});

app.get('/api/dashboard/summary', authenticateToken, authorizeRoles('SuperAdmin', 'HRAdmin', 'FinanceAdm'), async (req, res) => {
  try {
    const [employeeResult, attendanceResult, leaveResult] = await Promise.all([
      dbService.execute(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active
         FROM employee`
      ),
      dbService.execute(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN TRUNC(attendance_date) = TRUNC(SYSDATE) THEN 1 ELSE 0 END) AS today,
                SUM(CASE WHEN status = 'Present' AND TRUNC(attendance_date) = TRUNC(SYSDATE) THEN 1 ELSE 0 END) AS present_today
         FROM attendance`
      ),
      dbService.execute(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending
         FROM leave_request`
      )
    ]);

    res.json({
      employees: employeeResult.rows[0],
      attendance: attendanceResult.rows[0],
      leaves: leaveResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to load dashboard summary' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await dbService.checkHealth();
    res.json({
      status: dbHealth.healthy ? 'healthy' : 'degraded',
      services: {
        database: { status: dbHealth.healthy ? 'connected' : 'disconnected', ...(dbHealth.details || {}), error: dbHealth.error },
        firebase: { status: admin.apps.length ? 'connected' : 'disconnected' }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// ======================
// Server Management
// ======================
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found', code: 'ENDPOINT_NOT_FOUND' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
});

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  try {
    await dbService.close();
    if (admin.apps.length) await Promise.all(admin.apps.map(a => a.delete()));
    process.exit(0);
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

(async () => {
  try {
    await dbService.initialize();
    app.set('dbService', dbService);
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
})();
