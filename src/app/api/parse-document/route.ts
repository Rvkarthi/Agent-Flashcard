import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name;
    const isPdf = fileName.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    let pageCount = 1;

    if (isPdf) {
      try {
        const data = await pdfParse(buffer);
        extractedText = data.text || "";
        pageCount = data.numpages || 1;
      } catch (pdfErr) {
        console.warn("PDF parsing warning, using fallback text extractor:", pdfErr);
        extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
      }
    } else {
      extractedText = buffer.toString("utf-8");
    }

    // Clean up excessive whitespace
    extractedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    return NextResponse.json({
      success: true,
      text: extractedText,
      pageCount,
      fileName,
      fileSize: file.size,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to parse document";
    console.error("Document parse error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
