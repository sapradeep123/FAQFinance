"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const pool_1 = require("../db/pool");
const errorHandler_1 = require("../middleware/errorHandler");
class LLMService {
    constructor() {
        this.maxContextLength = 4000;
        this.defaultModel = env_1.config.llm.defaultModel || 'gpt-3.5-turbo';
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
    async generateResponse(messages, model = this.defaultModel, options = {}) {
        try {
            const provider = this.getProviderForModel(model);
            const formattedMessages = this.formatMessages(messages, options.systemPrompt);
            const truncatedMessages = this.truncateContext(formattedMessages);
            switch (provider) {
                case 'openai':
                    return await this.callOpenAI(truncatedMessages, model, options);
                case 'anthropic':
                    return await this.callAnthropic(truncatedMessages, model, options);
                case 'local':
                    return await this.callLocalModel(truncatedMessages, model, options);
                default:
                    throw new errorHandler_1.AppError(`Unsupported model: ${model}`, 400);
            }
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            throw new errorHandler_1.AppError(`Failed to generate AI response: ${error.message}`, 500);
        }
    }
    async callOpenAI(messages, model, options) {
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1000,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${env_1.config.llm.openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
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
    async callAnthropic(messages, model, options) {
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');
        const response = await axios_1.default.post('https://api.anthropic.com/v1/messages', {
            model: model.replace('claude-3-', 'claude-3-'),
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
            system: systemMessage?.content || 'You are a helpful AI assistant.',
            messages: conversationMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }))
        }, {
            headers: {
                'x-api-key': env_1.config.llm.anthropicApiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            timeout: 30000
        });
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
    async callLocalModel(messages, model, options) {
        const prompt = this.convertMessagesToPrompt(messages);
        const response = await axios_1.default.post(`${env_1.config.llm.localModelUrl}/api/generate`, {
            model,
            prompt,
            options: {
                temperature: options.temperature || 0.7,
                num_predict: options.maxTokens || 1000
            },
            stream: false
        }, {
            timeout: 60000
        });
        return {
            message: response.data.response,
            model,
            finishReason: 'stop'
        };
    }
    async createChatSession(userId, title, model) {
        const sessionTitle = title || `Chat ${new Date().toLocaleString()}`;
        const sessionModel = model || this.defaultModel;
        const result = await (0, pool_1.query)('INSERT INTO chat_sessions (user_id, title, model, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id', [userId, sessionTitle, sessionModel]);
        return result.rows[0].id;
    }
    async getChatSession(sessionId, userId) {
        const sessionResult = await (0, pool_1.query)('SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
        if (sessionResult.rows.length === 0) {
            return null;
        }
        const session = sessionResult.rows[0];
        const messagesResult = await (0, pool_1.query)('SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC', [sessionId]);
        const messages = messagesResult.rows.map(row => ({
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
    async addMessageToSession(sessionId, userId, role, content) {
        const sessionCheck = await (0, pool_1.query)('SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
        if (sessionCheck.rows.length === 0) {
            throw new errorHandler_1.AppError('Chat session not found', 404);
        }
        await (0, pool_1.query)('INSERT INTO chat_messages (session_id, role, content, created_at) VALUES ($1, $2, $3, NOW())', [sessionId, role, content]);
        await (0, pool_1.query)('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [sessionId]);
    }
    async getUserChatSessions(userId, limit = 20, offset = 0) {
        const result = await (0, pool_1.query)('SELECT id, title, model, created_at, updated_at FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3', [userId, limit, offset]);
        return result.rows.map(row => ({
            id: row.id,
            userId,
            title: row.title,
            messages: [],
            model: row.model,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }
    async deleteChatSession(sessionId, userId) {
        const result = await (0, pool_1.query)('DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
        if (result.rowCount === 0) {
            throw new errorHandler_1.AppError('Chat session not found', 404);
        }
    }
    async updateSessionTitle(sessionId, userId, title) {
        const result = await (0, pool_1.query)('UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3', [title, sessionId, userId]);
        if (result.rowCount === 0) {
            throw new errorHandler_1.AppError('Chat session not found', 404);
        }
    }
    getProviderForModel(model) {
        for (const [provider, config] of this.providers) {
            if (config.models.includes(model)) {
                return provider;
            }
        }
        return 'openai';
    }
    formatMessages(messages, systemPrompt) {
        const formatted = [];
        if (systemPrompt) {
            formatted.push({ role: 'system', content: systemPrompt });
        }
        return [...formatted, ...messages];
    }
    truncateContext(messages) {
        const systemMessages = messages.filter(m => m.role === 'system');
        const otherMessages = messages.filter(m => m.role !== 'system');
        let tokenCount = 0;
        const truncated = [...systemMessages];
        for (let i = otherMessages.length - 1; i >= 0; i--) {
            const message = otherMessages[i];
            const messageTokens = Math.ceil(message.content.length / 4);
            if (tokenCount + messageTokens > this.maxContextLength) {
                break;
            }
            truncated.unshift(message);
            tokenCount += messageTokens;
        }
        return truncated;
    }
    convertMessagesToPrompt(messages) {
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
    getAvailableModels() {
        return Array.from(this.providers.entries()).map(([provider, config]) => ({
            provider,
            models: config.models
        }));
    }
    isValidModel(model) {
        for (const config of this.providers.values()) {
            if (config.models.includes(model)) {
                return true;
            }
        }
        return false;
    }
}
exports.LLMService = LLMService;
exports.default = LLMService;
//# sourceMappingURL=llm.js.map