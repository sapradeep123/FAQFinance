import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { config } from '../config/config';
import { createError } from '../middleware/errorHandler';

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  region?: string;
  currency?: string;
  theme?: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  region?: string;
  currency?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  username?: string;
  region?: string;
  currency?: string;
  theme?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET as jwt.Secret, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      issuer: 'finance-app',
      audience: 'finance-app-users'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.JWT_REFRESH_SECRET as jwt.Secret,
      {
        expiresIn: config.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        issuer: 'finance-app',
        audience: 'finance-app-users'
      }
    );

    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string }> {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as any;
      if (decoded.type !== 'refresh') {
        throw createError('Invalid token type', 401);
      }
      return { userId: decoded.userId };
    } catch (error) {
      throw createError('Invalid refresh token', 401);
    }
  }

  async register(userData: CreateUserData): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [userData.email, userData.username]
      );

      if (existingUser.rows.length > 0) {
        throw createError('User with this email or username already exists', 409);
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Insert new user (we'll fetch it back by email)
      await query(
        `INSERT INTO users (email, username, password_hash, region, currency, role, status)
         VALUES (?, ?, ?, ?, ?, 'USER', 'ACTIVE')`,
        [
          userData.email,
          userData.username,
          hashedPassword,
          userData.region || 'US',
          userData.currency || 'USD'
        ]
      );

      const created = await this.getUserByEmail(userData.email);
      if (!created) {
        throw createError('Failed to create user', 500);
      }
      return created;
    } catch (error) {
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      // Find user by email
      const result = await query(
        `SELECT id, email, username, password_hash, role, status, region, currency, theme, 
                created_at, updated_at, last_login
         FROM users 
         WHERE email = ?`,
        [credentials.email]
      );

      if (result.rows.length === 0) {
        throw createError('Invalid email or password', 401);
      }

      const user = result.rows[0];

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw createError('Account is inactive or suspended', 403);
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        throw createError('Invalid email or password', 401);
      }

      // Update last login
      await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Remove password hash from user object
      const { password_hash, ...userWithoutPassword } = user;
      const tokens = this.generateTokens(userWithoutPassword);

      return {
        user: userWithoutPassword,
        tokens
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, username, role, status, region, currency, theme, 
              created_at, updated_at, last_login
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, username, role, status, region, currency, theme, 
              created_at, updated_at, last_login
       FROM users 
       WHERE email = ?`,
      [email]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updateProfile(userId: string, profileData: UpdateProfileData): Promise<User> {
    try {
      // Check if username is being changed and if it's already taken
      if (profileData.username) {
        const existingUser = await query(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [profileData.username, userId]
        );

        if (existingUser.rows.length > 0) {
          throw createError('Username is already taken', 409);
        }
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (profileData.username !== undefined) {
        updateFields.push(`username = $${paramIndex++}`);
        updateValues.push(profileData.username);
      }
      if (profileData.region !== undefined) {
        updateFields.push(`region = $${paramIndex++}`);
        updateValues.push(profileData.region);
      }
      if (profileData.currency !== undefined) {
        updateFields.push(`currency = $${paramIndex++}`);
        updateValues.push(profileData.currency);
      }
      if (profileData.theme !== undefined) {
        updateFields.push(`theme = $${paramIndex++}`);
        updateValues.push(profileData.theme);
      }

      if (updateFields.length === 0) {
        throw createError('No fields to update', 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(userId);

      const result = await query(
        `UPDATE users 
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw createError('User not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async changePassword(userId: string, passwordData: ChangePasswordData): Promise<void> {
    try {
      // Get current password hash
      const result = await query(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      if (result.rows.length === 0) {
        throw createError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(
        passwordData.currentPassword,
        result.rows[0].password_hash
      );

      if (!isCurrentPasswordValid) {
        throw createError('Current password is incorrect', 401);
      }

      // Hash new password
      const newHashedPassword = await this.hashPassword(passwordData.newPassword);

      // Update password
      await query(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newHashedPassword, userId]
      );
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId } = await this.verifyRefreshToken(refreshToken);
    
    const user = await this.getUserById(userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    if (user.status !== 'ACTIVE') {
      throw createError('Account is inactive or suspended', 403);
    }

    return this.generateTokens(user);
  }

  async createSession(userId: string, sessionData: { ip_address?: string; user_agent?: string }): Promise<string> {
    const sessionId = jwt.sign(
      { userId, type: 'session', timestamp: Date.now() },
      config.JWT_SECRET as jwt.Secret,
      { expiresIn: '24h' }
    );

    await query(
      `INSERT INTO user_sessions (id, user_id, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         last_activity = NOW(),
         ip_address = EXCLUDED.ip_address,
         user_agent = EXCLUDED.user_agent,
         updated_at = NOW()`,
      [
        sessionId,
        userId,
        sessionData.ip_address,
        sessionData.user_agent,
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      ]
    );

    return sessionId;
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const result = await query(
      `SELECT id FROM user_sessions 
       WHERE id = ? AND expires_at > CURRENT_TIMESTAMP`,
      [sessionId]
    );

    if (result.rows.length > 0) {
      // Update last activity
      await query(
        'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
        [sessionId]
      );
      return true;
    }

    return false;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await query(
      'UPDATE user_sessions SET is_active = false WHERE id = ?',
      [sessionId]
    );
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = ?',
      [userId]
    );
  }
}

export const authService = new AuthService();
export default authService;