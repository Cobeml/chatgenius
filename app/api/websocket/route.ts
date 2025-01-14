import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { ApiGatewayManagementApi } from 'aws-sdk';
import { APIGatewayProxyResult } from 'aws-lambda';

const dynamoDb = new DynamoDB.DocumentClient();
const CONNECTIONS_TABLE = process.env.AWS_DYNAMODB_CONNECTIONS_TABLE;

interface WebSocketEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    querystring?: string;
  };
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
}

interface WebSocketError extends Error {
  statusCode?: number;
}

// Helper function to send message to a connection
async function sendMessageToConnection(connectionId: string, data: Record<string, unknown>) {
  // Extract the endpoint from the WebSocket URL based on environment
  const wsEndpoint = process.env.NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_WEBSOCKET_URL_LOCAL!.replace('ws://', '').split('/')[0]
    : process.env.NEXT_PUBLIC_WEBSOCKET_URL_PROD!.replace('wss://', '').split('/')[0];
  
  const endpoint = process.env.NODE_ENV === 'development'
    ? `http://${wsEndpoint}`
    : `https://${wsEndpoint}/prod`;

  const api = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint
  });

  try {
    console.log('Attempting to send message to connection:', {
      connectionId,
      data,
      endpoint,
      environment: process.env.NODE_ENV
    });

    await api.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }).promise();

    console.log('Successfully sent message to connection:', connectionId);
  } catch (error) {
    console.error(`Error sending message to connection ${connectionId}:`, {
      error: error instanceof Error ? error.message : error,
      endpoint
    });
    if ((error as WebSocketError).statusCode === 410) {
      console.log('Connection is stale, removing:', connectionId);
      // Connection is stale, remove it
      await dynamoDb.delete({
        TableName: CONNECTIONS_TABLE!,
        Key: { connectionId }
      }).promise();
    }
    throw error; // Re-throw to handle in the calling function
  }
}

