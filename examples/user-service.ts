/**
 * 用户服务层
 */

import { User, UserManager, UserRole, IUser, validateEmail } from './user-management';

export interface IUserService {
  createUser(name: string, email: string, role?: UserRole): Promise<User>;
  getUserById(id: number): Promise<User | null>;
  updateUser(id: number, data: Partial<IUser>): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
}

export class UserService implements IUserService {
  private userManager: UserManager;

  constructor() {
    this.userManager = UserManager.getInstance();
  }

  public async createUser(name: string, email: string, role: UserRole = UserRole.USER): Promise<User> {
    if (!validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    const id = this.generateUserId();
    const user = new User(id, name, email, role);
    
    this.userManager.addUser(user);
    
    return user;
  }

  public async getUserById(id: number): Promise<User | null> {
    const user = this.userManager.getUser(id);
    return user || null;
  }

  public async updateUser(id: number, data: Partial<IUser>): Promise<boolean> {
    const user = this.userManager.getUser(id);
    if (!user) {
      return false;
    }

    if (data.name !== undefined || data.email !== undefined) {
      user.updateProfile(
        data.name || user.name,
        data.email || user.email
      );
    }

    return true;
  }

  public async deleteUser(id: number): Promise<boolean> {
    return this.userManager.removeUser(id);
  }

  public async getAllActiveUsers(): Promise<User[]> {
    const allUsers = this.userManager.getAllUsers();
    return allUsers.filter(user => user.isActive());
  }

  public async getUsersByRole(role: UserRole): Promise<User[]> {
    return this.userManager.findUsersByRole(role);
  }

  private generateUserId(): number {
    return Math.floor(Math.random() * 10000) + 1;
  }
}

// 认证服务
export class AuthService {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public async login(email: string, password: string): Promise<User | null> {
    // 简化的登录逻辑
    const allUsers = await this.userService.getAllActiveUsers();
    const user = allUsers.find(u => u.email === email);
    
    if (user && this.verifyPassword(password)) {
      return user;
    }
    
    return null;
  }

  public async logout(userId: number): Promise<boolean> {
    const user = await this.userService.getUserById(userId);
    return user !== null;
  }

  private verifyPassword(password: string): boolean {
    // 简化的密码验证
    return password.length >= 6;
  }
}

// 用户控制器
export class UserController {
  private userService: UserService;
  private authService: AuthService;

  constructor() {
    this.userService = new UserService();
    this.authService = new AuthService(this.userService);
  }

  public async handleCreateUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      const user = await this.userService.createUser(
        request.name,
        request.email,
        request.role
      );

      return {
        success: true,
        user: this.mapUserToResponse(user)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async handleLogin(request: LoginRequest): Promise<LoginResponse> {
    const user = await this.authService.login(request.email, request.password);
    
    if (user) {
      return {
        success: true,
        token: this.generateToken(user),
        user: this.mapUserToResponse(user)
      };
    }

    return {
      success: false,
      error: 'Invalid credentials'
    };
  }

  private mapUserToResponse(user: User): UserResponse {
    return {
      id: user.getId(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive()
    };
  }

  private generateToken(user: User): string {
    return `token_${user.getId()}_${Date.now()}`;
  }
}

// 请求/响应类型
interface CreateUserRequest {
  name: string;
  email: string;
  role?: UserRole;
}

interface CreateUserResponse {
  success: boolean;
  user?: UserResponse;
  error?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: UserResponse;
  error?: string;
}

interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}