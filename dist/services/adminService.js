"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetrics = getMetrics;
exports.getUsers = getUsers;
exports.setUserRole = setUserRole;
exports.getApiConfigs = getApiConfigs;
exports.setApiConfigs = setApiConfigs;
exports.getLogs = getLogs;
exports.addLog = addLog;
let mockUsers = [
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
let mockApiConfigs = [
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
let mockLogs = [
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
async function getMetrics() {
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
async function getUsers() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockUsers];
}
async function setUserRole(userId, role) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
        user.role = role;
    }
    else {
        throw new Error('User not found');
    }
}
async function getApiConfigs() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockApiConfigs];
}
async function setApiConfigs(configs) {
    await new Promise(resolve => setTimeout(resolve, 400));
    configs.forEach(config => {
        const existing = mockApiConfigs.find(c => c.id === config.id);
        if (existing && config.apiKey) {
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
async function getLogs(limit = 50) {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockLogs.slice(0, limit).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
async function addLog(entry) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const newLog = {
        ...entry,
        id: (mockLogs.length + 1).toString(),
        timestamp: new Date().toISOString()
    };
    mockLogs.unshift(newLog);
    if (mockLogs.length > 100) {
        mockLogs = mockLogs.slice(0, 100);
    }
}
//# sourceMappingURL=adminService.js.map