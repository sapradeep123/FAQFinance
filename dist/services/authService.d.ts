interface User {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    createdAt: string;
}
interface LoginCredentials {
    email: string;
    password: string;
}
interface SignupData {
    name: string;
    email: string;
    password: string;
}
interface UpdateProfileData {
    name?: string;
    email?: string;
}
interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}
interface AuthResponse {
    user: User;
    token: string;
}
declare class AuthService {
    private readonly USERS_KEY;
    private readonly AUTH_KEY;
    constructor();
    private initializeUsers;
    private getUsers;
    private saveUsers;
    private generateToken;
    private saveAuth;
    private clearAuth;
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    signup(data: SignupData): Promise<void>;
    me(): Promise<User>;
    updateProfile(data: UpdateProfileData): Promise<User>;
    changePassword(data: ChangePasswordData): Promise<void>;
    logout(): void;
    getStoredAuth(): {
        user: User;
        token: string;
    } | null;
    isAuthenticated(): boolean;
}
export declare const authService: AuthService;
export type { User, LoginCredentials, SignupData, UpdateProfileData, ChangePasswordData, AuthResponse };
//# sourceMappingURL=authService.d.ts.map