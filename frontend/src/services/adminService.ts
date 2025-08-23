// Mock admin service for development
import { API_BASE_URL } from '../config/clientEnv';

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalSessions: number;
}

export interface SystemMetrics {
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

export interface Metrics {
  users: UserMetrics;
  system: SystemMetrics;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface ApiConfig {
  id: string;
  name: string;
  provider: 'Yahoo' | 'Google' | 'Fallback';
  apiKey: string;
  isEnabled: boolean;
  priority: number;
  lastUsed?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Mock data
let mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-01-20T10:30:00Z',
    isActive: true
  },
  {
    id: '2',
    email: 'user1@example.com',
    role: 'user',
    createdAt: '2024-01-05T00:00:00Z',
    lastLogin: '2024-01-19T15:45:00Z',
    isActive: true
  },
  {
    id: '3',
    email: 'user2@example.com',
    role: 'user',
    createdAt: '2024-01-10T00:00:00Z',
    isActive: false
  }
];

let mockApiConfigs: ApiConfig[] = [
  {
    id: '1',
    name: 'Yahoo Finance API',
    provider: 'Yahoo',
    apiKey: 'yahoo_****_****_1234',
    isEnabled: true,
    priority: 1,
    lastUsed: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    name: 'Google Finance API',
    provider: 'Google',
    apiKey: 'google_****_****_5678',
    isEnabled: true,
    priority: 2,
    lastUsed: '2024-01-20T09:15:00Z'
  },
  {
    id: '3',
    name: 'Fallback Data Source',
    provider: 'Fallback',
    apiKey: 'fallback_****_****_9012',
    isEnabled: true,
    priority: 3,
    lastUsed: '2024-01-19T16:20:00Z'
  }
];

let mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-20T10:30:00Z',
    level: 'info',
    message: 'User logged in successfully',
    userId: '2',
    metadata: { ip: '192.168.1.100' }
  },
  {
    id: '2',
    timestamp: '2024-01-20T10:25:00Z',
    level: 'warn',
    message: 'API rate limit approaching',
    metadata: { provider: 'Yahoo', usage: '85%' }
  },
  {
    id: '3',
    timestamp: '2024-01-20T10:20:00Z',
    level: 'error',
    message: 'Failed to fetch market data',
    metadata: { provider: 'Google', error: 'Connection timeout' }
  }
];

// Service functions
export async function getMetrics(): Promise<Metrics> {
  // TODO: Replace with actual API call to GET /admin/metrics
  // const response = await fetch(`${API_BASE_URL}/admin/metrics`, {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // if (!response.ok) throw new Error('Failed to fetch metrics');
  // return await response.json();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const activeUsers = mockUsers.filter(u => u.isActive).length;
  const newUsersToday = mockUsers.filter(u => {
    const today = new Date().toDateString();
    return new Date(u.createdAt).toDateString() === today;
  }).length;
  
  return {
    users: {
      totalUsers: mockUsers.length,
      activeUsers,
      newUsersToday,
      totalSessions: 156
    },
    system: {
      uptime: '7d 12h 34m',
      memoryUsage: 68.5,
      cpuUsage: 23.2,
      diskUsage: 45.8
    }
  };
}

export async function getUsers(): Promise<User[]> {
  // TODO: Replace with actual API call to GET /admin/users
  // const response = await fetch(`${API_BASE_URL}/admin/users`, {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // if (!response.ok) throw new Error('Failed to fetch users');
  // return await response.json();
  
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...mockUsers];
}

export async function setUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  // TODO: Replace with actual API call to PUT /admin/users/{id}/role
  // const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
  //   method: 'PUT',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${token}`
  //   },
  //   body: JSON.stringify({ role })
  // });
  // if (!response.ok) throw new Error('Failed to update user role');
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const user = mockUsers.find(u => u.id === userId);
  if (user) {
    user.role = role;
  } else {
    throw new Error('User not found');
  }
}

export async function getApiConfigs(): Promise<ApiConfig[]> {
  // TODO: Replace with actual API call to GET /admin/api-configs
  // const response = await fetch(`${API_BASE_URL}/admin/api-configs`, {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // if (!response.ok) throw new Error('Failed to fetch API configs');
  // return await response.json();
  
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...mockApiConfigs];
}

export async function setApiConfigs(configs: Partial<ApiConfig>[]): Promise<void> {
  // TODO: Replace with actual API call to PUT /admin/api-configs
  // const response = await fetch(`${API_BASE_URL}/admin/api-configs`, {
  //   method: 'PUT',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${token}`
  //   },
  //   body: JSON.stringify(configs)
  // });
  // if (!response.ok) throw new Error('Failed to update API configs');
  
  await new Promise(resolve => setTimeout(resolve, 400));
  
  configs.forEach(config => {
    const existing = mockApiConfigs.find(c => c.id === config.id);
    if (existing && config.apiKey) {
      // Mask the API key for security
      const maskedKey = config.apiKey.length > 8 
        ? `${config.provider?.toLowerCase()}_****_****_${config.apiKey.slice(-4)}`
        : config.apiKey;
      
      Object.assign(existing, {
        ...config,
        apiKey: maskedKey
      });
    }
  });
}

export async function getLogs(limit: number = 50): Promise<LogEntry[]> {
  // TODO: Replace with actual API call to GET /admin/logs
  // const response = await fetch(`${API_BASE_URL}/admin/logs?limit=${limit}`, {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // if (!response.ok) throw new Error('Failed to fetch logs');
  // return await response.json();
  
  await new Promise(resolve => setTimeout(resolve, 400));
  return mockLogs.slice(0, limit).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const newLog: LogEntry = {
    ...entry,
    id: (mockLogs.length + 1).toString(),
    timestamp: new Date().toISOString()
  };
  
  mockLogs.unshift(newLog);
  
  // Keep only last 100 logs
  if (mockLogs.length > 100) {
    mockLogs = mockLogs.slice(0, 100);
  }
}