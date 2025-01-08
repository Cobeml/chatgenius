import { Suspense } from 'react';
import WorkspaceClient from './WorkspaceClient';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamoDB = DynamoDBDocument.from(new DynamoDB({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
}));

interface PageProps {
  params: Promise<{ id: string }>;
}

async function checkWorkspaceAccess(workspaceId: string, userEmail: string) {
  const workspace = await dynamoDB.get({
    TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
    Key: { id: workspaceId }
  });

  if (!workspace.Item) {
    return null;
  }

  const userRole = workspace.Item.members.find(
    (member: { userId: string; role: string }) => member.userId === userEmail
  );

  if (!userRole && workspace.Item.ownerId !== userEmail) {
    return null;
  }

  return {
    ...workspace.Item,
    userRole: workspace.Item.ownerId === userEmail ? 'owner' : userRole?.role
  };
}

export default async function WorkspacePage({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/login');
  }

  const workspaceAccess = await checkWorkspaceAccess(resolvedParams.id, session.user.email);
  
  if (!workspaceAccess) {
    redirect('/dashboard'); // Or wherever you want to redirect unauthorized users
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkspaceClient 
        workspaceId={resolvedParams.id} 
        userRole={workspaceAccess.userRole}
      />
    </Suspense>
  );
} 