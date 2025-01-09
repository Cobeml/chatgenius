import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dynamoDb } from '@/utils/aws-config';

async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, recaptchaToken } = await request.json();
    console.log('Signup attempt for:', email);

    // Verify reCAPTCHA
    if (!recaptchaToken) {
      return NextResponse.json({ error: "reCAPTCHA verification required" }, { status: 400 });
    }

    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return NextResponse.json({ error: "reCAPTCHA verification failed" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await dynamoDb.get({
      TableName: process.env.AWS_DYNAMODB_USERS_TABLE!,
      Key: { email }
    }).promise();

    if (existingUser.Item) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    await dynamoDb.put({
      TableName: process.env.AWS_DYNAMODB_USERS_TABLE!,
      Item: {
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      }
    }).promise();

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch (error: unknown) {
    console.error('Signup error:', error);
    return NextResponse.json({ 
      error: "Failed to create user",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 