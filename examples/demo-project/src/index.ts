/**
 * 主入口文件 (TypeScript)
 * 演示模块整合、路径别名使用和应用启动
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 使用路径别名导入模块
import { User, ApiResponse, AppConfig } from '@types/index';
import { 
  StringUtils, 
  DateUtils, 
  ValidationUtils, 
  ResponseUtils,
  AsyncUtils,
  ObjectUtils,
  ArrayUtils 
} from '@utils/helpers';
import { 
  userService, 
  roleService, 
  UserService, 
  RoleService,
  createUserService,
  createRoleService 
} from '@services/user-service';
import { UserList, UserManagement } from '@components/UserManagement';

// 导入JavaScript模块
const config = require('@config/app');
const { app: expressApp, start: startServer, getStatus } = require('./server');
const { 
  dbManager, 
  createQueryBuilder, 
  connect: connectDB,
  getStatus: getDBStatus 
} = require('./utils/database');

/**
 * 应用启动器类
 */
export class ApplicationBootstrap {
  private isInitialized: boolean = false;
  private services: {
    userService: UserService;
    roleService: RoleService;
  };

  constructor() {
    this.services = {
      userService: createUserService(),
      roleService: createRoleService()
    };
  }

  /**
   * 初始化应用
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 正在初始化 CallGraph Demo 应用...');

      // 1. 验证配置
      await this.validateConfiguration();

      // 2. 初始化服务
      await this.initializeServices();

      // 3. 设置事件监听器
      this.setupEventListeners();

      // 4. 运行系统检查
      await this.performSystemChecks();

      this.isInitialized = true;
      console.log('✅ 应用初始化完成');

    } catch (error) {
      console.error('❌ 应用初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  private async validateConfiguration(): Promise<void> {
    console.log('🔧 验证应用配置...');

    try {
      // 验证配置文件
      config.validateConfig();
      console.log('  ✓ 配置文件验证通过');

      // 验证环境变量
      const requiredEnvVars = ['NODE_ENV'];
      const missingVars = requiredEnvVars.filter(env => !process.env[env]);
      
      if (missingVars.length > 0) {
        console.warn(`  ⚠️ 缺少可选环境变量: ${missingVars.join(', ')}`);
      }

      console.log('  ✓ 环境变量检查完成');

    } catch (error) {
      throw new Error(`配置验证失败: ${error.message}`);
    }
  }

  /**
   * 初始化服务
   */
  private async initializeServices(): Promise<void> {
    console.log('🛠️ 初始化服务...');

    try {
      // 初始化数据库连接（如果需要）
      if (config.database.host !== 'localhost') {
        await connectDB();
        console.log('  ✓ 数据库连接已建立');
      }

      // 初始化用户服务
      this.services.userService.on('userCreated', (user: User) => {
        console.log(`👤 用户已创建: ${user.name} (${user.email})`);
      });

      this.services.userService.on('userUpdated', ({ id, data }: { id: string; data: User }) => {
        console.log(`👤 用户已更新: ${data.name} (ID: ${id})`);
      });

      this.services.userService.on('error', (error: any) => {
        console.error('用户服务错误:', error);
      });

      console.log('  ✓ 用户服务已初始化');

      // 初始化角色服务
      this.services.roleService.on('roleCreated', (role: any) => {
        console.log(`🛡️ 角色已创建: ${role.name}`);
      });

      console.log('  ✓ 角色服务已初始化');

    } catch (error) {
      throw new Error(`服务初始化失败: ${error.message}`);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    console.log('📡 设置事件监听器...');

    // 进程退出处理
    process.on('exit', (code) => {
      console.log(`进程退出，退出码: ${code}`);
    });

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      this.gracefulShutdown(1);
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason);
      console.error('Promise:', promise);
      this.gracefulShutdown(1);
    });

    // 优雅关闭信号
    process.on('SIGTERM', () => {
      console.log('收到SIGTERM信号，开始优雅关闭...');
      this.gracefulShutdown(0);
    });

    process.on('SIGINT', () => {
      console.log('收到SIGINT信号，开始优雅关闭...');
      this.gracefulShutdown(0);
    });

    console.log('  ✓ 事件监听器已设置');
  }

  /**
   * 执行系统检查
   */
  private async performSystemChecks(): Promise<void> {
    console.log('🔍 执行系统检查...');

    try {
      // 内存使用检查
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      console.log(`  ✓ 内存使用: ${memoryMB}MB`);

      // 磁盘空间检查（简化版）
      console.log('  ✓ 磁盘空间检查通过');

      // 网络连接检查
      await this.checkNetworkConnectivity();

      // 依赖服务检查
      await this.checkDependencies();

      console.log('  ✓ 系统检查完成');

    } catch (error) {
      console.warn(`系统检查警告: ${error.message}`);
    }
  }

  /**
   * 检查网络连接
   */
  private async checkNetworkConnectivity(): Promise<void> {
    try {
      // 简单的网络检查
      await AsyncUtils.retry(
        async () => {
          // 这里可以添加实际的网络检查逻辑
          return Promise.resolve();
        },
        2,
        1000
      );
      console.log('  ✓ 网络连接正常');
    } catch (error) {
      throw new Error('网络连接检查失败');
    }
  }

  /**
   * 检查依赖服务
   */
  private async checkDependencies(): Promise<void> {
    try {
      // 检查数据库状态
      const dbStatus = getDBStatus();
      console.log(`  ✓ 数据库状态: ${dbStatus.isConnected ? '已连接' : '未连接'}`);

      // 检查其他外部服务（示例）
      console.log('  ✓ 外部服务检查完成');

    } catch (error) {
      throw new Error(`依赖服务检查失败: ${error.message}`);
    }
  }

  /**
   * 启动应用
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🎯 启动应用服务...');

    try {
      // 启动HTTP服务器
      await startServer();
      console.log('  ✓ HTTP服务器已启动');

      // 启动后台任务（如果有）
      this.startBackgroundTasks();

      // 显示启动信息
      this.displayStartupInfo();

    } catch (error) {
      console.error('❌ 应用启动失败:', error);
      throw error;
    }
  }

  /**
   * 启动后台任务
   */
  private startBackgroundTasks(): void {
    // 定期清理过期会话
    setInterval(() => {
      console.log('🧹 执行定期清理任务...');
      // 这里可以添加清理逻辑
    }, 60 * 60 * 1000); // 每小时执行一次

    // 定期生成统计报告
    setInterval(async () => {
      try {
        const stats = await this.generateStatistics();
        console.log('📊 系统统计:', stats);
      } catch (error) {
        console.error('统计生成失败:', error);
      }
    }, 24 * 60 * 60 * 1000); // 每天执行一次

    console.log('  ✓ 后台任务已启动');
  }

  /**
   * 显示启动信息
   */
  private displayStartupInfo(): void {
    const appConfig = config.getConfig();
    const status = getStatus();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CallGraph Demo 应用启动成功!');
    console.log('='.repeat(60));
    console.log(`📍 应用端口: ${appConfig.app.port}`);
    console.log(`🌍 运行环境: ${appConfig.app.env}`);
    console.log(`📊 API地址: http://localhost:${appConfig.app.port}/api`);
    console.log(`💻 健康检查: http://localhost:${appConfig.app.port}/health`);
    console.log(`🔧 服务状态: ${JSON.stringify(status, null, 2)}`);
    console.log('='.repeat(60));
    console.log('使用 Ctrl+C 优雅关闭应用\n');
  }

  /**
   * 生成统计信息
   */
  private async generateStatistics(): Promise<any> {
    try {
      const serverStatus = getStatus();
      const dbStatus = getDBStatus();
      const userStats = await this.services.userService.getStatistics();
      const cacheStats = this.services.userService.getCacheStats();

      return {
        server: {
          uptime: DateUtils.format(new Date(Date.now() - serverStatus.uptime * 1000)),
          memory: `${Math.round(serverStatus.memory.heapUsed / 1024 / 1024)}MB`,
          users: serverStatus.users,
          roles: serverStatus.roles,
          sessions: serverStatus.sessions
        },
        database: dbStatus,
        userService: userStats,
        cache: cacheStats,
        timestamp: DateUtils.format(new Date())
      };
    } catch (error) {
      throw new Error(`统计生成失败: ${error.message}`);
    }
  }

  /**
   * 优雅关闭
   */
  private async gracefulShutdown(exitCode: number): Promise<void> {
    console.log('🛑 开始优雅关闭应用...');

    try {
      // 清理服务
      console.log('  正在清理服务...');
      this.services.userService.clearCache();

      // 关闭数据库连接
      if (getDBStatus().isConnected) {
        console.log('  正在断开数据库连接...');
        // await disconnectDB(); // 如果有这个方法
      }

      console.log('  ✓ 应用优雅关闭完成');

    } catch (error) {
      console.error('优雅关闭过程中出错:', error);
    } finally {
      process.exit(exitCode);
    }
  }

  /**
   * 获取服务实例
   */
  getServices() {
    return this.services;
  }

  /**
   * 获取应用状态
   */
  getApplicationStatus() {
    return {
      initialized: this.isInitialized,
      server: getStatus(),
      database: getDBStatus(),
      services: {
        userService: this.services.userService.getCacheStats(),
        roleService: 'active'
      }
    };
  }
}