// WebSocket event handlers
const handlers = {
  // $connect handler
  async connect(event: WebSocketEvent): Promise<APIGatewayProxyResult> {
    console.log('==== CONNECT HANDLER REACHED ====');
    
    // Log all possible sources of connection parameters
    console.log('Connection parameter sources:', {
      queryString: event.requestContext.querystring,
      queryParams: event.queryStringParameters,
      headers: event.headers,
      url: event.headers?.['x-forwarded-proto'] + '://' + event.headers?.['x-forwarded-host'] + event.headers?.['x-original-url']
    });

    // Get connection parameters from query string
    const params = event.queryStringParameters || {};
    const workspaceId = params.workspaceId;
    const token = params.token;
    const connectionId = event.requestContext.connectionId;

    console.log('Parsed connection parameters:', { 
      workspaceId, 
      token,
      connectionId,
      allParams: params
    });

    // Validate required parameters
    if (!workspaceId || !token || !connectionId || connectionId === 'unknown') {
      console.log('Missing or invalid connection parameters:', { workspaceId, token, connectionId, params });
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing or invalid parameters',
          required: ['workspaceId', 'token', 'connectionId'],
          received: { workspaceId, token, connectionId }
        })
      };
    }

    try {
      // First verify if this connection already exists
      console.log('Checking for existing connection:', connectionId);
      
      const existingConnection = await dynamoDb.get({
        TableName: CONNECTIONS_TABLE!,
        Key: { connectionId }
      }).promise();

      if (existingConnection.Item) {
        console.log('Found existing connection:', existingConnection.Item);
        
        // If it exists and is active, return success
        if (existingConnection.Item.status === 'connected') {
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Connection already active',
              connectionId
            })
          };
        }
      }

      // Clean up any existing connections for this user in this workspace
      console.log('Querying existing connections for cleanup:', {
        workspaceId,
        userId: token
      });

      const existingConnections = await dynamoDb.query({
        TableName: CONNECTIONS_TABLE!,
        IndexName: 'workspaceIndex',
        KeyConditionExpression: 'workspaceId = :workspaceId',
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':workspaceId': workspaceId,
          ':userId': token
        }
      }).promise();

      if (existingConnections.Items && existingConnections.Items.length > 0) {
        console.log('Found existing connections to clean up:', existingConnections.Items);
        
        const deletePromises = existingConnections.Items
          .filter(conn => conn.connectionId !== connectionId) // Don't delete the current connection if it exists
          .map(conn => {
            console.log('Deleting old connection:', conn.connectionId);
            return dynamoDb.delete({
              TableName: CONNECTIONS_TABLE!,
              Key: { connectionId: conn.connectionId }
            }).promise();
          });
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
          console.log('Successfully cleaned up old connections');
        }
      }

      // Store new connection in DynamoDB
      const timestamp = new Date().toISOString();
      const connectionItem = {
        connectionId,
        workspaceId,
        userId: token,
        timestamp,
        status: 'connected'
      };

      console.log('Storing new connection:', connectionItem);

      await dynamoDb.put({
        TableName: CONNECTIONS_TABLE!,
        Item: connectionItem
      }).promise();

      // Verify the connection was stored
      const verifyConnection = await dynamoDb.get({
        TableName: CONNECTIONS_TABLE!,
        Key: { connectionId }
      }).promise();

      if (!verifyConnection.Item) {
        console.error('Failed to verify connection storage:', connectionId);
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: 'Failed to store connection',
            connectionId
          })
        };
      }

      console.log('Successfully verified connection storage:', verifyConnection.Item);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Connected successfully',
          connectionId,
          connection: verifyConnection.Item
        })
      };
    } catch (error) {
      console.error('Error in connect handler:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error,
        connectionId,
        workspaceId,
        token
      });
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Failed to store connection',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  },

  // $disconnect handler
  async disconnect(event: WebSocketEvent): Promise<APIGatewayProxyResult> {
    const connectionId = event.requestContext.connectionId;

    try {
      await dynamoDb.delete({
        TableName: CONNECTIONS_TABLE!,
        Key: { connectionId }
      }).promise();

      return { statusCode: 200, body: 'Disconnected' };
    } catch (error) {
      console.error('$disconnect error:', error);
      return { statusCode: 500, body: 'Failed to disconnect' };
    }
  },

  // message handler
  async message(event: WebSocketEvent): Promise<APIGatewayProxyResult> {
    const connectionId = event.requestContext.connectionId;
    const body = event.body ? JSON.parse(event.body) : {};
    const { channelId, content, workspaceId, attachments } = body;

    console.log('Received message event:', {
      connectionId,
      channelId,
      content,
      workspaceId,
      attachments
    });

    try {
      // Get the connection record to get the userId
      console.log('Querying connection record:', {
        TableName: CONNECTIONS_TABLE,
        connectionId
      });

      const connectionRecord = await dynamoDb.get({
        TableName: CONNECTIONS_TABLE!,
        Key: { connectionId }
      }).promise();

      console.log('Connection record query result:', {
        connectionId,
        found: !!connectionRecord.Item,
        record: connectionRecord.Item
      });

      if (!connectionRecord.Item) {
        console.error('No connection record found:', connectionId);
        return { 
          statusCode: 400, 
          body: JSON.stringify({
            message: 'Connection record not found',
            connectionId
          })
        };
      }

      if (connectionRecord.Item.status !== 'connected' && connectionRecord.Item.status !== 'online') {
        console.error('Connection is not active:', {
          connectionId,
          status: connectionRecord.Item.status
        });
        return { 
          statusCode: 400, 
          body: JSON.stringify({
            message: 'Connection is not active',
            connectionId,
            status: connectionRecord.Item.status
          })
        };
      }

      const userId = connectionRecord.Item.userId;
      const timestamp = new Date().toISOString();

      // Store message in DynamoDB
      const messageItem = {
        channelId,
        timestamp,
        content,
        userId,
        attachments
      };

      console.log('Storing message in DynamoDB:', messageItem);

      await dynamoDb.put({
        TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
        Item: messageItem
      }).promise();

      // Get all active connections in the workspace
      console.log('Querying workspace connections:', {
        TableName: CONNECTIONS_TABLE,
        IndexName: 'workspaceIndex',
        workspaceId
      });

      const connections = await dynamoDb.query({
        TableName: CONNECTIONS_TABLE!,
        IndexName: 'workspaceIndex',
        KeyConditionExpression: 'workspaceId = :workspaceId',
        FilterExpression: '#status IN (:status1, :status2)',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':workspaceId': workspaceId,
          ':status1': 'connected',
          ':status2': 'online'
        }
      }).promise();

      console.log('Found workspace connections:', {
        workspaceId,
        connectionCount: connections.Items?.length,
        connections: connections.Items?.map(c => ({
          connectionId: c.connectionId,
          userId: c.userId,
          status: c.status
        }))
      });

      if (!connections.Items?.length) {
        console.warn('No active connections found for workspace:', workspaceId);
        return { 
          statusCode: 200, 
          body: JSON.stringify({
            message: 'Message stored but no connections to broadcast to',
            messageId: `${channelId}:${timestamp}`
          })
        };
      }

      // Broadcast to all connections including sender for consistency
      const broadcastMessage = {
        type: 'message',
        channelId,
        content,
        userId,
        timestamp,
        attachments,
        messageId: `${channelId}:${timestamp}`
      };

      console.log('Broadcasting message to connections:', {
        message: broadcastMessage,
        connectionCount: connections.Items.length
      });

      const broadcastPromises = connections.Items.map(async connection => {
        try {
          console.log('Sending message to connection:', {
            connectionId: connection.connectionId,
            userId: connection.userId
          });

          await sendMessageToConnection(connection.connectionId, broadcastMessage);
          
          console.log('Successfully sent message to connection:', connection.connectionId);
          return { success: true, connectionId: connection.connectionId };
        } catch (error) {
          console.error('Failed to send message to connection:', {
            connectionId: connection.connectionId,
            error: error instanceof Error ? error.message : error,
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            statusCode: (error as WebSocketError).statusCode
          });

          // If connection is gone (410), mark it as disconnected
          if ((error as WebSocketError).statusCode === 410) {
            try {
              console.log('Marking stale connection as disconnected:', connection.connectionId);
              
              await dynamoDb.update({
                TableName: CONNECTIONS_TABLE!,
                Key: { connectionId: connection.connectionId },
                UpdateExpression: 'SET #status = :status',
                ExpressionAttributeNames: {
                  '#status': 'status'
                },
                ExpressionAttributeValues: {
                  ':status': 'disconnected'
                }
              }).promise();

              console.log('Successfully marked connection as disconnected:', connection.connectionId);
            } catch (updateError) {
              console.error('Failed to update connection status:', {
                connectionId: connection.connectionId,
                error: updateError
              });
            }
          }

          return { 
            success: false, 
            connectionId: connection.connectionId,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: (error as WebSocketError).statusCode
          };
        }
      });

      const results = await Promise.all(broadcastPromises);
      const successCount = results.filter(r => r.success).length;

      console.log('Broadcast results:', {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
        details: results
      });

      return { 
        statusCode: 200, 
        body: JSON.stringify({
          message: 'Message sent',
          messageId: `${channelId}:${timestamp}`,
          broadcast: {
            total: results.length,
            successful: successCount,
            failed: results.length - successCount,
            details: results
          }
        })
      };
    } catch (error) {
      console.error('Message handler error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error,
        connectionId,
        channelId,
        workspaceId
      });
      return { 
        statusCode: 500, 
        body: JSON.stringify({
          message: 'Failed to send message',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  },

  // presence handler
  async presence(event: WebSocketEvent): Promise<APIGatewayProxyResult> {
    const connectionId = event.requestContext.connectionId;
    const body = event.body ? JSON.parse(event.body) : {};
    const { workspaceId, status } = body;

    try {
      // Update connection status
      await dynamoDb.update({
        TableName: CONNECTIONS_TABLE!,
        Key: { connectionId },
        UpdateExpression: 'set #status = :status, workspaceId = :workspaceId',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':workspaceId': workspaceId
        }
      }).promise();

      // Get all connections in the workspace
      const connections = await dynamoDb.query({
        TableName: CONNECTIONS_TABLE!,
        IndexName: 'workspaceIndex',
        KeyConditionExpression: 'workspaceId = :workspaceId',
        ExpressionAttributeValues: {
          ':workspaceId': workspaceId
        }
      }).promise();

      // Broadcast presence update to all connections
      const broadcastPromises = connections.Items?.map(connection => {
        if (connection.connectionId !== connectionId) {
          return sendMessageToConnection(connection.connectionId, {
            type: 'presence',
            connectionId,
            status
          });
        }
      });

      if (broadcastPromises) {
        await Promise.all(broadcastPromises);
      }

      return { statusCode: 200, body: 'Presence updated' };
    } catch (error) {
      console.error('presence error:', error);
      return { statusCode: 500, body: 'Failed to update presence' };
    }
  },

  // typing handler
  async typing(event: WebSocketEvent): Promise<APIGatewayProxyResult> {
    const connectionId = event.requestContext.connectionId;
    const body = event.body ? JSON.parse(event.body) : {};
    const { channelId, workspaceId, isTyping } = body;

    try {
      // Get all connections in the workspace
      const connections = await dynamoDb.query({
        TableName: CONNECTIONS_TABLE!,
        IndexName: 'workspaceIndex',
        KeyConditionExpression: 'workspaceId = :workspaceId',
        ExpressionAttributeValues: {
          ':workspaceId': workspaceId
        }
      }).promise();

      // Broadcast typing status to all connections
      const broadcastPromises = connections.Items?.map(connection => {
        if (connection.connectionId !== connectionId) {
          return sendMessageToConnection(connection.connectionId, {
            type: 'typing',
            connectionId,
            channelId,
            isTyping
          });
        }
      });

      if (broadcastPromises) {
        await Promise.all(broadcastPromises);
      }

      return { statusCode: 200, body: 'Typing status broadcast' };
    } catch (error) {
      console.error('typing error:', error);
      return { statusCode: 500, body: 'Failed to broadcast typing status' };
    }
  },

  // thread_message handler
  async thread_message(event: WebSocketEvent): Promise<APIGatewayProxyResult> {
    const connectionId = event.requestContext.connectionId;
    const body = event.body ? JSON.parse(event.body) : {};
    const { parentMessageId, content, workspaceId, attachments } = body;

    console.log('Received thread message event:', {
      connectionId,
      parentMessageId,
      content,
      workspaceId,
      attachments
    });

    try {
      // Get the connection record to get the userId
      const connectionRecord = await dynamoDb.get({
        TableName: CONNECTIONS_TABLE!,
        Key: { connectionId }
      }).promise();

      if (!connectionRecord.Item) {
        return { statusCode: 400, body: 'Connection record not found' };
      }

      const userId = connectionRecord.Item.userId;
      const timestamp = new Date().toISOString();

      // Store thread message in DynamoDB
      const threadMessageItem = {
        parentMessageId,
        timestamp,
        content,
        userId,
        attachments
      };

      await dynamoDb.put({
        TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
        Item: threadMessageItem
      }).promise();

      // Update thread count in parent message
      await dynamoDb.update({
        TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
        Key: { messageId: parentMessageId },
        UpdateExpression: 'ADD threadCount :inc',
        ExpressionAttributeValues: {
          ':inc': 1
        }
      }).promise();

      // Get all active connections in the workspace
      const connections = await dynamoDb.query({
        TableName: CONNECTIONS_TABLE!,
        IndexName: 'workspaceIndex',
        KeyConditionExpression: 'workspaceId = :workspaceId',
        FilterExpression: '#status IN (:status1, :status2)',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':workspaceId': workspaceId,
          ':status1': 'connected',
          ':status2': 'online'
        }
      }).promise();

      // Broadcast to all connections
      const broadcastMessage = {
        type: 'thread_message',
        parentMessageId,
        content,
        userId,
        timestamp,
        attachments,
        messageId: `${parentMessageId}:${timestamp}`
      };

      const broadcastPromises = connections.Items?.map(connection =>
        sendMessageToConnection(connection.connectionId, broadcastMessage)
      );

      if (broadcastPromises) {
        await Promise.all(broadcastPromises);
      }

      return { 
        statusCode: 200, 
        body: JSON.stringify({
          message: 'Thread message sent',
          messageId: `${parentMessageId}:${timestamp}`
        })
      };
    } catch (error) {
      console.error('Thread message handler error:', error);
      return { statusCode: 500, body: 'Failed to send thread message' };
    }
  }
};

