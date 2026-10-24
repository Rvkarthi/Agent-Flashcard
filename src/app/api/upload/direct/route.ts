import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getResolvedS3Credentials } from "@/lib/server-env";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customBucket = formData.get("customBucket") as string | null;
    const customRegion = formData.get("customRegion") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const { bucketName, region, accessKeyId, secretAccessKey, hasCredentials } =
      getResolvedS3Credentials(customBucket, customRegion);

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const timestamp = Date.now();
    const key = `study-documents/${timestamp}-${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (hasCredentials) {
      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      });

      await s3Client.send(command);

      const s3Uri = `s3://${bucketName}/${key}`;
      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

      return NextResponse.json({
        success: true,
        key,
        bucketName,
        region,
        s3Uri,
        url: publicUrl,
        mode: "aws_s3_live",
      });
    }

    // Sandbox mode
    return NextResponse.json({
      success: true,
      key,
      bucketName: bucketName || "amplify-study-docs-sandbox",
      region,
      s3Uri: `s3://${bucketName || "amplify-study-docs-sandbox"}/${key}`,
      url: "",
      mode: "sandbox",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server-side S3 upload failed";
    console.error("Direct server S3 upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
