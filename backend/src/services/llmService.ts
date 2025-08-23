import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';

export interface ApiProvider {
  id: string;
  provider: 'YAHOO' | 'GOOGLE' | 'FALLBACK';
  name: string;
  base_url: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'RATE_LIMITED';
  priority: number;
  timeout_ms: number;
  config: Record<string, any>;
}

export interface ProviderResponse {
  provider: 'YAHOO' | 'GOOGLE' | 'FALLBACK';
  answer: string;
  confidence: number;
  response_time_ms: number;
  tokens_used?: number;
  cost_cents?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ConsolidatedAnswer {
  answer: string;
  confidence: number;
  sources: string[];
  methodology: string;
  provider_responses: ProviderResponse[];
}

export interface ProviderRating {
  provider: 'YAHOO' | 'GOOGLE' | 'FALLBACK';
  correctness_percentage: number;
  reasoning: string;
  rated_by: 'YAHOO' | 'GOOGLE' | 'FALLBACK';
}

class LLMService {
  private async getActiveProviders(): Promise<ApiProvider[]> {
    const result = await pool.query(
      `SELECT id, provider, name, base_url, status, priority, timeout_ms, config
       FROM api_configs 
       WHERE status = 'ACTIVE'
       ORDER BY priority ASC`,
      []
    );

    return result.rows;
  }

  private async mockProviderCall(
    provider: ApiProvider,
    question: string,
    context?: string
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    
    // Simulate network delay
    const delay = provider.config.delay_ms || Math.random() * 1000 + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    const responseTime = Date.now() - startTime;

    // Mock responses based on provider
    const mockResponses = this.generateMockResponse(provider.provider, question, context);
    
    return {
      provider: provider.provider,
      answer: mockResponses.answer,
      confidence: mockResponses.confidence,
      response_time_ms: responseTime,
      tokens_used: Math.floor(Math.random() * 100) + 50,
      cost_cents: Math.floor(Math.random() * 10) + 1,
      metadata: {
        model: mockResponses.model,
        version: provider.config.version || '1.0'
      }
    };
  }

