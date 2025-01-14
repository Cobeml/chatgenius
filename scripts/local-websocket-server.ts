import { WebSocketServer, WebSocket as WebSocketClient, RawData } from 'ws';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { IncomingMessage } from 'http';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Configure AWS SDK
const dynamoDb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
}));

const CONNECTIONS_TABLE = process.env.AWS_DYNAMODB_CONNECTIONS_TABLE;
const PORT = 3001;

interface Connection {
  connectionId: string;
  workspaceId: string;
  userId: string;
  status: string;
}

const connections = new Map<string, Connection>();
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server is running on ws://localhost:${PORT}`);

wss.on('connection', async (ws: WebSocketClient, req: IncomingMessage) => {
  const url = new URL(req.url!, `ws://localhost:${PORT}`);
  const workspaceId = url.searchParams.get('workspaceId');
  const token = url.searchParams.get('token');
  const connectionId = Math.random().toString(36).substring(2);

  console.log('New connection:', {
    connectionId,
    workspaceId,
    token,
    url: req.url
  });

  if (!workspaceId || !token) {
    console.error('Missing required parameters');
    ws.close(4000, 'Missing required parameters');
    return;
  }

  // Store connection information
  const connection: Connection = {
    connectionId,
    workspaceId,
    userId: token,
    status: 'connected'
  };

  connections.set(connectionId, connection);

  // Store in DynamoDB if in development mode
  try {
    await dynamoDb.put({
      TableName: CONNECTIONS_TABLE!,
      Item: {
        ...connection,
        timestamp: new Date().toISOString()
      }
    });
    console.log('Stored connection in DynamoDB:', connection);
  } catch (error) {
    console.error('Failed to store connection in DynamoDB:', error);
  }

  // Handle messages
  ws.on('message', async (data: RawData) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);

      switch (message.action) {
        case 'message':
          // Store message in DynamoDB
          const timestamp = new Date().toISOString();
          const messageItem = {
            channelId: message.channelId,
            timestamp,
            content: message.content,
            userId: connection.userId,
            attachments: message.attachments
          };

          try {
            await dynamoDb.put({
              TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
              Item: messageItem
            });
            console.log('Stored message in DynamoDB:', messageItem);
          } catch (error) {
            console.error('Failed to store message in DynamoDB:', error);
          }

          // Broadcast to all connections in the workspace
          const broadcastMessage = {
            type: 'message',
            channelId: message.channelId,
            content: message.content,
            userId: connection.userId,
            timestamp,
            attachments: message.attachments,
            messageId: `${message.channelId}:${timestamp}`
          };

          wss.clients.forEach((client: WebSocketClient) => {
            if (client.readyState === WebSocketClient.OPEN) {
              client.send(JSON.stringify(broadcastMessage));
            }
          });
          break;

        case 'presence':
          connection.status = message.status;
          // Broadcast presence update
          const presenceMessage = {
            type: 'presence',
            connectionId,
            status: message.status
          };

          wss.clients.forEach((client: WebSocketClient) => {
            if (client !== ws && client.readyState === WebSocketClient.OPEN) {
              client.send(JSON.stringify(presenceMessage));
            }
          });
          break;

        case 'typing':
          // Broadcast typing status
          const typingMessage = {
            type: 'typing',
            connectionId,
            channelId: message.channelId,
            isTyping: message.isTyping
          };

          wss.clients.forEach((client: WebSocketClient) => {
            if (client !== ws && client.readyState === WebSocketClient.OPEN) {
              client.send(JSON.stringify(typingMessage));
            }
          });
          break;

        case 'thread_message':
          // Store thread message in DynamoDB
          const threadTimestamp = new Date().toISOString();
          const threadMessageItem = {
            parentMessageId: message.parentMessageId,
            timestamp: threadTimestamp,
            content: message.content,
            userId: connection.userId,
            attachments: message.attachments
          };

          try {
            await dynamoDb.put({
              TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
              Item: threadMessageItem
            });

            // Update thread count
            await dynamoDb.update({
              TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
              Key: { messageId: message.parentMessageId },
              UpdateExpression: 'ADD threadCount :inc',
              ExpressionAttributeValues: {
                ':inc': 1
              }
            });

            console.log('Stored thread message in DynamoDB:', threadMessageItem);
          } catch (error) {
            console.error('Failed to store thread message in DynamoDB:', error);
          }

          // Broadcast thread message
          const threadBroadcastMessage = {
            type: 'thread_message',
            parentMessageId: message.parentMessageId,
            content: message.content,
            userId: connection.userId,
            timestamp: threadTimestamp,
            attachments: message.attachments,
            messageId: `${message.parentMessageId}:${threadTimestamp}`
          };

          wss.clients.forEach((client: WebSocketClient) => {
            if (client.readyState === WebSocketClient.OPEN) {
              client.send(JSON.stringify(threadBroadcastMessage));
            }
          });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', async () => {
    console.log('Connection closed:', connectionId);
    connections.delete(connectionId);

    try {
      await dynamoDb.delete({
        TableName: CONNECTIONS_TABLE!,
        Key: { connectionId }
      });
      console.log('Removed connection from DynamoDB:', connectionId);
    } catch (error) {
      console.error('Failed to remove connection from DynamoDB:', error);
    }
  });
}); 