import { RateLimiter } from '@/app/types/openai';

class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(rateLimit: number) { // rateLimit is in requests per minute
    this.maxTokens = rateLimit;
    this.tokens = rateLimit;
    this.lastRefill = Date.now();
    this.refillRate = rateLimit / (60 * 1000); // Convert to tokens per millisecond
  }

  private refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  isRateLimited(): boolean {
    this.refill();
    return this.tokens < 1;
  }

  incrementCount(): void {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
    }
  }

  resetCount(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

// Create a singleton instance for the application
let rateLimiter: RateLimiter;

export function getRateLimiter(rateLimit: number = 60): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new TokenBucketRateLimiter(rateLimit);
  }
  return rateLimiter;
}

export function createRateLimiter(rateLimit: number): RateLimiter {
  return new TokenBucketRateLimiter(rateLimit);
} 