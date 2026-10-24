import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { customBucket, customRegion, customKeyId, customSecretKey } = body;

    const accessKeyId = (
      customKeyId ||
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ||
      ""
    ).trim();

    const secretAccessKey = (
      customSecretKey ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ||
      ""
    ).trim();

    const bucketName = (
      customBucket ||
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.NEXT_PUBLIC_AWS_S3_BUCKET ||
      ""
    ).trim();

    const region = (
      customRegion ||
      process.env.AWS_REGION ||
      process.env.NEXT_PUBLIC_AWS_REGION ||
      "us-east-1"
    ).trim();

    // 1. Length validation check
    const issues: string[] = [];
    if (!accessKeyId) {
      issues.push("AWS_ACCESS_KEY_ID is missing.");
    } else if (accessKeyId.length !== 20) {
      issues.push(`AWS_ACCESS_KEY_ID has length ${accessKeyId.length} (expected: 20 characters, starting with AKIA...)`);
    }

    if (!secretAccessKey) {
      issues.push("AWS_SECRET_ACCESS_KEY is missing.");
    } else if (secretAccessKey.length !== 40) {
      issues.push(
        `AWS_SECRET_ACCESS_KEY has length ${secretAccessKey.length} characters (AWS Secret Access Keys are always exactly 40 characters). It appears ${
          40 - secretAccessKey.length
        } characters were cut off when pasting!`
      );
    }

    if (!bucketName) {
      issues.push("S3 Bucket Name is missing.");
    }

    if (issues.length > 0) {
      return NextResponse.json({
        success: false,
        errorType: "CredentialLengthMismatch",
        issues,
        accessKeyLength: accessKeyId.length,
        secretKeyLength: secretAccessKey.length,
        bucketName,
        region,
      });
    }

    // 2. Test actual call to AWS S3
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    try {
      await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          MaxKeys: 1,
        })
      );

      return NextResponse.json({
        success: true,
        message: `Successfully authenticated with Amazon S3 bucket "${bucketName}" in region "${region}".`,
        bucketName,
        region,
      });
    } catch (awsErr: unknown) {
      const errName = (awsErr as { name?: string })?.name || "AWSError";
      const errMsg = (awsErr as Error)?.message || "AWS request failed";

      let diagnosis = errMsg;
      if (errName === "SignatureDoesNotMatch") {
        diagnosis = `SignatureDoesNotMatch: AWS rejected the cryptographic signature. This happens when the Secret Access Key is wrong or truncated (Current length: ${secretAccessKey.length}/40), or when the AWS_REGION does not match the bucket's region.`;
      } else if (errName === "AccessDenied" || errMsg.includes("Access Denied")) {
        diagnosis = `AccessDenied: Your IAM User does not have s3:ListBucket / s3:PutObject permissions on bucket "${bucketName}".`;
      } else if (errName === "NoSuchBucket") {
        diagnosis = `NoSuchBucket: The bucket "${bucketName}" does not exist in region "${region}".`;
      }

      return NextResponse.json({
        success: false,
        errorType: errName,
        diagnosis,
        rawMessage: errMsg,
        bucketName,
        region,
        secretKeyLength: secretAccessKey.length,
      });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
