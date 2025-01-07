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
      FilterExpression: 'ownerId = :userId OR contains(members, :userId)',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    const result = await dynamoDb.scan(params).promise();
    const workspaces = result.Items || [];

    // Transform the data to include roles
    const formattedWorkspaces = workspaces.map(workspace => ({
      id: workspace.id,
      name: workspace.name,
      role: workspace.ownerId === userId ? 'owner' : 'member'
    }));

    return NextResponse.json(formattedWorkspaces);
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message }, 
      { status: 500 }
    );
  }
}