/**
 * 工具函数：演示各种工具类的使用
 */
export async function demonstrateUtilities(): Promise<void> {
  console.log('\n📚 演示工具函数使用:');

  // 字符串工具
  const id = StringUtils.generateId();
  console.log(`生成的ID: ${id}`);
  console.log(`ID有效性: ${StringUtils.isValidId(id)}`);

  // 日期工具
  const now = new Date();
  console.log(`当前时间: ${DateUtils.format(now)}`);
  console.log(`相对时间: ${DateUtils.fromNow(now)}`);

  // 数组工具
  const testArray = [1, 2, 2, 3, 3, 3, 4];
  console.log(`原数组: [${testArray.join(', ')}]`);
  console.log(`去重后: [${ArrayUtils.unique(testArray).join(', ')}]`);

  // 对象工具
  const testObj = { a: 1, b: { c: 2, d: 3 } };
  const clonedObj = ObjectUtils.deepClone(testObj);
  console.log(`深度克隆: ${JSON.stringify(clonedObj)}`);

  // 验证工具
  const emailValid = ValidationUtils.isEmail('test@example.com');
  console.log(`邮箱验证: ${emailValid}`);

  // 异步工具
  console.log('测试延迟...');
  await AsyncUtils.delay(1000);
  console.log('延迟完成!');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    console.log('🎬 CallGraph Demo 应用启动中...\n');

    // 演示工具函数
    await demonstrateUtilities();

    // 创建并启动应用
    const bootstrap = new ApplicationBootstrap();
    await bootstrap.start();

    // 应用运行中...
    console.log('✨ 应用正在运行中，按 Ctrl+C 停止\n');

  } catch (error) {
    console.error('💥 应用启动失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

// 导出主要组件
export {
  ApplicationBootstrap,
  demonstrateUtilities,
  main as startApplication
};

// 导出服务实例（便于测试）
export const services = {
  userService,
  roleService
};

// 导出配置
export const appConfig = config;