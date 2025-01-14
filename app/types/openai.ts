export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  frequencyPenalty: number;
  presencePenalty: number;
  maxRetries: number;
  rateLimitRPM: number;
}

export interface OpenAIError extends Error {
  code?: string;
  status?: number;
  type?: string;
}

export interface RateLimiter {
  isRateLimited: () => boolean;
  incrementCount: () => void;
  resetCount: () => void;
}

export interface ChannelSummaryRequest {
  channelId: string;
  workspaceId: string;
  since: string;
  context?: string;
}

export interface ChannelSummaryResponse {
  summary: string;
  keyTopics: string[];
  decisions: string[];
  actionItems: string[];
  fileReferences: {
    filename: string;
    context: string;
  }[];
  threadSummaries: {
    threadId: string;
    summary: string;
    participants: string[];
  }[];
  error?: string;
} 