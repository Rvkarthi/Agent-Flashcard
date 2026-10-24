"use client";
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  Layers,
  Award,
  Download,
  Plus,
  Search,
  CheckCircle2,
  Database,
  ArrowLeft,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { StudyDeck, Flashcard } from "@/types";
import { FlashcardItem } from "./FlashcardItem";
import { QuizMode } from "./QuizMode";
import { CardEditorModal } from "./CardEditorModal";
import { ExportModal } from "./ExportModal";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { InteractiveButton } from "@/components/ui/InteractiveButton";
import { GlassBadge } from "@/components/ui/GlassBadge";

interface FlashcardDeckViewProps {
  deck: StudyDeck;
  onUpdateDeck: (updatedDeck: StudyDeck) => void;
  onBackToUpload: () => void;
}

export const FlashcardDeckView: React.FC<FlashcardDeckViewProps> = ({
  deck,
  onUpdateDeck,
  onBackToUpload,
}) => {
  const [activeTab, setActiveTab] = useState<"study" | "quiz" | "browse" | "analytics">("study");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>(deck.cards);
  const [currentDeckId, setCurrentDeckId] = useState(deck.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Sync state if deck changes
  if (deck.id !== currentDeckId) {
    setCurrentDeckId(deck.id);
    setCards(deck.cards);
    setCurrentIndex(0);
  }

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const updateCardInDeck = useCallback((updatedCard: Flashcard) => {
    setCards((prev) => {
      const next = prev.map((c) => (c.id === updatedCard.id ? updatedCard : c));
      onUpdateDeck({ ...deck, cards: next, updatedAt: new Date().toISOString() });
      return next;
    });
  }, [deck, onUpdateDeck]);

  const handleSaveCard = (card: Flashcard) => {
    setCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      const next = exists ? prev.map((c) => (c.id === card.id ? card : c)) : [...prev, card];
      onUpdateDeck({ ...deck, cards: next, updatedAt: new Date().toISOString() });
      return next;
    });
  };

  const handleDeleteCard = (cardId: string) => {
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== cardId);
      onUpdateDeck({ ...deck, cards: next, updatedAt: new Date().toISOString() });
      return next;
    });
    if (currentIndex >= cards.length - 1 && currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleResetProgress = () => {
    const reset = cards.map((c) => ({
      ...c,
      mastered: false,
      reviewCount: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      lastReviewedAt: undefined,
      nextReviewAt: undefined,
    }));
    setCards(reset);
    onUpdateDeck({ ...deck, cards: reset, updatedAt: new Date().toISOString() });
  };

  // Keyboard navigation shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditorOpen || isExportOpen || activeTab !== "study") return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => (i + 1 < cards.length ? i + 1 : 0));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => (i - 1 >= 0 ? i - 1 : cards.length - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards.length, isEditorOpen, isExportOpen, activeTab]);

  // Filtered cards for Browse mode
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const matchesSearch =
        c.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesDiff =
        selectedDifficulty === "all" || c.difficulty === selectedDifficulty;
      const matchesCat =
        selectedCategory === "all" || c.category === selectedCategory;

      return matchesSearch && matchesDiff && matchesCat;
    });
  }, [cards, searchQuery, selectedDifficulty, selectedCategory]);

  const masteredCount = cards.filter((c) => c.mastered).length;
  const masteryPercent = cards.length ? Math.round((masteredCount / cards.length) * 100) : 0;
  const currentCard = cards[currentIndex];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBackToUpload}
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-indigo-300 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Upload Another Document</span>
        </button>

        <div className="flex items-center gap-2">
          <InteractiveButton
            variant="glass"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => setIsExportOpen(true)}
          >
            Export Deck
          </InteractiveButton>

          <InteractiveButton
            variant="glass"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setCardToEdit(null);
              setIsEditorOpen(true);
            }}
          >
            Add Card
          </InteractiveButton>
        </div>
      </div>

      {/* Header Deck Spotlight Card */}
      <SpotlightCard className="p-6 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <GlassBadge variant="indigo" icon={<Layers className="w-3 h-3" />}>
                {cards.length} Study Cards
              </GlassBadge>
              <GlassBadge variant="emerald" icon={<CheckCircle2 className="w-3 h-3" />}>
                {masteryPercent}% Mastered
              </GlassBadge>
              {deck.s3Bucket && (
                <GlassBadge variant="neutral" icon={<Database className="w-3 h-3 text-indigo-400" />}>
                  S3: {deck.s3Bucket}
                </GlassBadge>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
              {deck.title}
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Source file: {deck.sourceDocumentName}
            </p>
          </div>

          {/* Quick Mastery Radial / Metric */}
          <div className="flex items-center gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-zinc-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-500"
                  strokeDasharray={`${masteryPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold font-mono text-zinc-100">
                {masteryPercent}%
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                {masteredCount} of {cards.length} Mastered
              </span>
              <span className="text-[11px] text-zinc-500">
                Spaced repetition SM-2
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 mt-6 pt-6 border-t border-zinc-800/80 overflow-x-auto">
          {[
            { id: "study", label: "Study Mode", icon: <BookOpen className="w-4 h-4" /> },
            { id: "quiz", label: "Practice Quiz", icon: <Award className="w-4 h-4" /> },
            { id: "browse", label: "Browse Cards", icon: <Layers className="w-4 h-4" /> },
            { id: "analytics", label: "Spaced Repetition", icon: <BarChart3 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "study" | "quiz" | "browse" | "analytics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </SpotlightCard>

      {/* ================= TAB 1: STUDY MODE ================= */}
      {activeTab === "study" && (
        <div className="space-y-6">
          {cards.length > 0 && currentCard ? (
            <div className="space-y-6">
              {/* Animated Flashcard Container */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCard.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <FlashcardItem
                    card={currentCard}
                    onUpdateCard={updateCardInDeck}
                    onEdit={(c) => {
                      setCardToEdit(c);
                      setIsEditorOpen(true);
                    }}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation Controls Bar */}
              <div className="w-full max-w-xl mx-auto flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
                <button
                  onClick={() =>
                    setCurrentIndex((i) => (i - 1 >= 0 ? i - 1 : cards.length - 1))
                  }
                  className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Previous card (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-zinc-300">
                    {currentIndex + 1} / {cards.length}
                  </span>
                  <button
                    onClick={handleShuffle}
                    className="p-2 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 transition-colors"
                    title="Shuffle cards"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() =>
                    setCurrentIndex((i) => (i + 1 < cards.length ? i + 1 : 0))
                  }
                  className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Next card (Right Arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="text-center text-[11px] font-mono text-zinc-500">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Space
                </kbd>{" "}
                to flip •{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  ←
                </kbd>{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  →
                </kbd>{" "}
                to navigate •{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  1-4
                </kbd>{" "}
                to grade
              </div>
            </div>
          ) : (
            <SpotlightCard className="p-8 text-center space-y-4">
              <p className="text-zinc-400 text-sm">No cards available in this deck.</p>
              <InteractiveButton
                variant="primary"
                size="sm"
                onClick={() => {
                  setCardToEdit(null);
                  setIsEditorOpen(true);
                }}
              >
                Add First Card
              </InteractiveButton>
            </SpotlightCard>
          )}
        </div>
      )}

      {/* ================= TAB 2: QUIZ PRACTICE ================= */}
      {activeTab === "quiz" && (
        <QuizMode cards={cards} onFinishQuiz={() => setActiveTab("study")} />
      )}

      {/* ================= TAB 3: BROWSE ALL CARDS ================= */}
      {activeTab === "browse" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search flashcards by question, answer, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="concept">Concept</option>
              <option value="qa">Q&A</option>
              <option value="true_false">True / False</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="mnemonic">Mnemonic</option>
            </select>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCards.map((c) => (
              <SpotlightCard key={c.id} className="p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <GlassBadge variant={c.difficulty === "easy" ? "emerald" : c.difficulty === "hard" ? "rose" : "amber"}>
                        {c.difficulty}
                      </GlassBadge>
                      <GlassBadge variant="indigo">
                        {c.category}
                      </GlassBadge>
                    </div>

                    <button
                      onClick={() => {
                        setCardToEdit(c);
                        setIsEditorOpen(true);
                      }}
                      className="text-xs text-zinc-400 hover:text-indigo-300 transition-colors"
                    >
                      Edit
                    </button>
                  </div>

                  <h4 className="text-sm font-semibold text-zinc-100 mb-2">
                    {c.front}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                    {c.back}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Reviews: {c.reviewCount}</span>
                  {c.mastered && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Mastered
                    </span>
                  )}
                </div>
              </SpotlightCard>
            ))}
          </div>

          {filteredCards.length === 0 && (
            <div className="text-center py-10 text-zinc-500 text-xs">
              No flashcards match your current filter query.
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: ANALYTICS & SPACED REPETITION ================= */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SpotlightCard className="p-6 space-y-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
              SuperMemo-2 Ease Factor
            </span>
            <div className="text-3xl font-bold text-indigo-400">
              {(
                cards.reduce((acc, c) => acc + (c.easeFactor || 2.5), 0) /
                (cards.length || 1)
              ).toFixed(2)}
            </div>
            <p className="text-xs text-zinc-400">
              Average retention coefficient. Automatically adjusts based on your rating speed.
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-6 space-y-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
              Total Flashcards Reviewed
            </span>
            <div className="text-3xl font-bold text-purple-400">
              {cards.reduce((acc, c) => acc + (c.reviewCount || 0), 0)}
            </div>
            <p className="text-xs text-zinc-400">
              Cumulative card reviews completed across study and quiz sessions.
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-6 space-y-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
              Mastery Rate
            </span>
            <div className="text-3xl font-bold text-emerald-400">
              {masteryPercent}%
            </div>
            <p className="text-xs text-zinc-400">
              {masteredCount} of {cards.length} concepts marked as fully memorized.
            </p>
          </SpotlightCard>

          <div className="md:col-span-3">
            <SpotlightCard className="p-6 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  Reset Deck Mastery
                </h4>
                <p className="text-xs text-zinc-400">
                  Clear review streaks and practice this document again from scratch.
                </p>
              </div>
              <InteractiveButton
                variant="danger"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleResetProgress}
              >
                Reset Progress
              </InteractiveButton>
            </SpotlightCard>
          </div>
        </div>
      )}

      {/* Card Editor Modal */}
      <CardEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        cardToEdit={cardToEdit}
        onSaveCard={handleSaveCard}
        onDeleteCard={handleDeleteCard}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        deck={deck}
      />
    </div>
  );
};
