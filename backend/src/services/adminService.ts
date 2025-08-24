import { query as dbQuery, transaction } from '../config/database';
const query = dbQuery;
import { createError } from '../middleware/errorHandler';

export interface ApiConfig {
  id: string;
  provider: string;
  config_key: string;
  config_value: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UsageLog {
  id: string;
  user_id?: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
  created_at: Date;
}

export interface MetricsRollup {
  id: string;
  date: Date;
  metric_type: 'DAILY' | 'HOURLY';
  endpoint?: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  unique_users: number;
  created_at: Date;
}

export interface SystemHealth {
  id: string;
  component: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  last_check: Date;
  response_time_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface RateLimit {
  id: string;
  identifier: string;
  identifier_type: 'IP' | 'USER' | 'API_KEY';
  endpoint?: string;
  requests_count: number;
  window_start: Date;
  window_duration_minutes: number;
  limit_per_window: number;
  created_at: Date;
  updated_at: Date;
}

export interface AdminNotification {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
  read_at?: Date;
  metadata?: Record<string, any>;
}

export interface GptConfig {
  id: number;
  provider: 'openai' | 'anthropic' | 'google';
  api_key: string;
  model: string;
  is_active: boolean;
  max_tokens?: number;
  temperature?: number;
  created_at: Date;
  updated_at: Date;
}

export interface SystemSettings {
  key: string;
  value: string;
  category?: string;
  updated_at: Date;
}

export interface SystemStats {
  total_users: number;
  active_users_24h: number;
  total_requests_24h: number;
  avg_response_time_24h: number;
  error_rate_24h: number;
  total_portfolios: number;
  total_positions: number;
  total_chat_threads: number;
  total_inquiries: number;
  database_size_mb: number;
  uptime_percentage: number;
}

export interface UserActivity {
  user_id: string;
  email: string;
  last_login: Date;
  total_requests: number;
  total_portfolios: number;
  total_chat_threads: number;
  created_at: Date;
}

class AdminService {
  // API Configuration Management
  async getApiConfigs(provider?: string): Promise<ApiConfig[]> {
    let sql = `
      SELECT id, provider, config_key, config_value, is_active, created_at, updated_at
      FROM api_configs
    `;
    const params: any[] = [];

    if (provider) {
      sql += ' WHERE provider = ?';
      params.push(provider);
    }

    sql += ' ORDER BY provider, config_key';

    const result = await query(sql, params);
    return result.rows;
  }

  async updateApiConfig(
    provider: string,
    configKey: string,
    configValue: string,
    isActive: boolean = true
  ): Promise<ApiConfig> {
    const result = await query(
      `INSERT INTO api_configs (provider, config_key, config_value, is_active)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (provider, config_key)
       DO UPDATE SET config_value = EXCLUDED.config_value,
                     is_active = EXCLUDED.is_active,
                     updated_at = NOW()`,
      [provider, configKey, configValue, isActive]
    );

    return result.rows[0];
  }

  async deleteApiConfig(provider: string, configKey: string): Promise<void> {
    const result = await query(
      'DELETE FROM api_configs WHERE provider = ? AND config_key = ?',
      [provider, configKey]
    );

    if (result.rowCount === 0) {
      throw createError('API configuration not found', 404);
    }
  }

