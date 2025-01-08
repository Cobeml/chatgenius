import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { s3 } from "@/utils/aws-config";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const channelId = formData.get('channelId') as string;

    if (!file || !channelId) {
      return NextResponse.json({ error: "File and channel ID required" }, { status: 400 });
    }

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `uploads/${channelId}/${Date.now()}-${file.name}`;
    
    try {
      await s3.upload({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }).promise();
    } catch (s3Error) {
      console.error("S3 Upload error:", s3Error);
      return NextResponse.json({ 
        error: "S3 Upload failed",
        details: s3Error instanceof Error ? s3Error.message : "Unknown S3 error",
        bucket: process.env.AWS_S3_BUCKET_NAME,
        region: process.env.AWS_S3_BUCKET_REGION
      }, { status: 500 });
    }

    // Only return the file URL, don't create a message
    return NextResponse.json({ 
      success: true,
      fileUrl: key 
    }, { status: 201 });
  }
  catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ 
      error: "Upload failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 