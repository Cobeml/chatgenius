import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  GetCommand
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const command = new QueryCommand({
      TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
      KeyConditionExpression: 'parentMessageId = :parentMessageId',
      ExpressionAttributeValues: {
        ':parentMessageId': id
      },
      ScanIndexForward: true
    });

    const result = await dynamoDb.send(command);
    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { content, userId, attachments, channelId } = body;
    const timestamp = new Date().toISOString();

    const threadMessage = {
      parentMessageId: id,
      messageId: timestamp,
      timestamp,
      content,
      userId,
      attachments
    };

    const putCommand = new PutCommand({
      TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
      Item: threadMessage
    });

    await dynamoDb.send(putCommand);

    const updateCommand = new UpdateCommand({
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      Key: { 
        channelId,
        timestamp: id
      },
      UpdateExpression: 'ADD threadCount :inc',
      ExpressionAttributeValues: {
        ':inc': 1
      }
    });

    await dynamoDb.send(updateCommand);
    return NextResponse.json(threadMessage);
  } catch (error) {
    console.error('Error creating thread message:', error);
    return NextResponse.json(
      { error: 'Failed to create thread message' },
      { status: 500 }
    );
  }
}

// New route for editing thread messages
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Thread message ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    // First, get the existing message to ensure it exists
    const getCommand = new GetCommand({
      TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
      Key: {
        parentMessageId: id,
        timestamp: messageId
      }
    });

    const existingMessage = await dynamoDb.send(getCommand);
    if (!existingMessage.Item) {
      return NextResponse.json(
        { error: 'Thread message not found' },
        { status: 404 }
      );
    }

    const updateCommand = new UpdateCommand({
      TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
      Key: {
        parentMessageId: id,
        timestamp: messageId
      },
      UpdateExpression: 'SET content = :content, edited = :edited',
      ExpressionAttributeValues: {
        ':content': content,
        ':edited': true
      },
      ReturnValues: 'ALL_NEW'
    });

    const result = await dynamoDb.send(updateCommand);
    return NextResponse.json(result.Attributes);
  } catch (error) {
    console.error('Error updating thread message:', error);
    return NextResponse.json(
      { error: 'Failed to update thread message' },
      { status: 500 }
    );
  }
}

// New route for deleting thread messages
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const channelId = searchParams.get('channelId');

    if (!messageId || !channelId) {
      return NextResponse.json(
        { error: 'Thread message ID and channel ID are required' },
        { status: 400 }
      );
    }

    // First, get the existing message to ensure it exists
    const getCommand = new GetCommand({
      TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
      Key: {
        parentMessageId: id,
        timestamp: messageId
      }
    });

    const existingMessage = await dynamoDb.send(getCommand);
    if (!existingMessage.Item) {
      return NextResponse.json(
        { error: 'Thread message not found' },
        { status: 404 }
      );
    }

    // Update the message to show as deleted
    const updateCommand = new UpdateCommand({
      TableName: process.env.AWS_DYNAMODB_THREADS_TABLE!,
      Key: {
        parentMessageId: id,
        timestamp: messageId
      },
      UpdateExpression: 'SET content = :content, deleted = :deleted',
      ExpressionAttributeValues: {
        ':content': '[Message deleted]',
        ':deleted': true
      },
      ReturnValues: 'ALL_NEW'
    });

    const result = await dynamoDb.send(updateCommand);
    return NextResponse.json(result.Attributes);
  } catch (error) {
    console.error('Error deleting thread message:', error);
    return NextResponse.json(
      { error: 'Failed to delete thread message' },
      { status: 500 }
    );
  }
} 