import { query, transaction } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPortfolios: number;
  totalChatSessions: number;
  totalTransactions: number;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    memory: number;
    cpu: number;
    uptime: number;
  };
  recentActivity: {
    newUsers: number;
    newPortfolios: number;
    newChatSessions: number;
    period: string;
  };
}

interface UserManagement {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  portfolioCount: number;
  chatSessionCount: number;
}

interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: any;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

interface ApiUsageStats {
  endpoint: string;
  method: string;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastAccessed: Date;
}

interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  isPublic: boolean;
  updatedAt: Date;
  updatedBy: string;
}

export class AdminService {
  // Dashboard Statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const [userStats, portfolioStats, chatStats, transactionStats] = await Promise.all([
      this.getUserStats(),
      this.getPortfolioStats(),
      this.getChatStats(),
      this.getTransactionStats()
    ]);

    const systemHealth = await this.getSystemHealth();
    const recentActivity = await this.getRecentActivity();

    return {
      totalUsers: userStats.total,
      activeUsers: userStats.active,
      totalPortfolios: portfolioStats.total,
      totalChatSessions: chatStats.total,
      totalTransactions: transactionStats.total,
      systemHealth,
      recentActivity
    };
  }

  // User Management
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
    isActive?: boolean
  ): Promise<{ users: UserManagement[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereClause += ` AND u.is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const usersQuery = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
        u.email_verified, u.last_login_at, u.created_at,
        COUNT(DISTINCT p.id) as portfolio_count,
        COUNT(DISTINCT cs.id) as chat_session_count
      FROM users u
      LEFT JOIN portfolios p ON u.id = p.user_id
      LEFT JOIN chat_sessions cs ON u.id = cs.user_id
      ${whereClause}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
               u.email_verified, u.last_login_at, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const usersResult = await query(usersQuery, params);

    const users: UserManagement[] = usersResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      portfolioCount: parseInt(row.portfolio_count),
      chatSessionCount: parseInt(row.chat_session_count)
    }));

    return {
      users,
      total,
      page,
      limit
    };
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [isActive, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('User not found', 404);
    }

    await this.logActivity('info', `User ${userId} status changed to ${isActive ? 'active' : 'inactive'}`);
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    const validRoles = ['user', 'admin', 'moderator'];
    if (!validRoles.includes(role)) {
      throw new AppError('Invalid role', 400);
    }

    const result = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
      [role, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('User not found', 404);
    }

    await this.logActivity('info', `User ${userId} role changed to ${role}`);
  }

  async deleteUser(userId: string): Promise<void> {
    await transaction(async (client) => {
      // Delete user data in correct order due to foreign key constraints
      await client.query('DELETE FROM portfolio_transactions WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = $1)', [userId]);
      await client.query('DELETE FROM portfolio_holdings WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = $1)', [userId]);
      await client.query('DELETE FROM portfolios WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = $1)', [userId]);
      await client.query('DELETE FROM chat_sessions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
      
      const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      if (result.rowCount === 0) {
        throw new AppError('User not found', 404);
      }
    });

    await this.logActivity('warn', `User ${userId} deleted`);
  }

  async exportUserData(userId: string): Promise<any> {
    const userResult = await query(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Get portfolios
    const portfoliosResult = await query(
      'SELECT * FROM portfolios WHERE user_id = $1',
      [userId]
    );

    // Get chat sessions
    const chatSessionsResult = await query(
      'SELECT id, title, model, created_at FROM chat_sessions WHERE user_id = $1',
      [userId]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at
      },
      portfolios: portfoliosResult.rows,
      chatSessions: chatSessionsResult.rows,
      exportedAt: new Date()
    };
  }

  // System Logs
  async getSystemLogs(
    page: number = 1,
    limit: number = 50,
    level?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ logs: SystemLog[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (level) {
      whereClause += ` AND level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) FROM system_logs ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const logsQuery = `
      SELECT * FROM system_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const logsResult = await query(logsQuery, params);

    const logs: SystemLog[] = logsResult.rows.map(row => ({
      id: row.id,
      level: row.level,
      message: row.message,
      metadata: row.metadata,
      userId: row.user_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at
    }));

    return {
      logs,
      total,
      page,
      limit
    };
  }

  async logActivity(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: any,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await query(
      `INSERT INTO system_logs (level, message, metadata, user_id, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [level, message, metadata ? JSON.stringify(metadata) : null, userId, ipAddress, userAgent]
    );
  }

  // System Settings
  async getSystemSettings(category?: string): Promise<SystemSettings[]> {
    let query_str = 'SELECT * FROM system_settings';
    const params: any[] = [];
    
    if (category) {
      query_str += ' WHERE category = $1';
      params.push(category);
    }
    
    query_str += ' ORDER BY category, key';
    
    const result = await query(query_str, params);
    
    return result.rows.map(row => ({
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description,
      category: row.category,
      isPublic: row.is_public,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    }));
  }

  async updateSystemSetting(
    key: string,
    value: string,
    updatedBy: string,
    description?: string,
    category: string = 'general'
  ): Promise<void> {
    await query(
      `INSERT INTO system_settings (key, value, description, category, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       description = EXCLUDED.description,
       category = EXCLUDED.category,
       updated_by = EXCLUDED.updated_by,
       updated_at = EXCLUDED.updated_at`,
      [key, value, description, category, updatedBy]
    );

    await this.logActivity('info', `System setting '${key}' updated`, { key, value, category });
  }

  // API Usage Statistics
  async getApiUsageStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<ApiUsageStats[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const result = await query(
      `SELECT 
         endpoint,
         method,
         COUNT(*) as total_requests,
         AVG(response_time) as average_response_time,
         (COUNT(*) FILTER (WHERE status_code >= 400))::float / COUNT(*) * 100 as error_rate,
         MAX(created_at) as last_accessed
       FROM api_usage_logs
       ${whereClause}
       GROUP BY endpoint, method
       ORDER BY total_requests DESC`,
      params
    );

    return result.rows.map(row => ({
      endpoint: row.endpoint,
      method: row.method,
      totalRequests: parseInt(row.total_requests),
      averageResponseTime: parseFloat(row.average_response_time),
      errorRate: parseFloat(row.error_rate),
      lastAccessed: row.last_accessed
    }));
  }

  // Database Backup
  async createDatabaseBackup(): Promise<{ backupId: string; filename: string }> {
    const backupId = `backup_${Date.now()}`;
    const filename = `${backupId}.sql`;
    
    // In a real implementation, you would:
    // 1. Create a database dump
    // 2. Store it in cloud storage
    // 3. Log the backup creation
    
    await this.logActivity('info', 'Database backup created', { backupId, filename });
    
    return { backupId, filename };
  }

  // System Health Check
  async getSystemHealth(): Promise<DashboardStats['systemHealth']> {
    try {
      // Test database connection
      await query('SELECT 1');
      
      // Get system metrics (simplified)
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      return {
        database: 'healthy',
        memory: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        cpu: 0, // Would need additional monitoring
        uptime: Math.round(uptime)
      };
    } catch (error) {
      return {
        database: 'error',
        memory: 0,
        cpu: 0,
        uptime: 0
      };
    }
  }

  // Send System Notification
  async sendSystemNotification(
    type: 'info' | 'warning' | 'error',
    title: string,
    message: string,
    targetUsers?: string[]
  ): Promise<void> {
    // In a real implementation, you would:
    // 1. Store notification in database
    // 2. Send via email/push notification
    // 3. Log the notification
    
    await this.logActivity('info', 'System notification sent', {
      type,
      title,
      message,
      targetUsers: targetUsers?.length || 'all'
    });
  }

  // Helper methods
  private async getUserStats(): Promise<{ total: number; active: number }> {
    const result = await query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users'
    );
    return {
      total: parseInt(result.rows[0].total),
      active: parseInt(result.rows[0].active)
    };
  }

  private async getPortfolioStats(): Promise<{ total: number }> {
    const result = await query('SELECT COUNT(*) as total FROM portfolios');
    return { total: parseInt(result.rows[0].total) };
  }

  private async getChatStats(): Promise<{ total: number }> {
    const result = await query('SELECT COUNT(*) as total FROM chat_sessions');
    return { total: parseInt(result.rows[0].total) };
  }

  private async getTransactionStats(): Promise<{ total: number }> {
    const result = await query('SELECT COUNT(*) as total FROM portfolio_transactions');
    return { total: parseInt(result.rows[0].total) };
  }

  private async getRecentActivity(): Promise<DashboardStats['recentActivity']> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [newUsers, newPortfolios, newChatSessions] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE created_at >= $1', [oneDayAgo]),
      query('SELECT COUNT(*) as count FROM portfolios WHERE created_at >= $1', [oneDayAgo]),
      query('SELECT COUNT(*) as count FROM chat_sessions WHERE created_at >= $1', [oneDayAgo])
    ]);

    return {
      newUsers: parseInt(newUsers.rows[0].count),
      newPortfolios: parseInt(newPortfolios.rows[0].count),
      newChatSessions: parseInt(newChatSessions.rows[0].count),
      period: '24h'
    };
  }
}

export default AdminService;