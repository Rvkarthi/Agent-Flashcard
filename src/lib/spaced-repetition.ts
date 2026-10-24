import { Flashcard } from "@/types";

export type Rating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface ReviewResult {
  card: Flashcard;
  nextIntervalDays: number;
  nextReviewDate: string;
}

export function reviewCard(card: Flashcard, rating: Rating): Flashcard {
  const now = new Date();
  let { easeFactor = 2.5, intervalDays = 1, reviewCount = 0 } = card;

  // Update ease factor (SM-2 formula)
  // EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  // Grade mapped from rating 1..4 to 2..5
  const grade = rating + 1;
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  if (rating === 1) {
    // Again: reset streak and review today or tomorrow
    reviewCount = 0;
    intervalDays = 1;
  } else {
    // Passed
    reviewCount += 1;
    if (reviewCount === 1) {
      intervalDays = 1;
    } else if (reviewCount === 2) {
      intervalDays = rating === 4 ? 6 : 3;
    } else {
      const bonus = rating === 4 ? 1.3 : rating === 2 ? 0.8 : 1.0;
      intervalDays = Math.round(intervalDays * easeFactor * bonus);
    }
  }

  const nextDate = new Date();
  nextDate.setDate(now.getDate() + intervalDays);

  return {
    ...card,
    reviewCount,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    intervalDays,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextDate.toISOString(),
    mastered: reviewCount >= 3 || rating === 4,
  };
}
