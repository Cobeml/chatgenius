import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDBSchemas } from '@/dynamodb-schema';
import { dynamoDb } from '@/utils/aws-config';

export interface ProcessedMessage {
  content: string;
  userId: string;
  timestamp: string;
  attachments?: string[];
  threadId?: string;
  isThreadMessage?: boolean;
}

export interface ProcessedActivity {
  messages: ProcessedMessage[];
  threads: Record<string, { messages: ProcessedMessage[]; participants: Set<string> }>;
  fileAttachments: { filename: string; userId: string; timestamp: string }[];
}

export class MessageProcessor {
  constructor() {}

  async getChannelActivity(
    channelId: string,
    since: string
  ): Promise<ProcessedActivity> {
    console.log('🔍 Fetching channel activity:', { channelId, since });
    
    const [messages, threadMessages] = await Promise.all([
      this.getChannelMessages(channelId, since),
      this.getThreadMessages(channelId, since)
    ]);

    console.log('📥 Retrieved messages:', {
      channelMessages: messages.length,
      threadMessages: threadMessages.length
    });

    console.log('📝 Channel Messages:', JSON.stringify(messages, null, 2));
    console.log('🧵 Thread Messages:', JSON.stringify(threadMessages, null, 2));

    const activity = this.processActivity(messages, threadMessages);
    
    console.log('✨ Processed Activity:', {
      mainMessages: activity.messages.length,
      threads: Object.keys(activity.threads).length,
      attachments: activity.fileAttachments.length
    });

    return activity;
  }

  private async getChannelMessages(
    channelId: string,
    since: string
  ): Promise<DynamoDBSchemas['Messages'][]> {
    console.log('📨 Querying channel messages:', { channelId, since });
    
    // First try to get messages since the given date
    const response = await dynamoDb.query({
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      KeyConditionExpression: 'channelId = :channelId AND #ts > :since',
      ExpressionAttributeNames: {
        '#ts': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':channelId': channelId,
        ':since': since
      }
    }).promise();

    console.log('📊 Channel messages query response:', {
      table: process.env.AWS_DYNAMODB_MESSAGES_TABLE,
      itemCount: response.Items?.length || 0,
      scannedCount: response.ScannedCount
    });

    // If no messages found after the date, get the most recent 20 messages
    if (!response.Items?.length) {
      console.log('📨 No messages found since date, fetching most recent messages');
      
      const recentResponse = await dynamoDb.query({
        TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
        KeyConditionExpression: 'channelId = :channelId',
        ExpressionAttributeValues: {
          ':channelId': channelId
        },
        Limit: 20,
        ScanIndexForward: false // This will sort in descending order (newest first)
      }).promise();

      console.log('📊 Recent messages query response:', {
        table: process.env.AWS_DYNAMODB_MESSAGES_TABLE,
        itemCount: recentResponse.Items?.length || 0,
        scannedCount: recentResponse.ScannedCount
      });

      // Reverse the array to get chronological order (oldest first)
      return (recentResponse.Items || []).reverse() as DynamoDBSchemas['Messages'][];
    }

    return (response.Items || []) as DynamoDBSchemas['Messages'][];
  }

  private async getThreadMessages(
    channelId: string,
    since: string
  ): Promise<DynamoDBSchemas['Threads'][]> {
    console.log('🧵 Querying thread messages:', { channelId, since });
    
    // First get all thread parent messages for the channel
    const parentMessages = await dynamoDb.query({
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      KeyConditionExpression: 'channelId = :channelId',
      FilterExpression: 'attribute_exists(threadCount)',
      ExpressionAttributeValues: {
        ':channelId': channelId
      }
    }).promise();

    console.log('👨‍👦 Thread parent messages:', {
      table: process.env.AWS_DYNAMODB_MESSAGES_TABLE,
      parentCount: parentMessages.Items?.length || 0
    });

    // Then get all thread messages for these parent messages since the timestamp
    const threadMessages: DynamoDBSchemas['Threads'][] = [];
    for (const parent of (parentMessages.Items || [])) {
      console.log('🔍 Querying replies for parent:', {
        parentId: parent.messageId || parent.timestamp
      });
      
      const response = await dynamoDb.query({
        TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
        KeyConditionExpression: 'parentMessageId = :parentId AND #ts > :since',
        ExpressionAttributeNames: {
          '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
          ':parentId': parent.messageId || parent.timestamp,
          ':since': since
        }
      }).promise();

      console.log('📬 Thread replies query response:', {
        table: process.env.AWS_DYNAMODB_THREADS_TABLE,
        parentId: parent.messageId || parent.timestamp,
        replyCount: response.Items?.length || 0
      });

      threadMessages.push(...((response.Items || []) as DynamoDBSchemas['Threads'][]));
    }

    return threadMessages;
  }

  private processActivity(
    messages: DynamoDBSchemas['Messages'][],
    threadMessages: DynamoDBSchemas['Threads'][]
  ): ProcessedActivity {
    console.log('🔄 Processing activity:', {
      messageCount: messages.length,
      threadMessageCount: threadMessages.length
    });

    const activity: ProcessedActivity = {
      messages: [],
      threads: {},
      fileAttachments: []
    };

    // Process main channel messages
    for (const msg of messages) {
      const processedMsg: ProcessedMessage = {
        content: msg.content,
        userId: msg.userId,
        timestamp: msg.timestamp,
        attachments: msg.attachments
      };
      activity.messages.push(processedMsg);

      // Track file attachments
      if (msg.attachments?.length) {
        console.log('📎 Processing channel message attachments:', {
          messageId: msg.timestamp,
          attachmentCount: msg.attachments.length
        });
        
        for (const filename of msg.attachments) {
          activity.fileAttachments.push({
            filename,
            userId: msg.userId,
            timestamp: msg.timestamp
          });
        }
      }
    }

    // Process thread messages
    for (const threadMsg of threadMessages) {
      if (!activity.threads[threadMsg.parentMessageId]) {
        activity.threads[threadMsg.parentMessageId] = {
          messages: [],
          participants: new Set()
        };
      }

      const thread = activity.threads[threadMsg.parentMessageId];
      const processedThreadMsg: ProcessedMessage = {
        content: threadMsg.content,
        userId: threadMsg.userId,
        timestamp: threadMsg.timestamp,
        attachments: threadMsg.attachments,
        threadId: threadMsg.parentMessageId,
        isThreadMessage: true
      };

      thread.messages.push(processedThreadMsg);
      thread.participants.add(threadMsg.userId);

      // Track file attachments in threads
      if (threadMsg.attachments?.length) {
        console.log('📎 Processing thread message attachments:', {
          threadId: threadMsg.parentMessageId,
          messageId: threadMsg.messageId,
          attachmentCount: threadMsg.attachments.length
        });
        
        for (const filename of threadMsg.attachments) {
          activity.fileAttachments.push({
            filename,
            userId: threadMsg.userId,
            timestamp: threadMsg.timestamp
          });
        }
      }
    }

    // Sort all messages by timestamp
    activity.messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (const thread of Object.values(activity.threads)) {
      thread.messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    console.log('✅ Activity processing complete:', {
      processedMessages: activity.messages.length,
      processedThreads: Object.keys(activity.threads).length,
      processedAttachments: activity.fileAttachments.length
    });

    return activity;
  }
}

// Create a singleton instance
let messageProcessor: MessageProcessor;

export function getMessageProcessor(): MessageProcessor {
  if (!messageProcessor) {
    messageProcessor = new MessageProcessor();
  }
  return messageProcessor;
}

export function createMessageProcessor(): MessageProcessor {
  return new MessageProcessor();
} 