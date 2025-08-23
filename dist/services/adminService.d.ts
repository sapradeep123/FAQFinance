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
export declare function getMetrics(): Promise<Metrics>;
export declare function getUsers(): Promise<User[]>;
export declare function setUserRole(userId: string, role: 'admin' | 'user'): Promise<void>;
export declare function getApiConfigs(): Promise<ApiConfig[]>;
export declare function setApiConfigs(configs: Partial<ApiConfig>[]): Promise<void>;
export declare function getLogs(limit?: number): Promise<LogEntry[]>;
export declare function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void>;
//# sourceMappingURL=adminService.d.ts.map