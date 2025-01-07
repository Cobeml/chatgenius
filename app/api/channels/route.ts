import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamoDb = new DynamoDB.DocumentClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, name } = await request.json();

    // Verify workspace ownership
    const workspace = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: workspaceId }
    }).promise();

    if (!workspace.Item || workspace.Item.ownerId !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channel = {
      workspaceId,
      id: uuidv4(),
      name: name.trim(),
      isPrivate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: Date.now() // Add position field for ordering
    };

    await dynamoDb.put({
      TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
      Item: channel
    }).promise();

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error("Create channel error:", error);
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    const result = await dynamoDb.query({
      TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
      KeyConditionExpression: 'workspaceId = :workspaceId',
      ExpressionAttributeValues: {
        ':workspaceId': workspaceId
      }
    }).promise();

    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error("Get channels error:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
} 