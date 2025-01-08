import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

interface ChannelPosition {
  id: string;
  position: number;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, channels } = await request.json();

    // Verify workspace ownership
    const workspace = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: workspaceId }
    }).promise();

    if (!workspace.Item || workspace.Item.ownerId !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update each channel's position
    await Promise.all(channels.map((channel: ChannelPosition) => 
      dynamoDb.update({
        TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
        Key: { 
          workspaceId: workspaceId,
          id: channel.id 
        },
        UpdateExpression: 'set #pos = :position',
        ExpressionAttributeNames: {
          '#pos': 'position'
        },
        ExpressionAttributeValues: {
          ':position': channel.position
        }
      }).promise()
    ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder channels error:", error);
    return NextResponse.json({ error: "Failed to reorder channels" }, { status: 500 });
  }
} 