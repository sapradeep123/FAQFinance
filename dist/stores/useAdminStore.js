"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAdminActions = exports.useAdminErrors = exports.useAdminLoadingStates = exports.useAdminLogs = exports.useAdminApiConfigs = exports.useAdminUsers = exports.useAdminMetrics = exports.useAdminStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const adminService_1 = require("../services/adminService");
exports.useAdminStore = (0, zustand_1.create)()((0, middleware_1.devtools)((set, get) => ({
    metrics: null,
    users: [],
    apiConfigs: [],
    logs: [],
    isLoadingMetrics: false,
    isLoadingUsers: false,
    isLoadingApiConfigs: false,
    isLoadingLogs: false,
    metricsError: null,
    usersError: null,
    apiConfigsError: null,
    logsError: null,
    loadMetrics: async () => {
        set({ isLoadingMetrics: true, metricsError: null });
        try {
            const metrics = await (0, adminService_1.getMetrics)();
            set({ metrics, isLoadingMetrics: false });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load metrics';
            set({ metricsError: errorMessage, isLoadingMetrics: false });
        }
    },
    loadUsers: async () => {
        set({ isLoadingUsers: true, usersError: null });
        try {
            const users = await (0, adminService_1.getUsers)();
            set({ users, isLoadingUsers: false });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
            set({ usersError: errorMessage, isLoadingUsers: false });
        }
    },
    updateUserRole: async (userId, role) => {
        try {
            await (0, adminService_1.setUserRole)(userId, role);
            const users = get().users.map(user => user.id === userId ? { ...user, role } : user);
            set({ users });
            await get().createLog({
                level: 'info',
                message: `User role updated: ${userId} -> ${role}`,
                metadata: { userId, newRole: role }
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
            set({ usersError: errorMessage });
            throw error;
        }
    },
    loadApiConfigs: async () => {
        set({ isLoadingApiConfigs: true, apiConfigsError: null });
        try {
            const apiConfigs = await (0, adminService_1.getApiConfigs)();
            set({ apiConfigs, isLoadingApiConfigs: false });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load API configs';
            set({ apiConfigsError: errorMessage, isLoadingApiConfigs: false });
        }
    },
    updateApiConfigs: async (configs) => {
        try {
            await (0, adminService_1.setApiConfigs)(configs);
            await get().loadApiConfigs();
            await get().createLog({
                level: 'info',
                message: `API configurations updated: ${configs.length} config(s)`,
                metadata: { configCount: configs.length }
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update API configs';
            set({ apiConfigsError: errorMessage });
            throw error;
        }
    },
    loadLogs: async (limit = 50) => {
        set({ isLoadingLogs: true, logsError: null });
        try {
            const logs = await (0, adminService_1.getLogs)(limit);
            set({ logs, isLoadingLogs: false });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load logs';
            set({ logsError: errorMessage, isLoadingLogs: false });
        }
    },
    createLog: async (entry) => {
        try {
            await (0, adminService_1.addLog)(entry);
            const newLog = {
                ...entry,
                id: `temp-${Date.now()}`,
                timestamp: new Date().toISOString()
            };
            const logs = [newLog, ...get().logs].slice(0, 50);
            set({ logs });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create log';
            set({ logsError: errorMessage });
            throw error;
        }
    },
    clearErrors: () => {
        set({
            metricsError: null,
            usersError: null,
            apiConfigsError: null,
            logsError: null
        });
    },
    refreshAll: async () => {
        const { loadMetrics, loadUsers, loadApiConfigs, loadLogs } = get();
        await Promise.allSettled([
            loadMetrics(),
            loadUsers(),
            loadApiConfigs(),
            loadLogs()
        ]);
    }
}), {
    name: 'admin-store',
    partialize: (state) => ({
        metrics: state.metrics,
        users: state.users,
        apiConfigs: state.apiConfigs,
        logs: state.logs
    })
}));
const useAdminMetrics = () => (0, exports.useAdminStore)(state => state.metrics);
exports.useAdminMetrics = useAdminMetrics;
const useAdminUsers = () => (0, exports.useAdminStore)(state => state.users);
exports.useAdminUsers = useAdminUsers;
const useAdminApiConfigs = () => (0, exports.useAdminStore)(state => state.apiConfigs);
exports.useAdminApiConfigs = useAdminApiConfigs;
const useAdminLogs = () => (0, exports.useAdminStore)(state => state.logs);
exports.useAdminLogs = useAdminLogs;
const useAdminLoadingStates = () => (0, exports.useAdminStore)(state => ({
    isLoadingMetrics: state.isLoadingMetrics,
    isLoadingUsers: state.isLoadingUsers,
    isLoadingApiConfigs: state.isLoadingApiConfigs,
    isLoadingLogs: state.isLoadingLogs
}));
exports.useAdminLoadingStates = useAdminLoadingStates;
const useAdminErrors = () => (0, exports.useAdminStore)(state => ({
    metricsError: state.metricsError,
    usersError: state.usersError,
    apiConfigsError: state.apiConfigsError,
    logsError: state.logsError
}));
exports.useAdminErrors = useAdminErrors;
const useAdminActions = () => (0, exports.useAdminStore)(state => ({
    loadMetrics: state.loadMetrics,
    loadUsers: state.loadUsers,
    updateUserRole: state.updateUserRole,
    loadApiConfigs: state.loadApiConfigs,
    updateApiConfigs: state.updateApiConfigs,
    loadLogs: state.loadLogs,
    createLog: state.createLog,
    clearErrors: state.clearErrors,
    refreshAll: state.refreshAll
}));
exports.useAdminActions = useAdminActions;
//# sourceMappingURL=useAdminStore.js.map