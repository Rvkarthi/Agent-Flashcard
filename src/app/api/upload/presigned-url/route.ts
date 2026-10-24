import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, fileType, customBucket, customRegion } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "Missing required field: fileName" },
        { status: 400 }
      );
    }

    // 1. Validate & trim AWS environment variables
    const accessKeyId = (
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ||
      ""
    ).trim();

    const secretAccessKey = (
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ||
      ""
    ).trim();

    const region = (
      customRegion ||
      process.env.AWS_REGION ||
      process.env.NEXT_PUBLIC_AWS_REGION ||
      "us-east-1"
    ).trim();

    const bucketName = (
      customBucket ||
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.NEXT_PUBLIC_AWS_S3_BUCKET ||
      ""
    ).trim();

    // 2. Sanitize S3 Object Key: strictly alphanumeric, dots, and hyphens
    // Prevents URI encoding/decoding mismatches between client & AWS SigV4
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");
    const timestamp = Date.now();
    const key = `study-documents/${timestamp}-${sanitizedFileName}`;

    // Normalize MIME type
    const normalizedContentType = fileType && fileType.trim().length > 0
      ? fileType.trim().toLowerCase()
      : "application/octet-stream";

    // 3. Generate Presigned URL if credentials are present
    if (bucketName && accessKeyId && secretAccessKey) {
      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // EXACT HEADER ALIGNMENT:
      // Sign with exact normalized ContentType so S3 stores correct metadata.
      // The frontend MUST send this exact Content-Type header.
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: normalizedContentType,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      const s3Uri = `s3://${bucketName}/${key}`;
      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

      return NextResponse.json({
        success: true,
        presignedUrl,
        key,
        bucketName,
        region,
        s3Uri,
        publicUrl,
        contentType: normalizedContentType,
        mode: "aws_s3_live",
      });
    }

    // 4. Sandbox fallback if AWS credentials are not configured on server
    return NextResponse.json({
      success: true,
      presignedUrl: null,
      key,
      bucketName: bucketName || "amplify-study-docs-sandbox",
      region,
      s3Uri: `s3://${bucketName || "amplify-study-docs-sandbox"}/${key}`,
      publicUrl: `https://${bucketName || "amplify-study-docs-sandbox"}.s3.${region}.amazonaws.com/${key}`,
      contentType: normalizedContentType,
      mode: "sandbox",
      message:
        "AWS credentials not detected. Operating in sandbox mode with simulated direct S3 upload.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate presigned URL";
    console.error("Presigned URL error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
