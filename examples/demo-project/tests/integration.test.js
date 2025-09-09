/**
 * JavaScript 测试文件
 * 演示 ES6 类、模块导入和异步操作
 */

const _ = require('lodash');
const axios = require('axios');

// 导入自定义模块
const { DatabaseManager, createQueryBuilder } = require('../src/utils/database');
const config = require('../config/app');

/**
 * 测试数据管理类
 */
class TestDataManager {
  constructor() {
    this.testUsers = [];
    this.testRoles = [];
    this.dbManager = new DatabaseManager();
  }

  /**
   * 生成测试用户数据
   */
  generateTestUsers(count = 100) {
    const firstNames = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴'];
    const lastNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋'];
    const domains = ['example.com', 'test.com', 'demo.com'];

    this.testUsers = Array.from({ length: count }, (_, index) => {
      const firstName = _.sample(firstNames);
      const lastName = _.sample(lastNames);
      const name = firstName + lastName;
      const email = `${name.toLowerCase()}${index + 1}@${_.sample(domains)}`;
      
      return {
        id: this.generateId(),
        name,
        email,
        age: _.random(18, 65),
        department: _.sample(['开发部', '产品部', '设计部', '运营部', '市场部']),
        salary: _.random(5000, 50000),
        createdAt: this.randomDate(new Date(2020, 0, 1), new Date()),
        status: _.sample(['active', 'inactive', 'pending'])
      };
    });

    console.log(`Generated ${this.testUsers.length} test users`);
    return this.testUsers;
  }

  /**
   * 生成测试角色数据
   */
  generateTestRoles() {
    const roles = [
      {
        name: 'super_admin',
        displayName: '超级管理员',
        permissions: ['*']
      },
      {
        name: 'admin',
        displayName: '管理员',
        permissions: ['user:*', 'role:read', 'report:*']
      },
      {
        name: 'manager',
        displayName: '经理',
        permissions: ['user:read', 'user:update', 'report:read']
      },
      {
        name: 'employee',
        displayName: '员工',
        permissions: ['user:read', 'profile:update']
      }
    ];

    this.testRoles = roles.map(role => ({
      id: this.generateId(),
      ...role,
      userCount: _.random(0, 50),
      createdAt: this.randomDate(new Date(2020, 0, 1), new Date())
    }));

    console.log(`Generated ${this.testRoles.length} test roles`);
    return this.testRoles;
  }

  /**
   * 批量创建用户
   */
  async batchCreateUsers(users = null) {
    const usersToCreate = users || this.testUsers;
    
    if (usersToCreate.length === 0) {
      throw new Error('No users to create');
    }

    try {
      // 分批处理，每批20个
      const batches = _.chunk(usersToCreate, 20);
      const results = [];

      for (const batch of batches) {
        console.log(`Creating batch of ${batch.length} users...`);
        
        const response = await axios.post('http://localhost:3000/api/v1/users/batch', batch, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          results.push(...response.data.data);
          console.log(`✓ Created ${response.data.data.length} users`);
        } else {
          console.error('✗ Batch creation failed:', response.data.error);
        }

        // 延迟避免请求过快
        await this.delay(500);
      }

      console.log(`Total created: ${results.length} users`);
      return results;

    } catch (error) {
      console.error('Batch creation error:', error.message);
      throw error;
    }
  }

