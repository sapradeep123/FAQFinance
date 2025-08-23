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
export declare class LLMService {
    private readonly providers;
    private readonly defaultModel;
    private readonly maxContextLength;
    constructor();
    generateResponse(messages: ChatMessage[], model?: string, options?: {
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
        systemPrompt?: string;
    }): Promise<ChatResponse>;
    private callOpenAI;
    private callAnthropic;
    private callLocalModel;
    createChatSession(userId: string, title?: string, model?: string): Promise<string>;
    getChatSession(sessionId: string, userId: string): Promise<ChatSession | null>;
    addMessageToSession(sessionId: string, userId: string, role: 'user' | 'assistant', content: string): Promise<void>;
    getUserChatSessions(userId: string, limit?: number, offset?: number): Promise<ChatSession[]>;
    deleteChatSession(sessionId: string, userId: string): Promise<void>;
    updateSessionTitle(sessionId: string, userId: string, title: string): Promise<void>;
    private getProviderForModel;
    private formatMessages;
    private truncateContext;
    private convertMessagesToPrompt;
    getAvailableModels(): {
        provider: string;
        models: string[];
    }[];
    isValidModel(model: string): boolean;
}
export default LLMService;
//# sourceMappingURL=llm.d.ts.map