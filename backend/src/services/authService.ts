import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { config } from '../config/env';
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

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'finance-app',
      audience: 'finance-app-users'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      {
        expiresIn: config.jwt.refreshExpiresIn,
        issuer: 'finance-app',
        audience: 'finance-app-users'
      }
    );

    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string }> {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;
      if (decoded.type !== 'refresh') {
        throw createError(401, 'Invalid token type');
      }
      return { userId: decoded.userId };
    } catch (error) {
      throw createError(401, 'Invalid refresh token');
    }
  }

  async register(userData: CreateUserData): Promise<User> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username]
      );

      if (existingUser.rows.length > 0) {
        throw createError(409, 'User with this email or username already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Insert new user
      const result = await client.query(
        `INSERT INTO users (email, username, password_hash, region, currency, role, status)
         VALUES ($1, $2, $3, $4, $5, 'USER', 'ACTIVE')
         RETURNING id, email, username, role, status, region, currency, theme, created_at, updated_at`,
        [
          userData.email,
          userData.username,
          hashedPassword,
          userData.region || 'US',
          userData.currency || 'USD'
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    const client = await pool.connect();
    
    try {
      // Find user by email
      const result = await client.query(
        `SELECT id, email, username, password_hash, role, status, region, currency, theme, 
                created_at, updated_at, last_login
         FROM users 
         WHERE email = $1`,
        [credentials.email]
      );

      if (result.rows.length === 0) {
        throw createError(401, 'Invalid email or password');
      }

      const user = result.rows[0];

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw createError(403, 'Account is inactive or suspended');
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        throw createError(401, 'Invalid email or password');
      }

      // Update last login
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Remove password hash from user object
      const { password_hash, ...userWithoutPassword } = user;
      const tokens = this.generateTokens(userWithoutPassword);

      return {
        user: userWithoutPassword,
        tokens
      };
    } finally {
      client.release();
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, username, role, status, region, currency, theme, 
              created_at, updated_at, last_login
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, username, role, status, region, currency, theme, 
              created_at, updated_at, last_login
       FROM users 
       WHERE email = $1`,
      [email]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updateProfile(userId: string, profileData: UpdateProfileData): Promise<User> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if username is being changed and if it's already taken
      if (profileData.username) {
        const existingUser = await client.query(
          'SELECT id FROM users WHERE username = $1 AND id != $2',
          [profileData.username, userId]
        );

        if (existingUser.rows.length > 0) {
          throw createError(409, 'Username is already taken');
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
        throw createError(400, 'No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(userId);

      const result = await client.query(
        `UPDATE users 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, username, role, status, region, currency, theme, created_at, updated_at, last_login`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw createError(404, 'User not found');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async changePassword(userId: string, passwordData: ChangePasswordData): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current password hash
      const result = await client.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw createError(404, 'User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(
        passwordData.currentPassword,
        result.rows[0].password_hash
      );

      if (!isCurrentPasswordValid) {
        throw createError(401, 'Current password is incorrect');
      }

      // Hash new password
      const newHashedPassword = await this.hashPassword(passwordData.newPassword);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newHashedPassword, userId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId } = await this.verifyRefreshToken(refreshToken);
    
    const user = await this.getUserById(userId);
    if (!user) {
      throw createError(404, 'User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw createError(403, 'Account is inactive or suspended');
    }

    return this.generateTokens(user);
  }

  async createSession(userId: string, sessionData: { ip_address?: string; user_agent?: string }): Promise<string> {
    const sessionId = jwt.sign(
      { userId, type: 'session', timestamp: Date.now() },
      config.jwt.secret,
      { expiresIn: '24h' }
    );

    await pool.query(
      `INSERT INTO user_sessions (id, user_id, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         last_activity = CURRENT_TIMESTAMP,
         ip_address = EXCLUDED.ip_address,
         user_agent = EXCLUDED.user_agent`,
      [
        sessionId,
        userId,
        sessionData.ip_address,
        sessionData.user_agent,
        new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      ]
    );

    return sessionId;
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT id FROM user_sessions 
       WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP AND is_active = true`,
      [sessionId]
    );

    if (result.rows.length > 0) {
      // Update last activity
      await pool.query(
        'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );
      return true;
    }

    return false;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE id = $1',
      [sessionId]
    );
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );
  }
}

export const authService = new AuthService();
export default authService;