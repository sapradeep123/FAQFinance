import { createError } from '../middleware/errorHandler';

export interface PromptValidationResult {
  isValid: boolean;
  confidence: number;
  category: 'FINANCE' | 'NON_FINANCE' | 'AMBIGUOUS';
  reasons: string[];
  suggestedRewrite?: string;
}

export interface FinancialContext {
  topics: string[];
  entities: string[];
  intent: 'ADVICE' | 'INFORMATION' | 'ANALYSIS' | 'CALCULATION' | 'OTHER';
}

class PromptFilterService {
  // Financial keywords and phrases for validation
  private readonly financialKeywords = {
    // Investment terms
    investment: ['invest', 'investment', 'portfolio', 'asset', 'stock', 'bond', 'mutual fund', 'etf', 'reit', 'commodity'],
    
    // Market terms
    market: ['market', 'trading', 'bull market', 'bear market', 'volatility', 'liquidity', 'dividend', 'yield', 'return'],
    
    // Financial planning
    planning: ['retirement', 'savings', 'budget', 'financial plan', 'emergency fund', 'insurance', 'tax planning'],
    
    // Banking and credit
    banking: ['bank', 'credit', 'loan', 'mortgage', 'interest rate', 'apr', 'credit score', 'debt'],
    
    // Business finance
    business: ['revenue', 'profit', 'cash flow', 'balance sheet', 'income statement', 'valuation', 'ipo', 'merger'],
    
    // Economic indicators
    economics: ['inflation', 'gdp', 'unemployment', 'federal reserve', 'monetary policy', 'fiscal policy', 'recession'],
    
    // Cryptocurrency
    crypto: ['bitcoin', 'cryptocurrency', 'blockchain', 'defi', 'nft', 'ethereum', 'crypto', 'digital currency']
  };

  // Non-financial topics that should be rejected
  private readonly nonFinancialKeywords = [
    // Technology (non-fintech)
    'programming', 'coding', 'software development', 'web design', 'gaming',
    
    // Health and medicine
    'medical', 'health', 'doctor', 'medicine', 'disease', 'treatment',
    
    // Entertainment
    'movie', 'music', 'sports', 'celebrity', 'entertainment', 'tv show',
    
    // Travel and lifestyle
    'travel', 'vacation', 'restaurant', 'recipe', 'cooking', 'fashion',
    
    // Education (non-financial)
    'homework', 'assignment', 'school project', 'academic research',
    
    // Personal relationships
    'dating', 'relationship', 'marriage advice', 'family issues'
  ];

  // Financial entities (companies, institutions, etc.)
  private readonly financialEntities = [
    // Major banks
    'jpmorgan', 'bank of america', 'wells fargo', 'citigroup', 'goldman sachs',
    
    // Investment firms
    'blackrock', 'vanguard', 'fidelity', 'charles schwab', 'td ameritrade',
    
    // Exchanges
    'nyse', 'nasdaq', 'dow jones', 's&p 500', 'russell 2000',
    
    // Regulatory bodies
    'sec', 'fdic', 'federal reserve', 'treasury', 'irs',
    
    // Major companies (for stock analysis)
    'apple', 'microsoft', 'amazon', 'google', 'tesla', 'berkshire hathaway'
  ];

  /**
   * Validates if a prompt is finance-related and appropriate for the system
   */
  async validatePrompt(prompt: string, userId?: string): Promise<PromptValidationResult> {
    try {
      const normalizedPrompt = prompt.toLowerCase().trim();
      
      // Check for empty or too short prompts
      if (normalizedPrompt.length < 10) {
        return {
          isValid: false,
          confidence: 0.9,
          category: 'NON_FINANCE',
          reasons: ['Prompt is too short to be meaningful'],
          suggestedRewrite: 'Please provide a more detailed financial question.'
        };
      }

      // Check for explicit non-financial content
      const nonFinancialScore = this.calculateNonFinancialScore(normalizedPrompt);
      if (nonFinancialScore > 0.7) {
        return {
          isValid: false,
          confidence: nonFinancialScore,
          category: 'NON_FINANCE',
          reasons: ['Content appears to be non-financial in nature'],
          suggestedRewrite: 'Please ask a question related to finance, investing, or money management.'
        };
      }

      // Calculate financial relevance score
      const financialScore = this.calculateFinancialScore(normalizedPrompt);
      const entityScore = this.calculateEntityScore(normalizedPrompt);
      const intentScore = this.calculateIntentScore(normalizedPrompt);
      
      const overallScore = (financialScore * 0.5) + (entityScore * 0.3) + (intentScore * 0.2);
      
      // Determine category and validity
      let category: 'FINANCE' | 'NON_FINANCE' | 'AMBIGUOUS';
      let isValid: boolean;
      let reasons: string[] = [];
      
      if (overallScore >= 0.7) {
        category = 'FINANCE';
        isValid = true;
        reasons.push('Strong financial content detected');
      } else if (overallScore >= 0.4) {
        category = 'AMBIGUOUS';
        isValid = true; // Allow with lower confidence
        reasons.push('Some financial content detected, but could be clearer');
      } else {
        category = 'NON_FINANCE';
        isValid = false;
        reasons.push('Insufficient financial content detected');
      }

      // Add specific reasons based on scores
      if (financialScore > 0.5) reasons.push('Contains financial terminology');
      if (entityScore > 0.5) reasons.push('References financial entities');
      if (intentScore > 0.5) reasons.push('Shows clear financial intent');
      
      return {
        isValid,
        confidence: overallScore,
        category,
        reasons,
        suggestedRewrite: !isValid ? this.generateSuggestedRewrite(normalizedPrompt) : undefined
      };
    } catch (error) {
      throw createError(500, `Prompt validation failed: ${error.message}`);
    }
  }

