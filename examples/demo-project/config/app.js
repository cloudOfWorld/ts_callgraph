/**
 * 应用配置文件 (JavaScript)
 * 演示JavaScript模块导出和环境变量使用
 */

const path = require('path');
const { config } = require('dotenv');

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env') });

/**
 * 数据库配置
 */
const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'callgraph_demo'
};

/**
 * Redis配置
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASS || null,
  db: parseInt(process.env.REDIS_DB) || 0
};

/**
 * JWT配置
 */
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES || '24h',
  algorithm: 'HS256'
};

/**
 * 应用配置
 */
const appConfig = {
  port: parseInt(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  apiPrefix: '/api/v1',
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100 // 限制每个IP 15分钟内最多100个请求
  }
};

/**
 * 日志配置
 */
const logConfig = {
  level: process.env.LOG_LEVEL || 'info',
  file: {
    enabled: process.env.LOG_FILE === 'true',
    path: process.env.LOG_PATH || './logs/app.log',
    maxSize: '20m',
    maxFiles: 5
  },
  console: {
    enabled: true,
    colorize: appConfig.env === 'development'
  }
};

/**
 * 导出配置对象
 */
module.exports = {
  database: databaseConfig,
  redis: redisConfig,
  jwt: jwtConfig,
  app: appConfig,
  log: logConfig,
  
  // 获取完整配置的方法
  getConfig() {
    return {
      database: this.database,
      redis: this.redis,
      jwt: this.jwt,
      app: this.app,
      log: this.log
    };
  },

  // 验证配置的方法
  validateConfig() {
    const requiredEnvVars = ['DB_HOST', 'JWT_SECRET'];
    const missing = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return true;
  }
};

// 运行时验证配置
if (require.main === module) {
  try {
    module.exports.validateConfig();
    console.log('Configuration validation passed');
    console.log('Current config:', JSON.stringify(module.exports.getConfig(), null, 2));
  } catch (error) {
    console.error('Configuration validation failed:', error.message);
    process.exit(1);
  }
}