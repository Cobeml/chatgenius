import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

// Create an interface for the member type
interface WorkspaceMember {
  userId: string;
  lastVisited?: string;
  role?: string;
  // Add other member properties as needed
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workspaceId = context.params.id;
    const userEmail = session.user.email;
    const now = new Date().toISOString();

    // Get the current workspace
    const workspace = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: workspaceId }
    }).promise();

    if (!workspace.Item) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Update the lastVisited timestamp for the current user
    const updatedMembers = workspace.Item.members.map((member: WorkspaceMember) => {
      if (member.userId === userEmail) {
        return { ...member, lastVisited: now };
      }
      return member;
    });

    // Update the workspace with the new members array
    await dynamoDb.update({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: workspaceId },
      UpdateExpression: 'SET members = :members',
      ExpressionAttributeValues: {
        ':members': updatedMembers
      }
    }).promise();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating last visited:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 