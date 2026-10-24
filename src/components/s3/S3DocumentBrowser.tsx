"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  FileText,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Search,
  Database,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";
import { StudyDeck, Flashcard, S3UploadConfig } from "@/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { GlassBadge } from "@/components/ui/GlassBadge";
import { InteractiveButton } from "@/components/ui/InteractiveButton";

export interface S3DocumentItem {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  s3Uri: string;
  url: string;
  isPdf: boolean;
}

interface S3DocumentBrowserProps {
  s3Config: S3UploadConfig;
  onDeckCreated: (deck: StudyDeck) => void;
  onOpenS3Config: () => void;
}

export const S3DocumentBrowser: React.FC<S3DocumentBrowserProps> = ({
  s3Config,
  onDeckCreated,
  onOpenS3Config,
}) => {
  const [documents, setDocuments] = useState<S3DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  const refreshDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (s3Config.bucketName) query.set("bucket", s3Config.bucketName);
      if (s3Config.region) query.set("region", s3Config.region);

      const res = await fetch(`/api/s3/list-documents?${query.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setDocuments(data.documents || []);
        if (data.mode === "aws_s3_live") {
          setSyncMessage(
            `Connected to AWS S3 bucket: ${data.bucketName} (${data.documents?.length || 0} files found)`
          );
        } else {
          setSyncMessage("Operating in Sandbox mode. Switch to Live S3 in settings to fetch remote files.");
        }
      } else {
        setError(data.error || "Failed to list files from S3 bucket.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error fetching S3 files.");
    } finally {
      setLoading(false);
    }
  }, [s3Config.bucketName, s3Config.region]);

  useEffect(() => {
    let ignore = false;
    async function initialFetch() {
      try {
        const query = new URLSearchParams();
        if (s3Config.bucketName) query.set("bucket", s3Config.bucketName);
        if (s3Config.region) query.set("region", s3Config.region);

        const res = await fetch(`/api/s3/list-documents?${query.toString()}`);
        const data = await res.json();
        if (!ignore && res.ok && data.success) {
          setDocuments(data.documents || []);
          if (data.mode === "aws_s3_live") {
            setSyncMessage(
              `Connected to AWS S3 bucket: ${data.bucketName} (${data.documents?.length || 0} files found)`
            );
          } else {
            setSyncMessage("Operating in Sandbox mode. Switch to Live S3 in settings to fetch remote files.");
          }
        }
      } catch {
        // silent fail on initial mount
      }
    }
    initialFetch();
    return () => {
      ignore = true;
    };
  }, [s3Config.bucketName, s3Config.region]);

  const handleProcessS3Document = useCallback(
    async (doc: S3DocumentItem) => {
      setProcessingKey(doc.key);
      setError(null);

      try {
        const res = await fetch("/api/s3/process-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: doc.key,
            customBucket: s3Config.bucketName || undefined,
            customRegion: s3Config.region || undefined,
            options: {
              cardCount: 12,
              difficulty: "mixed",
              style: "comprehensive",
              includeMnemonics: true,
              includeMultipleChoice: true,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to process document from S3");
        }

        const currentTimestamp = Date.now();
        const newDeck: StudyDeck = {
          id: `deck_s3_${currentTimestamp}`,
          title: doc.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
          description: `Imported from S3 (${formatBytes(doc.size)}) • ${doc.key}`,
          sourceDocumentName: doc.name,
          sourceDocumentS3Key: doc.key,
          sourceDocumentSize: doc.size,
          s3Bucket: s3Config.bucketName || "amplify-study-bucket",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cards: data.cards as Flashcard[],
          tags: [doc.isPdf ? "PDF" : "DOC", `${data.cards.length} Cards`],
        };

        onDeckCreated(newDeck);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to process S3 document");
      } finally {
        setProcessingKey(null);
      }
    },
    [onDeckCreated, s3Config.bucketName, s3Config.region]
  );

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SpotlightCard className="p-6 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              Amazon S3 Document Explorer
              <GlassBadge variant={s3Config.useMockSandbox ? "amber" : "emerald"}>
                {s3Config.useMockSandbox ? "Sandbox" : "Live S3"}
              </GlassBadge>
            </h3>
            <p className="text-xs text-zinc-400">
              Browse and generate flashcards from PDFs already in your S3 bucket
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <InteractiveButton
            variant="glass"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            onClick={refreshDocuments}
            disabled={loading}
          >
            {loading ? "Scanning S3..." : "Sync S3 Bucket"}
          </InteractiveButton>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            {syncMessage}
          </span>
          <button
            onClick={onOpenS3Config}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline font-mono"
          >
            Configure Bucket
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search documents by filename or S3 prefix..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
        />
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredDocs.map((doc) => {
          const isProcessing = processingKey === doc.key;
          return (
            <div
              key={doc.key}
              className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-zinc-800 text-indigo-400 flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-indigo-300 transition-colors">
                      {doc.name}
                    </p>
                    {doc.isPdf && (
                      <GlassBadge variant="indigo" size="sm">
                        PDF
                      </GlassBadge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-mono mt-1">
                    <span>{formatBytes(doc.size)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {formatDate(doc.lastModified)}
                    </span>
                    <span>•</span>
                    <span className="truncate text-zinc-400">Key: {doc.key}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    title="View file on S3"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <InteractiveButton
                  variant="primary"
                  size="sm"
                  icon={
                    isProcessing ? (
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Layers className="w-3.5 h-3.5" />
                    )
                  }
                  onClick={() => handleProcessS3Document(doc)}
                  disabled={isProcessing || processingKey !== null}
                >
                  {isProcessing ? "Synthesizing Deck..." : "Generate Flashcards"}
                </InteractiveButton>
              </div>
            </div>
          );
        })}

        {filteredDocs.length === 0 && !loading && (
          <div className="text-center py-12 px-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 space-y-3">
            <Cloud className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {documents.length === 0
                ? "No documents found in the configured S3 bucket. If you uploaded files to your bucket, make sure your S3 Bucket Name, Region, and IAM credentials are saved in settings."
                : "No documents match your search query."}
            </p>
            <InteractiveButton
              variant="glass"
              size="sm"
              onClick={onOpenS3Config}
            >
              Verify S3 Bucket Settings
            </InteractiveButton>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
};