  /**
   * Extracts financial context from a validated prompt
   */
  extractFinancialContext(prompt: string): FinancialContext {
    const normalizedPrompt = prompt.toLowerCase();
    const topics: string[] = [];
    const entities: string[] = [];
    
    // Extract topics
    Object.entries(this.financialKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (normalizedPrompt.includes(keyword)) {
          topics.push(category);
        }
      });
    });
    
    // Extract entities
    this.financialEntities.forEach(entity => {
      if (normalizedPrompt.includes(entity)) {
        entities.push(entity);
      }
    });
    
    // Determine intent
    let intent: 'ADVICE' | 'INFORMATION' | 'ANALYSIS' | 'CALCULATION' | 'OTHER' = 'OTHER';
    
    if (this.containsAdviceKeywords(normalizedPrompt)) {
      intent = 'ADVICE';
    } else if (this.containsAnalysisKeywords(normalizedPrompt)) {
      intent = 'ANALYSIS';
    } else if (this.containsCalculationKeywords(normalizedPrompt)) {
      intent = 'CALCULATION';
    } else if (this.containsInformationKeywords(normalizedPrompt)) {
      intent = 'INFORMATION';
    }
    
    return {
      topics: [...new Set(topics)], // Remove duplicates
      entities: [...new Set(entities)],
      intent
    };
  }

  /**
   * Enhances a prompt with financial context for better AI responses
   */
  enhancePromptWithContext(prompt: string, context: FinancialContext): string {
    let enhancedPrompt = prompt;
    
    // Add context prefix
    const contextPrefix = 'As a financial advisor, please provide guidance on the following: ';
    
    // Add specific instructions based on intent
    let instructions = '';
    switch (context.intent) {
      case 'ADVICE':
        instructions = ' Please provide actionable financial advice considering risk tolerance and diversification.';
        break;
      case 'ANALYSIS':
        instructions = ' Please provide a detailed financial analysis with supporting data and reasoning.';
        break;
      case 'CALCULATION':
        instructions = ' Please show the calculation steps and explain the financial formulas used.';
        break;
      case 'INFORMATION':
        instructions = ' Please provide accurate and up-to-date financial information with relevant context.';
        break;
    }
    
    return contextPrefix + enhancedPrompt + instructions;
  }

  // Private helper methods
  private calculateFinancialScore(prompt: string): number {
    let score = 0;
    let totalKeywords = 0;
    
    Object.values(this.financialKeywords).forEach(keywords => {
      keywords.forEach(keyword => {
        totalKeywords++;
        if (prompt.includes(keyword)) {
          score += 1;
        }
      });
    });
    
    return totalKeywords > 0 ? score / totalKeywords : 0;
  }

  private calculateNonFinancialScore(prompt: string): number {
    let score = 0;
    
    this.nonFinancialKeywords.forEach(keyword => {
      if (prompt.includes(keyword)) {
        score += 1;
      }
    });
    
    return Math.min(score / this.nonFinancialKeywords.length, 1);
  }

  private calculateEntityScore(prompt: string): number {
    let score = 0;
    
    this.financialEntities.forEach(entity => {
      if (prompt.includes(entity)) {
        score += 1;
      }
    });
    
    return Math.min(score / 5, 1); // Normalize to max of 1
  }

  private calculateIntentScore(prompt: string): number {
    const intentKeywords = {
      advice: ['should i', 'recommend', 'advice', 'suggest', 'what to do'],
      analysis: ['analyze', 'compare', 'evaluate', 'assess', 'review'],
      calculation: ['calculate', 'compute', 'how much', 'what is the', 'formula'],
      information: ['what is', 'explain', 'define', 'tell me about', 'information']
    };
    
    let score = 0;
    let totalChecked = 0;
    
    Object.values(intentKeywords).forEach(keywords => {
      keywords.forEach(keyword => {
        totalChecked++;
        if (prompt.includes(keyword)) {
          score += 1;
        }
      });
    });
    
    return totalChecked > 0 ? score / totalChecked : 0;
  }

  private containsAdviceKeywords(prompt: string): boolean {
    const adviceKeywords = ['should i', 'recommend', 'advice', 'suggest', 'what to do', 'best option'];
    return adviceKeywords.some(keyword => prompt.includes(keyword));
  }

  private containsAnalysisKeywords(prompt: string): boolean {
    const analysisKeywords = ['analyze', 'compare', 'evaluate', 'assess', 'review', 'pros and cons'];
    return analysisKeywords.some(keyword => prompt.includes(keyword));
  }

  private containsCalculationKeywords(prompt: string): boolean {
    const calculationKeywords = ['calculate', 'compute', 'how much', 'formula', 'percentage', 'rate'];
    return calculationKeywords.some(keyword => prompt.includes(keyword));
  }

  private containsInformationKeywords(prompt: string): boolean {
    const infoKeywords = ['what is', 'explain', 'define', 'tell me about', 'information', 'how does'];
    return infoKeywords.some(keyword => prompt.includes(keyword));
  }

  private generateSuggestedRewrite(prompt: string): string {
    const suggestions = [
      'Try asking about investment strategies, portfolio management, or financial planning.',
      'Consider asking about specific stocks, bonds, or other financial instruments.',
      'Ask about budgeting, saving strategies, or retirement planning.',
      'Inquire about market analysis, economic trends, or financial news.',
      'Request advice on debt management, credit improvement, or loan options.'
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }
}

export const promptFilterService = new PromptFilterService();