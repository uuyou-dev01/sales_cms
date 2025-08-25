// 认证相关类型
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  storeId: string;
  store: {
    id: string;
    name: string;
    displayName: string;
  };
}

export interface Store {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
}

// 会话类型
export interface Session {
  user: AuthUser;
  expires: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页类型
export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
