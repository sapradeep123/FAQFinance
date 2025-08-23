"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const authService_1 = require("../services/authService");
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const credentials = { email, password };
            const { user, token } = await authService_1.authService.login(credentials);
            set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false
            });
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Login failed',
                isLoading: false
            });
        }
    },
    signup: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
            const signupData = { name, email, password };
            await authService_1.authService.signup(signupData);
            set({ isLoading: false });
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Signup failed',
                isLoading: false
            });
        }
    },
    logout: () => {
        authService_1.authService.logout();
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null
        });
    },
    updateProfile: async (data) => {
        const { user } = get();
        if (!user)
            return;
        set({ isLoading: true, error: null });
        try {
            const updateData = {
                name: data.name,
                email: data.email
            };
            const updatedUser = await authService_1.authService.updateProfile(updateData);
            set({
                user: updatedUser,
                isLoading: false
            });
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Profile update failed',
                isLoading: false
            });
        }
    },
    checkAuth: () => {
        const storedAuth = authService_1.authService.getStoredAuth();
        if (storedAuth) {
            set({
                user: storedAuth.user,
                token: storedAuth.token,
                isAuthenticated: true
            });
        }
        else {
            set({
                user: null,
                token: null,
                isAuthenticated: false
            });
        }
    },
    clearError: () => set({ error: null }),
    setLoading: (loading) => set({ isLoading: loading })
}), {
    name: 'auth-storage',
    partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
    })
}));
//# sourceMappingURL=useAuthStore.js.map