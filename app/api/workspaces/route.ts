import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { dynamoDb } from "@/utils/aws-config";
import { v4 as uuidv4 } from "uuid";
import { DynamoDBSchemas } from "@/dynamodb-schema";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, members = [], invites = [] } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const workspaceId = uuidv4();
    const timestamp = new Date().toISOString();

    const workspaceItem: DynamoDBSchemas['Workspaces'] = {
      id: workspaceId,
      name: name.trim(),
      ownerId: session.user.email,
      members: [
        { userId: session.user.email, role: 'owner' },
        ...members.map((m: { userId: string }) => ({ userId: m.userId, role: 'member' as const }))
      ],
      invites: invites,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await dynamoDb.put({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Item: workspaceItem
    }).promise();

    return NextResponse.json(workspaceItem);
  } catch (error: unknown) {
    console.error("Create workspace error:", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
} 