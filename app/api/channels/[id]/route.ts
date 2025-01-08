import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

type Props = {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  context: Props
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = context.params.id;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    const dbParams = {
      TableName: process.env.AWS_DYNAMODB_CHANNELS_TABLE!,
      Key: {
        workspaceId: workspaceId,
        id: id
      }
    };

    const result = await dynamoDb.get(dbParams).promise();
    
    if (!result.Item) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json(result.Item);

  } catch (error: unknown) {
    console.error("Fetch channel error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch channel",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 