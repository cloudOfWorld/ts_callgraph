/**
 * 用户服务类 (TypeScript)
 * 演示类继承、接口实现、泛型使用和路径别名
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import _ from 'lodash';

import { 
  User, 
  Role, 
  Permission, 
  ApiResponse, 
  PaginationParams, 
  PaginatedResult,
  UserEvent,
  Optional
} from '@types/index';
import { 
  StringUtils, 
  DateUtils, 
  ValidationUtils, 
  ResponseUtils,
  AsyncUtils,
  ObjectUtils,
  ArrayUtils
} from '@utils/helpers';

/**
 * 基础服务接口
 */
export interface IBaseService<T> {
  findById(id: string): Promise<T | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResult<T>>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * 用户服务接口
 */
export interface IUserService extends IBaseService<User> {
  findByEmail(email: string): Promise<User | null>;
  findByRole(roleId: string): Promise<User[]>;
  assignRole(userId: string, roleId: string): Promise<boolean>;
  removeRole(userId: string, roleId: string): Promise<boolean>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean>;
}

/**
 * 基础服务类
 */
export abstract class BaseService<T> extends EventEmitter implements IBaseService<T> {
  protected httpClient: AxiosInstance;
  protected baseUrl: string;
  protected resourceName: string;

  constructor(baseUrl: string, resourceName: string) {
    super();
    this.baseUrl = baseUrl;
    this.resourceName = resourceName;
    
    // 创建HTTP客户端
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * 设置请求拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.httpClient.interceptors.request.use(
      (config) => {
        console.log(`[${this.resourceName}] Making request:`, config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error(`[${this.resourceName}] Request error:`, error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`[${this.resourceName}] Response received:`, response.status, response.data);
        return response;
      },
      async (error) => {
        console.error(`[${this.resourceName}] Response error:`, error.response?.status, error.message);
        
        // 自动重试逻辑
        if (error.response?.status >= 500 && error.config && !error.config.__retried) {
          error.config.__retried = true;
          await AsyncUtils.delay(1000);
          return this.httpClient.request(error.config);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取资源URL
   */
  protected getResourceUrl(path: string = ''): string {
    return `/${this.resourceName}${path}`;
  }

  /**
   * 处理API响应
   */
  protected handleResponse<R>(response: any): ApiResponse<R> {
    if (response.data && typeof response.data === 'object') {
      return response.data as ApiResponse<R>;
    }
    
    return ResponseUtils.success(response.data);
  }

  /**
   * 处理API错误
   */
  protected handleError(error: any): never {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    const statusCode = error.response?.status || 500;
    
    this.emit('error', { message, statusCode, originalError: error });
    
    throw new Error(`${this.resourceName} service error: ${message} (${statusCode})`);
  }

  /**
   * 抽象方法，子类必须实现
   */
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(params?: PaginationParams): Promise<PaginatedResult<T>>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
}

/**
 * 角色服务类
 */
export class RoleService extends BaseService<Role> {
  constructor(baseUrl: string = '/api/v1') {
    super(baseUrl, 'roles');
  }

  async findById(id: string): Promise<Role | null> {
    try {
      if (!StringUtils.isValidId(id)) {
        throw new Error('Invalid role ID format');
      }

      const response = await this.httpClient.get(this.getResourceUrl(`/${id}`));
      const result = this.handleResponse<Role>(response);
      
      return result.success ? result.data || null : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll(params: PaginationParams = { page: 1, limit: 10 }): Promise<PaginatedResult<Role>> {
    try {
      const response = await this.httpClient.get(this.getResourceUrl(), { params });
      const result = this.handleResponse<PaginatedResult<Role>>(response);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to fetch roles');
      }
      
      return result.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(data: Partial<Role>): Promise<Role> {
    try {
      const roleData = {
        id: StringUtils.generateId(),
        ...data,
        permissions: data.permissions || []
      };

      const response = await this.httpClient.post(this.getResourceUrl(), roleData);
      const result = this.handleResponse<Role>(response);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to create role');
      }
      
      this.emit('roleCreated', result.data);
      return result.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: Partial<Role>): Promise<Role> {
    try {
      const response = await this.httpClient.put(this.getResourceUrl(`/${id}`), data);
      const result = this.handleResponse<Role>(response);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to update role');
      }
      
      this.emit('roleUpdated', { id, data: result.data });
      return result.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.httpClient.delete(this.getResourceUrl(`/${id}`));
      this.emit('roleDeleted', { id });
      return true;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 为角色添加权限
   */
  async addPermission(roleId: string, permissionId: string): Promise<boolean> {
    try {
      await this.httpClient.post(this.getResourceUrl(`/${roleId}/permissions/${permissionId}`));
      this.emit('permissionAdded', { roleId, permissionId });
      return true;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 从角色移除权限
   */
  async removePermission(roleId: string, permissionId: string): Promise<boolean> {
    try {
      await this.httpClient.delete(this.getResourceUrl(`/${roleId}/permissions/${permissionId}`));
      this.emit('permissionRemoved', { roleId, permissionId });
      return true;
    } catch (error) {
      this.handleError(error);
    }
  }
}

/**
 * 用户服务类
 */
export class UserService extends BaseService<User> implements IUserService {
  private roleService: RoleService;
  private userCache: Map<string, { user: User; timestamp: number }>;
  private cacheTimeout: number = 5 * 60 * 1000; // 5分钟缓存

  constructor(baseUrl: string = '/api/v1') {
    super(baseUrl, 'users');
    this.roleService = new RoleService(baseUrl);
    this.userCache = new Map();
    
    // 设置缓存清理定时器
    this.setupCacheCleanup();
  }

  /**
   * 设置缓存清理定时器
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.userCache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.userCache.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 从缓存获取用户
   */
  private getCachedUser(id: string): User | null {
    const cached = this.userCache.get(id);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.user;
    }
    return null;
  }

  /**
   * 缓存用户
   */
  private cacheUser(user: User): void {
    this.userCache.set(user.id, {
      user: ObjectUtils.deepClone(user),
      timestamp: Date.now()
    });
  }

  async findById(id: string): Promise<User | null> {
    try {
      // 先从缓存获取
      const cachedUser = this.getCachedUser(id);
      if (cachedUser) {
        return cachedUser;
      }

      if (!StringUtils.isValidId(id)) {
        throw new Error('Invalid user ID format');
      }

      const response = await this.httpClient.get(this.getResourceUrl(`/${id}`));
      const result = this.handleResponse<User>(response);
      
      if (result.success && result.data) {
        this.cacheUser(result.data);
        return result.data;
      }
      
      return null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      if (!ValidationUtils.isEmail(email)) {
        throw new Error('Invalid email format');
      }

      const response = await this.httpClient.get(this.getResourceUrl('/search'), {
        params: { email }
      });
      const result = this.handleResponse<User>(response);
      
      if (result.success && result.data) {
        this.cacheUser(result.data);
        return result.data;
      }
      
      return null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll(params: PaginationParams = { page: 1, limit: 10 }): Promise<PaginatedResult<User>> {
    try {
      const response = await this.httpClient.get(this.getResourceUrl(), { params });
      const result = this.handleResponse<PaginatedResult<User>>(response);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to fetch users');
      }
      
      // 缓存用户
      result.data.items.forEach(user => this.cacheUser(user));
      
      return result.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(userData: Optional<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      // 验证用户数据
      const validation = ValidationUtils.validateUser(userData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const user: User = {
        id: StringUtils.generateId(),
        createdAt: new Date(),
        roles: [],
        ...userData
      } as User;

      const response = await this.httpClient.post(this.getResourceUrl(), user);
      const result = this.handleResponse<User>(response);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to create user');
      }
      
      this.cacheUser(result.data);
      this.emit('userCreated', result.data);
      
      return result.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      // 验证更新数据
      if (data.email && !ValidationUtils.isEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      const response = await this.httpClient.put(this.getResourceUrl(`/${id}`), updateData);
      const result = this.handleResponse<User>(response);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to update user');
      }
      
      // 更新缓存
      this.userCache.delete(id);
      this.cacheUser(result.data);
      
      this.emit('userUpdated', { id, data: result.data });
      return result.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.httpClient.delete(this.getResourceUrl(`/${id}`));
      
      // 清除缓存
      this.userCache.delete(id);
      
      this.emit('userDeleted', { id });
      return true;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByRole(roleId: string): Promise<User[]> {
    try {
      const response = await this.httpClient.get(this.getResourceUrl('/by-role'), {
        params: { roleId }
      });
      const result = this.handleResponse<User[]>(response);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to fetch users by role');
      }
      
      // 缓存用户
      result.data.forEach(user => this.cacheUser(user));
      
      return result.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async assignRole(userId: string, roleId: string): Promise<boolean> {
    try {
      await this.httpClient.post(this.getResourceUrl(`/${userId}/roles/${roleId}`));
      
      // 清除用户缓存
      this.userCache.delete(userId);
      
      this.emit('roleAssigned', { userId, roleId });
      return true;
    } catch (error) {
      this.handleError(error);
    }
  }

  async removeRole(userId: string, roleId: string): Promise<boolean> {
    try {
      await this.httpClient.delete(this.getResourceUrl(`/${userId}/roles/${roleId}`));
      
      // 清除用户缓存
      this.userCache.delete(userId);
      
      this.emit('roleRemoved', { userId, roleId });
      return true;
    } catch (error) {
      this.handleError(error);
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      if (!ValidationUtils.isStrongPassword(newPassword)) {
        throw new Error('New password does not meet strength requirements');
      }

      await this.httpClient.post(this.getResourceUrl(`/${userId}/change-password`), {
        oldPassword,
        newPassword
      });
      
      this.emit('passwordChanged', { userId });
      return true;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 批量创建用户
   */
  async batchCreate(users: Partial<User>[]): Promise<User[]> {
    try {
      const validUsers = [];
      const errors = [];

      for (const userData of users) {
        const validation = ValidationUtils.validateUser(userData);
        if (validation.isValid) {
          validUsers.push({
            id: StringUtils.generateId(),
            createdAt: new Date(),
            roles: [],
            ...userData
          });
        } else {
          errors.push(`User ${userData.email}: ${validation.errors.join(', ')}`);
        }
      }

      if (errors.length > 0) {
        console.warn('Some users failed validation:', errors);
      }

      const chunks = ArrayUtils.chunk(validUsers, 10); // 每批10个
      const results = [];

      for (const chunk of chunks) {
        const response = await this.httpClient.post(this.getResourceUrl('/batch'), chunk);
        const result = this.handleResponse<User[]>(response);
        
        if (result.success && result.data) {
          result.data.forEach(user => this.cacheUser(user));
          results.push(...result.data);
        }
      }

      this.emit('batchUserCreated', { count: results.length });
      return results;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 搜索用户
   */
  async search(query: string, params: PaginationParams = { page: 1, limit: 10 }): Promise<PaginatedResult<User>> {
    try {
      const response = await this.httpClient.get(this.getResourceUrl('/search'), {
        params: { ...params, q: query }
      });
      const result = this.handleResponse<PaginatedResult<User>>(response);
      
      if (!result.success || !result.data) {
        throw new Error('Search failed');
      }
      
      return result.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 获取用户统计信息
   */
  async getStatistics(): Promise<any> {
    try {
      const response = await this.httpClient.get(this.getResourceUrl('/statistics'));
      const result = this.handleResponse(response);
      
      return result.success ? result.data : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.userCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; timeout: number } {
    return {
      size: this.userCache.size,
      timeout: this.cacheTimeout
    };
  }
}

// 导出服务工厂函数
export function createUserService(baseUrl?: string): UserService {
  return new UserService(baseUrl);
}

export function createRoleService(baseUrl?: string): RoleService {
  return new RoleService(baseUrl);
}

// 导出默认实例
export const userService = new UserService();
export const roleService = new RoleService();