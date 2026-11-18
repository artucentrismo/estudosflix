import type { BaseRecord } from "../storage/database";

export const REE_INTERVAL_DAYS = [1, 3, 7, 15, 30, 60] as const;
export const DEFAULT_DAILY_REVIEW_LIMIT = 30;
export const MAX_CONSECUTIVE_CORRECT = 5;
export const ARCHIVE_RESPONSE_TIME_MS = 5000;

export type Flashcard = BaseRecord & {
  subjectId: string;
  front: string;
  back: string;
  level: number;
  consecutiveCorrect: number;
  reviewCount: number;
  responseTimeTotalMs: number;
  responseTimeCount: number;
  lastReviewedAt?: string;
  nextReviewAt: string;
  archived: boolean;
};

export type FlashcardReview = BaseRecord & {
  flashcardId: string;
  reviewedAt: string;
  remembered: boolean;
  responseTimeMs: number;
};

export function reviewFlashcard(
  card: Flashcard,
  remembered: boolean,
  responseTimeMs: number,
  reviewedAt = new Date().toISOString(),
): { card: Flashcard; review: FlashcardReview } {
  const safeTime = Math.max(0, Math.floor(responseTimeMs));
  const level = remembered ? Math.min(5, card.level + 1) : 0;
  const consecutiveCorrect = remembered ? card.consecutiveCorrect + 1 : 0;
  const responseTimeTotalMs = card.responseTimeTotalMs + safeTime;
  const responseTimeCount = card.responseTimeCount + 1;
  const averageResponseTime = responseTimeTotalMs / responseTimeCount;
  const archived = remembered && consecutiveCorrect >= MAX_CONSECUTIVE_CORRECT &&
    averageResponseTime < ARCHIVE_RESPONSE_TIME_MS;
  const intervalDays = REE_INTERVAL_DAYS[level];
  const nextReview = new Date(reviewedAt);
  nextReview.setDate(nextReview.getDate() + intervalDays);
  const updatedCard: Flashcard = {
    ...card,
    level,
    consecutiveCorrect,
    reviewCount: card.reviewCount + 1,
    responseTimeTotalMs,
    responseTimeCount,
    lastReviewedAt: reviewedAt,
    nextReviewAt: nextReview.toISOString(),
    archived: card.archived || archived,
    updatedAt: reviewedAt,
  };
  const review: FlashcardReview = {
    id: `review-${card.id}-${card.reviewCount + 1}`,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
    flashcardId: card.id,
    reviewedAt,
    remembered,
    responseTimeMs: safeTime,
  };
  return { card: updatedCard, review };
}

export function selectDailyReviewQueue(
  cards: Flashcard[],
  now = new Date(),
  limit = DEFAULT_DAILY_REVIEW_LIMIT,
): Flashcard[] {
  const timestamp = now.getTime();
  return cards
    .filter(card => !card.archived && new Date(card.nextReviewAt).getTime() <= timestamp)
    .sort((a, b) => {
      const aDue = new Date(a.nextReviewAt).getTime();
      const bDue = new Date(b.nextReviewAt).getTime();
      return aDue - bDue || a.level - b.level || a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0, Math.max(0, Math.min(limit, DEFAULT_DAILY_REVIEW_LIMIT)));
}
