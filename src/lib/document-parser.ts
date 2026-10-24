/**
 * Document extraction utility for study documents (PDF, Markdown, Text, CSV, JSON)
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "txt" || extension === "md" || extension === "markdown" || extension === "csv" || extension === "json") {
    return await file.text();
  }

  if (extension === "pdf") {
    return await extractTextFromPDF(file);
  }

  // Fallback: attempt to read as UTF-8 text
  try {
    const text = await file.text();
    // Check if it's readable text
    if (text && !text.includes("\u0000")) {
      return text;
    }
  } catch (e) {
    console.warn("Direct text read failed, falling back to binary stream parse", e);
  }

  // Fallback for docx or other formats: scan for printable strings
  return await extractPrintableStrings(file);
}

/**
 * Client-side robust PDF text extractor
 * Parses PDF streams without bulky native node dependencies
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const textDecoder = new TextDecoder("latin1");
    const rawContent = textDecoder.decode(bytes);

    const extractedTextParts: string[] = [];

    // 1. Look for text blocks in PDF streams: BT (Begin Text) ... ET (End Text)
    const textBlockRegex = /BT[\s\S]*?ET/g;
    const blocks = rawContent.match(textBlockRegex);

    if (blocks && blocks.length > 0) {
      for (const block of blocks) {
        // Extract string literals like (This is text) or [(T)(e)(x)(t)]
        const stringLiteralRegex = /\(([^)]+)\)|\[([^\]]+)\]/g;
        let match;
        while ((match = stringLiteralRegex.exec(block)) !== null) {
          const matchedString = match[1] || match[2] || "";
          // Clean up escaped characters
          const cleaned = matchedString
            .replace(/\\([()\\])/g, "$1")
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "")
            .replace(/\\t/g, " ")
            .trim();

          if (cleaned.length > 1) {
            extractedTextParts.push(cleaned);
          }
        }
      }
    }

    // 2. If block regex found enough words, join them
    if (extractedTextParts.length > 20) {
      return cleanExtractedText(extractedTextParts.join(" "));
    }

    // 3. Fallback: extract ASCII string sequences of length >= 4
    return extractPrintableStrings(file);
  } catch (error) {
    console.error("PDF extraction error:", error);
    return `[Extracted document content from ${file.name}]\nDocument could not be fully parsed as plain text. The AI generator will synthesize key concepts based on the document metadata and recognized text structure.`;
  }
}

async function extractPrintableStrings(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let result = "";
  let currentWord = "";

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Printable ASCII or newline/tab
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
      currentWord += String.fromCharCode(byte);
    } else {
      if (currentWord.trim().length >= 4) {
        // Only keep words/sentences, filter out PDF operator debris like /Font /Type
        if (!currentWord.startsWith("/") && !currentWord.includes("xref") && !currentWord.includes("obj")) {
          result += currentWord + " ";
        }
      }
      currentWord = "";
    }
  }

  return cleanExtractedText(result);
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/([.!?])\s*(?=[A-Z])/g, "$1\n")
    .trim();
}

/**
 * Sample Study Documents for quick 1-click test and exploration
 */
