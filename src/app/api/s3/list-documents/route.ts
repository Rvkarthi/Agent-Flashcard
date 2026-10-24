import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getResolvedS3Credentials } from "@/lib/server-env";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  try {
    const customBucket = searchParams.get("bucket");
    const customRegion = searchParams.get("region");

    const { bucketName, region, accessKeyId, secretAccessKey, hasCredentials } =
      getResolvedS3Credentials(customBucket, customRegion);

    if (hasCredentials) {
      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 50,
      });

      const response = await s3Client.send(command);

      const items = (response.Contents || []).map((obj) => ({
        key: obj.Key || "",
        name: (obj.Key || "").split("/").pop() || obj.Key || "Untitled",
        size: obj.Size || 0,
        lastModified: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
        s3Uri: `s3://${bucketName}/${obj.Key}`,
        url: `https://${bucketName}.s3.${region}.amazonaws.com/${obj.Key}`,
        isPdf: (obj.Key || "").toLowerCase().endsWith(".pdf"),
      }));

      return NextResponse.json({
        success: true,
        mode: "aws_s3_live",
        bucketName,
        region,
        count: items.length,
        documents: items,
      });
    }

    // Sandbox / Mock Mode
    return NextResponse.json({
      success: true,
      mode: "sandbox",
      bucketName: bucketName || "amplify-study-docs-sandbox",
      region,
      message: "Operating in sandbox mode. Displaying local and staged S3 files.",
      count: 0,
      documents: [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list S3 documents";
    console.error("List S3 documents error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
