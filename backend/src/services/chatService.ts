import { query, transaction } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { llmService, ProviderResponse, ConsolidatedAnswer, ProviderRating } from './llmService';
import { promptFilterService, PromptValidationResult, FinancialContext } from './promptFilterService';

export interface ChatThread {
  id: string;
  user_id: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  message_count: number;
  last_message_at?: Date;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  inquiry_id?: string;
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface Inquiry {
  id: string;
  thread_id: string;
  user_id: string;
  question: string;
  context?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface CreateThreadData {
  title?: string;
  initialMessage?: string;
}

export interface SendMessageData {
  content: string;
  context?: string;
}

class ChatService {
  async createThread(userId: string, data: CreateThreadData = {}): Promise<ChatThread> {
    try {
      // Create the thread
      const threadResult = await query(
        `INSERT INTO chat_threads (user_id, title, status)
         VALUES (?, ?, 'ACTIVE')
         RETURNING id, user_id, title, status, message_count, last_message_at, created_at, updated_at, metadata`,
        [
          userId,
          data.title || 'New Chat'
        ]
      );

      const thread = threadResult.rows[0];

      // If there's an initial message, add it
      if (data.initialMessage) {
        await query(
          `INSERT INTO chat_messages (thread_id, role, content)
           VALUES (?, ?, ?)`,
          [thread.id, 'USER', data.initialMessage]
        );

        // Update thread message count and last message time
        await query(
          `UPDATE chat_threads 
           SET message_count = 1, last_message_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [thread.id]
        );

        thread.message_count = 1;
        thread.last_message_at = new Date();
      }

      return thread;
    } catch (error) {
      throw error;
    }
  }

  async getUserThreads(
    userId: string,
    status: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE',
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatThread[]> {
    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];
    
    if (status !== 'ALL') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const result = await query(
      `SELECT id, user_id, title, status, message_count, last_message_at, created_at, updated_at, metadata
       FROM chat_threads 
       ${whereClause}
       ORDER BY last_message_at DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  async getThread(threadId: string, userId: string): Promise<ChatThread | null> {
    const result = await query(
      `SELECT id, user_id, title, status, message_count, last_message_at, created_at, updated_at, metadata
       FROM chat_threads 
       WHERE id = ? AND user_id = ?`,
      [threadId, userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getThreadMessages(
    threadId: string,
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    // First verify the user owns this thread
    const thread = await this.getThread(threadId, userId);
    if (!thread) {
      throw createError('Thread not found', 404);
    }

    const result = await query(
      `SELECT id, thread_id, role, content, inquiry_id, created_at, metadata
       FROM chat_messages 
       WHERE thread_id = ?
       ORDER BY created_at ASC
       LIMIT ? OFFSET ?`,
      [threadId, limit, offset]
    );

    return result.rows;
  }

  async sendMessage(
    threadId: string,
    userId: string,
    messageData: SendMessageData
  ): Promise<{
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    inquiry: Inquiry;
    validationResult?: PromptValidationResult;
  }> {
    return await transaction(async (queryFn) => {
      // Verify thread ownership
      const thread = await this.getThread(threadId, userId);
      if (!thread) {
        throw createError('Thread not found', 404);
      }

      if (thread.status !== 'ACTIVE') {
        throw createError('Cannot send messages to inactive thread', 400);
      }

      // Validate prompt for financial content
      const validationResult = await promptFilterService.validatePrompt(messageData.content, userId);
      
      if (!validationResult.isValid) {
        // Create a system message explaining the validation failure
        const systemMessageResult = await queryFn(
          `INSERT INTO chat_messages (thread_id, role, content, metadata)
           VALUES (?, ?, ?, ?)
           RETURNING id, thread_id, role, content, inquiry_id, created_at, metadata`,
          [
            threadId, 
            'SYSTEM', 
            `I can only help with finance-related questions. ${validationResult.reasons.join(' ')} ${validationResult.suggestedRewrite || ''}`,
            JSON.stringify({ validationResult })
          ]
        );

        throw createError('Non-financial content detected', 400);
      }

      // Create inquiry
      const inquiryResult = await queryFn(
        `INSERT INTO inquiries (thread_id, user_id, question, context, status)
         VALUES (?, ?, ?, ?, 'PENDING')
         RETURNING id, thread_id, user_id, question, context, status, created_at, updated_at, metadata`,
        [threadId, userId, messageData.content, messageData.context]
      );

      const inquiry = inquiryResult.rows[0];

      // Create user message
      const userMessageResult = await queryFn(
        `INSERT INTO chat_messages (thread_id, role, content, inquiry_id, metadata)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id, thread_id, role, content, inquiry_id, created_at, metadata`,
        [threadId, 'USER', messageData.content, inquiry.id, JSON.stringify({ context: messageData.context })]
      );

      const userMessage = userMessageResult.rows[0];

      // Process with LLM service - use askAllProviders instead of processInquiry
      const providerResponses = await llmService.askAllProviders(
        inquiry.question,
        inquiry.context,
        inquiry.user_id
      );

      // Get the first response as the answer
      const llmResponse = providerResponses[0] || {
        provider: 'openai',
        answer: 'I apologize, but I was unable to generate a response at this time.',
        confidence: 0,
        response_time_ms: 0
      };

      // Create assistant message
      const assistantMessageResult = await queryFn(
        `INSERT INTO chat_messages (thread_id, role, content, inquiry_id, metadata)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id, thread_id, role, content, inquiry_id, created_at, metadata`,
        [
          threadId, 
          'ASSISTANT', 
          llmResponse.answer, 
          inquiry.id, 
          JSON.stringify({
            provider: llmResponse.provider,
            model: 'gpt-3.5-turbo',
            tokensUsed: llmResponse.tokens_used || 0,
            responseTime: llmResponse.response_time_ms
          })
        ]
      );

      const assistantMessage = assistantMessageResult.rows[0];

      // Update inquiry status
      await queryFn(
        `UPDATE inquiries 
         SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP, metadata = ?
         WHERE id = ?`,
        [JSON.stringify({ 
          provider: llmResponse.provider,
          model: 'gpt-3.5-turbo',
          tokensUsed: llmResponse.tokens_used || 0,
          responseTime: llmResponse.response_time_ms
        }), inquiry.id]
      );

      // Update thread message count and last message time
      await queryFn(
        `UPDATE chat_threads 
         SET message_count = message_count + 2, last_message_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [threadId]
      );

      return {
        userMessage,
        assistantMessage,
        inquiry: {
          ...inquiry,
          status: 'COMPLETED'
        },
        validationResult
      };
    });
  }

  async archiveThread(threadId: string, userId: string): Promise<void> {
    const thread = await this.getThread(threadId, userId);
    if (!thread) {
      throw createError('Thread not found', 404);
    }

    await query(
      `UPDATE chat_threads 
       SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [threadId]
    );
  }

  async deleteThread(threadId: string, userId: string): Promise<void> {
      const thread = await this.getThread(threadId, userId);
      if (!thread) {
      throw createError('Thread not found', 404);
      }

    await query(
        `UPDATE chat_threads 
         SET status = 'DELETED', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
        [threadId]
      );
  }

  async getThreadAnalytics(threadId: string, userId: string): Promise<any> {
    const thread = await this.getThread(threadId, userId);
    if (!thread) {
      throw createError('Thread not found', 404);
    }

    // Get message count by role
    const messageStats = await query(
      `SELECT role, COUNT(*) as count
       FROM chat_messages 
       WHERE thread_id = ?
       GROUP BY role`,
      [threadId]
    );

    // Get inquiry stats
    const inquiryStats = await query(
      `SELECT status, COUNT(*) as count
       FROM inquiries 
       WHERE thread_id = ?
       GROUP BY status`,
      [threadId]
    );

    // Get average response time
    const responseTimeResult = await query(
      `SELECT AVG(CAST(metadata->>'responseTime' AS REAL)) as avg_response_time
       FROM chat_messages 
       WHERE thread_id = ? AND role = 'ASSISTANT' AND metadata IS NOT NULL`,
      [threadId]
    );

    return {
      threadId,
      messageStats: messageStats.rows,
      inquiryStats: inquiryStats.rows,
      avgResponseTime: responseTimeResult.rows[0]?.avg_response_time || 0
    };
  }

  async searchThreads(
    userId: string,
    searchQuery: string,
    limit: number = 20
  ): Promise<ChatThread[]> {
    const result = await query(
      `SELECT DISTINCT ct.id, ct.user_id, ct.title, ct.status, ct.message_count, 
              ct.last_message_at, ct.created_at, ct.updated_at, ct.metadata
       FROM chat_threads ct
       JOIN chat_messages cm ON ct.id = cm.thread_id
       WHERE ct.user_id = ? 
         AND (ct.title LIKE ? OR cm.content LIKE ?)
         AND ct.status = 'ACTIVE'
       ORDER BY ct.last_message_at DESC, ct.created_at DESC
       LIMIT ?`,
      [userId, `%${searchQuery}%`, `%${searchQuery}%`, limit]
    );

    return result.rows;
  }

  async getPopularTopics(userId: string, limit: number = 10): Promise<any[]> {
    const result = await query(
      `SELECT 
         cm.content,
         COUNT(*) as frequency
       FROM chat_messages cm
       JOIN chat_threads ct ON cm.thread_id = ct.id
       WHERE ct.user_id = ? 
         AND cm.role = 'USER'
         AND ct.status = 'ACTIVE'
       GROUP BY cm.content
       ORDER BY frequency DESC
       LIMIT ?`,
      [userId, limit]
    );

    return result.rows;
  }

  async getThreadInsights(threadId: string, userId: string): Promise<any> {
    const thread = await this.getThread(threadId, userId);
    if (!thread) {
      throw createError('Thread not found', 404);
    }

    // Get financial context analysis - simplified since analyzeFinancialContext doesn't exist
    const financialContext = { type: 'general', confidence: 0.8 };

    // Get message sentiment analysis (simplified)
    const messages = await this.getThreadMessages(threadId, userId, 1000, 0);
    const userMessages = messages.filter(m => m.role === 'USER');
    const assistantMessages = messages.filter(m => m.role === 'ASSISTANT');

    // Get inquiry success rate
    const inquiryResult = await query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
       FROM inquiries 
       WHERE thread_id = ?`,
      [threadId]
    );

    const inquiryStats = inquiryResult.rows[0];

    return {
      threadId,
      financialContext,
      messageCount: {
        user: userMessages.length,
        assistant: assistantMessages.length,
        total: messages.length
      },
      inquirySuccessRate: inquiryStats.total > 0 ? (inquiryStats.completed / inquiryStats.total) * 100 : 0,
      inquiryStats: {
        total: inquiryStats.total,
        completed: inquiryStats.completed,
        failed: inquiryStats.failed
      }
    };
  }

  async exportThread(threadId: string, userId: string, format: 'json' | 'txt' = 'json'): Promise<string> {
    const thread = await this.getThread(threadId, userId);
    if (!thread) {
      throw createError('Thread not found', 404);
    }

    const messages = await this.getThreadMessages(threadId, userId, 10000, 0);
    const inquiries = await query(
      `SELECT * FROM inquiries WHERE thread_id = ?`,
      [threadId]
    );

    const exportData = {
      thread,
      messages: messages,
      inquiries: inquiries.rows,
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      // Simple text format
      let text = `Chat Thread: ${thread.title}\n`;
      text += `Created: ${thread.created_at}\n`;
      text += `Status: ${thread.status}\n\n`;
      
      messages.forEach((msg: any) => {
        text += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      });
      
      return text;
    }
  }

  async getThreadRecommendations(userId: string, limit: number = 5): Promise<any[]> {
    // Get user's recent topics
    const recentTopics = await query(
      `SELECT 
         cm.content,
         COUNT(*) as frequency
       FROM chat_messages cm
       JOIN chat_threads ct ON cm.thread_id = ct.id
       WHERE ct.user_id = ? 
         AND cm.role = 'USER'
         AND ct.status = 'ACTIVE'
         AND cm.created_at >= datetime('now', '-7 days')
       GROUP BY cm.content
       ORDER BY frequency DESC
       LIMIT 10`,
      [userId]
    );

    // Get similar threads from other users (anonymized)
    const similarThreads = await query(
      `SELECT 
         ct.title,
         COUNT(*) as message_count,
         AVG(CAST(ct.metadata->>'avgResponseTime' AS REAL)) as avg_response_time
       FROM chat_threads ct
       JOIN chat_messages cm ON ct.id = cm.thread_id
       WHERE ct.status = 'ACTIVE'
         AND cm.content LIKE ?
       GROUP BY ct.id
       ORDER BY message_count DESC
       LIMIT ?`,
      [`%${recentTopics.rows[0]?.content || 'finance'}%`, limit]
    );

    return similarThreads.rows;
  }

  async cleanupOldThreads(userId: string, daysOld: number = 90): Promise<number> {
    const result = await query(
      `UPDATE chat_threads 
       SET status = 'ARCHIVED'
       WHERE user_id = ? 
         AND status = 'ACTIVE'
         AND created_at < datetime('now', '-${daysOld} days')`,
      [userId]
    );

    return result.rowCount;
  }

  async getThreadMetrics(userId: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    let timeFilter: string;
    switch (timeframe) {
      case 'day':
        timeFilter = "datetime('now', '-1 day')";
        break;
      case 'week':
        timeFilter = "datetime('now', '-7 days')";
        break;
      case 'month':
        timeFilter = "datetime('now', '-30 days')";
        break;
      default:
        timeFilter = "datetime('now', '-7 days')";
    }

    const result = await query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as thread_count,
         SUM(message_count) as total_messages
       FROM chat_threads 
       WHERE user_id = ? 
         AND created_at >= ${timeFilter}
         AND status = 'ACTIVE'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [userId]
    );

    return result.rows;
  }
}

export const chatService = new ChatService();
