"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  RotateCw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Edit2,
  Lightbulb,
} from "lucide-react";
import { Flashcard } from "@/types";
import { GlassBadge } from "@/components/ui/GlassBadge";
import { reviewCard, Rating } from "@/lib/spaced-repetition";
import confetti from "canvas-confetti";

interface FlashcardItemProps {
  card: Flashcard;
  onUpdateCard: (updatedCard: Flashcard) => void;
  onEdit?: (card: Flashcard) => void;
  autoPlayAudio?: boolean;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({
  card,
  onUpdateCard,
  onEdit,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentCardId, setCurrentCardId] = useState(card.id);

  // Synchronize state when card changes without cascading renders
  if (card.id !== currentCardId) {
    setCurrentCardId(card.id);
    setIsFlipped(false);
    setIsSpeaking(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = (rating: Rating, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = reviewCard(card, rating);

    if (rating === 4 || (rating === 3 && updated.reviewCount >= 2)) {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#6366f1", "#a855f7", "#ec4899", "#10b981"],
      });
    }

    onUpdateCard(updated);
  };

  const speakText = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[#*`_]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const difficultyVariant = {
    easy: "emerald" as const,
    medium: "amber" as const,
    hard: "rose" as const,
  }[card.difficulty || "medium"];

  return (
    <div className="w-full max-w-xl mx-auto perspective-1000 select-none">
      <motion.div
        className="relative w-full h-[380px] sm:h-[420px] rounded-3xl cursor-pointer transform-style-3d transition-transform duration-500"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={handleFlip}
      >
        {/* ================= FRONT SIDE ================= */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-6 sm:p-8 backdrop-blur-2xl flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.6)] group hover:border-white/20 transition-all">
          {/* Top metadata row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GlassBadge variant={difficultyVariant}>
                {card.difficulty.toUpperCase()}
              </GlassBadge>
              <GlassBadge variant="indigo">
                {card.category.replace("_", " ").toUpperCase()}
              </GlassBadge>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => speakText(card.front, e)}
                title="Read card aloud"
                className={`p-2 rounded-xl transition-all ${
                  isSpeaking
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                }`}
              >
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(card);
                  }}
                  title="Edit flashcard"
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Question / Concept Center */}
          <div className="my-auto py-4 text-center">
            <span className="text-[11px] font-mono tracking-widest uppercase text-indigo-400 mb-2 block font-semibold">
              QUESTION / PROMPT
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight leading-relaxed max-h-[190px] overflow-y-auto px-2">
              {card.front}
            </h3>

            {card.category === "multiple_choice" && card.options && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {card.options.slice(0, 4).map((opt, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 font-mono flex items-start gap-2"
                  >
                    <span className="text-indigo-400 font-bold">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span className="truncate">{opt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom hint row */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <RotateCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
              <span>Click or press Space to reveal answer</span>
            </div>

            {card.mastered && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mastered
              </span>
            )}
          </div>
        </div>

        {/* ================= BACK SIDE (REVEALED) ================= */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-zinc-900/95 to-zinc-950/98 p-6 sm:p-8 backdrop-blur-2xl flex flex-col justify-between shadow-[0_25px_60px_rgba(99,102,241,0.18)]">
          {/* Top metadata row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GlassBadge variant="emerald">ANSWER</GlassBadge>
              {card.reviewCount > 0 && (
                <span className="text-xs font-mono text-zinc-400">
                  Reviews: {card.reviewCount}
                </span>
              )}
            </div>

            <button
              onClick={(e) => speakText(card.back, e)}
              title="Read answer aloud"
              className={`p-2 rounded-xl transition-all ${
                isSpeaking
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Answer Text Center */}
          <div className="my-auto py-2 max-h-[210px] overflow-y-auto px-2">
            <p className="text-sm sm:text-base text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
              {card.back}
            </p>

            {card.explanation && (
              <div className="mt-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200/90 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>{card.explanation}</span>
              </div>
            )}
          </div>

          {/* Spaced Repetition Grading Bar */}
          <div className="pt-3 border-t border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-2 text-center">
              How well did you know this?
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={(e) => handleRating(1, e)}
                className="py-2 px-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              >
                Again (1)
              </button>
              <button
                type="button"
                onClick={(e) => handleRating(2, e)}
                className="py-2 px-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              >
                Hard (2)
              </button>
              <button
                type="button"
                onClick={(e) => handleRating(3, e)}
                className="py-2 px-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              >
                Good (3)
              </button>
              <button
                type="button"
                onClick={(e) => handleRating(4, e)}
                className="py-2 px-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              >
                Easy (4)
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
