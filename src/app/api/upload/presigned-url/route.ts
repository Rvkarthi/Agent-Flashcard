import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getResolvedS3Credentials } from "@/lib/server-env";

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

    // Resolves credentials supporting S3_* for AWS Amplify (where AWS_* is blocked)
    const { bucketName, region, accessKeyId, secretAccessKey, hasCredentials } =
      getResolvedS3Credentials(customBucket, customRegion);

    // Sanitize S3 Object Key
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");
    const timestamp = Date.now();
    const key = `study-documents/${timestamp}-${sanitizedFileName}`;

    const normalizedContentType =
      fileType && fileType.trim().length > 0
        ? fileType.trim().toLowerCase()
        : "application/octet-stream";

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
        ContentType: normalizedContentType,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
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

    // Sandbox fallback
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate presigned URL";
    console.error("Presigned URL error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
