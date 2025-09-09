/**
 * 工具函数集合 (TypeScript)
 * 演示TypeScript语法、第三方库使用和路径别名
 */

import { v4 as uuidv4, validate as isValidUUID } from 'uuid';
import moment from 'moment';
import _ from 'lodash';
import { User, ApiResponse, PaginationParams, PaginatedResult } from '@types/index';

/**
 * 字符串工具类
 */
export class StringUtils {
  /**
   * 生成唯一ID
   */
  static generateId(): string {
    return uuidv4();
  }

  /**
   * 验证UUID格式
   */
  static isValidId(id: string): boolean {
    return isValidUUID(id);
  }

  /**
   * 转换为驼峰命名
   */
  static toCamelCase(str: string): string {
    return _.camelCase(str);
  }

  /**
   * 转换为蛇形命名
   */
  static toSnakeCase(str: string): string {
    return _.snakeCase(str);
  }

  /**
   * 截断字符串
   */
  static truncate(str: string, length: number = 50): string {
    return _.truncate(str, { length });
  }

  /**
   * 首字母大写
   */
  static capitalize(str: string): string {
    return _.capitalize(str);
  }
}

/**
 * 日期工具类
 */
export class DateUtils {
  /**
   * 格式化日期
   */
  static format(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    return moment(date).format(format);
  }

  /**
   * 获取相对时间
   */
  static fromNow(date: Date): string {
    return moment(date).fromNow();
  }

  /**
   * 检查是否为有效日期
   */
  static isValid(date: any): boolean {
    return moment(date).isValid();
  }

  /**
   * 添加时间
   */
  static add(date: Date, amount: number, unit: moment.unitOfTime.DurationConstructor): Date {
    return moment(date).add(amount, unit).toDate();
  }

  /**
   * 计算日期差
   */
  static diff(date1: Date, date2: Date, unit: moment.unitOfTime.Diff = 'days'): number {
    return moment(date1).diff(moment(date2), unit);
  }

  /**
   * 获取今天的开始和结束时间
   */
  static getTodayRange(): { start: Date; end: Date } {
    const today = moment().startOf('day');
    return {
      start: today.toDate(),
      end: today.clone().endOf('day').toDate()
    };
  }
}

/**
 * 对象工具类
 */
export class ObjectUtils {
  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    return _.cloneDeep(obj);
  }

  /**
   * 合并对象
   */
  static merge<T extends object>(...objects: Partial<T>[]): T {
    return _.merge({}, ...objects) as T;
  }

  /**
   * 选择对象属性
   */
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    return _.pick(obj, keys);
  }

  /**
   * 排除对象属性
   */
  static omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    return _.omit(obj, keys);
  }

  /**
   * 检查对象是否为空
   */
  static isEmpty(obj: any): boolean {
    return _.isEmpty(obj);
  }

  /**
   * 获取嵌套属性值
   */
  static get<T = any>(obj: object, path: string, defaultValue?: T): T {
    return _.get(obj, path, defaultValue);
  }

  /**
   * 设置嵌套属性值
   */
  static set<T extends object>(obj: T, path: string, value: any): T {
    return _.set(obj, path, value);
  }
}

/**
 * 数组工具类
 */
export class ArrayUtils {
  /**
   * 数组去重
   */
  static unique<T>(array: T[]): T[] {
    return _.uniq(array);
  }

  /**
   * 根据属性去重
   */
  static uniqueBy<T>(array: T[], iteratee: string | ((item: T) => any)): T[] {
    return _.uniqBy(array, iteratee);
  }

  /**
   * 数组分组
   */
  static groupBy<T>(array: T[], iteratee: string | ((item: T) => any)): Record<string, T[]> {
    return _.groupBy(array, iteratee);
  }

  /**
   * 数组排序
   */
  static sortBy<T>(array: T[], iteratees: string[] | ((item: T) => any)[]): T[] {
    return _.sortBy(array, iteratees);
  }

  /**
   * 数组分块
   */
  static chunk<T>(array: T[], size: number = 10): T[][] {
    return _.chunk(array, size);
  }

  /**
   * 数组扁平化
   */
  static flatten<T>(array: any[]): T[] {
    return _.flatten(array);
  }

  /**
   * 深度扁平化
   */
  static flattenDeep<T>(array: any[]): T[] {
    return _.flattenDeep(array);
  }
}

/**
 * 验证工具类
 */
export class ValidationUtils {
  /**
   * 验证邮箱格式
   */
  static isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式（中国）
   */
  static isPhoneNumber(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证密码强度
   */
  static isStrongPassword(password: string): boolean {
    // 至少8位，包含大小写字母、数字和特殊字符
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(password);
  }

  /**
   * 验证URL格式
   */
  static isURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证用户数据
   */
  static validateUser(userData: Partial<User>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('姓名至少需要2个字符');
    }

    if (!userData.email || !this.isEmail(userData.email)) {
      errors.push('邮箱格式不正确');
    }

    if (userData.age !== undefined && (userData.age < 0 || userData.age > 120)) {
      errors.push('年龄必须在0-120之间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * API响应工具类
 */
export class ResponseUtils {
  /**
   * 创建成功响应
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date()
    };
  }

  /**
   * 创建错误响应
   */
  static error(error: string, message?: string): ApiResponse {
    return {
      success: false,
      error,
      message,
      timestamp: new Date()
    };
  }

  /**
   * 创建分页响应
   */
  static paginated<T>(
    items: T[],
    total: number,
    params: PaginationParams
  ): ApiResponse<PaginatedResult<T>> {
    const totalPages = Math.ceil(total / params.limit);
    
    return this.success({
      items,
      total,
      page: params.page,
      limit: params.limit,
      totalPages
    });
  }
}

/**
 * 异步工具类
 */
export class AsyncUtils {
  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试执行
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) {
          break;
        }

        await this.delay(delayMs * (i + 1));
      }
    }

    throw lastError!;
  }

  /**
   * 并发控制
   */
  static async concurrent<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }
}