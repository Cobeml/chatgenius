import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { DynamoDB } from 'aws-sdk';
import { isDMChannel, getDMParticipants } from '@/app/utils/dm';

const dynamoDb = new DynamoDB.DocumentClient();
const CHANNEL_MEMBERSHIP_TABLE = process.env.AWS_DYNAMODB_CHANNEL_MEMBERSHIP_TABLE;

// Mark messages as read
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!CHANNEL_MEMBERSHIP_TABLE) {
      return NextResponse.json({ error: 'Channel membership table not configured' }, { status: 500 });
    }

    const { channelId, messageId, workspaceId } = await request.json();

    if (!channelId || !messageId || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For DM channels, verify the user is a participant
    if (isDMChannel(channelId)) {
      const participants = getDMParticipants(channelId);
      if (!participants?.includes(session.user.email.toLowerCase())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Update the channel membership with the last read message
    const timestamp = new Date().toISOString();
    await dynamoDb.put({
      TableName: CHANNEL_MEMBERSHIP_TABLE,
      Item: {
        channelId,
        userId: session.user.email,
        lastReadMessageId: messageId,
        lastReadTimestamp: timestamp,
        workspaceId
      }
    }).promise();

    return NextResponse.json({ 
      success: true,
      timestamp,
      messageId 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}

// Get read status for a channel
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!CHANNEL_MEMBERSHIP_TABLE) {
      return NextResponse.json({ error: 'Channel membership table not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // For DM channels, verify the user is a participant
    if (isDMChannel(channelId)) {
      const participants = getDMParticipants(channelId);
      if (!participants?.includes(session.user.email.toLowerCase())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Get read status for all members in the channel
    const result = await dynamoDb.query({
      TableName: CHANNEL_MEMBERSHIP_TABLE,
      KeyConditionExpression: 'channelId = :channelId',
      ExpressionAttributeValues: {
        ':channelId': channelId
      }
    }).promise();

    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error getting read status:', error);
    return NextResponse.json(
      { error: 'Failed to get read status' },
      { status: 500 }
    );
  }
} 