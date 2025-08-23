import { pool } from '../db/pool';
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
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create the thread
      const threadResult = await client.query(
        `INSERT INTO chat_threads (user_id, title, status)
         VALUES ($1, $2, 'ACTIVE')
         RETURNING id, user_id, title, status, message_count, last_message_at, created_at, updated_at, metadata`,
        [
          userId,
          data.title || 'New Chat'
        ]
      );

      const thread = threadResult.rows[0];

      // If there's an initial message, add it
      if (data.initialMessage) {
        await client.query(
          `INSERT INTO chat_messages (thread_id, role, content)
           VALUES ($1, 'USER', $2)`,
          [thread.id, data.initialMessage]
        );

        // Update thread message count and last message time
        await client.query(
          `UPDATE chat_threads 
           SET message_count = 1, last_message_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [thread.id]
        );

        thread.message_count = 1;
        thread.last_message_at = new Date();
      }

      await client.query('COMMIT');
      return thread;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserThreads(
    userId: string,
    status: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE',
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatThread[]> {
    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];
    
    if (status !== 'ALL') {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    const result = await pool.query(
      `SELECT id, user_id, title, status, message_count, last_message_at, created_at, updated_at, metadata
       FROM chat_threads 
       ${whereClause}
       ORDER BY last_message_at DESC NULLS LAST, created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  async getThread(threadId: string, userId: string): Promise<ChatThread | null> {
    const result = await pool.query(
      `SELECT id, user_id, title, status, message_count, last_message_at, created_at, updated_at, metadata
       FROM chat_threads 
       WHERE id = $1 AND user_id = $2`,
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
      throw createError(404, 'Thread not found');
    }

    const result = await pool.query(
      `SELECT id, thread_id, role, content, inquiry_id, created_at, metadata
       FROM chat_messages 
       WHERE thread_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
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
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify thread ownership
      const thread = await this.getThread(threadId, userId);
      if (!thread) {
        throw createError(404, 'Thread not found');
      }

      if (thread.status !== 'ACTIVE') {
        throw createError(400, 'Cannot send messages to inactive thread');
      }

      // Validate prompt for financial content
      const validationResult = await promptFilterService.validatePrompt(messageData.content, userId);
      
      if (!validationResult.isValid) {
        // Create a system message explaining the validation failure
        const systemMessageResult = await client.query(
          `INSERT INTO chat_messages (thread_id, role, content, metadata)
           VALUES ($1, 'SYSTEM', $2, $3)
           RETURNING id, thread_id, role, content, inquiry_id, created_at, metadata`,
          [
            threadId, 
            `I can only help with finance-related questions. ${validationResult.reasons.join(' ')} ${validationResult.suggestedRewrite || ''}`,
            JSON.stringify({ validationResult })
          ]
        );

        await client.query('COMMIT');
        
        throw createError(400, 'Non-financial content detected', {
          validationResult,
          systemMessage: systemMessageResult.rows[0]
        });
      }

      // Extract financial context for enhanced processing
      const financialContext = promptFilterService.extractFinancialContext(messageData.content);
      const enhancedPrompt = promptFilterService.enhancePromptWithContext(messageData.content, financialContext);

      // Add user message
      const userMessageResult = await client.query(
        `INSERT INTO chat_messages (thread_id, role, content, metadata)
         VALUES ($1, 'USER', $2, $3)
         RETURNING id, thread_id, role, content, inquiry_id, created_at, metadata`,
        [threadId, messageData.content, JSON.stringify({ validationResult, financialContext })]
      );

      const userMessage = userMessageResult.rows[0];

      // Create inquiry for processing with enhanced prompt
      const inquiryResult = await client.query(
        `INSERT INTO inquiries (thread_id, user_id, question, context, status, metadata)
         VALUES ($1, $2, $3, $4, 'PENDING', $5)
         RETURNING id, thread_id, user_id, question, context, status, created_at, updated_at, metadata`,
        [
          threadId, 
          userId, 
          enhancedPrompt, // Use enhanced prompt for AI processing
          messageData.context, 
          JSON.stringify({ originalPrompt: messageData.content, financialContext, validationResult })
        ]
      );

      const inquiry = inquiryResult.rows[0];

      // Update thread statistics
      await client.query(
        `UPDATE chat_threads 
         SET message_count = message_count + 1, 
             last_message_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [threadId]
      );

      await client.query('COMMIT');

      // Process the inquiry asynchronously
      const assistantMessage = await this.processInquiry(inquiry.id);

      return {
        userMessage,
        assistantMessage,
        inquiry,
        validationResult
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async processInquiry(inquiryId: string): Promise<ChatMessage> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update inquiry status to processing
      await client.query(
        'UPDATE inquiries SET status = \'PROCESSING\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [inquiryId]
      );

      // Get inquiry details
      const inquiryResult = await client.query(
        'SELECT id, thread_id, user_id, question, context FROM inquiries WHERE id = $1',
        [inquiryId]
      );

      if (inquiryResult.rows.length === 0) {
        throw createError(404, 'Inquiry not found');
      }

      const inquiry = inquiryResult.rows[0];

      // Get provider responses
      const providerResponses = await llmService.askAllProviders(
        inquiry.question,
        inquiry.context,
        inquiry.user_id
      );

      // Store provider answers
      for (const response of providerResponses) {
        await client.query(
          `INSERT INTO provider_answers (
            inquiry_id, provider, answer, confidence, response_time_ms, 
            tokens_used, cost_cents, error_message, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            inquiryId,
            response.provider,
            response.answer,
            response.confidence,
            response.response_time_ms,
            response.tokens_used || 0,
            response.cost_cents || 0,
            response.error || null,
            JSON.stringify(response.metadata || {})
          ]
        );
      }

      // Consolidate answers
      const consolidatedAnswer = await llmService.consolidateAnswers(providerResponses);

      // Store consolidated answer
      const consolidatedResult = await client.query(
        `INSERT INTO consolidated_answers (
          inquiry_id, answer, confidence, sources, methodology, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          inquiryId,
          consolidatedAnswer.answer,
          consolidatedAnswer.confidence,
          consolidatedAnswer.sources,
          consolidatedAnswer.methodology,
          JSON.stringify({
            provider_responses: consolidatedAnswer.provider_responses.length,
            processing_time: Date.now()
          })
        ]
      );

      const consolidatedAnswerId = consolidatedResult.rows[0].id;

      // Get ratings for the consolidated answer
      const ratings = await llmService.rateConsolidatedAnswer(
        consolidatedAnswer,
        inquiry.question
      );

      // Store ratings
      for (const rating of ratings) {
        await client.query(
          `INSERT INTO provider_ratings (
            consolidated_answer_id, provider, correctness_percentage, reasoning, rated_by
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            consolidatedAnswerId,
            rating.provider,
            rating.correctness_percentage,
            rating.reasoning,
            rating.rated_by
          ]
        );
      }

      // Create assistant message
      const assistantMessageResult = await client.query(
        `INSERT INTO chat_messages (thread_id, role, content, inquiry_id, metadata)
         VALUES ($1, 'ASSISTANT', $2, $3, $4)
         RETURNING id, thread_id, role, content, inquiry_id, created_at, metadata`,
        [
          inquiry.thread_id,
          consolidatedAnswer.answer,
          inquiryId,
          JSON.stringify({
            confidence: consolidatedAnswer.confidence,
            sources: consolidatedAnswer.sources,
            methodology: consolidatedAnswer.methodology
          })
        ]
      );

      const assistantMessage = assistantMessageResult.rows[0];

      // Update inquiry status to completed
      await client.query(
        'UPDATE inquiries SET status = \'COMPLETED\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [inquiryId]
      );

      // Update thread statistics
      await client.query(
        `UPDATE chat_threads 
         SET message_count = message_count + 1, 
             last_message_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [inquiry.thread_id]
      );

      await client.query('COMMIT');
      return assistantMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Update inquiry status to failed
      try {
        await pool.query(
          'UPDATE inquiries SET status = \'FAILED\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [inquiryId]
        );
      } catch (updateError) {
        console.error('Failed to update inquiry status to FAILED:', updateError);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  async updateThreadTitle(threadId: string, userId: string, title: string): Promise<ChatThread> {
    const result = await pool.query(
      `UPDATE chat_threads 
       SET title = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, title, status, message_count, last_message_at, created_at, updated_at, metadata`,
      [title, threadId, userId]
    );

    if (result.rows.length === 0) {
      throw createError(404, 'Thread not found');
    }

    return result.rows[0];
  }

  async archiveThread(threadId: string, userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE chat_threads 
       SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [threadId, userId]
    );

    if (result.rowCount === 0) {
      throw createError(404, 'Thread not found');
    }
  }

  async deleteThread(threadId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify thread ownership
      const thread = await this.getThread(threadId, userId);
      if (!thread) {
        throw createError(404, 'Thread not found');
      }

      // Soft delete - mark as deleted instead of actually deleting
      await client.query(
        `UPDATE chat_threads 
         SET status = 'DELETED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [threadId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getInquiryDetails(inquiryId: string, userId: string): Promise<{
    inquiry: Inquiry;
    providerAnswers: ProviderResponse[];
    consolidatedAnswer?: ConsolidatedAnswer;
    ratings?: ProviderRating[];
  }> {
    // Get inquiry
    const inquiryResult = await pool.query(
      `SELECT i.id, i.thread_id, i.user_id, i.question, i.context, i.status, i.created_at, i.updated_at, i.metadata
       FROM inquiries i
       JOIN chat_threads t ON i.thread_id = t.id
       WHERE i.id = $1 AND t.user_id = $2`,
      [inquiryId, userId]
    );

    if (inquiryResult.rows.length === 0) {
      throw createError(404, 'Inquiry not found');
    }

    const inquiry = inquiryResult.rows[0];

    // Get provider answers
    const providerAnswersResult = await pool.query(
      `SELECT provider, answer, confidence, response_time_ms, tokens_used, cost_cents, error_message, metadata, created_at
       FROM provider_answers
       WHERE inquiry_id = $1
       ORDER BY created_at ASC`,
      [inquiryId]
    );

    const providerAnswers: ProviderResponse[] = providerAnswersResult.rows.map(row => ({
      provider: row.provider,
      answer: row.answer,
      confidence: parseFloat(row.confidence),
      response_time_ms: row.response_time_ms,
      tokens_used: row.tokens_used,
      cost_cents: row.cost_cents,
      error: row.error_message,
      metadata: row.metadata
    }));

    // Get consolidated answer if available
    const consolidatedResult = await pool.query(
      `SELECT id, answer, confidence, sources, methodology, metadata, created_at
       FROM consolidated_answers
       WHERE inquiry_id = $1`,
      [inquiryId]
    );

    let consolidatedAnswer: ConsolidatedAnswer | undefined;
    let ratings: ProviderRating[] | undefined;

    if (consolidatedResult.rows.length > 0) {
      const consolidated = consolidatedResult.rows[0];
      
      // Get ratings for this consolidated answer
      const ratingsResult = await pool.query(
        `SELECT provider, correctness_percentage, reasoning, rated_by, created_at
         FROM provider_ratings
         WHERE consolidated_answer_id = $1
         ORDER BY created_at ASC`,
        [consolidated.id]
      );

      ratings = ratingsResult.rows.map(row => ({
        provider: row.provider,
        correctness_percentage: parseFloat(row.correctness_percentage),
        reasoning: row.reasoning,
        rated_by: row.rated_by
      }));

      consolidatedAnswer = {
        answer: consolidated.answer,
        confidence: parseFloat(consolidated.confidence),
        sources: consolidated.sources,
        methodology: consolidated.methodology,
        provider_responses: providerAnswers
      };
    }

    return {
      inquiry,
      providerAnswers,
      consolidatedAnswer,
      ratings
    };
  }

  async searchThreads(
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<ChatThread[]> {
    const result = await pool.query(
      `SELECT DISTINCT t.id, t.user_id, t.title, t.status, t.message_count, t.last_message_at, t.created_at, t.updated_at, t.metadata
       FROM chat_threads t
       LEFT JOIN chat_messages m ON t.id = m.thread_id
       WHERE t.user_id = $1 
         AND t.status != 'DELETED'
         AND (t.title ILIKE $2 OR m.content ILIKE $2)
       ORDER BY t.last_message_at DESC NULLS LAST, t.created_at DESC
       LIMIT $3`,
      [userId, `%${query}%`, limit]
    );

    return result.rows;
  }

  async getChatStatistics(userId: string): Promise<{
    total_threads: number;
    active_threads: number;
    total_messages: number;
    total_inquiries: number;
    avg_response_time_ms: number;
  }> {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT t.id) as total_threads,
        COUNT(DISTINCT CASE WHEN t.status = 'ACTIVE' THEN t.id END) as active_threads,
        COALESCE(SUM(t.message_count), 0) as total_messages,
        COUNT(DISTINCT i.id) as total_inquiries,
        COALESCE(AVG(pa.response_time_ms), 0) as avg_response_time_ms
      FROM chat_threads t
      LEFT JOIN inquiries i ON t.id = i.thread_id
      LEFT JOIN provider_answers pa ON i.id = pa.inquiry_id
      WHERE t.user_id = $1 AND t.status != 'DELETED'`,
      [userId]
    );

    const stats = result.rows[0];
    return {
      total_threads: parseInt(stats.total_threads),
      active_threads: parseInt(stats.active_threads),
      total_messages: parseInt(stats.total_messages),
      total_inquiries: parseInt(stats.total_inquiries),
      avg_response_time_ms: Math.round(parseFloat(stats.avg_response_time_ms))
    };
  }
}

export const chatService = new ChatService();
export default chatService;