  /**
   * 测试用户查询性能
   */
  async performanceTest() {
    console.log('Starting performance test...');
    
    const testCases = [
      {
        name: 'Single User Query',
        test: async () => {
          const response = await axios.get(`http://localhost:3000/api/v1/users/${this.testUsers[0]?.id}`);
          return response.data.success;
        }
      },
      {
        name: 'User List Query',
        test: async () => {
          const response = await axios.get('http://localhost:3000/api/v1/users?limit=50');
          return response.data.success && response.data.data.items.length > 0;
        }
      },
      {
        name: 'User Search',
        test: async () => {
          const response = await axios.get('http://localhost:3000/api/v1/users/search?q=张');
          return response.data.success;
        }
      },
      {
        name: 'User Statistics',
        test: async () => {
          const response = await axios.get('http://localhost:3000/api/v1/users/statistics');
          return response.data.success;
        }
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      const start = Date.now();
      let success = false;
      let error = null;

      try {
        success = await testCase.test();
      } catch (e) {
        error = e.message;
      }

      const duration = Date.now() - start;
      
      results.push({
        name: testCase.name,
        success,
        duration,
        error
      });

      console.log(`${testCase.name}: ${success ? '✓' : '✗'} (${duration}ms)`);
      
      if (error) {
        console.log(`  Error: ${error}`);
      }
    }

    return results;
  }

  /**
   * 数据分析和报告
   */
  analyzeTestData() {
    if (this.testUsers.length === 0) {
      console.log('No test data to analyze');
      return null;
    }

    const analysis = {
      userStats: {
        total: this.testUsers.length,
        byDepartment: _.countBy(this.testUsers, 'department'),
        byStatus: _.countBy(this.testUsers, 'status'),
        averageAge: _.meanBy(this.testUsers, 'age'),
        averageSalary: _.meanBy(this.testUsers, 'salary'),
        ageDistribution: this.getAgeDistribution(),
        salaryRanges: this.getSalaryRanges()
      },
      roleStats: {
        total: this.testRoles.length,
        totalUsers: _.sumBy(this.testRoles, 'userCount'),
        averageUsersPerRole: _.meanBy(this.testRoles, 'userCount')
      }
    };

    console.log('\n📊 Test Data Analysis:');
    console.log('='.repeat(40));
    console.log(`Total Users: ${analysis.userStats.total}`);
    console.log(`Average Age: ${Math.round(analysis.userStats.averageAge)}`);
    console.log(`Average Salary: ¥${Math.round(analysis.userStats.averageSalary)}`);
    console.log('\nDepartment Distribution:');
    Object.entries(analysis.userStats.byDepartment).forEach(([dept, count]) => {
      console.log(`  ${dept}: ${count}`);
    });
    console.log('\nStatus Distribution:');
    Object.entries(analysis.userStats.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    return analysis;
  }

  /**
   * 获取年龄分布
   */
  getAgeDistribution() {
    const ageRanges = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0
    };

    this.testUsers.forEach(user => {
      const age = user.age;
      if (age >= 18 && age <= 25) ageRanges['18-25']++;
      else if (age >= 26 && age <= 35) ageRanges['26-35']++;
      else if (age >= 36 && age <= 45) ageRanges['36-45']++;
      else if (age >= 46 && age <= 55) ageRanges['46-55']++;
      else if (age >= 56 && age <= 65) ageRanges['56-65']++;
    });

    return ageRanges;
  }

  /**
   * 获取薪资范围分布
   */
  getSalaryRanges() {
    const salaryRanges = {
      '5k-10k': 0,
      '10k-20k': 0,
      '20k-30k': 0,
      '30k-40k': 0,
      '40k+': 0
    };

    this.testUsers.forEach(user => {
      const salary = user.salary;
      if (salary < 10000) salaryRanges['5k-10k']++;
      else if (salary < 20000) salaryRanges['10k-20k']++;
      else if (salary < 30000) salaryRanges['20k-30k']++;
      else if (salary < 40000) salaryRanges['30k-40k']++;
      else salaryRanges['40k+']++;
    });

    return salaryRanges;
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData() {
    console.log('Cleaning up test data...');
    
    try {
      // 获取所有用户
      const response = await axios.get('http://localhost:3000/api/v1/users?limit=1000');
      
      if (response.data.success) {
        const users = response.data.data.items;
        console.log(`Found ${users.length} users to delete`);

        // 批量删除
        for (const user of users) {
          try {
            await axios.delete(`http://localhost:3000/api/v1/users/${user.id}`);
          } catch (error) {
            console.warn(`Failed to delete user ${user.id}:`, error.message);
          }
        }

        console.log('✓ Test data cleanup completed');
      }
      
    } catch (error) {
      console.error('Cleanup error:', error.message);
      throw error;
    }
  }

  /**
   * 生成随机日期
   */
  randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  /**
   * 生成ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 导出测试数据
   */
  exportTestData(format = 'json') {
    const data = {
      users: this.testUsers,
      roles: this.testRoles,
      exportDate: new Date().toISOString()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        // 简化的CSV导出
        const csvHeaders = 'id,name,email,age,department,salary,status\n';
        const csvRows = this.testUsers.map(user => 
          `${user.id},${user.name},${user.email},${user.age},${user.department},${user.salary},${user.status}`
        ).join('\n');
        return csvHeaders + csvRows;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

/**
 * 测试运行器
 */
class TestRunner {
  constructor() {
    this.dataManager = new TestDataManager();
    this.results = [];
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 Starting comprehensive tests...\n');

    const tests = [
      { name: 'Generate Test Data', method: 'testDataGeneration' },
      { name: 'API Integration Test', method: 'testApiIntegration' },
      { name: 'Performance Test', method: 'testPerformance' },
      { name: 'Data Analysis', method: 'testDataAnalysis' }
    ];

    for (const test of tests) {
      console.log(`\n📋 Running: ${test.name}`);
      console.log('-'.repeat(40));
      
      try {
        const start = Date.now();
        await this[test.method]();
        const duration = Date.now() - start;
        
        this.results.push({
          name: test.name,
          success: true,
          duration,
          error: null
        });
        
        console.log(`✅ ${test.name} completed (${duration}ms)`);
        
      } catch (error) {
        this.results.push({
          name: test.name,
          success: false,
          duration: 0,
          error: error.message
        });
        
        console.error(`❌ ${test.name} failed:`, error.message);
      }
    }

    this.displayResults();
  }

  /**
   * 测试数据生成
   */
  async testDataGeneration() {
    this.dataManager.generateTestUsers(50);
    this.dataManager.generateTestRoles();
    console.log('Test data generation completed');
  }

  /**
   * 测试API集成
   */
  async testApiIntegration() {
    // 检查服务器是否运行
    try {
      await axios.get('http://localhost:3000/health');
      console.log('✓ Server is running');
    } catch (error) {
      throw new Error('Server is not accessible. Please start the server first.');
    }

    // 测试批量创建用户
    await this.dataManager.batchCreateUsers(this.dataManager.testUsers.slice(0, 10));
    console.log('✓ Batch user creation completed');
  }

  /**
   * 测试性能
   */
  async testPerformance() {
    const results = await this.dataManager.performanceTest();
    const failedTests = results.filter(r => !r.success);
    
    if (failedTests.length > 0) {
      throw new Error(`${failedTests.length} performance tests failed`);
    }
    
    console.log('✓ All performance tests passed');
  }

  /**
   * 测试数据分析
   */
  async testDataAnalysis() {
    const analysis = this.dataManager.analyzeTestData();
    
    if (!analysis) {
      throw new Error('No data to analyze');
    }
    
    console.log('✓ Data analysis completed');
  }

  /**
   * 显示测试结果
   */
  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Test Results Summary');
    console.log('='.repeat(60));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Success Rate: ${Math.round(passedTests / totalTests * 100)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  • ${result.name}: ${result.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const runner = new TestRunner();
  
  runner.runAllTests()
    .then(() => {
      console.log('\n🎉 All tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

// 导出类和函数
module.exports = {
  TestDataManager,
  TestRunner
};