export const SAMPLE_DOCUMENTS = [
  {
    name: "AWS_Cloud_Architecture_and_S3.md",
    size: 4280,
    type: "text/markdown",
    content: `# AWS Cloud Architecture & Amazon S3 Mastery Guide

## 1. Amazon S3 Fundamentals
Amazon Simple Storage Service (Amazon S3) is an object storage service offering industry-leading scalability, data availability, security, and performance.

### Key Concepts:
- **Bucket**: A container for objects stored in Amazon S3. Bucket names are globally unique across all AWS accounts.
- **Object**: Fundamental entities stored in Amazon S3, composed of object data and metadata. Keys uniquely identify objects within a bucket.
- **Consistency Model**: Amazon S3 provides strong read-after-write consistency for PUT and DELETE requests of objects across all AWS Regions.
- **Storage Classes**:
  1. *S3 Standard*: High durability, availability, and performance object storage for frequently accessed data.
  2. *S3 Intelligent-Tiering*: Automatically moves data to the most cost-effective tier without performance impact.
  3. *S3 Standard-IA (Infrequent Access)*: Lower storage cost for data accessed less often but requiring rapid access.
  4. *S3 Glacier Flexible Retrieval & Deep Archive*: Lowest cost archival storage with retrieval times from minutes to hours.

## 2. Direct S3 Uploads and Presigned URLs
A **Presigned URL** grants time-limited permission to download or upload an S3 object without requiring AWS credentials on the client.
- **How it works**: An authorized backend server creates a cryptographic signature using IAM credentials with a specified expiration (TTL).
- **Security**: The client receives only the presigned URL, preventing AWS secret keys from being exposed to browser frontends.
- **CORS (Cross-Origin Resource Sharing)**: Must be configured on the S3 bucket to allow browser PUT/GET requests from web application domains.

## 3. AWS Amplify Hosting Architecture
AWS Amplify Hosting is a fully managed CI/CD and hosting service for fast, secure, and modern web applications (Next.js, React, Vue).
- **Next.js SSR/SSG Support**: Amplify Hosting Compute automatically deploys server-side rendered routes to AWS Lambda@Edge / compute instances and serves static assets via Amazon CloudFront CDN.
- **Continuous Deployment**: Connects directly to Git repositories (GitHub, GitLab, AWS CodeCommit) to trigger automatic builds upon push.
- **Environment Management**: Supports branch-specific environment variables and preview deployments for Pull Requests.`,
  },
  {
    name: "Cell_Biology_and_Metabolism.md",
    size: 3820,
    type: "text/markdown",
    content: `# Cell Biology and Cellular Metabolism

## 1. Cellular Respiration
Cellular respiration is the metabolic pathway through which cells break down glucose and convert it into chemical energy in the form of Adenosine Triphosphate (ATP).

### The Three Main Stages:
1. **Glycolysis**:
   - Takes place in the cytoplasm.
   - Anaerobic process (does not require oxygen).
   - Breaks 1 glucose molecule (6 carbons) into 2 pyruvate molecules (3 carbons each).
   - Net yield: 2 ATP and 2 NADH.

2. **The Krebs Cycle (Citric Acid Cycle)**:
   - Takes place in the mitochondrial matrix.
   - Acetyl-CoA combines with oxaloacetate to form citrate.
   - Generates high-energy electron carriers: 3 NADH, 1 FADH2, and 1 GTP/ATP per turn (x2 per glucose).
   - Releases carbon dioxide (CO2) as a byproduct.

3. **Oxidative Phosphorylation & Electron Transport Chain (ETC)**:
   - Located on the inner mitochondrial cristae membrane.
   - High-energy electrons from NADH and FADH2 pass through transmembrane complexes (I, II, III, IV).
   - Creates a proton gradient (chemiosmosis) across the inner membrane.
   - **ATP Synthase**: Acts as a rotary molecular motor driven by proton flow, producing approximately 26 to 28 ATP molecules.
   - Total theoretical ATP yield per glucose molecule: ~30-32 ATP.

## 2. Photosynthesis
- **Light-dependent reactions**: Occur in the thylakoid membranes; water is photolyzed, oxygen released, ATP and NADPH generated.
- **Calvin Cycle (Light-independent)**: Occurs in the stroma; enzyme RuBisCO fixes carbon dioxide into G3P sugars.`,
  },
  {
    name: "Modern_Web_Micro_Interactions_and_UI.md",
    size: 3100,
    type: "text/markdown",
    content: `# Modern UI Engineering: Cult UI, React Bits & Micro-Interactions

## 1. Micro-Interactions in Modern Design
A micro-interaction is a subtle, contained product moment that accomplishes a single task while enhancing user delight and feedback.

### The Four Parts of a Micro-Interaction:
1. **Trigger**: Initiates the micro-interaction (user click, hover, scroll position, or system state change).
2. **Rules**: Determine what happens once the trigger fires (e.g., card flips 180 degrees over 350ms).
3. **Feedback**: Visual, auditory, or haptic response verifying that the rule is executing.
4. **Loops and Modes**: Define the timing, repetition, or alternate states of the interaction.

## 2. Glassmorphism Aesthetics
Glassmorphism creates depth and visual hierarchy by simulating frosted semi-transparent glass planes.
- **CSS Properties**: \`backdrop-filter: blur(16px)\`, \`background: rgba(255, 255, 255, 0.05)\`, \`border: 1px solid rgba(255, 255, 255, 0.1)\`.
- **Specular Highlights**: Subtle gradient borders that emulate ambient lighting hitting edges.
- **Dark Mode Harmony**: Deep neutral backgrounds (\`#09090b\` / \`#030712\`) prevent washed-out blur artifacts.

## 3. Spotlight & Beam Effects
- **Radial Mouse Spotlight**: Calculates mouse coordinate relative to card bounding rect (\`e.clientX - rect.left\`) and renders an overlay radial gradient that follows the cursor.
- **Border Beam Animation**: A localized linear gradient moving along an SVG border path using CSS offset-path or Framer Motion animation loops.`,
  },
];
