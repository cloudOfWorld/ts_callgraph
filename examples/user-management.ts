/**
 * 示例用户管理系统
 */

// 用户接口定义
export interface IUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive(): boolean;
}

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

// 抽象基类
export abstract class BaseEntity {
  protected id: number;
  protected createdAt: Date;
  
  constructor(id: number) {
    this.id = id;
    this.createdAt = new Date();
  }

  abstract validate(): boolean;
  
  public getId(): number {
    return this.id;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }
}

// 用户类实现
export class User extends BaseEntity implements IUser {
  public name: string;
  public email: string;
  public role: UserRole;
  private _isActive: boolean = true;

  constructor(id: number, name: string, email: string, role: UserRole = UserRole.USER) {
    super(id);
    this.name = name;
    this.email = email;
    this.role = role;
  }

  public isActive(): boolean {
    return this._isActive;
  }

  public setActive(active: boolean): void {
    this._isActive = active;
  }

  public validate(): boolean {
    return this.email.includes('@') && this.name.length > 0;
  }

  public updateProfile(name: string, email: string): void {
    if (this.validate()) {
      this.name = name;
      this.email = email;
    }
  }

  public static createAdmin(id: number, name: string, email: string): User {
    return new User(id, name, email, UserRole.ADMIN);
  }
}

// 用户管理器类
export class UserManager {
  private users: Map<number, User> = new Map();
  private static instance: UserManager;

  private constructor() {}

  public static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  public addUser(user: User): void {
    if (user.validate()) {
      this.users.set(user.getId(), user);
    }
  }

  public getUser(id: number): User | undefined {
    return this.users.get(id);
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public removeUser(id: number): boolean {
    return this.users.delete(id);
  }

  public findUsersByRole(role: UserRole): User[] {
    return this.getAllUsers().filter(user => user.role === role);
  }

  public activateUser(id: number): boolean {
    const user = this.getUser(id);
    if (user) {
      user.setActive(true);
      return true;
    }
    return false;
  }
}

// 工具函数
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatUserName(user: User): string {
  return `${user.name} (${user.role})`;
}

// 常量
export const DEFAULT_USER_ROLE = UserRole.USER;
export const MAX_USERS = 1000;