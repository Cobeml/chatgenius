import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Safely access the id parameter - need to await params now
    const { id } = await params;
    const channelId = id;

    const queryParams = {
      TableName: process.env.AWS_DYNAMODB_MESSAGES_TABLE!,
      KeyConditionExpression: 'channelId = :channelId',
      ExpressionAttributeValues: {
        ':channelId': channelId
      },
      ScanIndexForward: false,
      Limit: 50
    };

    const result = await dynamoDb.query(queryParams).promise();
    return NextResponse.json(result.Items || []);

  } catch (error: unknown) {
    console.error("Fetch messages error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch messages",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 