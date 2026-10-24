"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Sparkles } from "lucide-react";
import { Flashcard, CardCategory, CardDifficulty } from "@/types";
import { InteractiveButton } from "@/components/ui/InteractiveButton";

interface CardEditorFormProps {
  cardToEdit?: Flashcard | null;
  onSaveCard: (card: Flashcard) => void;
  onDeleteCard?: (cardId: string) => void;
  onClose: () => void;
}

const CardEditorForm: React.FC<CardEditorFormProps> = ({
  cardToEdit,
  onSaveCard,
  onDeleteCard,
  onClose,
}) => {
  const [front, setFront] = useState(cardToEdit?.front || "");
  const [back, setBack] = useState(cardToEdit?.back || "");
  const [category, setCategory] = useState<CardCategory>(cardToEdit?.category || "concept");
  const [difficulty, setDifficulty] = useState<CardDifficulty>(cardToEdit?.difficulty || "medium");
  const [explanation, setExplanation] = useState(cardToEdit?.explanation || "");
  const [tagsInput, setTagsInput] = useState(cardToEdit?.tags?.join(", ") || "");

  const handleSave = () => {
    if (!front.trim() || !back.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updatedCard: Flashcard = {
      id: cardToEdit?.id || `card_custom_${Date.now()}`,
      front: front.trim(),
      back: back.trim(),
      category,
      difficulty,
      explanation: explanation.trim() || undefined,
      tags: tags.length > 0 ? tags : ["Custom"],
      mastered: cardToEdit?.mastered || false,
      reviewCount: cardToEdit?.reviewCount || 0,
      easeFactor: cardToEdit?.easeFactor || 2.5,
      intervalDays: cardToEdit?.intervalDays || 1,
    };

    onSaveCard(updatedCard);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3.5 text-xs">
        <div>
          <label className="block font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Card Front (Question / Prompt)
          </label>
          <textarea
            rows={3}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="e.g. What is Amazon S3 Intelligent-Tiering?"
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Card Back (Answer / Definition)
          </label>
          <textarea
            rows={4}
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="e.g. An object storage class that automatically optimizes storage costs by moving data to the most cost-effective access tier..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CardCategory)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="concept">Concept & Definition</option>
              <option value="qa">Conceptual Q&A</option>
              <option value="true_false">True / False</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="mnemonic">Recall Mnemonic</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as CardDifficulty)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Context / Explanation (Optional)
          </label>
          <input
            type="text"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="e.g. Reference: Section 2.1 Storage Classes"
            className="w-full px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Tags (Comma separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. AWS, S3, Architecture"
            className="w-full px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
        {cardToEdit && onDeleteCard ? (
          <button
            type="button"
            onClick={() => {
              onDeleteCard(cardToEdit.id);
              onClose();
            }}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Card
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <InteractiveButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </InteractiveButton>
          <InteractiveButton
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!front.trim() || !back.trim()}
          >
            Save Card
          </InteractiveButton>
        </div>
      </div>
    </div>
  );
};

interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: Flashcard | null;
  onSaveCard: (card: Flashcard) => void;
  onDeleteCard?: (cardId: string) => void;
}

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
  isOpen,
  onClose,
  cardToEdit,
  onSaveCard,
  onDeleteCard,
}) => {
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
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-xl rounded-2xl border border-white/[0.12] bg-zinc-950/90 p-6 shadow-2xl backdrop-blur-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {cardToEdit ? "Edit Study Flashcard" : "Create New Flashcard"}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CardEditorForm
              key={cardToEdit?.id || "new"}
              cardToEdit={cardToEdit}
              onSaveCard={onSaveCard}
              onDeleteCard={onDeleteCard}
              onClose={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
