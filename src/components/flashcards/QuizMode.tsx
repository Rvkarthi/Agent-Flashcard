"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  ArrowRight,
  Flame,
  Sparkles,
} from "lucide-react";
import { Flashcard, QuizQuestionState } from "@/types";
import { InteractiveButton } from "@/components/ui/InteractiveButton";
import { GlassBadge } from "@/components/ui/GlassBadge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import confetti from "canvas-confetti";

interface QuizModeProps {
  cards: Flashcard[];
  onFinishQuiz: () => void;
}

export const QuizMode: React.FC<QuizModeProps> = ({ cards, onFinishQuiz }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [, setHistory] = useState<QuizQuestionState[]>([]);

  const currentCard = cards[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (revealed || !currentCard) return;

    setSelectedOption(idx);
    setRevealed(true);

    const isCorrect =
      currentCard.category === "multiple_choice" || currentCard.category === "true_false"
        ? idx === (currentCard.correctOptionIndex ?? 0)
        : true;

    if (isCorrect) {
      setScore((s) => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > highestStreak) setHighestStreak(newStreak);

      confetti({
        particleCount: 20,
        spread: 50,
        origin: { y: 0.7 },
        colors: ["#10b981", "#6366f1", "#a855f7"],
      });
    } else {
      setStreak(0);
    }

    setHistory((prev) => [
      ...prev,
      {
        cardId: currentCard.id,
        selectedOptionIndex: idx,
        isCorrect,
        answered: true,
      },
    ]);
  };

  const handleSelfGrade = (isCorrect: boolean) => {
    if (!currentCard) return;
    setRevealed(true);

    if (isCorrect) {
      setScore((s) => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > highestStreak) setHighestStreak(newStreak);
    } else {
      setStreak(0);
    }

    setHistory((prev) => [
      ...prev,
      {
        cardId: currentCard.id,
        isCorrect,
        answered: true,
      },
    ]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setRevealed(false);
    } else {
      setQuizFinished(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setRevealed(false);
    setScore(0);
    setStreak(0);
    setQuizFinished(false);
    setHistory([]);
  };

  if (quizFinished) {
    const accuracy = Math.round((score / cards.length) * 100);
    return (
      <SpotlightCard className="max-w-xl mx-auto p-8 text-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.3)]"
        >
          <Award className="w-10 h-10 text-indigo-400" />
        </motion.div>

        <div>
          <h3 className="text-2xl font-bold text-zinc-100">Study Quiz Complete!</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Excellent session. Here is your performance overview:
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Score
            </span>
            <span className="text-2xl font-bold text-zinc-100">
              {score} / {cards.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Accuracy
            </span>
            <span
              className={`text-2xl font-bold ${
                accuracy >= 80
                  ? "text-emerald-400"
                  : accuracy >= 60
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {accuracy}%
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Max Streak
            </span>
            <span className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
              <Flame className="w-5 h-5" />
              {highestStreak}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <InteractiveButton
            variant="secondary"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={restartQuiz}
          >
            Retake Quiz
          </InteractiveButton>
          <InteractiveButton
            variant="primary"
            size="md"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={onFinishQuiz}
          >
            Back to Deck
          </InteractiveButton>
        </div>
      </SpotlightCard>
    );
  }

  const options =
    currentCard.category === "multiple_choice" && currentCard.options
      ? currentCard.options
      : currentCard.category === "true_false"
      ? ["True", "False"]
      : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Top Quiz Status Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <GlassBadge variant="indigo">
            Question {currentIndex + 1} of {cards.length}
          </GlassBadge>
          {streak > 1 && (
            <span className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse">
              <Flame className="w-3.5 h-3.5" />
              {streak} Streak!
            </span>
          )}
        </div>

        <div className="text-xs font-mono text-zinc-400">
          Score: <span className="text-indigo-400 font-bold">{score}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          animate={{
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question Card */}
      <SpotlightCard className="p-8 space-y-6">
        <div>
          <span className="text-[11px] font-mono tracking-widest uppercase text-indigo-400 block mb-2 font-semibold">
            {currentCard.category.replace("_", " ").toUpperCase()} • {currentCard.difficulty.toUpperCase()}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 leading-snug">
            {currentCard.front}
          </h3>
        </div>

        {/* Options Selection (Multiple Choice or True/False) */}
        {options ? (
          <div className="space-y-2.5">
            {options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer = idx === (currentCard.correctOptionIndex ?? 0);

              let buttonStyle = "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700";
              if (revealed) {
                if (isCorrectAnswer) {
                  buttonStyle = "bg-emerald-500/20 border-emerald-500/60 text-emerald-300";
                } else if (isSelected && !isCorrectAnswer) {
                  buttonStyle = "bg-rose-500/20 border-rose-500/60 text-rose-300";
                } else {
                  buttonStyle = "opacity-40 border-zinc-800 text-zinc-500";
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-4 rounded-xl border font-medium text-sm transition-all flex items-center justify-between ${buttonStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-xs font-mono font-bold text-zinc-300">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {revealed && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  )}
                  {revealed && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Conceptual / QA Self-Assessment */
          <div className="space-y-4 pt-2">
            {!revealed ? (
              <div className="text-center py-4">
                <InteractiveButton
                  variant="glass"
                  size="md"
                  onClick={() => setRevealed(true)}
                >
                  Show Answer & Self-Assess
                </InteractiveButton>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-zinc-900/80 border border-indigo-500/30 space-y-4"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1">
                    Correct Answer
                  </span>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                    {currentCard.back}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Did you get it right?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelfGrade(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold"
                    >
                      Incorrect
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelfGrade(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold"
                    >
                      Correct!
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Revealed Explanation & Next Button */}
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 border-t border-zinc-800/80 flex items-center justify-between"
          >
            <p className="text-xs text-zinc-400 max-w-md">
              {currentCard.explanation || currentCard.back.slice(0, 120)}
            </p>

            <InteractiveButton
              variant="primary"
              size="sm"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={handleNext}
            >
              {currentIndex + 1 < cards.length ? "Next Question" : "See Results"}
            </InteractiveButton>
          </motion.div>
        )}
      </SpotlightCard>
    </div>
  );
};
