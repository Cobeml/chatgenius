import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

const dynamodb = new DynamoDB.DocumentClient();
const WORKSPACES_TABLE = process.env.AWS_DYNAMODB_WORKSPACES_TABLE;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!WORKSPACES_TABLE) {
    console.error('WORKSPACES_TABLE environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { workspaceId } = await request.json();

    // Get the workspace
    const { Item: workspace } = await dynamodb.get({
      TableName: WORKSPACES_TABLE,
      Key: { id: workspaceId }
    }).promise();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is invited
    if (!workspace.invites?.includes(session.user.email)) {
      return NextResponse.json({ error: 'No invite found' }, { status: 403 });
    }

    // Remove user from invites and add to members
    await dynamodb.update({
      TableName: WORKSPACES_TABLE,
      Key: { id: workspaceId },
      UpdateExpression: `
        SET members = list_append(
          if_not_exists(members, :empty_list),
          :new_member
        ),
        invites = :updated_invites,
        updatedAt = :timestamp
      `,
      ExpressionAttributeValues: {
        ':empty_list': [],
        ':new_member': [{
          userId: session.user.email,
          role: 'member'
        }],
        ':updated_invites': workspace.invites.filter((email: string) => email !== session!.user!.email),
        ':timestamp': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'  // This will help us debug by returning the updated item
    }).promise();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 