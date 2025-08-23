import axios from 'axios';
import { config } from '../config/env';
import { query } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LLMProvider {
  name: string;
  models: string[];
  maxTokens: number;
  supportsStreaming: boolean;
}

export class LLMService {
  private readonly providers: Map<string, LLMProvider>;
  private readonly defaultModel: string;
  private readonly maxContextLength: number = 4000;

  constructor() {
    this.defaultModel = config.llm.defaultModel || 'gpt-3.5-turbo';
    this.providers = new Map([
      ['openai', {
        name: 'OpenAI',
        models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'],
        maxTokens: 4096,
        supportsStreaming: true
      }],
      ['anthropic', {
        name: 'Anthropic',
        models: ['claude-3-sonnet', 'claude-3-opus', 'claude-3-haiku'],
        maxTokens: 4096,
        supportsStreaming: true
      }],
      ['local', {
        name: 'Local Model',
        models: ['llama2', 'mistral', 'codellama'],
        maxTokens: 2048,
        supportsStreaming: false
      }]
    ]);
  }

  // Generate AI response
  async generateResponse(
    messages: ChatMessage[],
    model: string = this.defaultModel,
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      systemPrompt?: string;
    } = {}
  ): Promise<ChatResponse> {
    try {
      const provider = this.getProviderForModel(model);
      
      // Prepare messages with system prompt
      const formattedMessages = this.formatMessages(messages, options.systemPrompt);
      
      // Truncate context if too long
      const truncatedMessages = this.truncateContext(formattedMessages);
      
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(truncatedMessages, model, options);
        case 'anthropic':
          return await this.callAnthropic(truncatedMessages, model, options);
        case 'local':
          return await this.callLocalModel(truncatedMessages, model, options);
        default:
          throw new AppError(`Unsupported model: ${model}`, 400);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to generate AI response: ${error.message}`, 500);
    }
  }

  // OpenAI API call
  private async callOpenAI(
    messages: ChatMessage[],
    model: string,
    options: any
  ): Promise<ChatResponse> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: false // For simplicity, not implementing streaming here
      },
      {
        headers: {
          'Authorization': `Bearer ${config.llm.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const choice = response.data.choices[0];
    return {
      message: choice.message.content,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      },
      model,
      finishReason: choice.finish_reason
    };
  }

  // Anthropic API call
  private async callAnthropic(
    messages: ChatMessage[],
    model: string,
    options: any
  ): Promise<ChatResponse> {
    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: model.replace('claude-3-', 'claude-3-'),
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        system: systemMessage?.content || 'You are a helpful AI assistant.',
        messages: conversationMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }))
      },
      {
        headers: {
          'x-api-key': config.llm.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    );

    return {
      message: response.data.content[0].text,
      usage: {
        promptTokens: response.data.usage.input_tokens,
        completionTokens: response.data.usage.output_tokens,
        totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens
      },
      model,
      finishReason: response.data.stop_reason
    };
  }

  // Local model API call (e.g., Ollama)
  private async callLocalModel(
    messages: ChatMessage[],
    model: string,
    options: any
  ): Promise<ChatResponse> {
    const prompt = this.convertMessagesToPrompt(messages);
    
    const response = await axios.post(
      `${config.llm.localModelUrl}/api/generate`,
      {
        model,
        prompt,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 1000
        },
        stream: false
      },
      {
        timeout: 60000 // Local models can be slower
      }
    );

    return {
      message: response.data.response,
      model,
      finishReason: 'stop'
    };
  }

  // Create a new chat session
  async createChatSession(userId: string, title?: string, model?: string): Promise<string> {
    const sessionTitle = title || `Chat ${new Date().toLocaleString()}`;
    const sessionModel = model || this.defaultModel;
    
    const result = await query(
      'INSERT INTO chat_sessions (user_id, title, model, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
      [userId, sessionTitle, sessionModel]
    );
    
    return result.rows[0].id;
  }

  // Get chat session
  async getChatSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const sessionResult = await query(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    
    if (sessionResult.rows.length === 0) {
      return null;
    }
    
    const session = sessionResult.rows[0];
    
    // Get messages
    const messagesResult = await query(
      'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    
    const messages: ChatMessage[] = messagesResult.rows.map(row => ({
      role: row.role,
      content: row.content,
      timestamp: row.created_at
    }));
    
    return {
      id: session.id,
      userId: session.user_id,
      title: session.title,
      messages,
      model: session.model,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };
  }

  // Add message to session
  async addMessageToSession(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    // Verify session belongs to user
    const sessionCheck = await query(
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    
    if (sessionCheck.rows.length === 0) {
      throw new AppError('Chat session not found', 404);
    }
    
    // Add message
    await query(
      'INSERT INTO chat_messages (session_id, role, content, created_at) VALUES ($1, $2, $3, NOW())',
      [sessionId, role, content]
    );
    
    // Update session timestamp
    await query(
      'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
      [sessionId]
    );
  }

  // Get user's chat sessions
  async getUserChatSessions(userId: string, limit: number = 20, offset: number = 0): Promise<ChatSession[]> {
    const result = await query(
      'SELECT id, title, model, created_at, updated_at FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      userId,
      title: row.title,
      messages: [], // Don't load messages for list view
      model: row.model,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // Delete chat session
  async deleteChatSession(sessionId: string, userId: string): Promise<void> {
    const result = await query(
      'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new AppError('Chat session not found', 404);
    }
  }

  // Update session title
  async updateSessionTitle(sessionId: string, userId: string, title: string): Promise<void> {
    const result = await query(
      'UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
      [title, sessionId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new AppError('Chat session not found', 404);
    }
  }

  // Helper methods
  private getProviderForModel(model: string): string {
    for (const [provider, config] of this.providers) {
      if (config.models.includes(model)) {
        return provider;
      }
    }
    return 'openai'; // Default fallback
  }

  private formatMessages(messages: ChatMessage[], systemPrompt?: string): ChatMessage[] {
    const formatted: ChatMessage[] = [];
    
    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }
    
    return [...formatted, ...messages];
  }

  private truncateContext(messages: ChatMessage[]): ChatMessage[] {
    // Simple truncation - keep system message and recent messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    // Estimate token count (rough approximation)
    let tokenCount = 0;
    const truncated: ChatMessage[] = [...systemMessages];
    
    // Add messages from most recent, staying under token limit
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const message = otherMessages[i];
      const messageTokens = Math.ceil(message.content.length / 4); // Rough estimate
      
      if (tokenCount + messageTokens > this.maxContextLength) {
        break;
      }
      
      truncated.unshift(message);
      tokenCount += messageTokens;
    }
    
    return truncated;
  }

  private convertMessagesToPrompt(messages: ChatMessage[]): string {
    return messages
      .map(msg => {
        switch (msg.role) {
          case 'system':
            return `System: ${msg.content}`;
          case 'user':
            return `Human: ${msg.content}`;
          case 'assistant':
            return `Assistant: ${msg.content}`;
          default:
            return msg.content;
        }
      })
      .join('\n\n') + '\n\nAssistant:';
  }

  // Get available models
  getAvailableModels(): { provider: string; models: string[] }[] {
    return Array.from(this.providers.entries()).map(([provider, config]) => ({
      provider,
      models: config.models
    }));
  }

  // Validate model
  isValidModel(model: string): boolean {
    for (const config of this.providers.values()) {
      if (config.models.includes(model)) {
        return true;
      }
    }
    return false;
  }
}

export default LLMService;