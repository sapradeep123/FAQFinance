import { query, transaction } from '../config/database';
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
    let query = `
      SELECT id, provider, config_key, config_value, is_active, created_at, updated_at
      FROM api_configs
    `;
    const params: any[] = [];

    if (provider) {
      query += ' WHERE provider = $1';
      params.push(provider);
    }

    query += ' ORDER BY provider, config_key';

    const result = await query(query, params);
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
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider, config_key)
       DO UPDATE SET 
         config_value = EXCLUDED.config_value,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, provider, config_key, config_value, is_active, created_at, updated_at`,
      [provider, configKey, configValue, isActive]
    );

    return result.rows[0];
  }

  async deleteApiConfig(provider: string, configKey: string): Promise<void> {
    const result = await query(
      'DELETE FROM api_configs WHERE provider = $1 AND config_key = $2',
      [provider, configKey]
    );

    if (result.rowCount === 0) {
      throw createError(404, 'API configuration not found');
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
      `INSERT INTO usage_logs (
        user_id, endpoint, method, status_code, response_time_ms, 
        ip_address, user_agent, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
    let query = `
      SELECT id, user_id, endpoint, method, status_code, response_time_ms, 
             ip_address, user_agent, error_message, created_at
      FROM usage_logs
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (endpoint) {
      query += ` AND endpoint = $${paramIndex++}`;
      params.push(endpoint);
    }

    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(query, params);
    return result.rows;
  }

  async generateMetricsRollup(date: Date, metricType: 'DAILY' | 'HOURLY'): Promise<void> {
    try {
      await transaction(async (client) => {

      let dateFilter: string;
      if (metricType === 'DAILY') {
        dateFilter = 'DATE(created_at) = DATE($1)';
      } else {
        dateFilter = 'DATE_TRUNC(\'hour\', created_at) = DATE_TRUNC(\'hour\', $1)';
      }

      // Generate overall metrics
      const overallResult = await query(
        `SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
          AVG(response_time_ms) as avg_response_time_ms,
          COUNT(DISTINCT user_id) as unique_users
        FROM usage_logs 
        WHERE ${dateFilter}`,
        [date]
      );

      const overall = overallResult.rows[0];

      await query(
        `INSERT INTO metrics_rollup (
          date, metric_type, total_requests, successful_requests, failed_requests,
          avg_response_time_ms, unique_users
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (date, metric_type, endpoint)
        DO UPDATE SET 
          total_requests = EXCLUDED.total_requests,
          successful_requests = EXCLUDED.successful_requests,
          failed_requests = EXCLUDED.failed_requests,
          avg_response_time_ms = EXCLUDED.avg_response_time_ms,
          unique_users = EXCLUDED.unique_users`,
        [
          date,
          metricType,
          parseInt(overall.total_requests),
          parseInt(overall.successful_requests),
          parseInt(overall.failed_requests),
          Math.round(parseFloat(overall.avg_response_time_ms) || 0),
          parseInt(overall.unique_users)
        ]
      );

      // Generate per-endpoint metrics
      const endpointResult = await query(
        `SELECT 
          endpoint,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
          AVG(response_time_ms) as avg_response_time_ms,
          COUNT(DISTINCT user_id) as unique_users
        FROM usage_logs 
        WHERE ${dateFilter}
        GROUP BY endpoint`,
        [date]
      );

      for (const endpoint of endpointResult.rows) {
        await query(
          `INSERT INTO metrics_rollup (
            date, metric_type, endpoint, total_requests, successful_requests, failed_requests,
            avg_response_time_ms, unique_users
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (date, metric_type, endpoint)
          DO UPDATE SET 
            total_requests = EXCLUDED.total_requests,
            successful_requests = EXCLUDED.successful_requests,
            failed_requests = EXCLUDED.failed_requests,
            avg_response_time_ms = EXCLUDED.avg_response_time_ms,
            unique_users = EXCLUDED.unique_users`,
          [
            date,
            metricType,
            endpoint.endpoint,
            parseInt(endpoint.total_requests),
            parseInt(endpoint.successful_requests),
            parseInt(endpoint.failed_requests),
            Math.round(parseFloat(endpoint.avg_response_time_ms) || 0),
            parseInt(endpoint.unique_users)
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
    let query = `
      SELECT id, date, metric_type, endpoint, total_requests, successful_requests,
             failed_requests, avg_response_time_ms, unique_users, created_at
      FROM metrics_rollup
      WHERE date >= $1 AND date <= $2 AND metric_type = $3
    `;
    const params: any[] = [startDate, endDate, metricType];

    if (endpoint) {
      query += ' AND endpoint = $4';
      params.push(endpoint);
    } else {
      query += ' AND endpoint IS NULL';
    }

    query += ' ORDER BY date ASC';

    const result = await query(query, params);
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
       VALUES ($1, $2, $3, $4, $5)
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
           remaining: Math.max(0, maxRequests - requestsCount - (allowed ? 1 : 0)),
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
       VALUES ($1, $2, $3, $4)
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
    let query = `
      SELECT id, type, title, message, is_read, created_at, read_at, metadata
      FROM admin_notifications
    `;
    const params: any[] = [];

    if (unreadOnly) {
      query += ' WHERE is_read = false';
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(query, params);
    return result.rows;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const result = await query(
      `UPDATE admin_notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [notificationId]
    );

    if (result.rowCount === 0) {
      throw createError(404, 'Notification not found');
    }
  }

  // System Statistics
  async getSystemStats(): Promise<SystemStats> {
    const result = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM usage_logs WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') as active_users_24h,
        (SELECT COUNT(*) FROM usage_logs WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') as total_requests_24h,
        (SELECT COALESCE(AVG(response_time_ms), 0) FROM usage_logs WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') as avg_response_time_24h,
        (SELECT COALESCE(COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 0) FROM usage_logs WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') as error_rate_24h,
        (SELECT COUNT(*) FROM portfolios WHERE is_active = true) as total_portfolios,
        (SELECT COUNT(*) FROM positions WHERE quantity > 0) as total_positions,
        (SELECT COUNT(*) FROM chat_threads WHERE status = 'ACTIVE') as total_chat_threads,
        (SELECT COUNT(*) FROM inquiries) as total_inquiries,
        (SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2)) as database_size_mb
    `);

    const stats = result.rows[0];

    // Calculate uptime percentage (simplified - based on system health checks)
    const uptimeResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'HEALTHY' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as uptime_percentage
      FROM system_health
      WHERE last_check >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `);

    const uptimePercentage = uptimeResult.rows[0]?.uptime_percentage || 100;

    return {
      total_users: parseInt(stats.total_users),
      active_users_24h: parseInt(stats.active_users_24h),
      total_requests_24h: parseInt(stats.total_requests_24h),
      avg_response_time_24h: Math.round(parseFloat(stats.avg_response_time_24h)),
      error_rate_24h: parseFloat(stats.error_rate_24h),
      total_portfolios: parseInt(stats.total_portfolios),
      total_positions: parseInt(stats.total_positions),
      total_chat_threads: parseInt(stats.total_chat_threads),
      total_inquiries: parseInt(stats.total_inquiries),
      database_size_mb: parseFloat(stats.database_size_mb),
      uptime_percentage: parseFloat(uptimePercentage)
    };
  }

  async getUserActivity(
    limit: number = 50,
    offset: number = 0
  ): Promise<UserActivity[]> {
    const result = await query(`
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
    const result = await query(`
      SELECT id, provider, api_key, model, is_active, max_tokens, temperature, created_at, updated_at
      FROM gpt_configs
      ORDER BY provider, created_at DESC
    `);
    return result.rows;
  }

  async createGptConfig(config: Omit<GptConfig, 'id' | 'created_at' | 'updated_at'>): Promise<GptConfig> {
    const result = await query(`
      INSERT INTO gpt_configs (provider, api_key, model, is_active, max_tokens, temperature)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, provider, api_key, model, is_active, max_tokens, temperature, created_at, updated_at
    `, [config.provider, config.api_key, config.model, config.is_active ?? true, config.max_tokens, config.temperature]);
    
    if (result.rows.length === 0) {
      throw createError(500, 'Failed to create GPT configuration');
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
      throw createError(400, 'No fields to update');
    }

    setParts.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(`
      UPDATE gpt_configs 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, provider, api_key, model, is_active, max_tokens, temperature, created_at, updated_at
    `, values);

    if (result.rows.length === 0) {
      throw createError(404, 'GPT configuration not found');
    }

    return result.rows[0];
  }

  async deleteGptConfig(id: number): Promise<void> {
    const result = await query('DELETE FROM gpt_configs WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      throw createError(404, 'GPT configuration not found');
    }
  }

  // System Settings Management
  async getSystemSettings(): Promise<SystemSettings[]> {
    const result = await query(`
      SELECT key, value, category, updated_at
      FROM system_settings
      ORDER BY category, key
    `);
    return result.rows;
  }

  async updateSystemSetting(key: string, value: string, category?: string): Promise<SystemSettings> {
    const result = await query(`
      INSERT INTO system_settings (key, value, category, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        category = EXCLUDED.category,
        updated_at = NOW()
      RETURNING key, value, category, updated_at
    `, [key, value, category]);
    
    if (result.rows.length === 0) {
      throw createError(500, 'Failed to update system setting');
    }
    
    return result.rows[0];
  }
}

export const adminService = new AdminService();
export default adminService;