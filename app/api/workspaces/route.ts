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

    // Create initial members array with owner
    const initialMembers = [
      { userId: session.user.email, role: 'owner' as const }
    ];

    // Add additional members if any
    const allMembers = [
      ...initialMembers,
      ...members.map((m: { userId: string }) => ({ 
        userId: m.userId, 
        role: 'member' as const 
      }))
    ];

    const workspaceItem: DynamoDBSchemas['Workspaces'] = {
      id: workspaceId,
      name: name.trim(),
      ownerId: session.user.email,
      members: allMembers,
      invites: invites,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await dynamoDb.put({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Item: workspaceItem
    }).promise();

    // Return the exact structure expected by the frontend
    return NextResponse.json({
      id: workspaceId,
      name: name.trim(),
      members: allMembers,
      ownerId: session.user.email
    });

  } catch (error: unknown) {
    console.error("Create workspace error:", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
} 