// Main route handler for POST requests (all WebSocket messages)
export async function POST(request: Request) {
  try {
    console.log('==== WEBSOCKET POST HANDLER REACHED ====');
    
    // Get the raw request details
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const url = new URL(request.url);
    
    console.log('Raw request details:', {
      method: request.method,
      headers,
      rawBody,
      url: request.url,
      searchParams: Object.fromEntries(url.searchParams.entries())
    });

    // Extract connection ID from various possible sources
    const connectionId = 
      headers['x-apigateway-connectionid'] || 
      headers['connectionid'] ||
      headers['x-connectionid'] ||
      (rawBody && rawBody.includes('connectionId') ? JSON.parse(rawBody).connectionId : null) ||
      url.searchParams.get('connectionId');

    if (!connectionId || connectionId === 'unknown') {
      console.error('Missing or invalid connection ID:', { headers, rawBody, searchParams: url.searchParams });
      return NextResponse.json({ 
        statusCode: 400, 
        body: 'Missing or invalid connection ID' 
      });
    }

    // Determine if this is a $connect event
    const isConnect = !rawBody || rawBody.length === 0 || !rawBody.includes('"action"');
    const routeKey = isConnect ? '$connect' : (JSON.parse(rawBody).action || '$default');

    // Construct the WebSocket event
    const event: WebSocketEvent = {
      requestContext: {
        connectionId,
        routeKey,
        querystring: url.searchParams.toString()
      },
      headers,
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      body: rawBody
    };

    // Log environment configuration
    console.log('Environment configuration:', {
      CONNECTIONS_TABLE: process.env.AWS_DYNAMODB_CONNECTIONS_TABLE,
      AWS_REGION: process.env.AWS_REGION,
      WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
      NODE_ENV: process.env.NODE_ENV
    });

    // Handle the event based on route key
    let result;
    switch (routeKey) {
      case '$connect':
        result = await handlers.connect(event);
        break;
      case '$disconnect':
        result = await handlers.disconnect(event);
        break;
      case 'message':
        result = await handlers.message(event);
        break;
      case 'thread_message':
        result = await handlers.thread_message(event);
        break;
      case 'presence':
        result = await handlers.presence(event);
        break;
      case 'typing':
        result = await handlers.typing(event);
        break;
      default:
        console.error('Unknown route key:', routeKey);
        return NextResponse.json({ statusCode: 400, body: 'Unknown route' });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('WebSocket POST handler error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    return NextResponse.json({ 
      statusCode: 500, 
      body: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 