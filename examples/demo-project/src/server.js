/**
 * Express 服务器 (JavaScript)
 * 演示HTTP服务器、中间件、路由和异步处理
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

// 引入配置和工具
const config = require('../config/app');
const { dbManager, createQueryBuilder } = require('./utils/database');

/**
 * Express 应用类
 */
class ExpressApp {
  constructor() {
    this.app = express();
    this.server = null;
    this.isRunning = false;
    
    // 内存存储（演示用）
    this.users = new Map();
    this.roles = new Map();
    this.sessions = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    // 初始化一些测试数据
    this.initializeTestData();
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // 安全中间件
    this.app.use(helmet());
    
    // CORS配置
    this.app.use(cors({
      origin: config.app.corsOrigins,
      credentials: true
    }));

    // 请求日志
    if (config.app.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // 请求体解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // 限流中间件
    const limiter = rateLimit({
      windowMs: config.app.rateLimiting.windowMs,
      max: config.app.rateLimiting.max,
      message: {
        error: 'Too many requests',
        message: 'Please try again later'
      }
    });
    this.app.use(limiter);

    // 请求ID中间件
    this.app.use((req, res, next) => {
      req.id = uuidv4();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // 请求时间中间件
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      
      // 响应结束时记录耗时
      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        console.log(`[${req.id}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      
      next();
    });

    // 静态文件服务
    this.app.use('/static', express.static('public'));
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        requestId: req.id
      });
    });

    // API版本信息
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'CallGraph Demo API',
        version: '1.0.0',
        description: 'Demo API for testing TypeScript/JavaScript call graph analysis',
        endpoints: {
          users: '/api/v1/users',
          roles: '/api/v1/roles',
          auth: '/api/v1/auth'
        }
      });
    });

    // API路由
    this.app.use('/api/v1', this.createApiRouter());
  }

  /**
   * 创建API路由器
   */
  createApiRouter() {
    const router = express.Router();

    // 用户路由
    router.use('/users', this.createUserRouter());
    
    // 角色路由
    router.use('/roles', this.createRoleRouter());
    
    // 认证路由
    router.use('/auth', this.createAuthRouter());

    return router;
  }

  /**
   * 创建用户路由器
   */
  createUserRouter() {
    const router = express.Router();

    // 获取用户列表
    router.get('/', async (req, res) => {
      try {
        const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = req.query;
        
        const users = Array.from(this.users.values());
        const sortedUsers = _.orderBy(users, [sortBy], [sortOrder]);
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

        res.json({
          success: true,
          data: {
            items: paginatedUsers,
            total: users.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(users.length / limit)
          }
        });
      } catch (error) {
        this.handleError(res, error, 'Failed to fetch users');
      }
    });

    // 获取单个用户
    router.get('/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const user = this.users.get(id);

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        res.json({
          success: true,
          data: user
        });
      } catch (error) {
        this.handleError(res, error, 'Failed to fetch user');
      }
    });

    // 创建用户
    router.post('/', async (req, res) => {
      try {
        const userData = req.body;
        
        // 验证用户数据
        const validation = this.validateUserData(userData);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: validation.errors
          });
        }

        const user = {
          id: uuidv4(),
          ...userData,
          roles: userData.roles || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.users.set(user.id, user);

        res.status(201).json({
          success: true,
          data: user,
          message: 'User created successfully'
        });
      } catch (error) {
        this.handleError(res, error, 'Failed to create user');
      }
    });

    // 批量创建用户
    router.post('/batch', async (req, res) => {
      try {
        const usersData = req.body;
        
        if (!Array.isArray(usersData)) {
          return res.status(400).json({
            success: false,
            error: 'Expected an array of users'
          });
        }

        const createdUsers = [];
        const errors = [];

        for (const userData of usersData) {
          const validation = this.validateUserData(userData);
          if (validation.isValid) {
            const user = {
              id: uuidv4(),
              ...userData,
              roles: userData.roles || [],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            this.users.set(user.id, user);
            createdUsers.push(user);
          } else {
            errors.push({
              userData,
              errors: validation.errors
            });
          }
        }

        res.status(201).json({
          success: true,
          data: createdUsers,
          message: `Created ${createdUsers.length} users`,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (error) {
        this.handleError(res, error, 'Failed to batch create users');
      }
    });

    // 更新用户
    router.put('/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        const user = this.users.get(id);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // 验证更新数据
        const validation = this.validateUserData(updateData, true);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: validation.errors
          });
        }

        const updatedUser = {
          ...user,
          ...updateData,
          updatedAt: new Date()
        };

        this.users.set(id, updatedUser);

        res.json({
          success: true,
          data: updatedUser,
          message: 'User updated successfully'
        });
      } catch (error) {
        this.handleError(res, error, 'Failed to update user');
      }
    });

    // 删除用户
    router.delete('/:id', async (req, res) => {
      try {
        const { id } = req.params;

        if (!this.users.has(id)) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        this.users.delete(id);

        res.json({
          success: true,
          message: 'User deleted successfully'
        });
      } catch (error) {
        this.handleError(res, error, 'Failed to delete user');
      }
    });

    // 搜索用户
    router.get('/search', async (req, res) => {
      try {
        const { q, page = 1, limit = 10 } = req.query;
        
        if (!q) {
          return res.status(400).json({
            success: false,
            error: 'Search query is required'
          });
        }

        const users = Array.from(this.users.values());
        const filteredUsers = users.filter(user => 
          user.name.toLowerCase().includes(q.toLowerCase()) ||
          user.email.toLowerCase().includes(q.toLowerCase())
        );

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        res.json({
          success: true,
          data: {
            items: paginatedUsers,
            total: filteredUsers.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filteredUsers.length / limit)
          }
        });
      } catch (error) {
        this.handleError(res, error, 'Failed to search users');
      }
    });

    // 用户统计
    router.get('/statistics', async (req, res) => {
      try {
        const users = Array.from(this.users.values());
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const statistics = {
          totalUsers: users.length,
          activeUsers: users.filter(u => new Date(u.createdAt) > thirtyDaysAgo).length,
          averageAge: users.length > 0 ? _.meanBy(users.filter(u => u.age), 'age') : 0,
          roleDistribution: _.countBy(users.flatMap(u => u.roles), 'name')
        };

        res.json({
          success: true,
          data: statistics
        });
      } catch (error) {
        this.handleError(res, error, 'Failed to get user statistics');
      }
    });

    return router;
  }

  /**
   * 创建角色路由器
   */
  createRoleRouter() {
    const router = express.Router();

    // 获取角色列表
    router.get('/', (req, res) => {
      const roles = Array.from(this.roles.values());
      res.json({
        success: true,
        data: roles
      });
    });

    // 创建角色
    router.post('/', (req, res) => {
      const roleData = req.body;
      const role = {
        id: uuidv4(),
        ...roleData,
        permissions: roleData.permissions || [],
        createdAt: new Date()
      };

      this.roles.set(role.id, role);

      res.status(201).json({
        success: true,
        data: role
      });
    });

    return router;
  }

  /**
   * 创建认证路由器
   */
  createAuthRouter() {
    const router = express.Router();

    // 登录
    router.post('/login', async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({
            success: false,
            error: 'Email and password are required'
          });
        }

        // 查找用户（简单演示）
        const user = Array.from(this.users.values()).find(u => u.email === email);
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
          });
        }

        // 创建会话
        const session = {
          id: uuidv4(),
          userId: user.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时
        };

        this.sessions.set(session.id, session);

        res.json({
          success: true,
          data: {
            token: session.id,
            user: _.omit(user, ['password']),
            expiresAt: session.expiresAt
          }
        });
      } catch (error) {
        this.handleError(res, error, 'Login failed');
      }
    });

    // 登出
    router.post('/logout', (req, res) => {
      const { token } = req.body;
      
      if (token) {
        this.sessions.delete(token);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });

    return router;
  }

  /**
   * 错误处理
   */
  setupErrorHandling() {
    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl
      });
    });

    // 全局错误处理
    this.app.use((error, req, res, next) => {
      console.error(`[${req.id}] Unhandled error:`, error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: config.app.env === 'development' ? error.message : 'Something went wrong',
        requestId: req.id
      });
    });
  }

  /**
   * 初始化测试数据
   */
  initializeTestData() {
    // 创建测试角色
    const adminRole = {
      id: uuidv4(),
      name: 'admin',
      permissions: [
        { id: uuidv4(), action: 'read', resource: '*' },
        { id: uuidv4(), action: 'write', resource: '*' },
        { id: uuidv4(), action: 'delete', resource: '*' }
      ],
      createdAt: new Date()
    };

    const userRole = {
      id: uuidv4(),
      name: 'user',
      permissions: [
        { id: uuidv4(), action: 'read', resource: 'user' },
        { id: uuidv4(), action: 'write', resource: 'user' }
      ],
      createdAt: new Date()
    };

    this.roles.set(adminRole.id, adminRole);
    this.roles.set(userRole.id, userRole);

    // 创建测试用户
    const testUsers = [
      {
        name: '张三',
        email: 'zhangsan@example.com',
        age: 30,
        roles: [adminRole]
      },
      {
        name: '李四',
        email: 'lisi@example.com',
        age: 25,
        roles: [userRole]
      },
      {
        name: '王五',
        email: 'wangwu@example.com',
        age: 28,
        roles: [userRole]
      }
    ];

    testUsers.forEach(userData => {
      const user = {
        id: uuidv4(),
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.users.set(user.id, user);
    });

    console.log(`Initialized ${this.users.size} test users and ${this.roles.size} test roles`);
  }

  /**
   * 验证用户数据
   */
  validateUserData(userData, isUpdate = false) {
    const errors = [];

    if (!isUpdate && !userData.name) {
      errors.push('Name is required');
    } else if (userData.name && userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (!isUpdate && !userData.email) {
      errors.push('Email is required');
    } else if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Invalid email format');
    }

    if (userData.age !== undefined && (typeof userData.age !== 'number' || userData.age < 0 || userData.age > 120)) {
      errors.push('Age must be a number between 0 and 120');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 错误处理助手
   */
  handleError(res, error, message) {
    console.error(`${message}:`, error);
    
    res.status(500).json({
      success: false,
      error: message,
      details: config.app.env === 'development' ? error.message : undefined
    });
  }

  /**
   * 启动服务器
   */
  async start() {
    try {
      // 连接数据库（如果需要）
      if (config.database.host !== 'localhost') {
        await dbManager.initialize();
        console.log('Database connected');
      }

      // 启动HTTP服务器
      this.server = this.app.listen(config.app.port, () => {
        this.isRunning = true;
        console.log(`Server running on port ${config.app.port}`);
        console.log(`Environment: ${config.app.env}`);
        console.log(`API Base URL: http://localhost:${config.app.port}/api/v1`);
      });

      // 优雅关闭处理
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * 停止服务器
   */
  async stop() {
    if (this.server && this.isRunning) {
      console.log('Shutting down server...');
      
      this.server.close(async () => {
        this.isRunning = false;
        
        // 断开数据库连接
        if (dbManager.isConnected) {
          await dbManager.close();
        }
        
        console.log('Server stopped');
        process.exit(0);
      });
    }
  }

  /**
   * 获取应用实例
   */
  getApp() {
    return this.app;
  }

  /**
   * 获取服务器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: config.app.port,
      environment: config.app.env,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      users: this.users.size,
      roles: this.roles.size,
      sessions: this.sessions.size
    };
  }
}

// 创建和导出应用实例
const app = new ExpressApp();

// 如果直接运行此文件则启动服务器
if (require.main === module) {
  app.start().catch(console.error);
}

module.exports = {
  ExpressApp,
  app,
  
  // 便捷方法
  start: () => app.start(),
  stop: () => app.stop(),
  getApp: () => app.getApp(),
  getStatus: () => app.getStatus()
};