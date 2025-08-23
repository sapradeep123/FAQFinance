import bcrypt from 'bcryptjs';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/authJWT';
import { query, transaction } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

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

export class AuthService {
  // Register new user
  async register(data: RegisterData): Promise<AuthResult> {
    const { email, password, firstName, lastName } = data;
    
    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists with this email', 409);
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const userResult = await query(
      `INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'user', true, false, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at`,
      [email.toLowerCase(), hashedPassword, firstName, lastName]
    );
    
    const user = userResult.rows[0];
    
    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    // Store refresh token
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
      [user.id, refreshToken]
    );
    
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    };
  }
  
  // Login user
  async login(email: string, password: string): Promise<AuthResult> {
    // Find user
    const userResult = await query(
      'SELECT id, email, password, first_name, last_name, role, is_active, email_verified, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      throw new AppError('Invalid email or password', 401);
    }
    
    const user = userResult.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      throw new AppError('Account is deactivated. Please contact support.', 401);
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    // Store refresh token
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
      [user.id, refreshToken]
    );
    
    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );
    
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    };
  }
  
  // Refresh access token
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Check if refresh token exists in database
      const tokenResult = await query(
        'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
        [refreshToken]
      );
      
      if (tokenResult.rows.length === 0) {
        throw new AppError('Invalid or expired refresh token', 401);
      }
      
      // Get user details
      const userResult = await query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        throw new AppError('User not found or inactive', 401);
      }
      
      const user = userResult.rows[0];
      
      // Generate new tokens
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };
      
      const newAccessToken = generateToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);
      
      // Replace old refresh token with new one
      await transaction(async (client) => {
        await client.query(
          'DELETE FROM refresh_tokens WHERE token = $1',
          [refreshToken]
        );
        
        await client.query(
          'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\', NOW())',
          [user.id, newRefreshToken]
        );
      });
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: '24h'
      };
      
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }
  
  // Logout user
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await query(
        'DELETE FROM refresh_tokens WHERE user_id = $1 AND token = $2',
        [userId, refreshToken]
      );
    } else {
      // Logout from all devices
      await query(
        'DELETE FROM refresh_tokens WHERE user_id = $1',
        [userId]
      );
    }
  }
  
  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const result = await query(
      'SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
  
  // Update user profile
  async updateUserProfile(userId: string, updateData: Partial<{ firstName: string; lastName: string; email: string }>): Promise<UserProfile | null> {
    const { firstName, lastName, email } = updateData;
    
    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase(), userId]
      );
      
      if (existingUser.rows.length > 0) {
        throw new AppError('Email is already taken by another user', 409);
      }
    }
    
    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at`,
      [firstName, lastName, email?.toLowerCase(), userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
  
  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get current password
    const userResult = await query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }
    
    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, userId]
    );
    
    // Invalidate all refresh tokens for security
    await query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );
  }
  
  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    
    // Don't reveal if email exists or not for security
    if (userResult.rows.length === 0) {
      return;
    }
    
    const userId = userResult.rows[0].id;
    
    // Generate reset token (in real app, you'd send this via email)
    const resetToken = generateToken({ id: userId, email, role: 'user' });
    
    // Store reset token
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\', NOW())',
      [userId, resetToken]
    );
    
    // In a real application, you would send an email here
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }
  
  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Verify and get token info
    const tokenResult = await query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (tokenResult.rows.length === 0) {
      throw new AppError('Invalid or expired reset token', 400);
    }
    
    const userId = tokenResult.rows[0].user_id;
    
    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password and clean up tokens
    await transaction(async (client) => {
      await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );
      
      await client.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1',
        [userId]
      );
      
      await client.query(
        'DELETE FROM refresh_tokens WHERE user_id = $1',
        [userId]
      );
    });
  }
  
  // Verify email
  async verifyEmail(token: string): Promise<void> {
    // In a real application, you'd have email verification tokens
    // For now, we'll just mark the email as verified
    const tokenResult = await query(
      'SELECT user_id FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (tokenResult.rows.length === 0) {
      throw new AppError('Invalid or expired verification token', 400);
    }
    
    const userId = tokenResult.rows[0].user_id;
    
    await transaction(async (client) => {
      await client.query(
        'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );
      
      await client.query(
        'DELETE FROM email_verification_tokens WHERE user_id = $1',
        [userId]
      );
    });
  }
}

export default AuthService;