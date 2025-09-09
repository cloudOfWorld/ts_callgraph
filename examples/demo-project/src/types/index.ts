/**
 * 用户相关类型定义
 */
export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  roles: Role[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  action: string;
  resource: string;
}

/**
 * API响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

/**
 * 分页类型
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 配置类型
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  database: DatabaseConfig;
  jwtSecret: string;
  corsOrigins: string[];
}

/**
 * 事件类型
 */
export type UserEvent = 
  | { type: 'USER_CREATED'; payload: User }
  | { type: 'USER_UPDATED'; payload: { id: string; changes: Partial<User> } }
  | { type: 'USER_DELETED'; payload: { id: string } };

/**
 * 工具类型
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;