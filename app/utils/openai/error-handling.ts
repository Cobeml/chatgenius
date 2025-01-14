import { OpenAIError } from '@/app/types/openai';

export class OpenAIErrorHandler {
  private readonly maxRetries: number;
  private readonly baseDelay: number = 1000; // 1 second

  constructor(maxRetries: number = 3) {
    this.maxRetries = maxRetries;
  }

  async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.shouldRetry(error as OpenAIError) || attempt === this.maxRetries) {
          throw this.enhanceError(error as OpenAIError);
        }

        await this.delay(attempt);
      }
    }

    // This should never be reached due to the throw above
    throw lastError;
  }

  private shouldRetry(error: OpenAIError): boolean {
    // Retry on rate limits and server errors
    if (error.status) {
      return error.status === 429 || (error.status >= 500 && error.status < 600);
    }

    // Retry on network errors
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ECONNREFUSED';
  }

  private async delay(attempt: number): Promise<void> {
    // Exponential backoff with jitter
    const jitter = Math.random() * 0.3 + 0.85; // Random between 0.85 and 1.15
    const delay = Math.min(this.baseDelay * Math.pow(2, attempt) * jitter, 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private enhanceError(error: OpenAIError): OpenAIError {
    if (error.status === 429) {
      error.message = 'Rate limit exceeded. Please try again later.';
      error.type = 'rate_limit_error';
    } else if (error.status && error.status >= 500) {
      error.message = 'OpenAI service is currently unavailable. Please try again later.';
      error.type = 'server_error';
    } else if (error.status === 401) {
      error.message = 'Invalid API key. Please check your configuration.';
      error.type = 'authentication_error';
    } else if (error.status === 400) {
      error.message = 'Invalid request to OpenAI API. Please check your inputs.';
      error.type = 'validation_error';
    } else if (!error.status) {
      error.message = 'Network error occurred while connecting to OpenAI.';
      error.type = 'network_error';
    }

    return error;
  }
}

// Create a singleton instance
let errorHandler: OpenAIErrorHandler;

export function getErrorHandler(maxRetries?: number): OpenAIErrorHandler {
  if (!errorHandler) {
    errorHandler = new OpenAIErrorHandler(maxRetries);
  }
  return errorHandler;
}

export function createErrorHandler(maxRetries: number): OpenAIErrorHandler {
  return new OpenAIErrorHandler(maxRetries);
} 