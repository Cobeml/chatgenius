import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_S3_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileKey = searchParams.get('file');

  if (!fileKey) {
    return new NextResponse('File key is required', { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
    });

    // Generate a signed URL that expires in 60 seconds
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return new NextResponse('Error accessing file', { status: 500 });
  }
} 