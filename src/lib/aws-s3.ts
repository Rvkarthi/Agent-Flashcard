import { S3UploadConfig } from "@/types";

const S3_CONFIG_STORAGE_KEY = "amplify_study_s3_config";

export function getSavedS3Config(): S3UploadConfig {
  if (typeof window === "undefined") {
    return {
      bucketName: "",
      region: "us-east-1",
      useMockSandbox: true,
    };
  }

  try {
    const raw = localStorage.getItem(S3_CONFIG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read S3 config from localStorage", e);
  }

  return {
    bucketName:
      process.env.NEXT_PUBLIC_S3_BUCKET ||
      process.env.NEXT_PUBLIC_AWS_S3_BUCKET ||
      "",
    region:
      process.env.NEXT_PUBLIC_S3_REGION ||
      process.env.NEXT_PUBLIC_AWS_REGION ||
      "us-east-1",
    useMockSandbox:
      !process.env.NEXT_PUBLIC_S3_BUCKET &&
      !process.env.NEXT_PUBLIC_AWS_S3_BUCKET,
  };
}

export function saveS3Config(config: S3UploadConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(S3_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save S3 config to localStorage", e);
  }
}

export interface UploadResult {
  success: boolean;
  key: string;
  s3Uri: string;
  url: string;
  mode: "aws_s3_live" | "sandbox";
  error?: string;
}

/**
 * Executes a clean browser PUT request to an Amazon S3 presigned URL.
 * Guarantees:
 * 1. Exact Header & Method Alignment (PUT, matches backend signed ContentType)
 * 2. Strips unsigned & default headers (credentials: "omit", no custom/auth headers)
 * 3. Prevents SignatureDoesNotMatch errors caused by SigV4 canonical hash mismatches
 */
export async function uploadToS3PresignedUrl(
  presignedUrl: string,
  file: File,
  signedContentType?: string
): Promise<{ success: boolean; status: number; statusText: string; errorBody?: string }> {
  // Construct headers strictly matching what the backend signed
  const headers: Record<string, string> = {};

  if (signedContentType && signedContentType.trim().length > 0) {
    // Exact matching case-sensitive Content-Type
    headers["Content-Type"] = signedContentType.trim();
  }

  try {
    const response = await fetch(presignedUrl, {
      method: "PUT", // Strictly PUT for PutObject presigned URLs
      headers,
      body: file,
      mode: "cors",
      credentials: "omit", // Do NOT send cookies or default auth headers
      cache: "no-store",
    });

    if (response.ok) {
      return { success: true, status: response.status, statusText: response.statusText };
    }

    const errorBody = await response.text().catch(() => "");
    return {
      success: false,
      status: response.status,
      statusText: response.statusText,
      errorBody,
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      statusText: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Main application upload orchestrator with progress reporting and resilient fallback
 */
export async function uploadFileToS3(
  file: File,
  onProgress?: (progressPercent: number) => void,
  customConfig?: Partial<S3UploadConfig>
): Promise<UploadResult> {
  const config = { ...getSavedS3Config(), ...customConfig };

  try {
    // 1. Request presigned URL from API route
    const mimeType = (file.type || "application/octet-stream").toLowerCase();
    const response = await fetch("/api/upload/presigned-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: mimeType,
        customBucket: config.bucketName || undefined,
        customRegion: config.region || undefined,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to initiate S3 upload");
    }

    const { presignedUrl, key, s3Uri, publicUrl, contentType, mode } = await response.json();

    // 2. Direct S3 Upload via Presigned URL
    if (presignedUrl && mode === "aws_s3_live" && !config.useMockSandbox) {
      if (onProgress) onProgress(30);

      const s3Res = await uploadToS3PresignedUrl(presignedUrl, file, contentType);

      if (s3Res.success) {
        if (onProgress) onProgress(100);
        return {
          success: true,
          key,
          s3Uri,
          url: publicUrl,
          mode: "aws_s3_live",
        };
      }

      console.warn(
        `Direct presigned S3 upload failed (Status: ${s3Res.status} ${s3Res.statusText}). Error details:`,
        s3Res.errorBody
      );

      // 3. Resilient Fallback: Stream directly via Server Route if browser direct upload encounters CORS or policy restrictions
      if (onProgress) onProgress(60);
      const formData = new FormData();
      formData.append("file", file);
      if (config.bucketName) formData.append("customBucket", config.bucketName);
      if (config.region) formData.append("customRegion", config.region);

      const serverRes = await fetch("/api/upload/direct", {
        method: "POST",
        body: formData,
      });

      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (onProgress) onProgress(100);
        return {
          success: true,
          key: serverData.key || key,
          s3Uri: serverData.s3Uri || s3Uri,
          url: serverData.url || publicUrl,
          mode: "aws_s3_live",
        };
      }

      throw new Error(
        `Direct S3 upload failed (${s3Res.status} ${s3Res.statusText}): ${s3Res.errorBody || "Signature verification failed"}`
      );
    }

    // 4. Sandbox Mode: realistic animated progress simulation
    return new Promise((resolve) => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 22) + 12;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          if (onProgress) onProgress(100);
          resolve({
            success: true,
            key: key || `study-documents/${Date.now()}-${file.name}`,
            s3Uri: s3Uri || `s3://amplify-study-docs-sandbox/${file.name}`,
            url: publicUrl || URL.createObjectURL(file),
            mode: "sandbox",
          });
        } else {
          if (onProgress) onProgress(currentProgress);
        }
      }, 120);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Upload error:", error);
    return {
      success: false,
      key: "",
      s3Uri: "",
      url: "",
      mode: "sandbox",
      error: message,
    };
  }
}
