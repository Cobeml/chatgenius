import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dynamoDb } from "@/utils/aws-config";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const workspaceId = uuidv4();
    const timestamp = new Date().toISOString();

    await dynamoDb.put({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Item: {
        id: workspaceId,
        name: name.trim(),
        ownerId: session!.user!.email,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    }).promise();

    return NextResponse.json({
      id: workspaceId,
      name: name.trim(),
      ownerId: session?.user?.email ?? 'unknown',
      createdAt: timestamp,
      updatedAt: timestamp
    }, { status: 201 });

  } catch (error: any) {
    console.error("Create workspace error:", error);
    return NextResponse.json({ 
      error: "Failed to create workspace",
      details: error.message 
    }, { status: 500 });
  }
} 