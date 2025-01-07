import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DynamoDB } from 'aws-sdk';

// Initialize DynamoDB client
const dynamoDb = new DynamoDB.DocumentClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
    }

    const params = {
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      KeyConditionExpression: 'channelId = :channelId',
      ExpressionAttributeValues: {
        ':channelId': channelId
      },
      ScanIndexForward: false, // This will return items in descending order
      Limit: 50
    };

    const result = await dynamoDb.query(params).promise();
    return NextResponse.json(result.Items || []);

  } catch (error: unknown) {
    console.error("Fetch messages error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch messages",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId, content, attachments } = await request.json();

    if (!channelId?.trim() || (!content?.trim() && (!attachments || attachments.length === 0))) {
      return NextResponse.json({ error: "Channel ID and either message content or attachments are required" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const userId = session.user.email;

    const params = {
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      Item: {
        channelId: channelId.trim(),
        timestamp: timestamp,
        userId: userId,
        content: content.trim(),
        ...(attachments && attachments.length > 0 && { attachments })
      }
    };

    await dynamoDb.put(params).promise();

    return NextResponse.json(params.Item, { status: 201 });

  } catch (error: unknown) {
    console.error("Send message error:", error);
    return NextResponse.json({ 
      error: "Failed to send message",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 