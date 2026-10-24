import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { generateFlashcardsFromText } from "@/lib/flashcard-generator";
import { GenerationOptions } from "@/types";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, customBucket, customRegion, options } = body;

    if (!key) {
      return NextResponse.json({ error: "Missing required S3 key" }, { status: 400 });
    }

    const bucketName =
      customBucket ||
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.NEXT_PUBLIC_AWS_S3_BUCKET;
    const region =
      customRegion ||
      process.env.AWS_REGION ||
      process.env.NEXT_PUBLIC_AWS_REGION ||
      "us-east-1";

    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

    let extractedText = "";
    const fileName = key.split("/").pop() || key;
    let fileSize = 0;

    if (bucketName && accessKeyId && secretAccessKey) {
      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await s3Client.send(command);
      fileSize = response.ContentLength || 0;

      // Read stream to buffer
      const stream = response.Body;
      const chunks: Uint8Array[] = [];
      if (stream) {
        // @ts-expect-error stream is an async iterable in Node.js
        for await (const chunk of stream) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
      }
      const buffer = Buffer.concat(chunks);

      const isPdf = key.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        try {
          const data = await pdfParse(buffer);
          extractedText = data.text || "";
        } catch (pdfErr) {
          console.warn("S3 PDF parse error, fallback to string extract:", pdfErr);
          extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
        }
      } else {
        extractedText = buffer.toString("utf-8");
      }
    } else {
      // Sandbox fallback if not configured on server
      extractedText = `Sample study notes extracted for document ${fileName}.\n\nAmazon S3 Storage Architecture and Cloud Infrastructure.\nDefinition: S3 provides 99.999999999% (11 9s) of durability across multiple Availability Zones.`;
    }

    const generationOptions: GenerationOptions = {
      cardCount: options?.cardCount || 10,
      difficulty: options?.difficulty || "mixed",
      style: options?.style || "comprehensive",
      includeMnemonics: options?.includeMnemonics ?? true,
      includeMultipleChoice: options?.includeMultipleChoice ?? true,
    };

    const cards = generateFlashcardsFromText(
      extractedText,
      fileName,
      generationOptions
    );

    return NextResponse.json({
      success: true,
      cards,
      fileName,
      key,
      bucketName,
      fileSize,
      extractedTextLength: extractedText.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process S3 document";
    console.error("Process S3 document error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
