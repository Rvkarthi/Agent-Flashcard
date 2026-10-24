"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Check, FileText, Code, Database } from "lucide-react";
import { StudyDeck } from "@/types";
import { InteractiveButton } from "@/components/ui/InteractiveButton";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: StudyDeck;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  deck,
}) => {
  const [format, setFormat] = useState<"anki" | "csv" | "json" | "markdown">("anki");
  const [copied, setCopied] = useState(false);

  const generateExportText = () => {
    if (format === "anki") {
      // Tab separated for Anki import: Front \t Back \t Tags
      return deck.cards
        .map((c) => {
          const front = c.front.replace(/\t/g, " ").replace(/\n/g, "<br>");
          const back = c.back.replace(/\t/g, " ").replace(/\n/g, "<br>");
          const tags = (c.tags || []).join(" ");
          return `${front}\t${back}\t${tags}`;
        })
        .join("\n");
    }

    if (format === "csv") {
      const header = `"Front","Back","Category","Difficulty","Tags"`;
      const rows = deck.cards.map((c) => {
        const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
        return `${escapeCsv(c.front)},${escapeCsv(c.back)},${escapeCsv(c.category)},${escapeCsv(
          c.difficulty
        )},${escapeCsv((c.tags || []).join("; "))}`;
      });
      return [header, ...rows].join("\n");
    }

    if (format === "json") {
      return JSON.stringify(deck, null, 2);
    }

    if (format === "markdown") {
      return `# ${deck.title} Study Flashcards
Source: ${deck.sourceDocumentName}
Generated on: ${new Date(deck.createdAt).toLocaleDateString()}
Total Cards: ${deck.cards.length}

---

${deck.cards
  .map(
    (c, idx) => `### Card ${idx + 1}: ${c.category.toUpperCase()} (${c.difficulty})
**Q:** ${c.front}

**A:** ${c.back}

${c.explanation ? `*Note: ${c.explanation}*\n` : ""}
---`
  )
  .join("\n\n")}`;
    }

    return "";
  };

  const exportText = generateExportText();

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensions = {
      anki: "txt",
      csv: "csv",
      json: "json",
      markdown: "md",
    };
    const mimeTypes = {
      anki: "text/plain",
      csv: "text/csv",
      json: "application/json",
      markdown: "text/markdown",
    };

    const ext = extensions[format];
    const mime = mimeTypes[format];
    const filename = `${deck.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_flashcards.${ext}`;

    const blob = new Blob([exportText], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl rounded-2xl border border-white/[0.12] bg-zinc-950/90 p-6 shadow-2xl backdrop-blur-2xl z-10 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-400" />
                Export Flashcards ({deck.cards.length} cards)
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Format Picker */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "anki", label: "Anki (.txt)", icon: <Database className="w-3.5 h-3.5" /> },
                { id: "csv", label: "CSV Spreadsheet", icon: <FileText className="w-3.5 h-3.5" /> },
                { id: "markdown", label: "Markdown (.md)", icon: <FileText className="w-3.5 h-3.5" /> },
                { id: "json", label: "JSON Data", icon: <Code className="w-3.5 h-3.5" /> },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as "anki" | "csv" | "json" | "markdown")}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    format === f.id
                      ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            {/* Export Preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Export Preview
              </span>
              <pre className="h-48 overflow-auto p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-300 select-all">
                {exportText}
              </pre>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={handleCopy}
                className="text-xs text-zinc-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy All
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <InteractiveButton variant="secondary" size="sm" onClick={onClose}>
                  Close
                </InteractiveButton>
                <InteractiveButton
                  variant="primary"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownload}
                >
                  Download File
                </InteractiveButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
