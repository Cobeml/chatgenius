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
    members: {
      userId: string;
      role: 'owner' | 'admin' | 'member';
      lastVisited?: string;
    }[];
    invites: string[];
    createdAt: string;
    updatedAt: string;
  };

  Channels: {
    workspaceId: string;
    id: string;
    name: string;
    isPrivate: boolean;
    position: number;
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

  Connections: {
    connectionId: string;
    workspaceId: string;
    userId: string;
    timestamp: string;
    status: 'connected' | 'disconnected' | 'online' | 'offline' | 'away';
  }
}

export const DynamoDBTableSchemas = {
  Users: {
    TableName: process.env.AWS_DYNAMODB_USERS_TABLE!,
    KeySchema: [
      { AttributeName: 'email', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  Workspaces: {
    TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  Channels: {
    TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
    KeySchema: [
      { AttributeName: 'workspaceId', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'workspaceId', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  Messages: {
    TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
    KeySchema: [
      { AttributeName: 'channelId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'channelId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  Threads: {
    TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
    KeySchema: [
      { AttributeName: 'parentMessageId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'parentMessageId', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },

  Connections: {
    TableName: process.env.AWS_DYNAMODB_CONNECTIONS_TABLE!,
    KeySchema: [
      { AttributeName: 'connectionId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'connectionId', AttributeType: 'S' },
      { AttributeName: 'workspaceId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'workspaceIndex',
        KeySchema: [
          { AttributeName: 'workspaceId', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }
}; 