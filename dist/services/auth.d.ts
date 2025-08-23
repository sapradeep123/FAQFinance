interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}
interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}
interface AuthResult {
    user: Omit<UserProfile, 'password'>;
    tokens: AuthTokens;
}
export declare class AuthService {
    register(data: RegisterData): Promise<AuthResult>;
    login(email: string, password: string): Promise<AuthResult>;
    refreshToken(refreshToken: string): Promise<AuthTokens>;
    logout(userId: string, refreshToken?: string): Promise<void>;
    getUserProfile(userId: string): Promise<UserProfile | null>;
    updateUserProfile(userId: string, updateData: Partial<{
        firstName: string;
        lastName: string;
        email: string;
    }>): Promise<UserProfile | null>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    verifyEmail(token: string): Promise<void>;
}
export default AuthService;
//# sourceMappingURL=auth.d.ts.map