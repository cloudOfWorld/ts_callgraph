/**
 * JavaScript测试文件
 * 包含各种JavaScript特有的语法和模式
 */

// CommonJS导出
const express = require('express');
const { EventEmitter } = require('events');

// ES6类
class UserService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.users = new Map();
  }

  async createUser(userData) {
    const user = {
      id: Date.now(),
      ...userData,
      createdAt: new Date()
    };
    
    this.users.set(user.id, user);
    this.emit('userCreated', user);
    return user;
  }

  findUser(id) {
    return this.users.get(id);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }
}

// 函数表达式
const validateUser = function(user) {
  return user && user.name && user.email;
};

// 箭头函数
const hashPassword = (password) => {
  // 简化的密码哈希
  return Buffer.from(password).toString('base64');
};

// 对象字面量模式
const userController = {
  async login(req, res) {
    const { email, password } = req.body;
    const hashedPassword = hashPassword(password);
    
    // 查找用户逻辑
    res.json({ success: true });
  },

  async register(req, res) {
    const userData = req.body;
    
    if (!validateUser(userData)) {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    const userService = new UserService({});
    const user = await userService.createUser(userData);
    
    res.json({ user });
  },

  logout(req, res) {
    // 登出逻辑
    res.json({ message: 'Logged out' });
  }
};

// 工厂函数模式
function createApiRouter() {
  const router = express.Router();
  
  router.post('/login', userController.login);
  router.post('/register', userController.register);
  router.post('/logout', userController.logout);
  
  return router;
}

// 模块模式
const DatabaseManager = (function() {
  let instance;
  
  function createInstance() {
    return {
      connect() {
        console.log('Database connected');
      },
      
      disconnect() {
        console.log('Database disconnected');
      }
    };
  }
  
  return {
    getInstance() {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    }
  };
})();

// CommonJS导出
module.exports = {
  UserService,
  userController,
  createApiRouter,
  DatabaseManager,
  validateUser,
  hashPassword
};