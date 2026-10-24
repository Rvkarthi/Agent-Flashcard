export type CardCategory =
  | "concept"
  | "qa"
  | "true_false"
  | "multiple_choice"
  | "mnemonic";

export type CardDifficulty = "easy" | "medium" | "hard";

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: CardCategory;
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;
  difficulty: CardDifficulty;
  tags: string[];
  mastered: boolean;
  reviewCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  easeFactor: number;
  intervalDays: number;
}

export interface StudyDeck {
  id: string;
  title: string;
  description: string;
  sourceDocumentName: string;
  sourceDocumentS3Key?: string;
  sourceDocumentSize?: number;
  s3Bucket?: string;
  createdAt: string;
  updatedAt: string;
  cards: Flashcard[];
  tags: string[];
}

export interface StudyDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  s3Key: string;
  s3Url?: string;
  status: "uploading" | "uploaded" | "processing" | "ready" | "error";
  progress: number;
  error?: string;
  extractedText?: string;
  deckId?: string;
}

export interface S3UploadConfig {
  bucketName: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  useMockSandbox: boolean;
}

export interface GenerationOptions {
  cardCount: number;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  style: "comprehensive" | "core_concepts" | "exam_prep" | "quick_review";
  includeMnemonics: boolean;
  includeMultipleChoice: boolean;
}

export interface QuizQuestionState {
  cardId: string;
  selectedOptionIndex?: number;
  isCorrect?: boolean;
  answered: boolean;
}

export interface StudySessionStats {
  cardsReviewed: number;
  masteredCount: number;
  againCount: number;
  streak: number;
  startTime: number;
}
