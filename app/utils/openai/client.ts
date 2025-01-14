import OpenAI from 'openai';
import { OpenAIConfig, OpenAIError } from '@/app/types/openai';
import { getRateLimiter } from './rate-limiter';
import { getErrorHandler } from './error-handling';

export class OpenAIClient {
  private client: OpenAI;
  private config: OpenAIConfig;
  private rateLimiter = getRateLimiter();
  private errorHandler = getErrorHandler();

  constructor(config: Partial<OpenAIConfig> = {}) {
    // Default configuration
    this.config = {
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
      frequencyPenalty: parseFloat(process.env.OPENAI_FREQUENCY_PENALTY || '0.5'),
      presencePenalty: parseFloat(process.env.OPENAI_PRESENCE_PENALTY || '0.5'),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
      rateLimitRPM: parseInt(process.env.OPENAI_RATE_LIMIT_RPM || '60'),
      ...config
    };

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey
    });

    // Initialize rate limiter with configured RPM
    this.rateLimiter = getRateLimiter(this.config.rateLimitRPM);
    this.errorHandler = getErrorHandler(this.config.maxRetries);
  }

  async generateCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: Partial<OpenAI.Chat.ChatCompletionCreateParams> = {}
  ): Promise<OpenAI.Chat.ChatCompletion> {
    if (this.rateLimiter.isRateLimited()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    return await this.errorHandler.withRetry(async () => {
      try {
        const completion = await this.client.chat.completions.create({
          stream: false,
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty,
          ...options
        }) as OpenAI.Chat.ChatCompletion;

        this.rateLimiter.incrementCount();
        return completion;
      } catch (error) {
        throw this.handleError(error as OpenAIError);
      }
    });
  }

  private handleError(error: OpenAIError): OpenAIError {
    // Add any client-specific error handling here
    return error;
  }
}

// Create a singleton instance
let openAIClient: OpenAIClient;

export function getOpenAIClient(config?: Partial<OpenAIConfig>): OpenAIClient {
  if (!openAIClient) {
    openAIClient = new OpenAIClient(config);
  }
  return openAIClient;
}

export function createOpenAIClient(config: Partial<OpenAIConfig>): OpenAIClient {
  return new OpenAIClient(config);
} 