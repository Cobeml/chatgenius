import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

const dynamodb = new DynamoDB.DocumentClient();
const WORKSPACES_TABLE = process.env.AWS_DYNAMODB_WORKSPACES_TABLE;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!WORKSPACES_TABLE) {
    console.error('WORKSPACES_TABLE environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { workspaceId } = await request.json();
    console.log('Processing invite denial:', { workspaceId, userEmail });

    // Get the workspace
    const { Item: workspace } = await dynamodb.get({
      TableName: WORKSPACES_TABLE,
      Key: { id: workspaceId }
    }).promise();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is invited
    if (!workspace.invites?.includes(userEmail)) {
      return NextResponse.json({ error: 'No invite found' }, { status: 403 });
    }

    // Remove user from invites list
    const updateParams = {
      TableName: WORKSPACES_TABLE,
      Key: { id: workspaceId },
      UpdateExpression: 'SET invites = :updated_invites, updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':updated_invites': workspace.invites.filter((email: string) => email !== userEmail),
        ':timestamp': new Date().toISOString()
      },
      ConditionExpression: 'attribute_exists(id)'
    };

    await dynamodb.update(updateParams).promise();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error denying invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 