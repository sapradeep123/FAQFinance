import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import fetch from 'node-fetch';

export interface GptProvider {
  id: number;
  provider: 'openai' | 'anthropic' | 'google';
  api_key: string;
  model: string;
  is_active: boolean;
  max_tokens: number;
  temperature: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProviderResponse {
  provider: 'openai' | 'anthropic' | 'google';
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
  provider: 'openai' | 'anthropic' | 'google';
  correctness_percentage: number;
  reasoning: string;
  rated_by: 'openai' | 'anthropic' | 'google';
}

class LLMService {
  private async getActiveProviders(): Promise<GptProvider[]> {
    const result = await pool.query(
      `SELECT id, provider, api_key, model, is_active, max_tokens, temperature, created_at, updated_at
       FROM gpt_configs 
       WHERE is_active = true
       ORDER BY provider ASC`,
      []
    );

    return result.rows;
  }

  private async callProvider(
    provider: GptProvider,
    question: string,
    context?: string
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    
    try {
      let response: any;
      let answer: string;
      let tokensUsed = 0;
      
      const prompt = context ? `Context: ${context}\n\nQuestion: ${question}` : question;
      
      switch (provider.provider) {
        case 'openai':
          response = await this.callOpenAI(provider, prompt);
          answer = response.choices[0]?.message?.content || 'No response generated';
          tokensUsed = response.usage?.total_tokens || 0;
          break;
          
        case 'anthropic':
          response = await this.callAnthropic(provider, prompt);
          answer = response.content[0]?.text || 'No response generated';
          tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;
          break;
          
        case 'google':
          response = await this.callGoogle(provider, prompt);
          answer = response.candidates[0]?.content?.parts[0]?.text || 'No response generated';
          tokensUsed = response.usageMetadata?.totalTokenCount || 0;
          break;
          
        default:
          throw new Error(`Unsupported provider: ${provider.provider}`);
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        provider: provider.provider,
        answer,
        confidence: 0.85, // Base confidence for real API responses
        response_time_ms: responseTime,
        tokens_used: tokensUsed,
        cost_cents: this.calculateCost(provider.provider, tokensUsed),
        metadata: {
          model: provider.model,
          temperature: provider.temperature,
          max_tokens: provider.max_tokens
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        provider: provider.provider,
        answer: '',
        confidence: 0,
        response_time_ms: responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async callOpenAI(provider: GptProvider, prompt: string): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial advisor AI. Provide helpful, accurate financial advice and information. Focus only on finance-related topics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: provider.max_tokens,
        temperature: provider.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async callAnthropic(provider: GptProvider, prompt: string): Promise<any> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': provider.api_key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: provider.max_tokens,
        temperature: provider.temperature,
        system: 'You are a financial advisor AI. Provide helpful, accurate financial advice and information. Focus only on finance-related topics.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async callGoogle(provider: GptProvider, prompt: string): Promise<any> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a financial advisor AI. Provide helpful, accurate financial advice and information. Focus only on finance-related topics.\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: provider.temperature,
          maxOutputTokens: provider.max_tokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private calculateCost(provider: 'openai' | 'anthropic' | 'google', tokens: number): number {
    // Rough cost estimates in cents per 1000 tokens
    const costPer1000Tokens = {
      openai: 2, // GPT-4 approximate cost
      anthropic: 1.5, // Claude approximate cost
      google: 1 // Gemini approximate cost
    };

    return Math.ceil((tokens / 1000) * costPer1000Tokens[provider]);
  }

  private generateMockResponse(
    provider: 'openai' | 'anthropic' | 'google',
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
        return await this.callProvider(provider, question, context);
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
    provider: GptProvider,
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