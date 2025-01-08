import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { DynamoDBSchemas } from '@/dynamodb-schema';

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
    console.log('Processing invite acceptance:', { workspaceId, userEmail: session.user.email });

    // Get the workspace
    const { Item: workspace } = await dynamodb.get({
      TableName: WORKSPACES_TABLE,
      Key: { id: workspaceId }
    }).promise();

    console.log('Found workspace:', workspace);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is invited
    if (!workspace.invites?.includes(session.user.email)) {
      console.log('User not found in invites:', { 
        invites: workspace.invites, 
        userEmail: session.user.email 
      });
      return NextResponse.json({ error: 'No invite found' }, { status: 403 });
    }

    const userEmail = session.user.email;

    // Add check for existing member
    if (workspace.members?.some((member: DynamoDBSchemas['Workspaces']['members'][0]) => 
      member.userId === userEmail
    )) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    const updateParams = {
      TableName: WORKSPACES_TABLE,
      Key: { id: workspaceId },
      UpdateExpression: `
        SET members = list_append(if_not_exists(members, :empty_list), :new_member),
            invites = :updated_invites,
            updatedAt = :timestamp
      `,
      ExpressionAttributeValues: {
        ':empty_list': [],
        ':new_member': [{
          userId: userEmail,
          role: 'member' as const
        }],
        ':updated_invites': workspace.invites.filter((email: string) => email !== userEmail),
        ':timestamp': new Date().toISOString()
      },
      ConditionExpression: 'attribute_exists(id)'
    };

    console.log('Updating workspace with params:', updateParams);
    const updateResult = await dynamodb.update(updateParams).promise();
    console.log('Update result:', updateResult);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 