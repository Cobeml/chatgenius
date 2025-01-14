import { getOpenAIClient } from '../openai/client';
import { SUMMARY_SYSTEM_PROMPT, generatePrompt } from './prompts';
import { ProcessedActivity, ProcessedMessage } from './message-processor';
import { ChannelSummaryResponse } from '@/app/types/openai';

export class SummaryGenerator {
  private openAIClient = getOpenAIClient();

  async generateChannelSummary(activity: ProcessedActivity, context: string = "Summarizing recent channel activity"): Promise<ChannelSummaryResponse> {
    try {
      // Check if there are any messages to summarize
      if (activity.messages.length === 0) {
        return {
          summary: "No messages found in the specified time period.",
          keyTopics: [],
          decisions: [],
          actionItems: [],
          fileReferences: [],
          threadSummaries: []
        };
      }

      // Format messages for the prompt
      const formattedMessages = this.formatMessagesForPrompt(activity);

      // Generate main channel summary
      const channelSummary = await this.generateSummaryWithTemplate(
        'channelSummary',
        formattedMessages,
        { context }
      );

      // Generate thread summaries if there are any
      const threadSummaries = await this.generateThreadSummaries(activity);

      return {
        ...channelSummary,
        threadSummaries
      };
    } catch (error) {
      console.error('Error generating channel summary:', error);
      throw error;
    }
  }

  private async generateSummaryWithTemplate(
    template: 'channelSummary' | 'threadSummary' | 'actionItems' | 'keyTopics',
    messages: string,
    variables: Record<string, string> = {}
  ): Promise<any> {
    const prompt = generatePrompt(template, { messages, ...variables });

    const completion = await this.openAIClient.generateCompletion([
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]);

    try {
      const content = completion.choices[0].message.content || '{}';
      // Remove any non-JSON content that might be present
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const jsonContent = content.slice(jsonStart, jsonEnd);
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error parsing summary response:', error);
      // Return a basic valid JSON structure instead of throwing
      return {
        summary: "Failed to generate summary. Please try again.",
        keyTopics: [],
        decisions: [],
        actionItems: [],
        fileReferences: []
      };
    }
  }

  private async generateThreadSummaries(activity: ProcessedActivity): Promise<any[]> {
    const threadSummaries = [];

    for (const [threadId, thread] of Object.entries(activity.threads)) {
      const formattedThreadMessages = this.formatMessagesForPrompt({
        messages: (thread as { messages: any[] }).messages,
        participants: (thread as { participants: Set<string> }).participants
      });

      const summary = await this.generateSummaryWithTemplate(
        'threadSummary',
        formattedThreadMessages
      );

      threadSummaries.push({
        threadId,
        ...summary
      });
    }

    return threadSummaries;
  }

  private formatMessagesForPrompt(activity: ProcessedActivity | { messages: ProcessedMessage[]; participants: Set<string> }): string {
    let formattedMessages = '';

    if (!('fileAttachments' in activity)) {
      // Format thread messages
      formattedMessages = activity.messages
        .map((msg: { timestamp: string; userId: string; content: string }) => 
          `[${msg.timestamp}] ${msg.userId}: ${msg.content}`)
        .join('\n');
    } else {
      // Format channel messages
      formattedMessages = activity.messages
        .map((msg: { timestamp: string; userId: string; content: string; attachments?: string[] }) => {
          let messageText = `[${msg.timestamp}] ${msg.userId}: ${msg.content}`;
          if (msg.attachments?.length) {
            messageText += `\nAttachments: ${msg.attachments.join(', ')}`;
          }
          return messageText;
        })
        .join('\n');

      // Add file references
      if (activity.fileAttachments.length) {
        formattedMessages += '\n\nFile References:\n' + 
          activity.fileAttachments
            .map((file: { filename: string; userId: string; timestamp: string }) => 
              `- ${file.filename} (shared by ${file.userId} at ${file.timestamp})`)
            .join('\n');
      }
    }

    return formattedMessages;
  }
}

// Create a singleton instance
let summaryGenerator: SummaryGenerator;

export function getSummaryGenerator(): SummaryGenerator {
  if (!summaryGenerator) {
    summaryGenerator = new SummaryGenerator();
  }
  return summaryGenerator;
}

export function createSummaryGenerator(): SummaryGenerator {
  return new SummaryGenerator();
} 