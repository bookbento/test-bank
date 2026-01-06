// Consolidated Progress Aggregation Utilities
// Converts individual card progress updates into consolidated card set progress

import type { Flashcard, CardSetProgress } from '../types/flashcard';
import { calculateCardSetProgress } from './flashcardHelpers';

/**
 * Aggregate individual card progress updates into consolidated card set progress
 * This replaces multiple card writes with a single card set progress write
 * @param pendingProgress - Map of cardId -> individual card progress data
 * @param allCards - Current state of all cards in the card set
 * @param cardSetId - The card set identifier
 * @returns Consolidated CardSetProgress object
 */
export const aggregateCardProgressToSetProgress = (
  pendingProgress: Map<string, any>,
  allCards: Flashcard[],
  cardSetId: string
): CardSetProgress => {
  // Apply pending progress updates to cards to get the latest state
  const updatedCards = allCards.map((card) => {
    const pendingUpdate = pendingProgress.get(card.id);
    if (pendingUpdate) {
      return {
        ...card,
        ...pendingUpdate,
        // Ensure we preserve the card structure
        id: card.id,
        front: card.front,
        back: card.back,
        cardSetId: card.cardSetId,
      };
    }
    return card;
  });

  // Calculate consolidated progress from the updated cards
  const consolidatedProgress = calculateCardSetProgress(
    updatedCards,
    cardSetId
  );

  // Add session-specific metadata
  // Remove unused session variables - no longer needed

  return {
    ...consolidatedProgress,
    // Update timestamps
    updatedAt: new Date(),
  };
};

/**
 * Validate that consolidated progress matches expected aggregation
 * @param consolidated - The aggregated progress
 * @param pendingProgress - Original pending progress map
 * @param originalCards - Original card states
 * @returns Validation result with details
 */
export const validateConsolidatedProgress = (
  consolidated: CardSetProgress,
  pendingProgress: Map<string, any>,
  originalCards: Flashcard[]
): {
  isValid: boolean;
  errors: string[];
  details: {
    expectedReviewedCards: number;
    actualReviewedCards: number;
    reviewedInSession: number;
  };
} => {
  const errors: string[] = [];

  // Calculate expected values
  const originalReviewedCount = originalCards.filter(
    (card) => card.totalReviews > 0
  ).length;
  const newlyReviewedCards = Array.from(pendingProgress.keys()).filter(
    (cardId) => {
      const originalCard = originalCards.find((c) => c.id === cardId);
      return originalCard && originalCard.totalReviews === 0;
    }
  ).length;

  const expectedReviewedCards = originalReviewedCount + newlyReviewedCards;
  const actualReviewedCards = consolidated.reviewedCards;
  const reviewedInSession = pendingProgress.size;

  // Validation checks
  if (consolidated.totalCards !== originalCards.length) {
    errors.push(
      `Total cards mismatch: expected ${originalCards.length}, got ${consolidated.totalCards}`
    );
  }

  if (actualReviewedCards < originalReviewedCount) {
    errors.push(
      `Reviewed cards decreased: was ${originalReviewedCount}, now ${actualReviewedCards}`
    );
  }

  if (
    consolidated.progressPercentage > 100 ||
    consolidated.progressPercentage < 0
  ) {
    errors.push(
      `Invalid progress percentage: ${consolidated.progressPercentage}%`
    );
  }

  // Remove lastReviewDate validation as it's no longer part of CardSetProgress

  return {
    isValid: errors.length === 0,
    errors,
    details: {
      expectedReviewedCards,
      actualReviewedCards,
      reviewedInSession,
    },
  };
};

/**
 * Create a summary of what changed in this review session
 * @param before - Progress before the session
 * @param after - Progress after the session
 * @param sessionProgress - Individual card updates from the session
 * @returns Human-readable summary
 */
export const createProgressSummary = (
  before: CardSetProgress | null,
  after: CardSetProgress,
  sessionProgress: Map<string, any>
): string => {
  const beforeReviewed = before?.reviewedCards || 0;
  const afterReviewed = after.reviewedCards;
  const newCardsLearned = afterReviewed - beforeReviewed;
  const cardsReviewedInSession = sessionProgress.size;

  const progressIncrease = before
    ? after.progressPercentage - before.progressPercentage
    : after.progressPercentage;

  return `Review session completed: ${cardsReviewedInSession} cards reviewed, ${newCardsLearned} new cards learned, progress increased by ${progressIncrease.toFixed(1)}% (${beforeReviewed}→${afterReviewed}/${after.totalCards})`;
};

// aggregationUtils export removed - was not being used by any code
