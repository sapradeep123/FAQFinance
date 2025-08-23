interface LLMRequest {
    threadId: string;
    question: string;
}
interface ProviderRating {
    provider: string;
    score_percent: number;
}
interface LLMResponse {
    consolidatedAnswer: string;
    ratings: ProviderRating[];
    avgScore: number;
}
declare class LLMService {
    private mockProviders;
    private mockResponses;
    ask({ threadId, question }: LLMRequest): Promise<LLMResponse>;
}
export declare const llmService: LLMService;
export {};
//# sourceMappingURL=llmService.d.ts.map