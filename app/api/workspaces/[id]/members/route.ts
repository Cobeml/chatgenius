import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get workspace data
    const workspace = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id }
    }).promise();

    if (!workspace.Item) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get all users in batch
    const userPromises = workspace.Item.members.map((m: { userId: string }) => 
      dynamoDb.get({
        TableName: process.env.AWS_DYNAMODB_USERS_TABLE!,
        Key: { email: m.userId }
      }).promise()
    );
    
    const users = await Promise.all(userPromises);

    // Map users to member format
    const members = workspace.Item.members.map((member: { userId: string, role: 'owner' | 'admin' | 'member' }) => {
      const user = users.find(u => u.Item?.email === member.userId);
      return {
        email: user?.Item?.email || 'Unknown',
        role: member.role
      };
    });

    return NextResponse.json(members);
  } catch (error: unknown) {
    console.error('Error fetching workspace members:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 