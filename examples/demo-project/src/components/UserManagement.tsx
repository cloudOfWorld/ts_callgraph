/**
 * React组件示例 (TypeScript)
 * 演示React组件、钩子使用和事件处理
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import _ from 'lodash';

import { User, PaginationParams, PaginatedResult } from '@types/index';
import { userService, UserService } from '@services/user-service';
import { StringUtils, DateUtils, ValidationUtils, ArrayUtils } from '@utils/helpers';

/**
 * 组件Props接口
 */
interface UserListProps {
  initialUsers?: User[];
  pageSize?: number;
  onUserSelect?: (user: User) => void;
  onUserCreate?: (user: User) => void;
  onUserUpdate?: (user: User) => void;
  onUserDelete?: (userId: string) => void;
  className?: string;
}

/**
 * 用户列表状态接口
 */
interface UserListState {
  users: User[];
  loading: boolean;
  error: string | null;
  pagination: PaginationParams;
  totalUsers: number;
  selectedUser: User | null;
  searchQuery: string;
  sortField: keyof User;
  sortOrder: 'asc' | 'desc';
}

/**
 * 用户表单Props接口
 */
interface UserFormProps {
  user?: User | null;
  onSubmit: (userData: Partial<User>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * 用户表单状态接口
 */
interface UserFormState {
  name: string;
  email: string;
  age: string;
  errors: Record<string, string>;
}

/**
 * 用户表单组件
 */
export const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formState, setFormState] = useState<UserFormState>({
    name: user?.name || '',
    email: user?.email || '',
    age: user?.age?.toString() || '',
    errors: {}
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // 聚焦到第一个输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 当用户prop改变时更新表单状态
  useEffect(() => {
    if (user) {
      setFormState({
        name: user.name || '',
        email: user.email || '',
        age: user.age?.toString() || '',
        errors: {}
      });
    }
  }, [user]);

  /**
   * 更新表单字段
   */
  const updateField = useCallback((field: keyof Omit<UserFormState, 'errors'>, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: '' // 清除字段错误
      }
    }));
  }, []);

  /**
   * 验证表单
   */
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formState.name.trim()) {
      errors.name = '姓名不能为空';
    } else if (formState.name.trim().length < 2) {
      errors.name = '姓名至少需要2个字符';
    }

    if (!formState.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!ValidationUtils.isEmail(formState.email)) {
      errors.email = '邮箱格式不正确';
    }

    if (formState.age && (isNaN(Number(formState.age)) || Number(formState.age) < 0 || Number(formState.age) > 120)) {
      errors.age = '年龄必须是0-120之间的数字';
    }

    setFormState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [formState]);

  /**
   * 提交表单
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const userData: Partial<User> = {
        name: formState.name.trim(),
        email: formState.email.trim(),
        age: formState.age ? Number(formState.age) : undefined
      };

      await onSubmit(userData);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormState(prev => ({
        ...prev,
        errors: { general: '提交失败，请重试' }
      }));
    }
  }, [formState, validateForm, onSubmit]);

  /**
   * 重置表单
   */
  const handleReset = useCallback(() => {
    setFormState({
      name: '',
      email: '',
      age: '',
      errors: {}
    });
  }, []);

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <div className="form-group">
        <label htmlFor="name">姓名 *</label>
        <input
          ref={inputRef}
          id="name"
          type="text"
          value={formState.name}
          onChange={(e) => updateField('name', e.target.value)}
          className={formState.errors.name ? 'error' : ''}
          disabled={loading}
          maxLength={50}
        />
        {formState.errors.name && (
          <span className="error-message">{formState.errors.name}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="email">邮箱 *</label>
        <input
          id="email"
          type="email"
          value={formState.email}
          onChange={(e) => updateField('email', e.target.value)}
          className={formState.errors.email ? 'error' : ''}
          disabled={loading}
          maxLength={100}
        />
        {formState.errors.email && (
          <span className="error-message">{formState.errors.email}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="age">年龄</label>
        <input
          id="age"
          type="number"
          value={formState.age}
          onChange={(e) => updateField('age', e.target.value)}
          className={formState.errors.age ? 'error' : ''}
          disabled={loading}
          min="0"
          max="120"
        />
        {formState.errors.age && (
          <span className="error-message">{formState.errors.age}</span>
        )}
      </div>

      {formState.errors.general && (
        <div className="error-message general-error">
          {formState.errors.general}
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? '提交中...' : (user ? '更新' : '创建')}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="btn btn-secondary"
        >
          重置
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-cancel"
        >
          取消
        </button>
      </div>
    </form>
  );
};

/**
 * 用户列表组件
 */
export const UserList: React.FC<UserListProps> = ({
  initialUsers = [],
  pageSize = 10,
  onUserSelect,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  className = ''
}) => {
  const [state, setState] = useState<UserListState>({
    users: initialUsers,
    loading: false,
    error: null,
    pagination: { page: 1, limit: pageSize },
    totalUsers: 0,
    selectedUser: null,
    searchQuery: '',
    sortField: 'name',
    sortOrder: 'asc'
  });

  const [showUserForm, setShowUserForm] = useState(false);
  const serviceRef = useRef<UserService>(userService);

  /**
   * 加载用户列表
   */
  const loadUsers = useCallback(async (params?: Partial<PaginationParams>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const paginationParams = { ...state.pagination, ...params };
      let result: PaginatedResult<User>;

      if (state.searchQuery.trim()) {
        result = await serviceRef.current.search(state.searchQuery, paginationParams);
      } else {
        result = await serviceRef.current.findAll(paginationParams);
      }

      setState(prev => ({
        ...prev,
        users: result.items,
        totalUsers: result.total,
        pagination: {
          page: result.page,
          limit: result.limit
        },
        loading: false
      }));
    } catch (error) {
      console.error('Failed to load users:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载用户失败'
      }));
    }
  }, [state.pagination, state.searchQuery]);

  /**
   * 防抖搜索
   */
  const debouncedSearch = useMemo(
    () => _.debounce((query: string) => {
      setState(prev => ({
        ...prev,
        searchQuery: query,
        pagination: { ...prev.pagination, page: 1 }
      }));
    }, 500),
    []
  );

  /**
   * 排序用户
   */
  const sortedUsers = useMemo(() => {
    return ArrayUtils.sortBy(state.users, [
      (user: User) => {
        const value = user[state.sortField];
        if (typeof value === 'string') {
          return state.sortOrder === 'asc' ? value.toLowerCase() : value.toLowerCase();
        }
        return value;
      }
    ]);
  }, [state.users, state.sortField, state.sortOrder]);

  /**
   * 初始加载
   */
  useEffect(() => {
    if (initialUsers.length === 0) {
      loadUsers();
    }
  }, [loadUsers, initialUsers.length]);

  /**
   * 搜索查询变化时重新加载
   */
  useEffect(() => {
    if (state.searchQuery !== '') {
      loadUsers({ page: 1 });
    }
  }, [state.searchQuery, loadUsers]);

  /**
   * 处理搜索
   */
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  }, [debouncedSearch]);

  /**
   * 处理排序
   */
  const handleSort = useCallback((field: keyof User) => {
    setState(prev => ({
      ...prev,
      sortField: field,
      sortOrder: prev.sortField === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  /**
   * 处理分页
   */
  const handlePageChange = useCallback((page: number) => {
    loadUsers({ page });
  }, [loadUsers]);

  /**
   * 处理用户选择
   */
  const handleUserSelect = useCallback((user: User) => {
    setState(prev => ({ ...prev, selectedUser: user }));
    onUserSelect?.(user);
  }, [onUserSelect]);

  /**
   * 处理用户创建
   */
  const handleUserCreate = useCallback(async (userData: Partial<User>) => {
    try {
      const newUser = await serviceRef.current.create(userData);
      onUserCreate?.(newUser);
      setShowUserForm(false);
      await loadUsers(); // 重新加载列表
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }, [onUserCreate, loadUsers]);

  /**
   * 处理用户更新
   */
  const handleUserUpdate = useCallback(async (userData: Partial<User>) => {
    if (!state.selectedUser) return;

    try {
      const updatedUser = await serviceRef.current.update(state.selectedUser.id, userData);
      onUserUpdate?.(updatedUser);
      setShowUserForm(false);
      setState(prev => ({ ...prev, selectedUser: null }));
      await loadUsers(); // 重新加载列表
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }, [state.selectedUser, onUserUpdate, loadUsers]);

  /**
   * 处理用户删除
   */
  const handleUserDelete = useCallback(async (userId: string) => {
    if (!window.confirm('确定要删除这个用户吗？')) {
      return;
    }

    try {
      await serviceRef.current.delete(userId);
      onUserDelete?.(userId);
      await loadUsers(); // 重新加载列表
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('删除用户失败');
    }
  }, [onUserDelete, loadUsers]);

  /**
   * 获取分页信息
   */
  const paginationInfo = useMemo(() => {
    const { page, limit } = state.pagination;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, state.totalUsers);
    const totalPages = Math.ceil(state.totalUsers / limit);

    return { start, end, totalPages };
  }, [state.pagination, state.totalUsers]);

  if (state.error) {
    return (
      <div className={`user-list error ${className}`}>
        <div className="error-message">
          错误: {state.error}
          <button onClick={() => loadUsers()} className="btn btn-sm">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`user-list ${className}`}>
      {/* 搜索和操作栏 */}
      <div className="list-header">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索用户..."
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="actions">
          <button
            onClick={() => setShowUserForm(true)}
            className="btn btn-primary"
          >
            添加用户
          </button>
          <button
            onClick={() => loadUsers()}
            disabled={state.loading}
            className="btn btn-secondary"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 用户表格 */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                姓名 {state.sortField === 'name' && (state.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('email')} className="sortable">
                邮箱 {state.sortField === 'email' && (state.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('age')} className="sortable">
                年龄 {state.sortField === 'age' && (state.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('createdAt')} className="sortable">
                创建时间 {state.sortField === 'createdAt' && (state.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {state.loading ? (
              <tr>
                <td colSpan={5} className="loading">
                  加载中...
                </td>
              </tr>
            ) : sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">
                  {state.searchQuery ? '没有找到匹配的用户' : '暂无用户数据'}
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={state.selectedUser?.id === user.id ? 'selected' : ''}
                >
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.age || '-'}</td>
                  <td>{DateUtils.format(user.createdAt, 'YYYY-MM-DD HH:mm')}</td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setState(prev => ({ ...prev, selectedUser: user }));
                        setShowUserForm(true);
                      }}
                      className="btn btn-sm btn-edit"
                    >
                      编辑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserDelete(user.id);
                      }}
                      className="btn btn-sm btn-danger"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="pagination">
        <div className="pagination-info">
          显示 {paginationInfo.start} - {paginationInfo.end} 条，共 {state.totalUsers} 条
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(state.pagination.page - 1)}
            disabled={state.pagination.page === 1 || state.loading}
            className="btn btn-sm"
          >
            上一页
          </button>
          <span className="page-info">
            第 {state.pagination.page} / {paginationInfo.totalPages} 页
          </span>
          <button
            onClick={() => handlePageChange(state.pagination.page + 1)}
            disabled={state.pagination.page >= paginationInfo.totalPages || state.loading}
            className="btn btn-sm"
          >
            下一页
          </button>
        </div>
      </div>

      {/* 用户表单对话框 */}
      {showUserForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{state.selectedUser ? '编辑用户' : '添加用户'}</h3>
            <UserForm
              user={state.selectedUser}
              onSubmit={state.selectedUser ? handleUserUpdate : handleUserCreate}
              onCancel={() => {
                setShowUserForm(false);
                setState(prev => ({ ...prev, selectedUser: null }));
              }}
              loading={state.loading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 用户管理主组件
 */
export const UserManagement: React.FC = () => {
  const [statistics, setStatistics] = useState<any>(null);

  /**
   * 加载统计数据
   */
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await userService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  /**
   * 处理用户事件
   */
  const handleUserEvents = useCallback(() => {
    // 重新加载统计数据
    loadStatistics();
  }, [loadStatistics]);

  return (
    <div className="user-management">
      <header className="management-header">
        <h1>用户管理</h1>
        {statistics && (
          <div className="statistics">
            <div className="stat-item">
              <span className="label">总用户数:</span>
              <span className="value">{statistics.totalUsers || 0}</span>
            </div>
            <div className="stat-item">
              <span className="label">活跃用户:</span>
              <span className="value">{statistics.activeUsers || 0}</span>
            </div>
          </div>
        )}
      </header>

      <main className="management-content">
        <UserList
          pageSize={20}
          onUserCreate={handleUserEvents}
          onUserUpdate={handleUserEvents}
          onUserDelete={handleUserEvents}
          className="main-user-list"
        />
      </main>
    </div>
  );
};