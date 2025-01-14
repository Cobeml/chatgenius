import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { DynamoDB } from 'aws-sdk';
import { isDMChannel } from "@/app/utils/dm";

// Initialize DynamoDB client
const dynamoDb = new DynamoDB.DocumentClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Scan for messages in DM channels involving the user
    // Note: In production, you'd want to use a GSI for better performance
    const scanParams = {
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      FilterExpression: 'begins_with(channelId, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'dm_'
      }
    };

    const result = await dynamoDb.scan(scanParams).promise();
    const messages = result.Items || [];

    // Filter messages to only include DMs where the user is a participant
    const userDMs = messages.filter(message => {
      if (!isDMChannel(message.channelId)) return false;
      const channelId = message.channelId.toLowerCase();
      const userIdLower = userId.toLowerCase();
      return channelId.includes(userIdLower);
    });

    return NextResponse.json(userDMs);

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