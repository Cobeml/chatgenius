import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user?.email || '';
    if (!userId) {
      return NextResponse.json({ error: 'User email not found' }, { status: 401 });
    }

    const params = {
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      FilterExpression: 'contains(invites, :userId)',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    const result = await dynamoDb.scan(params).promise();
    const workspaces = result.Items || [];

    // Transform the data to match the WorkspaceInvite interface
    const invites = workspaces.map(workspace => ({
      id: workspace.id,
      workspaceName: workspace.name,
      inviterId: workspace.ownerId
    }));

    return NextResponse.json(invites);
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { inviteId, accept } = await request.json();
    const userId = session.user?.email || '';

    const workspace = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: inviteId }
    }).promise();

    if (!workspace.Item) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    if (accept) {
      // Add to members and remove from invites
      await dynamoDb.update({
        TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
        Key: { id: inviteId },
        UpdateExpression: 'ADD members :userId REMOVE invites :userId',
        ExpressionAttributeValues: {
          ':userId': new Set([userId])
        }
      }).promise();
    } else {
      // Just remove from invites
      await dynamoDb.update({
        TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
        Key: { id: inviteId },
        UpdateExpression: 'REMOVE invites :userId',
        ExpressionAttributeValues: {
          ':userId': new Set([userId])
        }
      }).promise();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { workspaceId, emails } = await request.json();
    const inviterId = session.user?.email;

    if (!workspaceId || !emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    console.log('Debug:', { workspaceId, emails, inviterId }); // Add debugging

    const workspace = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: workspaceId }
    }).promise();

    if (!workspace.Item) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    if (workspace.Item.ownerId !== inviterId) {
      return NextResponse.json({ error: 'Unauthorized to invite users' }, { status: 403 });
    }

    // Ensure emails array is not empty
    if (emails.length === 0) {
      return NextResponse.json({ error: 'No email addresses provided' }, { status: 400 });
    }

    await dynamoDb.update({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: workspaceId },
      UpdateExpression: 'SET invites = list_append(if_not_exists(invites, :empty_list), :emails)',
      ExpressionAttributeValues: {
        ':emails': emails,
        ':empty_list': []
      }
    }).promise();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message }, 
      { status: 500 }
    );
  }
} 