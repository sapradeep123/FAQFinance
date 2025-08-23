"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const SEEDED_USERS = [
    {
        id: '1',
        email: 'admin@trae.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        email: 'demo@trae.com',
        name: 'Demo User',
        role: 'user',
        createdAt: new Date().toISOString()
    }
];
const USER_PASSWORDS = {
    'admin@trae.com': 'admin123',
    'demo@trae.com': 'demo123'
};
class AuthService {
    constructor() {
        this.USERS_KEY = 'trae_users';
        this.AUTH_KEY = 'trae_auth';
        this.initializeUsers();
    }
    initializeUsers() {
        const existingUsers = localStorage.getItem(this.USERS_KEY);
        if (!existingUsers) {
            localStorage.setItem(this.USERS_KEY, JSON.stringify(SEEDED_USERS));
        }
    }
    getUsers() {
        const users = localStorage.getItem(this.USERS_KEY);
        return users ? JSON.parse(users) : SEEDED_USERS;
    }
    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }
    generateToken(user) {
        return btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role }));
    }
    saveAuth(user, token) {
        const authData = { user, token };
        localStorage.setItem(this.AUTH_KEY, JSON.stringify(authData));
    }
    clearAuth() {
        localStorage.removeItem(this.AUTH_KEY);
    }
    async login(credentials) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = this.getUsers();
                const user = users.find(u => u.email === credentials.email);
                if (!user) {
                    reject(new Error('User not found'));
                    return;
                }
                const expectedPassword = USER_PASSWORDS[credentials.email];
                if (credentials.password !== expectedPassword) {
                    reject(new Error('Invalid password'));
                    return;
                }
                const token = this.generateToken(user);
                this.saveAuth(user, token);
                resolve({ user, token });
            }, 800);
        });
    }
    async signup(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = this.getUsers();
                if (users.find(u => u.email === data.email)) {
                    reject(new Error('Email already exists'));
                    return;
                }
                const newUser = {
                    id: Date.now().toString(),
                    email: data.email,
                    name: data.name,
                    role: 'user',
                    createdAt: new Date().toISOString()
                };
                users.push(newUser);
                this.saveUsers(users);
                const passwords = JSON.parse(localStorage.getItem('trae_passwords') || '{}');
                passwords[data.email] = data.password;
                localStorage.setItem('trae_passwords', JSON.stringify(passwords));
                resolve();
            }, 1000);
        });
    }
    async me() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const authData = localStorage.getItem(this.AUTH_KEY);
                if (!authData) {
                    reject(new Error('Not authenticated'));
                    return;
                }
                try {
                    const { user } = JSON.parse(authData);
                    resolve(user);
                }
                catch (error) {
                    reject(new Error('Invalid auth data'));
                }
            }, 300);
        });
    }
    async updateProfile(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const authData = localStorage.getItem(this.AUTH_KEY);
                if (!authData) {
                    reject(new Error('Not authenticated'));
                    return;
                }
                try {
                    const { user, token } = JSON.parse(authData);
                    const users = this.getUsers();
                    const userIndex = users.findIndex(u => u.id === user.id);
                    if (userIndex === -1) {
                        reject(new Error('User not found'));
                        return;
                    }
                    const updatedUser = { ...users[userIndex], ...data };
                    users[userIndex] = updatedUser;
                    this.saveUsers(users);
                    this.saveAuth(updatedUser, token);
                    resolve(updatedUser);
                }
                catch (error) {
                    reject(new Error('Failed to update profile'));
                }
            }, 600);
        });
    }
    async changePassword(data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const authData = localStorage.getItem(this.AUTH_KEY);
                if (!authData) {
                    reject(new Error('Not authenticated'));
                    return;
                }
                try {
                    const { user } = JSON.parse(authData);
                    const storedPasswords = JSON.parse(localStorage.getItem('trae_passwords') || '{}');
                    const currentPassword = storedPasswords[user.email] || USER_PASSWORDS[user.email];
                    if (data.currentPassword !== currentPassword) {
                        reject(new Error('Current password is incorrect'));
                        return;
                    }
                    storedPasswords[user.email] = data.newPassword;
                    localStorage.setItem('trae_passwords', JSON.stringify(storedPasswords));
                    resolve();
                }
                catch (error) {
                    reject(new Error('Failed to change password'));
                }
            }, 600);
        });
    }
    logout() {
        this.clearAuth();
    }
    getStoredAuth() {
        const authData = localStorage.getItem(this.AUTH_KEY);
        if (!authData)
            return null;
        try {
            return JSON.parse(authData);
        }
        catch {
            return null;
        }
    }
    isAuthenticated() {
        return this.getStoredAuth() !== null;
    }
}
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map