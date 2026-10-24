"use client";
import React, { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Database,
  Settings,
  BookOpen,
  ArrowRight,
  Trash2,
  Zap,
  UploadCloud,
  FolderOpen,
} from "lucide-react";
import { StudyDeck, S3UploadConfig } from "@/types";
import { DocumentUploader } from "@/components/upload/DocumentUploader";
import { S3DocumentBrowser } from "@/components/s3/S3DocumentBrowser";
import { FlashcardDeckView } from "@/components/flashcards/FlashcardDeckView";
import { S3ConfigModal } from "@/components/upload/S3ConfigModal";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { GlassBadge } from "@/components/ui/GlassBadge";
import { getSavedS3Config } from "@/lib/aws-s3";

const SAVED_DECKS_STORAGE_KEY = "amplify_study_decks_history";

// React 19 official hydration-safe snapshot pattern
const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,  // Client snapshot
    () => false  // Server snapshot
  );
}

function getClientDecks(): StudyDeck[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_DECKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore read errors
  }
  return [];
}

export default function Home() {
  const isMounted = useMounted();
  const [activeDeck, setActiveDeck] = useState<StudyDeck | null>(null);
  const [savedDecks, setSavedDecks] = useState<StudyDeck[]>(() => getClientDecks());
  const [isS3ConfigOpen, setIsS3ConfigOpen] = useState(false);
  const [s3Config, setS3Config] = useState<S3UploadConfig>(() => getSavedS3Config());
  const [activeTab, setActiveTab] = useState<"upload" | "s3_browser">("upload");

  const saveDeckToHistory = (deck: StudyDeck) => {
    setActiveDeck(deck);
    setSavedDecks((prev) => {
      const filtered = prev.filter((d) => d.id !== deck.id);
      const updated = [deck, ...filtered];
      try {
        localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist deck history", e);
      }
      return updated;
    });
  };

  const deleteDeck = (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedDecks((prev) => {
      const next = prev.filter((d) => d.id !== deckId);
      try {
        localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to persist deck history", e);
      }
      return next;
    });
    if (activeDeck?.id === deckId) {
      setActiveDeck(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden font-sans">
      {/* Ambient background mesh glow (React Bits / Cult UI aesthetic) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl opacity-60 rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-2/3 -right-40 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] opacity-25" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Navigation */}
        <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div
              onClick={() => setActiveDeck(null)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-zinc-100 flex items-center gap-2">
                  AmplifyStudy
                  <GlassBadge variant="indigo" size="sm">
                    AWS S3 Direct
                  </GlassBadge>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block -mt-0.5">
                  Next.js on AWS Amplify Hosting
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsS3ConfigOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-300 hover:text-white transition-all shadow-sm"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">S3 Bucket:</span>
                <span className="font-mono text-zinc-400">
                  {!isMounted
                    ? "Loading..."
                    : s3Config.useMockSandbox
                    ? "Sandbox"
                    : s3Config.bucketName || "Configure"}
                </span>
                <Settings className="w-3.5 h-3.5 text-zinc-500 ml-1" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {activeDeck ? (
            <FlashcardDeckView
              deck={activeDeck}
              onUpdateDeck={saveDeckToHistory}
              onBackToUpload={() => setActiveDeck(null)}
            />
          ) : (
            <div className="space-y-10">
              {/* Hero Banner with Cult UI / React Bits typography */}
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <GlassBadge
                    variant="purple"
                    size="md"
                    className="mb-4 inline-flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    Amplify Hosting + Amazon S3 Storage Engine
                  </GlassBadge>

                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-100 leading-[1.15]">
                    Transform study docs into{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
                      interactive flashcards.
                    </span>
                  </h1>

                  <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Upload documents directly to Amazon S3 or explore files already in your bucket.
                    Our AI synthesizes structured 3D flip flashcards, practice quizzes, and
                    spaced repetition routines.
                  </p>
                </motion.div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center justify-center">
                <div className="p-1 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("upload")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "upload"
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    Upload New Document
                  </button>

                  <button
                    onClick={() => setActiveTab("s3_browser")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === "s3_browser"
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse Existing S3 Files
                  </button>
                </div>
              </div>

              {/* Tab 1: Upload New File */}
              {activeTab === "upload" && (
                <DocumentUploader
                  onDeckCreated={saveDeckToHistory}
                  onOpenS3Config={() => setIsS3ConfigOpen(true)}
                />
              )}

              {/* Tab 2: S3 Document Browser (for PDFs already in S3) */}
              {activeTab === "s3_browser" && (
                <div className="max-w-4xl mx-auto">
                  <S3DocumentBrowser
                    s3Config={s3Config}
                    onDeckCreated={saveDeckToHistory}
                    onOpenS3Config={() => setIsS3ConfigOpen(true)}
                  />
                </div>
              )}

              {/* Saved Study Decks Section */}
              {isMounted && savedDecks.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      Your Study Decks ({savedDecks.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {savedDecks.map((deck) => {
                      const mastered = deck.cards.filter((c) => c.mastered).length;
                      const percent = deck.cards.length
                        ? Math.round((mastered / deck.cards.length) * 100)
                        : 0;

                      return (
                        <SpotlightCard
                          key={deck.id}
                          onClick={() => setActiveDeck(deck)}
                          className="p-5 cursor-pointer flex flex-col justify-between group hover:border-indigo-500/40"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <GlassBadge variant="indigo">
                                {deck.cards.length} Cards
                              </GlassBadge>
                              <button
                                onClick={(e) => deleteDeck(deck.id, e)}
                                title="Remove deck"
                                className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <h4 className="text-sm font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1">
                              {deck.title}
                            </h4>
                            <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                              {deck.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                            <span className="text-zinc-500 font-mono text-[11px]">
                              {percent}% Mastered
                            </span>
                            <span className="text-indigo-400 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              Study <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </SpotlightCard>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Minimalist Cult UI / React Bits Footer */}
        <footer className="border-t border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md py-6 mt-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>AWS Amplify Hosting Ready • S3 Direct Pipeline</span>
            </div>

            <div className="flex items-center gap-4">
              <span>Next.js App Router</span>
              <span>•</span>
              <span>React 19</span>
              <span>•</span>
              <span>Cult UI / React Bits Minimalist</span>
            </div>
          </div>
        </footer>
      </div>

      {/* S3 Configuration Modal */}
      <S3ConfigModal
        isOpen={isS3ConfigOpen}
        onClose={() => setIsS3ConfigOpen(false)}
        onSaved={(newCfg) => setS3Config(newCfg)}
      />
    </div>
  );
}
