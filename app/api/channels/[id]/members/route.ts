import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

// Get channel members
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    const channel = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
      Key: {
        workspaceId,
        id
      }
    }).promise();

    if (!channel.Item) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (!channel.Item.isPrivate) {
      return NextResponse.json({ error: "Not a private channel" }, { status: 400 });
    }

    return NextResponse.json(channel.Item.members || []);
  } catch (error) {
    console.error("Get channel members error:", error);
    return NextResponse.json({ error: "Failed to get channel members" }, { status: 500 });
  }
}

// Add members to private channel
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { workspaceId, members } = await request.json();

    if (!workspaceId || !members || !Array.isArray(members)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get channel and verify ownership
    const channel = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
      Key: {
        workspaceId,
        id
      }
    }).promise();

    if (!channel.Item) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (!channel.Item.isPrivate) {
      return NextResponse.json({ error: "Not a private channel" }, { status: 400 });
    }

    // Get workspace to verify admin status
    const workspace = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: workspaceId }
    }).promise();

    if (!workspace.Item) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isAdmin = workspace.Item.ownerId === session.user.email || 
                   (workspace.Item.admins && workspace.Item.admins.includes(session.user.email));

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update channel members
    const currentMembers = channel.Item.members || [];
    const newMembers = [...new Set([...currentMembers, ...members])];

    await dynamoDb.update({
      TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
      Key: {
        workspaceId,
        id
      },
      UpdateExpression: 'SET members = :members',
      ExpressionAttributeValues: {
        ':members': newMembers
      }
    }).promise();

    return NextResponse.json({ success: true, members: newMembers });
  } catch (error) {
    console.error("Add channel members error:", error);
    return NextResponse.json({ error: "Failed to add channel members" }, { status: 500 });
  }
}

// Remove member from private channel
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const memberToRemove = searchParams.get('member');

    if (!workspaceId || !memberToRemove) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get channel and verify ownership
    const channel = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
      Key: {
        workspaceId,
        id
      }
    }).promise();

    if (!channel.Item) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (!channel.Item.isPrivate) {
      return NextResponse.json({ error: "Not a private channel" }, { status: 400 });
    }

    // Get workspace to verify admin status
    const workspace = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: workspaceId }
    }).promise();

    if (!workspace.Item) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isAdmin = workspace.Item.ownerId === session.user.email || 
                   (workspace.Item.admins && workspace.Item.admins.includes(session.user.email));

    if (!isAdmin && session.user.email !== memberToRemove) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update channel members
    const currentMembers = channel.Item.members || [];
    const newMembers = currentMembers.filter((m: string) => m !== memberToRemove);

    await dynamoDb.update({
      TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
      Key: {
        workspaceId,
        id
      },
      UpdateExpression: 'SET members = :members',
      ExpressionAttributeValues: {
        ':members': newMembers
      }
    }).promise();

    return NextResponse.json({ success: true, members: newMembers });
  } catch (error) {
    console.error("Remove channel member error:", error);
    return NextResponse.json({ error: "Failed to remove channel member" }, { status: 500 });
  }
} 