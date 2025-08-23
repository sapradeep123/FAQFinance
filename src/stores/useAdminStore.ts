import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  getMetrics,
  getUsers,
  setUserRole,
  getApiConfigs,
  setApiConfigs,
  getLogs,
  addLog,
  type Metrics,
  type User,
  type ApiConfig,
  type LogEntry
} from '../services/adminService';

interface AdminState {
  // State
  metrics: Metrics | null;
  users: User[];
  apiConfigs: ApiConfig[];
  logs: LogEntry[];
  
  // Loading states
  isLoadingMetrics: boolean;
  isLoadingUsers: boolean;
  isLoadingApiConfigs: boolean;
  isLoadingLogs: boolean;
  
  // Error states
  metricsError: string | null;
  usersError: string | null;
  apiConfigsError: string | null;
  logsError: string | null;
  
  // Actions
  loadMetrics: () => Promise<void>;
  loadUsers: () => Promise<void>;
  updateUserRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
  loadApiConfigs: () => Promise<void>;
  updateApiConfigs: (configs: Partial<ApiConfig>[]) => Promise<void>;
  loadLogs: (limit?: number) => Promise<void>;
  createLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => Promise<void>;
  
  // Utility actions
  clearErrors: () => void;
  refreshAll: () => Promise<void>;
}

export const useAdminStore = create<AdminState>()(devtools(
  (set, get) => ({
    // Initial state
    metrics: null,
    users: [],
    apiConfigs: [],
    logs: [],
    
    // Loading states
    isLoadingMetrics: false,
    isLoadingUsers: false,
    isLoadingApiConfigs: false,
    isLoadingLogs: false,
    
    // Error states
    metricsError: null,
    usersError: null,
    apiConfigsError: null,
    logsError: null,
    
    // Actions
    loadMetrics: async () => {
      set({ isLoadingMetrics: true, metricsError: null });
      try {
        const metrics = await getMetrics();
        set({ metrics, isLoadingMetrics: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load metrics';
        set({ metricsError: errorMessage, isLoadingMetrics: false });
      }
    },
    
    loadUsers: async () => {
      set({ isLoadingUsers: true, usersError: null });
      try {
        const users = await getUsers();
        set({ users, isLoadingUsers: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
        set({ usersError: errorMessage, isLoadingUsers: false });
      }
    },
    
    updateUserRole: async (userId: string, role: 'admin' | 'user') => {
      try {
        await setUserRole(userId, role);
        
        // Update the user in the local state
        const users = get().users.map(user => 
          user.id === userId ? { ...user, role } : user
        );
        set({ users });
        
        // Log the action
        await get().createLog({
          level: 'info',
          message: `User role updated: ${userId} -> ${role}`,
          metadata: { userId, newRole: role }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
        set({ usersError: errorMessage });
        throw error;
      }
    },
    
    loadApiConfigs: async () => {
      set({ isLoadingApiConfigs: true, apiConfigsError: null });
      try {
        const apiConfigs = await getApiConfigs();
        set({ apiConfigs, isLoadingApiConfigs: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load API configs';
        set({ apiConfigsError: errorMessage, isLoadingApiConfigs: false });
      }
    },
    
    updateApiConfigs: async (configs: Partial<ApiConfig>[]) => {
      try {
        await setApiConfigs(configs);
        
        // Reload the configs to get the updated (masked) values
        await get().loadApiConfigs();
        
        // Log the action
        await get().createLog({
          level: 'info',
          message: `API configurations updated: ${configs.length} config(s)`,
          metadata: { configCount: configs.length }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update API configs';
        set({ apiConfigsError: errorMessage });
        throw error;
      }
    },
    
    loadLogs: async (limit: number = 50) => {
      set({ isLoadingLogs: true, logsError: null });
      try {
        const logs = await getLogs(limit);
        set({ logs, isLoadingLogs: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load logs';
        set({ logsError: errorMessage, isLoadingLogs: false });
      }
    },
    
    createLog: async (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
      try {
        await addLog(entry);
        
        // Add the log to the local state (with estimated timestamp)
        const newLog: LogEntry = {
          ...entry,
          id: `temp-${Date.now()}`,
          timestamp: new Date().toISOString()
        };
        
        const logs = [newLog, ...get().logs].slice(0, 50); // Keep only latest 50
        set({ logs });
      } catch (error) {
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
      
      // Load all data in parallel
      await Promise.allSettled([
        loadMetrics(),
        loadUsers(),
        loadApiConfigs(),
        loadLogs()
      ]);
    }
  }),
  {
    name: 'admin-store',
    partialize: (state) => ({
      // Don't persist loading states or errors
      metrics: state.metrics,
      users: state.users,
      apiConfigs: state.apiConfigs,
      logs: state.logs
    })
  }
));

// Selectors for computed values
export const useAdminMetrics = () => useAdminStore(state => state.metrics);
export const useAdminUsers = () => useAdminStore(state => state.users);
export const useAdminApiConfigs = () => useAdminStore(state => state.apiConfigs);
export const useAdminLogs = () => useAdminStore(state => state.logs);

// Loading state selectors
export const useAdminLoadingStates = () => useAdminStore(state => ({
  isLoadingMetrics: state.isLoadingMetrics,
  isLoadingUsers: state.isLoadingUsers,
  isLoadingApiConfigs: state.isLoadingApiConfigs,
  isLoadingLogs: state.isLoadingLogs
}));

// Error state selectors
export const useAdminErrors = () => useAdminStore(state => ({
  metricsError: state.metricsError,
  usersError: state.usersError,
  apiConfigsError: state.apiConfigsError,
  logsError: state.logsError
}));

// Action selectors
export const useAdminActions = () => useAdminStore(state => ({
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