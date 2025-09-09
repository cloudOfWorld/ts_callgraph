/**
 * 数据库工具类 (JavaScript)
 * 演示JavaScript类、异步操作和模块导出
 */

const _ = require('lodash');
const { Pool } = require('pg'); // PostgreSQL客户端（假设安装）
const config = require('../../config/app');

/**
 * 数据库连接池管理类
 */
class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    try {
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.username,
        password: config.database.password,
        database: config.database.database,
        max: 20, // 最大连接数
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // 测试连接
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      this.connectionRetries = 0;
      console.log('Database connected successfully');
      
      return true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      
      this.connectionRetries++;
      if (this.connectionRetries < this.maxRetries) {
        console.log(`Retrying connection... (${this.connectionRetries}/${this.maxRetries})`);
        await this.delay(2000 * this.connectionRetries);
        return this.initialize();
      }
      
      throw new Error(`Failed to connect to database after ${this.maxRetries} retries`);
    }
  }

  /**
   * 执行查询
   */
  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 执行事务
   */
  async transaction(callback) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 批量插入
   */
  async batchInsert(tableName, records, chunkSize = 100) {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const chunks = _.chunk(records, chunkSize);
    const results = [];

    for (const chunk of chunks) {
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      for (const record of chunk) {
        const keys = Object.keys(record);
        const recordPlaceholders = keys.map(() => `$${paramIndex++}`);
        placeholders.push(`(${recordPlaceholders.join(', ')})`);
        values.push(...Object.values(record));
      }

      const keys = Object.keys(records[0]);
      const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES ${placeholders.join(', ')} RETURNING *`;
      
      const result = await this.query(sql, values);
      results.push(...result);
    }

    return results;
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('Database connection closed');
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      totalCount: this.pool ? this.pool.totalCount : 0,
      idleCount: this.pool ? this.pool.idleCount : 0,
      waitingCount: this.pool ? this.pool.waitingCount : 0
    };
  }
}

/**
 * 查询构建器类
 */
class QueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.selectFields = ['*'];
    this.whereConditions = [];
    this.joinClauses = [];
    this.orderByClause = '';
    this.limitClause = '';
    this.offsetClause = '';
    this.params = [];
    this.paramIndex = 1;
  }

  /**
   * SELECT字段
   */
  select(fields) {
    if (Array.isArray(fields)) {
      this.selectFields = fields;
    } else if (typeof fields === 'string') {
      this.selectFields = fields.split(',').map(f => f.trim());
    }
    return this;
  }

  /**
   * WHERE条件
   */
  where(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    
    this.whereConditions.push(`${field} ${operator} $${this.paramIndex++}`);
    this.params.push(value);
    return this;
  }

  /**
   * WHERE IN条件
   */
  whereIn(field, values) {
    if (!Array.isArray(values) || values.length === 0) {
      return this;
    }
    
    const placeholders = values.map(() => `$${this.paramIndex++}`);
    this.whereConditions.push(`${field} IN (${placeholders.join(', ')})`);
    this.params.push(...values);
    return this;
  }

  /**
   * JOIN连接
   */
  join(tableName, condition) {
    this.joinClauses.push(`INNER JOIN ${tableName} ON ${condition}`);
    return this;
  }

  /**
   * LEFT JOIN连接
   */
  leftJoin(tableName, condition) {
    this.joinClauses.push(`LEFT JOIN ${tableName} ON ${condition}`);
    return this;
  }

  /**
   * ORDER BY排序
   */
  orderBy(field, direction = 'ASC') {
    this.orderByClause = `ORDER BY ${field} ${direction.toUpperCase()}`;
    return this;
  }

  /**
   * LIMIT限制
   */
  limit(count) {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  /**
   * OFFSET偏移
   */
  offset(count) {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  /**
   * 分页
   */
  paginate(page, limit) {
    const offset = (page - 1) * limit;
    return this.limit(limit).offset(offset);
  }

  /**
   * 构建SQL语句
   */
  toSQL() {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    
    if (this.joinClauses.length > 0) {
      sql += ' ' + this.joinClauses.join(' ');
    }
    
    if (this.whereConditions.length > 0) {
      sql += ' WHERE ' + this.whereConditions.join(' AND ');
    }
    
    if (this.orderByClause) {
      sql += ' ' + this.orderByClause;
    }
    
    if (this.limitClause) {
      sql += ' ' + this.limitClause;
    }
    
    if (this.offsetClause) {
      sql += ' ' + this.offsetClause;
    }
    
    return { sql, params: this.params };
  }

  /**
   * 执行查询
   */
  async execute(dbManager) {
    const { sql, params } = this.toSQL();
    return await dbManager.query(sql, params);
  }
}

/**
 * 数据库迁移工具
 */
class MigrationRunner {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.migrations = [];
  }

  /**
   * 添加迁移
   */
  addMigration(name, upQuery, downQuery) {
    this.migrations.push({
      name,
      upQuery,
      downQuery,
      timestamp: Date.now()
    });
    return this;
  }

  /**
   * 运行迁移
   */
  async runMigrations() {
    // 创建迁移记录表
    await this.createMigrationTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = this.migrations.filter(
      migration => !executedMigrations.includes(migration.name)
    );

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration: ${migration.name}`);
        
        await this.dbManager.transaction(async (client) => {
          await client.query(migration.upQuery);
          await client.query(
            'INSERT INTO migrations (name, executed_at) VALUES ($1, $2)',
            [migration.name, new Date()]
          );
        });
        
        console.log(`Migration completed: ${migration.name}`);
      } catch (error) {
        console.error(`Migration failed: ${migration.name}`, error);
        throw error;
      }
    }
  }

  /**
   * 创建迁移记录表
   */
  async createMigrationTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await this.dbManager.query(createTableSQL);
  }

  /**
   * 获取已执行的迁移
   */
  async getExecutedMigrations() {
    try {
      const result = await this.dbManager.query('SELECT name FROM migrations ORDER BY executed_at');
      return result.map(row => row.name);
    } catch (error) {
      return [];
    }
  }
}

// 创建单例实例
const dbManager = new DatabaseManager();

// 工厂函数
function createQueryBuilder(tableName) {
  return new QueryBuilder(tableName);
}

function createMigrationRunner() {
  return new MigrationRunner(dbManager);
}

// 导出模块
module.exports = {
  DatabaseManager,
  QueryBuilder,
  MigrationRunner,
  dbManager,
  createQueryBuilder,
  createMigrationRunner,

  // 便捷方法
  async query(sql, params) {
    return await dbManager.query(sql, params);
  },

  async transaction(callback) {
    return await dbManager.transaction(callback);
  },

  async connect() {
    return await dbManager.initialize();
  },

  async disconnect() {
    return await dbManager.close();
  },

  getStatus() {
    return dbManager.getStatus();
  }
};