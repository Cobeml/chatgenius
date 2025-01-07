export interface DynamoDBSchemas {
  Users: {
    email: string;
    password: string;
    createdAt: string;
  };

  Workspaces: {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  };

  Channels: {
    workspaceId: string;
    id: string;
    name: string;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
  };

  Messages: {
    channelId: string;
    timestamp: string;
    userId: string;
    content: string;
    attachments?: string[];
    edited?: boolean;
    threadCount?: number;
  };

  Threads: {
    parentMessageId: string;
    timestamp: string;
    userId: string;
    content: string;
    attachments?: string[];
    edited?: boolean;
  };
} 