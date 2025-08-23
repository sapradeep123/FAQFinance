interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalPortfolios: number;
    totalChatSessions: number;
    totalTransactions: number;
    systemHealth: {
        database: 'healthy' | 'warning' | 'error';
        memory: number;
        cpu: number;
        uptime: number;
    };
    recentActivity: {
        newUsers: number;
        newPortfolios: number;
        newChatSessions: number;
        period: string;
    };
}
interface UserManagement {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    portfolioCount: number;
    chatSessionCount: number;
}
interface SystemLog {
    id: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    metadata?: any;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
interface ApiUsageStats {
    endpoint: string;
    method: string;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    lastAccessed: Date;
}
interface SystemSettings {
    id: string;
    key: string;
    value: string;
    description?: string;
    category: string;
    isPublic: boolean;
    updatedAt: Date;
    updatedBy: string;
}
export declare class AdminService {
    getDashboardStats(): Promise<DashboardStats>;
    getUsers(page?: number, limit?: number, search?: string, role?: string, isActive?: boolean): Promise<{
        users: UserManagement[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateUserStatus(userId: string, isActive: boolean): Promise<void>;
    updateUserRole(userId: string, role: string): Promise<void>;
    deleteUser(userId: string): Promise<void>;
    exportUserData(userId: string): Promise<any>;
    getSystemLogs(page?: number, limit?: number, level?: string, startDate?: Date, endDate?: Date): Promise<{
        logs: SystemLog[];
        total: number;
        page: number;
        limit: number;
    }>;
    logActivity(level: 'info' | 'warn' | 'error' | 'debug', message: string, metadata?: any, userId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
    getSystemSettings(category?: string): Promise<SystemSettings[]>;
    updateSystemSetting(key: string, value: string, updatedBy: string, description?: string, category?: string): Promise<void>;
    getApiUsageStats(startDate?: Date, endDate?: Date): Promise<ApiUsageStats[]>;
    createDatabaseBackup(): Promise<{
        backupId: string;
        filename: string;
    }>;
    getSystemHealth(): Promise<DashboardStats['systemHealth']>;
    sendSystemNotification(type: 'info' | 'warning' | 'error', title: string, message: string, targetUsers?: string[]): Promise<void>;
    private getUserStats;
    private getPortfolioStats;
    private getChatStats;
    private getTransactionStats;
    private getRecentActivity;
}
export default AdminService;
//# sourceMappingURL=admin.d.ts.map