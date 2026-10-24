"use client";
import React, { useState, useRef, ChangeEvent, DragEvent, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Sparkles,
  AlertCircle,
  Settings,
  Zap,
  ArrowRight,
  Database,
  Layers,
  FileCheck,
} from "lucide-react";
import { extractTextFromFile, SAMPLE_DOCUMENTS } from "@/lib/document-parser";
import { uploadFileToS3, getSavedS3Config } from "@/lib/aws-s3";
import { StudyDocument, GenerationOptions, StudyDeck, Flashcard } from "@/types";
import { formatBytes } from "@/lib/utils";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { GlassBadge } from "@/components/ui/GlassBadge";
import { BorderBeam } from "@/components/ui/BorderBeam";

interface DocumentUploaderProps {
  onDeckCreated: (deck: StudyDeck) => void;
  onOpenS3Config: () => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onDeckCreated,
  onOpenS3Config,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeDocument, setActiveDocument] = useState<StudyDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState("");
  const [options, setOptions] = useState<GenerationOptions>({
    cardCount: 12,
    difficulty: "mixed",
    style: "comprehensive",
    includeMnemonics: true,
    includeMultipleChoice: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const s3Config = getSavedS3Config();
      const currentTimestamp = Date.now();
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

      const newDoc: StudyDocument = {
        id: `doc_${currentTimestamp}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        s3Key: `study-documents/${currentTimestamp}-${cleanName}`,
        status: "uploading",
        progress: 0,
      };

      setActiveDocument(newDoc);
      setIsProcessing(true);
      setCurrentStepText("Uploading document directly to Amazon S3...");

      try {
        // 1. Direct S3 Upload with real progress reporting
        const uploadResult = await uploadFileToS3(file, (percent) => {
          setActiveDocument((prev) => (prev ? { ...prev, progress: percent } : null));
          setGenerationProgress(Math.round(percent * 0.45));
        });

        if (!uploadResult.success && uploadResult.error) {
          throw new Error(uploadResult.error);
        }

        // Update doc with S3 Key and URI
        setActiveDocument((prev) =>
          prev
            ? {
                ...prev,
                status: "processing",
                s3Key: uploadResult.key,
                s3Url: uploadResult.url,
                progress: 100,
              }
            : null
        );

        // 2. Extract Document Content using robust server-side PDF parser
        setCurrentStepText("Analyzing document semantics & extracting text...");
        setGenerationProgress(55);

        let extractedText = "";
        try {
          const parseFormData = new FormData();
          parseFormData.append("file", file);
          const parseRes = await fetch("/api/parse-document", {
            method: "POST",
            body: parseFormData,
          });
          if (parseRes.ok) {
            const parseData = await parseRes.json();
            extractedText = parseData.text || "";
          }
        } catch (serverParseErr) {
          console.warn("Server parse fallback to client parser:", serverParseErr);
        }

        // Fallback to client extraction if server returned empty
        if (!extractedText || extractedText.length < 20) {
          extractedText = await extractTextFromFile(file);
        }

        setGenerationProgress(75);
        setCurrentStepText("Synthesizing interactive flashcard deck with AI...");

        // 3. Generate Flashcards via Next.js API
        const genRes = await fetch("/api/flashcards/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: extractedText,
            docName: file.name,
            options,
          }),
        });

        if (!genRes.ok) {
          const errJson = await genRes.json().catch(() => ({}));
          throw new Error(errJson.error || "Flashcard generation failed");
        }

        const { cards } = await genRes.json();
        setGenerationProgress(100);
        setCurrentStepText("Flashcards ready!");

        // 4. Create new StudyDeck
        const deckTimestamp = Date.now();
        const newDeck: StudyDeck = {
          id: `deck_${deckTimestamp}`,
          title: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
          description: `Generated from ${file.name} (${formatBytes(file.size)}) stored in S3.`,
          sourceDocumentName: file.name,
          sourceDocumentS3Key: uploadResult.key,
          sourceDocumentSize: file.size,
          s3Bucket: s3Config.bucketName || "amplify-study-s3-bucket",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cards: cards as Flashcard[],
          tags: [
            file.name.split(".").pop()?.toUpperCase() || "DOC",
            `${cards.length} Cards`,
          ],
        };

        setTimeout(() => {
          setIsProcessing(false);
          setActiveDocument((prev) => (prev ? { ...prev, status: "ready" } : null));
          onDeckCreated(newDeck);
        }, 600);
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Processing failed";
        setIsProcessing(false);
        setActiveDocument((prev) =>
          prev ? { ...prev, status: "error", error: message } : null
        );
      }
    },
    [onDeckCreated, options]
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const loadSample = (sample: (typeof SAMPLE_DOCUMENTS)[0]) => {
    const blob = new Blob([sample.content], { type: sample.type });
    const file = new File([blob], sample.name, { type: sample.type });
    processFile(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Upload Spotlight Hero */}
      <SpotlightCard className="p-8 relative">
        <BorderBeam size={220} duration={10} colorFrom="#6366f1" colorTo="#a855f7" />

        {/* Top bar with S3 status */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800/80 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-zinc-300">
              AWS Amplify S3 Ingestion Gateway
            </span>
          </div>
          <button
            onClick={onOpenS3Config}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            S3 Bucket Config
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
              : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown,.csv,.json,.docx"
            onChange={handleFileChange}
            className="hidden"
          />

          <motion.div
            whileHover={{ y: -4 }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
          >
            <UploadCloud className="w-8 h-8" />
          </motion.div>

          <h3 className="text-xl font-semibold text-zinc-100 mb-2">
            Upload Study Document to Amazon S3
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-5">
            Drop your PDF slides, textbook chapter, or notes here.
            Direct upload to Amazon S3 with instant flashcard generation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <GlassBadge variant="indigo" icon={<FileText className="w-3 h-3" />}>
              PDF Documents
            </GlassBadge>
            <GlassBadge variant="purple" icon={<FileText className="w-3 h-3" />}>
              Markdown (.md)
            </GlassBadge>
            <GlassBadge variant="neutral" icon={<FileText className="w-3 h-3" />}>
              Plain Text (.txt)
            </GlassBadge>
            <GlassBadge variant="emerald" icon={<FileCheck className="w-3 h-3" />}>
              CSV / Notes
            </GlassBadge>
          </div>
        </div>

        {/* Processing State Overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 p-5 rounded-xl bg-zinc-900/90 border border-indigo-500/30 backdrop-blur-xl space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
                  {currentStepText}
                </span>
                <span className="font-mono text-zinc-400 font-semibold">
                  {generationProgress}%
                </span>
              </div>

              {/* Progress Bar with glowing gradient */}
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${generationProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {activeDocument && (
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1">
                  <span>File: {activeDocument.name}</span>
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Database className="w-3 h-3 text-indigo-400" />
                    S3 Key: {activeDocument.s3Key}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error notification */}
        {activeDocument?.status === "error" && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{activeDocument.error}</span>
          </div>
        )}
      </SpotlightCard>

      {/* Generation Options & 1-Click Samples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instant Study Samples */}
        <SpotlightCard className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-zinc-200">
              1-Click Sample Study Documents
            </h4>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            Test direct S3 ingestion and flashcard generation instantly without preparing files:
          </p>

          <div className="space-y-2.5">
            {SAMPLE_DOCUMENTS.map((sample, idx) => (
              <button
                key={idx}
                disabled={isProcessing}
                onClick={() => loadSample(sample)}
                className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 transition-all flex items-center justify-between group disabled:opacity-50"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                    {sample.name.replace(/_/g, " ")}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {formatBytes(sample.size)} • Markdown Note
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>
        </SpotlightCard>

        {/* Flashcard Customization Controls */}
        <SpotlightCard className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-zinc-200">
              Deck Generation Parameters
            </h4>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            Configure how the AI structures your study flashcards:
          </p>

          <div className="space-y-4">
            {/* Card Count slider */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-zinc-400 font-medium">Card Quantity</span>
                <span className="text-indigo-300 font-mono font-semibold">
                  {options.cardCount} Cards
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={options.cardCount}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    cardCount: parseInt(e.target.value),
                  }))
                }
                className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Difficulty Segment */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Target Difficulty
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["mixed", "easy", "medium", "hard"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, difficulty: lvl }))}
                    className={`py-1.5 text-xs rounded-lg capitalize border font-medium transition-all ${
                      options.difficulty === lvl
                        ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <label className="text-xs text-zinc-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeMultipleChoice}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      includeMultipleChoice: e.target.checked,
                    }))
                  }
                  className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
                />
                Multiple Choice Practice
              </label>

              <label className="text-xs text-zinc-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeMnemonics}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      includeMnemonics: e.target.checked,
                    }))
                  }
                  className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
                />
                Recall Mnemonics
              </label>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};
