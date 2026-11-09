const oracledb = require('oracledb');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const normalizeRows = (rows = []) => rows.map(row =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]))
);

const normalizeSql = sql => {
  let index = 0;
  return sql.replace(/\?/g, () => `:${++index}`);
};

class DatabaseService {
  constructor() {
    this.pool = null;
    this.initialized = false;
  }

  async initialize() {
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    if (!user || !password) {
      throw new Error('DB_USER and DB_PASSWORD must be set in backend/.env');
    }

    const connectString = process.env.DB_CONNECT_STRING ||
      `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '1521'}/${process.env.DB_SERVICE || 'XE'}`;

    this.pool = await oracledb.createPool({
      user,
      password,
      connectString,
      poolMin: Number.parseInt(process.env.DB_POOL_MIN, 10) || 1,
      poolMax: Number.parseInt(process.env.DB_POOL_MAX, 10) || 10,
      poolIncrement: 1
    });

    const connection = await this.pool.getConnection();
    try {
      await connection.execute('SELECT 1 FROM DUAL');
    } finally {
      await connection.close();
    }

    this.initialized = true;
    console.log(`Oracle database pool initialized (${connectString})`);
  }

  async getConnection() {
    if (!this.initialized) throw new Error('Oracle pool not initialized');
    return this.pool.getConnection();
  }

  async execute(sql, params = [], transactionConnection = null) {
    if (!this.initialized) throw new Error('Oracle pool not initialized');
    const connection = transactionConnection || await this.pool.getConnection();
    try {
      const result = await connection.execute(
        normalizeSql(sql),
        params,
        { outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit: !transactionConnection }
      );
      return { ...result, rows: normalizeRows(result.rows) };
    } finally {
      if (!transactionConnection) await connection.close();
    }
  }

  async checkHealth() {
    try {
      await this.execute('SELECT 1 FROM DUAL');
      return { healthy: true };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.close(10);
      this.pool = null;
      this.initialized = false;
      console.log('Oracle pool closed');
    }
  }
}

module.exports = DatabaseService;
