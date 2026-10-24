/**
 * Centralized AWS & S3 credential resolver.
 * Supports standard AWS_* variables for local dev, and S3_* / APP_* variables for
 * AWS Amplify Console where the "AWS_" prefix is strictly reserved and prohibited.
 */

export interface ResolvedS3Credentials {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  hasCredentials: boolean;
}

export function getResolvedS3Credentials(
  customBucket?: string | null,
  customRegion?: string | null,
  customKeyId?: string | null,
  customSecret?: string | null
): ResolvedS3Credentials {
  const bucketName = (
    customBucket ||
    process.env.S3_BUCKET_NAME ||
    process.env.APP_AWS_S3_BUCKET_NAME ||
    process.env.STORAGE_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.NEXT_PUBLIC_S3_BUCKET ||
    process.env.NEXT_PUBLIC_AWS_S3_BUCKET ||
    ""
  ).trim();

  const region = (
    customRegion ||
    process.env.S3_REGION ||
    process.env.APP_AWS_REGION ||
    process.env.STORAGE_REGION ||
    process.env.AWS_REGION ||
    process.env.NEXT_PUBLIC_S3_REGION ||
    process.env.NEXT_PUBLIC_AWS_REGION ||
    "us-east-1"
  ).trim();

  const accessKeyId = (
    customKeyId ||
    process.env.S3_ACCESS_KEY_ID ||
    process.env.APP_AWS_ACCESS_KEY_ID ||
    process.env.STORAGE_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID ||
    process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ||
    ""
  ).trim();

  const secretAccessKey = (
    customSecret ||
    process.env.S3_SECRET_ACCESS_KEY ||
    process.env.APP_AWS_SECRET_ACCESS_KEY ||
    process.env.STORAGE_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ||
    ""
  ).trim();

  const hasCredentials = Boolean(bucketName && accessKeyId && secretAccessKey);

  return {
    bucketName,
    region,
    accessKeyId,
    secretAccessKey,
    hasCredentials,
  };
}
