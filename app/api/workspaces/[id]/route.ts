import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: params.id }
    }).promise();

    if (!result.Item) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json(result.Item);
  } catch (error) {
    console.error("Fetch workspace error:", error);
    return NextResponse.json({ error: "Failed to fetch workspace" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();
    const updateParams = {
      TableName: process.env.AWS_DYNAMODB_WORKSPACES_TABLE!,
      Key: { id: params.id },
      UpdateExpression: 'set #name = :name, members = :members, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': updates.name,
        ':members': updates.members,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDb.update(updateParams).promise();
    return NextResponse.json(result.Attributes);
  } catch (error) {
    console.error("Update workspace error:", error);
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }
} 