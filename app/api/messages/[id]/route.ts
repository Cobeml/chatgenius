import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Safely access the id parameter - need to await params now
    const { id } = await params;
    const channelId = id;

    const queryParams = {
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      KeyConditionExpression: 'channelId = :channelId',
      ExpressionAttributeValues: {
        ':channelId': channelId
      },
      ScanIndexForward: false,
      Limit: 50
    };

    const result = await dynamoDb.query(queryParams).promise();
    return NextResponse.json(result.Items || []);

  } catch (error: unknown) {
    console.error("Fetch messages error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch messages",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Edit message
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;
    const { channelId, content } = await request.json();

    if (!channelId || !content?.trim()) {
      return NextResponse.json({ error: "Channel ID and content are required" }, { status: 400 });
    }

    // Get the message to verify ownership
    const message = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      Key: {
        channelId,
        timestamp: messageId
      }
    }).promise();

    if (!message.Item) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify message ownership
    if (message.Item.userId !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the message
    const result = await dynamoDb.update({
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      Key: {
        channelId,
        timestamp: messageId
      },
      UpdateExpression: 'SET content = :content, edited = :edited',
      ExpressionAttributeValues: {
        ':content': content.trim(),
        ':edited': true
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    return NextResponse.json(result.Attributes);

  } catch (error) {
    console.error("Edit message error:", error);
    return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
  }
}

// Delete message
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
    }

    // Get the message to verify ownership
    const message = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      Key: {
        channelId,
        timestamp: messageId
      }
    }).promise();

    if (!message.Item) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify message ownership
    if (message.Item.userId !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the message
    await dynamoDb.delete({
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      Key: {
        channelId,
        timestamp: messageId
      }
    }).promise();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
} 