  private generateMockResponse(
    provider: 'YAHOO' | 'GOOGLE' | 'FALLBACK',
    question: string,
    context?: string
  ): { answer: string; confidence: number; model: string } {
    const lowerQuestion = question.toLowerCase();
    
    // Determine topic for more relevant responses
    let topic = 'general';
    if (lowerQuestion.includes('stock') || lowerQuestion.includes('share') || lowerQuestion.includes('equity')) {
      topic = 'stocks';
    } else if (lowerQuestion.includes('bond') || lowerQuestion.includes('treasury') || lowerQuestion.includes('yield')) {
      topic = 'bonds';
    } else if (lowerQuestion.includes('crypto') || lowerQuestion.includes('bitcoin') || lowerQuestion.includes('ethereum')) {
      topic = 'crypto';
    } else if (lowerQuestion.includes('loan') || lowerQuestion.includes('mortgage') || lowerQuestion.includes('credit')) {
      topic = 'lending';
    } else if (lowerQuestion.includes('tax') || lowerQuestion.includes('irs') || lowerQuestion.includes('deduction')) {
      topic = 'tax';
    } else if (lowerQuestion.includes('portfolio') || lowerQuestion.includes('diversif') || lowerQuestion.includes('allocation')) {
      topic = 'portfolio';
    }

    const responses = {
      YAHOO: {
        stocks: {
          answers: [
            "Based on Yahoo Finance data, stock performance depends on various market factors including earnings, sector trends, and economic indicators. Consider diversifying your portfolio across different sectors and market caps.",
            "Yahoo Finance shows that blue-chip stocks typically offer more stability but lower growth potential compared to growth stocks. Historical data suggests a balanced approach works best for most investors.",
            "According to Yahoo's market analysis, current market volatility suggests focusing on dividend-paying stocks and companies with strong fundamentals and consistent earnings growth."
          ],
          confidence: 0.85,
          model: "Yahoo-Finance-AI-v2"
        },
        bonds: {
          answers: [
            "Yahoo Finance bond data indicates that rising interest rates typically decrease bond prices. Consider laddering bond maturities to manage interest rate risk.",
            "Based on Yahoo's fixed income analysis, government bonds offer safety but lower yields, while corporate bonds provide higher yields with increased credit risk."
          ],
          confidence: 0.80,
          model: "Yahoo-Finance-AI-v2"
        },
        general: {
          answers: [
            "According to Yahoo Finance, successful investing requires understanding your risk tolerance, time horizon, and financial goals. Diversification remains a key principle.",
            "Yahoo's financial experts recommend starting with index funds for beginners, as they provide instant diversification and typically have lower fees than actively managed funds."
          ],
          confidence: 0.75,
          model: "Yahoo-Finance-AI-v2"
        }
      },
      GOOGLE: {
        stocks: {
          answers: [
            "Google Finance analysis suggests that fundamental analysis combined with technical indicators provides the best framework for stock evaluation. Focus on P/E ratios, revenue growth, and market position.",
            "Based on Google's market research, ESG (Environmental, Social, Governance) factors are increasingly important in stock selection, with sustainable companies showing better long-term performance.",
            "Google's AI models indicate that market timing is difficult; dollar-cost averaging into quality stocks tends to produce better results over time."
          ],
          confidence: 0.88,
          model: "Google-Finance-LLM-v3"
        },
        crypto: {
          answers: [
            "Google's cryptocurrency analysis shows high volatility and regulatory uncertainty. Only invest what you can afford to lose, and consider crypto as a small portion of your overall portfolio.",
            "Based on Google's blockchain research, Bitcoin and Ethereum have the strongest network effects, but newer cryptocurrencies carry significantly higher risks."
          ],
          confidence: 0.70,
          model: "Google-Finance-LLM-v3"
        },
        general: {
          answers: [
            "Google's financial research emphasizes the importance of emergency funds (3-6 months expenses) before investing. Compound interest is your most powerful wealth-building tool.",
            "According to Google's analysis, asset allocation should match your age and risk tolerance. The rule of thumb: subtract your age from 100 to determine your stock allocation percentage."
          ],
          confidence: 0.82,
          model: "Google-Finance-LLM-v3"
        }
      },
      FALLBACK: {
        general: {
          answers: [
            "Financial planning requires careful consideration of your personal circumstances. Common principles include diversification, regular saving, and understanding your risk tolerance.",
            "Investment success typically comes from consistent, disciplined approaches rather than trying to time the market. Consider consulting with a financial advisor for personalized advice.",
            "Basic financial health involves budgeting, building an emergency fund, managing debt, and investing for long-term goals. Start with what you can afford and gradually increase your investments."
          ],
          confidence: 0.65,
          model: "Fallback-Finance-v1"
        }
      }
    };

    const providerResponses = responses[provider];
    const topicResponses = providerResponses[topic as keyof typeof providerResponses] || providerResponses.general;
    const randomAnswer = topicResponses.answers[Math.floor(Math.random() * topicResponses.answers.length)];
    
    // Add context-specific information if portfolio context is provided
    let finalAnswer = randomAnswer;
    if (context && context.includes('portfolio')) {
      finalAnswer += " Given your portfolio context, consider how this advice applies to your current holdings and risk profile.";
    }

    return {
      answer: finalAnswer,
      confidence: topicResponses.confidence + (Math.random() * 0.1 - 0.05), // Add small random variation
      model: topicResponses.model
    };
  }

