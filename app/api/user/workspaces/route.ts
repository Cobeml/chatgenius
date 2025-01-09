import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 401 });
    }

    const params = {
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      // Remove the FilterExpression as we'll filter in memory after getting results
    };

    const result = await dynamoDb.scan(params).promise();
    const workspaces = result.Items || [];

    // Separate workspaces based on user's role
    const categorizedWorkspaces = workspaces.reduce((acc, workspace) => {
      // Check if user is a member
      const memberInfo = workspace.members?.find(
        (member: { userId: string; role: string }) => member.userId === userEmail
      );

      if (memberInfo) {
        const workspaceData = {
          id: workspace.id,
          name: workspace.name,
          role: memberInfo.role
        };

        if (memberInfo.role === 'owner') {
          acc.owned.push(workspaceData);
        } else if (memberInfo.role === 'admin') {
          acc.administered.push(workspaceData);
        } else {
          acc.member.push(workspaceData);
        }
      }

      return acc;
    }, {
      owned: [],
      administered: [],
      member: []
    });

    return NextResponse.json(categorizedWorkspaces);
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    );
  }
}