  // Usage Logging and Analytics
  async logUsage(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await query(
      `INSERT INTO api_usage (
        user_id, endpoint, method, status_code, response_time, 
        ip_address, user_agent, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        ipAddress || null,
        userAgent || null,
        errorMessage || null
      ]
    );
  }

  async getUsageLogs(
    limit: number = 100,
    offset: number = 0,
    endpoint?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageLog[]> {
    let sql = `
      SELECT id, user_id, endpoint, method, status_code, response_time, 
             ip_address, user_agent, error_message, created_at
      FROM api_usage
      WHERE 1=1
    `;
    const params: any[] = [];

    if (endpoint) {
      sql += ` AND endpoint = ?`;
      params.push(endpoint);
    }

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    if (startDate) {
      sql += ` AND created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  async generateMetricsRollup(date: Date, metricType: 'DAILY' | 'HOURLY'): Promise<void> {
    try {
      await transaction(async (client) => {

      let dateFilter: string;
      if (metricType === 'DAILY') {
        dateFilter = "date(created_at) = date(?)";
      } else {
        dateFilter = "strftime('%Y-%m-%d %H:00:00', created_at) = strftime('%Y-%m-%d %H:00:00', ?)";
      }

      // Generate overall metrics (from api_usage)
      const overallResult = await query(
        `SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
          AVG(response_time) as avg_response_time_ms,
          COUNT(DISTINCT user_id) as unique_users
        FROM api_usage 
        WHERE ${dateFilter}`,
        [date]
      );

      const overall = overallResult.rows[0];

      await query(
        `INSERT INTO metrics_rollup (
          date, metric_type, total_requests, successful_requests, failed_requests,
          avg_response_time_ms, unique_users
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          date,
          metricType,
          Number(overall.total_requests),
          Number(overall.successful_requests),
          Number(overall.failed_requests),
          Math.round(parseFloat(overall.avg_response_time_ms) || 0),
          Number(overall.unique_users)
        ]
      );

      // Generate per-endpoint metrics
      const endpointResult = await query(
        `SELECT 
          endpoint,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
          AVG(response_time) as avg_response_time_ms,
          COUNT(DISTINCT user_id) as unique_users
        FROM api_usage 
        WHERE ${dateFilter}
        GROUP BY endpoint`,
        [date]
      );

      for (const endpoint of endpointResult.rows) {
        await query(
          `INSERT INTO metrics_rollup (
            date, metric_type, endpoint, total_requests, successful_requests, failed_requests,
            avg_response_time_ms, unique_users
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            date,
            metricType,
            endpoint.endpoint,
            Number(endpoint.total_requests),
            Number(endpoint.successful_requests),
            Number(endpoint.failed_requests),
            Math.round(parseFloat(endpoint.avg_response_time_ms) || 0),
            Number(endpoint.unique_users)
          ]
        );
      }

      });
    } catch (error) {
      throw error;
    }
  }

  async getMetrics(
    startDate: Date,
    endDate: Date,
    metricType: 'DAILY' | 'HOURLY' = 'DAILY',
    endpoint?: string
  ): Promise<MetricsRollup[]> {
    let queryStr = `
      SELECT id, date, metric_type, endpoint, total_requests, successful_requests,
             failed_requests, avg_response_time_ms, unique_users, created_at
      FROM metrics_rollup
      WHERE date >= ? AND date <= ? AND metric_type = ?
    `;
    const params: any[] = [startDate, endDate, metricType];

    if (endpoint) {
      queryStr += ' AND endpoint = ?';
      params.push(endpoint);
    } else {
      queryStr += ' AND endpoint IS NULL';
    }

    queryStr += ' ORDER BY date ASC';

    const result = await query(queryStr, params);
    return result.rows;
  }

  // System Health Monitoring
  async updateSystemHealth(
    component: string,
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN',
    responseTimeMs?: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<SystemHealth> {
    const result = await query(
      `INSERT INTO system_health (component, status, response_time_ms, error_message, metadata)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (component)
       DO UPDATE SET 
         status = EXCLUDED.status,
         last_check = CURRENT_TIMESTAMP,
         response_time_ms = EXCLUDED.response_time_ms,
         error_message = EXCLUDED.error_message,
         metadata = EXCLUDED.metadata,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, component, status, last_check, response_time_ms, error_message, metadata, created_at, updated_at`,
      [
        component,
        status,
        responseTimeMs || null,
        errorMessage || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return result.rows[0];
  }

  async getSystemHealth(): Promise<SystemHealth[]> {
    const result = await query(
      `SELECT id, component, status, last_check, response_time_ms, error_message, metadata, created_at, updated_at
       FROM system_health
       ORDER BY component ASC`
    );

    return result.rows;
  }

  // Rate Limiting
  async checkRateLimit(
    identifier: string,
    identifierType: 'IP' | 'USER' | 'API_KEY',
    endpoint: string,
    limitPerWindow: number,
    windowDurationMinutes: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    try {
      return await transaction(async (client) => {

      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - windowDurationMinutes);

      // Get or create rate limit record
      const result = await query(
        `SELECT id, requests_count, window_start
         FROM rate_limits
         WHERE identifier = $1 AND identifier_type = $2 AND endpoint = $3
         FOR UPDATE`,
        [identifier, identifierType, endpoint]
      );

      let requestsCount = 0;
      let rateLimitId: string;

      if (result.rows.length > 0) {
        const rateLimit = result.rows[0];
        rateLimitId = rateLimit.id;
        
        // Check if we're in the same window
        if (new Date(rateLimit.window_start) > windowStart) {
          requestsCount = rateLimit.requests_count;
        } else {
          // Reset window
          requestsCount = 0;
          await query(
            `UPDATE rate_limits 
             SET requests_count = 0, window_start = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [rateLimitId]
          );
        }
      } else {
        // Create new rate limit record
        const insertResult = await query(
          `INSERT INTO rate_limits (
            identifier, identifier_type, endpoint, requests_count, 
            window_duration_minutes, limit_per_window
          ) VALUES ($1, $2, $3, 0, $4, $5)
          RETURNING id`,
          [identifier, identifierType, endpoint, windowDurationMinutes, limitPerWindow]
        );
        rateLimitId = insertResult.rows[0].id;
      }

      const allowed = requestsCount < limitPerWindow;
      
      if (allowed) {
        // Increment request count
        await query(
          'UPDATE rate_limits SET requests_count = requests_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [rateLimitId]
        );
        requestsCount++;
      }

        const resetTime = new Date();
        resetTime.setMinutes(resetTime.getMinutes() + windowDurationMinutes);

        return {
           allowed,
           remaining: Math.max(0, limitPerWindow - requestsCount - (allowed ? 1 : 0)),
           resetTime
         };
      });
    } catch (error) {
      throw error;
    }
  }

  // Admin Notifications
  async createNotification(
    type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<AdminNotification> {
    const result = await query(
      `INSERT INTO admin_notifications (type, title, message, metadata)
       VALUES (?, ?, ?, ?)
       RETURNING id, type, title, message, is_read, created_at, read_at, metadata`,
      [type, title, message, metadata ? JSON.stringify(metadata) : null]
    );

    return result.rows[0];
  }

  async getNotifications(
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<AdminNotification[]> {
    let sql = `
      SELECT id, type, title, message, is_read, created_at, read_at, metadata
      FROM admin_notifications
    `;
    const params: any[] = [];

    if (unreadOnly) {
      sql += ' WHERE is_read = false';
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await dbQuery(sql, params);
    return result.rows;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const result = await dbQuery(
      `UPDATE admin_notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [notificationId]
    );

    if ((result as any).rowCount === 0) {
      throw createError('Notification not found', 404);
    }
  }

  // System Statistics
  async getSystemStats(): Promise<SystemStats> {
    const result = await dbQuery(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM api_usage WHERE created_at >= now() - interval '24 hours') as active_users_24h,
        (SELECT COUNT(*) FROM api_usage WHERE created_at >= now() - interval '24 hours') as total_requests_24h,
        (SELECT COALESCE(AVG(response_time), 0) FROM api_usage WHERE created_at >= now() - interval '24 hours') as avg_response_time_24h,
        (SELECT COALESCE(COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 0) FROM api_usage WHERE created_at >= now() - interval '24 hours') as error_rate_24h,
        (SELECT COUNT(*) FROM portfolios WHERE is_active = true) as total_portfolios,
        (SELECT COUNT(*) FROM positions WHERE quantity > 0) as total_positions,
        (SELECT COUNT(*) FROM chat_threads WHERE status = 'ACTIVE') as total_chat_threads,
        (SELECT COUNT(*) FROM inquiries) as total_inquiries,
        (SELECT 0) as database_size_mb
    `);

    const stats = result.rows[0];

    // Calculate uptime percentage (simplified - based on system health checks)
    const uptimeResult = await dbQuery(`
      SELECT 
        COUNT(CASE WHEN status = 'HEALTHY' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as uptime_percentage
      FROM system_health
      WHERE last_check >= now() - interval '24 hours'
    `);

    const uptimePercentage = uptimeResult.rows[0]?.uptime_percentage || 100;

    return {
      total_users: Number(stats.total_users),
      active_users_24h: Number(stats.active_users_24h),
      total_requests_24h: Number(stats.total_requests_24h),
      avg_response_time_24h: Math.round(Number(stats.avg_response_time_24h) || 0),
      error_rate_24h: Number(stats.error_rate_24h),
      total_portfolios: Number(stats.total_portfolios),
      total_positions: Number(stats.total_positions),
      total_chat_threads: Number(stats.total_chat_threads),
      total_inquiries: Number(stats.total_inquiries),
      database_size_mb: Number(stats.database_size_mb),
      uptime_percentage: Number(uptimePercentage)
    };
  }

  async getUserActivity(
    limit: number = 50,
    offset: number = 0
  ): Promise<UserActivity[]> {
    const result = await dbQuery(`
      SELECT 
        u.id as user_id,
        u.email,
        u.last_login,
        u.created_at,
        COALESCE(ul.total_requests, 0) as total_requests,
        COALESCE(p.total_portfolios, 0) as total_portfolios,
        COALESCE(ct.total_chat_threads, 0) as total_chat_threads
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as total_requests
        FROM usage_logs
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ) ul ON u.id = ul.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as total_portfolios
        FROM portfolios
        WHERE is_active = true
        GROUP BY user_id
      ) p ON u.id = p.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as total_chat_threads
        FROM chat_threads
        WHERE status = 'ACTIVE'
        GROUP BY user_id
      ) ct ON u.id = ct.user_id
      WHERE u.status = 'ACTIVE'
      ORDER BY u.last_login DESC NULLS LAST
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;
  }

  // Data Cleanup
  async cleanupOldData(daysToKeep: number = 90): Promise<{
    deleted_usage_logs: number;
    deleted_metrics: number;
    deleted_notifications: number;
  }> {
    try {
      return await transaction(async (client) => {

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Delete old usage logs
      const usageResult = await query(
        'DELETE FROM usage_logs WHERE created_at < $1',
        [cutoffDate]
      );

      // Delete old metrics (keep longer retention for metrics)
      const metricsResult = await query(
        'DELETE FROM metrics_rollup WHERE created_at < $1',
        [new Date(cutoffDate.getTime() - (30 * 24 * 60 * 60 * 1000))] // Keep metrics for 30 extra days
      );

      // Delete old read notifications
      const notificationsResult = await query(
        'DELETE FROM admin_notifications WHERE is_read = true AND read_at < $1',
        [cutoffDate]
      );

        return {
          deleted_usage_logs: usageResult.rowCount || 0,
          deleted_metrics: metricsResult.rowCount || 0,
          deleted_notifications: notificationsResult.rowCount || 0
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // GPT Configuration Management
  async getGptConfigs(): Promise<GptConfig[]> {
    const result = await dbQuery(`
      SELECT id, provider, api_key, model, is_active, max_tokens, temperature, created_at, updated_at
      FROM gpt_configs
      ORDER BY provider, created_at DESC
    `);
    return result.rows;
  }

  async createGptConfig(config: Omit<GptConfig, 'id' | 'created_at' | 'updated_at'>): Promise<GptConfig> {
    const result = await dbQuery(`
      INSERT INTO gpt_configs (provider, api_key, model, is_active, max_tokens, temperature)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, provider, api_key, model, is_active, max_tokens, temperature, created_at, updated_at
    `, [config.provider, config.api_key, config.model, config.is_active ?? true, config.max_tokens, config.temperature]);
    
    if (result.rows.length === 0) {
      throw createError('Failed to create GPT configuration', 500);
    }
    
    return result.rows[0];
  }

  async updateGptConfig(id: number, config: Partial<Omit<GptConfig, 'id' | 'created_at' | 'updated_at'>>): Promise<GptConfig> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (config.provider !== undefined) {
      setParts.push(`provider = $${paramIndex++}`);
      values.push(config.provider);
    }
    if (config.api_key !== undefined) {
      setParts.push(`api_key = $${paramIndex++}`);
      values.push(config.api_key);
    }
    if (config.model !== undefined) {
      setParts.push(`model = $${paramIndex++}`);
      values.push(config.model);
    }
    if (config.is_active !== undefined) {
      setParts.push(`is_active = $${paramIndex++}`);
      values.push(config.is_active);
    }
    if (config.max_tokens !== undefined) {
      setParts.push(`max_tokens = $${paramIndex++}`);
      values.push(config.max_tokens);
    }
    if (config.temperature !== undefined) {
      setParts.push(`temperature = $${paramIndex++}`);
      values.push(config.temperature);
    }

    if (setParts.length === 0) {
      throw createError('No fields to update', 400);
    }

    setParts.push(`updated_at = NOW()`);
    values.push(id);

    const result = await dbQuery(`
      UPDATE gpt_configs 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, provider, api_key, model, is_active, max_tokens, temperature, created_at, updated_at
    `, values);

    if (result.rows.length === 0) {
      throw createError('GPT configuration not found', 404);
    }

    return result.rows[0];
  }

  async deleteGptConfig(id: number): Promise<void> {
    const result = await query('DELETE FROM gpt_configs WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      throw createError('GPT configuration not found', 404);
    }
  }

  // System Settings Management
  async getSystemSettings(): Promise<SystemSettings[]> {
    const result = await dbQuery(`
      SELECT key, value, category, updated_at
      FROM system_settings
      ORDER BY category, key
    `);
    return result.rows;
  }

  async updateSystemSetting(key: string, value: string, category?: string): Promise<SystemSettings> {
    const result = await dbQuery(`
      INSERT INTO system_settings (key, value, category, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        category = EXCLUDED.category,
        updated_at = NOW()
      RETURNING key, value, category, updated_at
    `, [key, value, category]);
    
    if (result.rows.length === 0) {
      throw createError('Failed to update system setting', 500);
    }
    
    return result.rows[0];
  }
}

export const adminService = new AdminService();
export default adminService;