  async askAllProviders(
    question: string,
    context?: string,
    userId?: string
  ): Promise<ProviderResponse[]> {
    const providers = await this.getActiveProviders();
    
    if (providers.length === 0) {
      throw createError(503, 'No active API providers available');
    }

    // Call all providers in parallel
    const providerPromises = providers.map(async (provider) => {
      try {
        return await this.mockProviderCall(provider, question, context);
      } catch (error) {
        // Return error response for failed providers
        return {
          provider: provider.provider,
          answer: '',
          confidence: 0,
          response_time_ms: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const responses = await Promise.all(providerPromises);
    
    // Log usage for each provider call
    if (userId) {
      for (const response of responses) {
        await this.logProviderUsage(userId, response);
      }
    }

    return responses;
  }

  async consolidateAnswers(responses: ProviderResponse[]): Promise<ConsolidatedAnswer> {
    // Filter out failed responses
    const validResponses = responses.filter(r => !r.error && r.answer.length > 0);
    
    if (validResponses.length === 0) {
      throw createError(503, 'All API providers failed to respond');
    }

    // Sort by confidence score
    validResponses.sort((a, b) => b.confidence - a.confidence);
    
    // Use the highest confidence answer as the base
    const primaryResponse = validResponses[0];
    let consolidatedAnswer = primaryResponse.answer;
    
    // If we have multiple valid responses, create a more comprehensive answer
    if (validResponses.length > 1) {
      const secondaryInsights = validResponses.slice(1)
        .filter(r => r.confidence > 0.6) // Only include reasonably confident responses
        .map(r => r.answer)
        .join(' ');
      
      if (secondaryInsights.length > 0) {
        // Simple consolidation - in a real implementation, you'd use more sophisticated NLP
        consolidatedAnswer += ` Additionally, ${secondaryInsights}`;
      }
    }

    // Calculate overall confidence (weighted average)
    const totalWeight = validResponses.reduce((sum, r) => sum + r.confidence, 0);
    const weightedConfidence = validResponses.reduce((sum, r) => sum + (r.confidence * r.confidence), 0) / totalWeight;
    
    return {
      answer: consolidatedAnswer,
      confidence: Math.min(weightedConfidence, 0.95), // Cap at 95%
      sources: validResponses.map(r => r.provider),
      methodology: `Consolidated from ${validResponses.length} provider(s) using confidence-weighted analysis`,
      provider_responses: responses
    };
  }

  async rateConsolidatedAnswer(
    consolidatedAnswer: ConsolidatedAnswer,
    originalQuestion: string
  ): Promise<ProviderRating[]> {
    const activeProviders = await this.getActiveProviders();
    const ratings: ProviderRating[] = [];

    // Each provider rates the consolidated answer
    for (const provider of activeProviders) {
      try {
        const rating = await this.mockProviderRating(
          provider,
          consolidatedAnswer,
          originalQuestion
        );
        ratings.push(rating);
      } catch (error) {
        console.error(`Failed to get rating from ${provider.provider}:`, error);
        // Continue with other providers
      }
    }

    return ratings;
  }

  private async mockProviderRating(
    provider: ApiProvider,
    consolidatedAnswer: ConsolidatedAnswer,
    originalQuestion: string
  ): Promise<ProviderRating> {
    // Simulate rating delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    // Mock rating logic - in reality, this would be an API call
    const baseScore = 70 + Math.random() * 25; // 70-95% range
    
    // Adjust score based on whether this provider contributed to the answer
    const contributedToAnswer = consolidatedAnswer.sources.includes(provider.provider);
    const adjustedScore = contributedToAnswer ? baseScore + 5 : baseScore;
    
    // Generate reasoning based on provider
    const reasonings = {
      YAHOO: [
        "The answer aligns well with current market data and historical trends.",
        "Financial metrics and analysis appear accurate based on our data sources.",
        "The advice follows sound investment principles supported by market research."
      ],
      GOOGLE: [
        "The response demonstrates good understanding of financial concepts and risk factors.",
        "The methodology appears sound and considers multiple market variables.",
        "The advice is well-balanced and considers both opportunities and risks."
      ],
      FALLBACK: [
        "The answer provides practical financial guidance suitable for general audiences.",
        "The response covers key financial principles and risk considerations.",
        "The advice appears reasonable though could benefit from more specific data."
      ]
    };

    const providerReasonings = reasonings[provider.provider];
    const randomReasoning = providerReasonings[Math.floor(Math.random() * providerReasonings.length)];

    return {
      provider: provider.provider,
      correctness_percentage: Math.min(Math.max(adjustedScore, 0), 100),
      reasoning: randomReasoning,
      rated_by: provider.provider
    };
  }

  private async logProviderUsage(userId: string, response: ProviderResponse): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO usage_logs (
          user_id, action, resource, method, status_code, duration_ms,
          api_provider, tokens_used, cost_cents, error_message, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          'API_CALL',
          'llm_query',
          'POST',
          response.error ? 500 : 200,
          response.response_time_ms,
          response.provider,
          response.tokens_used || 0,
          response.cost_cents || 0,
          response.error || null,
          JSON.stringify({
            confidence: response.confidence,
            model: response.metadata?.model
          })
        ]
      );
    } catch (error) {
      console.error('Failed to log provider usage:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  async getProviderMetrics(days: number = 7): Promise<{
    provider: string;
    total_calls: number;
    success_rate: number;
    avg_response_time: number;
    avg_confidence: number;
    total_cost_cents: number;
  }[]> {
    const result = await pool.query(
      `SELECT 
        api_provider as provider,
        COUNT(*) as total_calls,
        ROUND(AVG(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) * 100, 2) as success_rate,
        ROUND(AVG(duration_ms), 2) as avg_response_time,
        ROUND(AVG((metadata->>'confidence')::numeric), 2) as avg_confidence,
        SUM(cost_cents) as total_cost_cents
      FROM usage_logs 
      WHERE action = 'API_CALL' 
        AND api_provider IS NOT NULL
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      GROUP BY api_provider
      ORDER BY total_calls DESC`,
      []
    );

    return result.rows;
  }
}

export const llmService = new LLMService();
export default llmService;