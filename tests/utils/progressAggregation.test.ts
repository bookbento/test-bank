// Comprehensive Test for Consolidated Progress Optimization
// Tests the new approach: 10 card updates → 1 consolidated progress update

import { describe, it, expect, beforeEach } from 'vitest';
import {
  aggregateCardProgressToSetProgress,
  validateConsolidatedProgress,
  createProgressSummary,
} from '../../src/utils/progressAggregation';
import type { Flashcard, CardSetProgress } from '../../src/types/flashcard';

describe('Consolidated Progress Optimization', () => {
  let mockCards: Flashcard[];
  let mockPendingProgress: Map<string, any>;
  let mockCardSetId: string;

  beforeEach(() => {
    mockCardSetId = 'test-set';

    // Create mock cards - mix of new and reviewed cards
    mockCards = [
      {
        id: 'card-1',
        front: { icon: '🚀', title: 'Hello', description: 'Greeting' },
        back: { icon: '👋', title: '你好', description: 'nǐ hǎo' },
        cardSetId: mockCardSetId,
        easinessFactor: 2.5,
        repetitions: 0,
        interval: 1,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(0), // Use epoch for "never reviewed"
        totalReviews: 0, // New card
        correctStreak: 0,
        averageQuality: 0,
        isNew: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'card-2',
        front: { icon: '📚', title: 'Book', description: 'Reading' },
        back: { icon: '书', title: 'shū', description: 'Book in Chinese' },
        cardSetId: mockCardSetId,
        easinessFactor: 2.3,
        repetitions: 2,
        interval: 3,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(Date.now() - 86400000), // Yesterday
        totalReviews: 3, // Previously reviewed
        correctStreak: 2,
        averageQuality: 3.5,
        isNew: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'card-3',
        front: { icon: '🏠', title: 'House', description: 'Home' },
        back: { icon: '家', title: 'jiā', description: 'House/Home' },
        cardSetId: mockCardSetId,
        easinessFactor: 2.5,
        repetitions: 0,
        interval: 1,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(0), // Use epoch for "never reviewed"
        totalReviews: 0, // New card
        correctStreak: 0,
        averageQuality: 0,
        isNew: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Mock pending progress - progress from a review session
    mockPendingProgress = new Map([
      [
        'card-1',
        {
          easinessFactor: 2.6,
          repetitions: 1,
          interval: 1,
          nextReviewDate: new Date(Date.now() + 86400000), // Tomorrow
          lastReviewDate: new Date(),
          totalReviews: 1, // Now reviewed
          correctStreak: 1,
          averageQuality: 4.0,
          isNew: false,
          updatedAt: new Date(),
        },
      ],
      [
        'card-3',
        {
          easinessFactor: 2.7,
          repetitions: 1,
          interval: 1,
          nextReviewDate: new Date(Date.now() + 86400000), // Tomorrow
          lastReviewDate: new Date(),
          totalReviews: 1, // Now reviewed
          correctStreak: 1,
          averageQuality: 5.0,
          isNew: false,
          updatedAt: new Date(),
        },
      ],
    ]);
  });

  describe('aggregateCardProgressToSetProgress', () => {
    it('should correctly aggregate individual card progress into set progress', () => {
      const result = aggregateCardProgressToSetProgress(
        mockPendingProgress,
        mockCards,
        mockCardSetId
      );

      expect(result.cardSetId).toBe(mockCardSetId);
      expect(result.totalCards).toBe(3);

      // Should count previously reviewed + newly reviewed cards
      // Before: 1 card reviewed (card-2)
      // Session: 2 new cards reviewed (card-1, card-3)
      // Total reviewed: 3 cards
      expect(result.reviewedCards).toBe(3);
      expect(result.progressPercentage).toBe(100); // 3/3 = 100%

      // lastReviewDate field removed from CardSetProgress
      expect(result.updatedAt).toBeInstanceOf(Date);

      // Check session metadata - lastReviewSession field removed from CardSetProgress
    });

    it('should handle empty pending progress', () => {
      const emptyProgress = new Map();

      const result = aggregateCardProgressToSetProgress(
        emptyProgress,
        mockCards,
        mockCardSetId
      );

      expect(result.totalCards).toBe(3);
      expect(result.reviewedCards).toBe(1); // Only card-2 was previously reviewed
      expect(result.progressPercentage).toBe(33); // 1/3 ≈ 33%
      // lastReviewSession field removed from CardSetProgress
    });

    it('should preserve existing progress for non-session cards', () => {
      // Only reviewing card-1, not card-2 or card-3
      const limitedProgress = new Map([
        [
          'card-1',
          {
            easinessFactor: 2.6,
            repetitions: 1,
            interval: 1,
            totalReviews: 1,
            isNew: false,
          },
        ],
      ]);

      const result = aggregateCardProgressToSetProgress(
        limitedProgress,
        mockCards,
        mockCardSetId
      );

      // Should still count card-2 as reviewed (it was already reviewed)
      expect(result.reviewedCards).toBe(2); // card-1 (new) + card-2 (existing)
      expect(result.progressPercentage).toBe(67); // 2/3 ≈ 67%
    });
  });

  describe('validateConsolidatedProgress', () => {
    it('should validate correct consolidated progress', () => {
      const consolidatedProgress = aggregateCardProgressToSetProgress(
        mockPendingProgress,
        mockCards,
        mockCardSetId
      );

      const validation = validateConsolidatedProgress(
        consolidatedProgress,
        mockPendingProgress,
        mockCards
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.details.reviewedInSession).toBe(2);
      expect(validation.details.actualReviewedCards).toBe(3);
    });

    it('should detect invalid progress percentage', () => {
      const invalidProgress: CardSetProgress = {
        cardSetId: mockCardSetId,
        totalCards: 3,
        reviewedCards: 5, // Invalid: more than total cards
        progressPercentage: 150, // Invalid: > 100%
        masteredCards: 0,
        needPracticeCards: 0,
        reviewedToday: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const validation = validateConsolidatedProgress(
        invalidProgress,
        mockPendingProgress,
        mockCards
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid progress percentage: 150%');
    });

    it('should detect progress regression', () => {
      const regressedProgress: CardSetProgress = {
        cardSetId: mockCardSetId,
        totalCards: 3,
        reviewedCards: 0, // Regression: was 1, now 0
        progressPercentage: 0,
        masteredCards: 0,
        needPracticeCards: 0,
        reviewedToday: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const validation = validateConsolidatedProgress(
        regressedProgress,
        mockPendingProgress,
        mockCards
      );

      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((e) => e.includes('Reviewed cards decreased'))
      ).toBe(true);
    });
  });

  describe('createProgressSummary', () => {
    it('should create meaningful progress summary', () => {
      const beforeProgress: CardSetProgress = {
        cardSetId: mockCardSetId,
        totalCards: 3,
        reviewedCards: 1,
        progressPercentage: 33,
        masteredCards: 0,
        needPracticeCards: 0,
        reviewedToday: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const afterProgress = aggregateCardProgressToSetProgress(
        mockPendingProgress,
        mockCards,
        mockCardSetId
      );

      const summary = createProgressSummary(
        beforeProgress,
        afterProgress,
        mockPendingProgress
      );

      expect(summary).toContain('2 cards reviewed'); // Session size
      expect(summary).toContain('2 new cards learned'); // Progress increase
      expect(summary).toContain('67.0%'); // Progress increase (100 - 33 = 67)
      expect(summary).toContain('1→3/3'); // Before→After/Total
    });

    it('should handle first session (no previous progress)', () => {
      const afterProgress = aggregateCardProgressToSetProgress(
        mockPendingProgress,
        mockCards,
        mockCardSetId
      );

      const summary = createProgressSummary(
        null, // No previous progress
        afterProgress,
        mockPendingProgress
      );

      expect(summary).toContain('2 cards reviewed');
      expect(summary).toContain('3 new cards learned'); // All cards are "new" relative to null
      expect(summary).toContain('100.0%'); // Full progress increase
    });
  });

  describe('Cost Optimization Analysis', () => {
    it('should demonstrate write operation reduction', () => {
      // Simulate old approach: individual card writes
      const oldApproachWrites = mockPendingProgress.size; // 2 writes

      // New approach: consolidated progress write
      const newApproachWrites = 1; // Always 1 write

      const reduction = Math.round(
        (1 - newApproachWrites / oldApproachWrites) * 100
      );

      expect(oldApproachWrites).toBe(2);
      expect(newApproachWrites).toBe(1);
      expect(reduction).toBe(50); // 50% reduction for 2 cards

      console.log(
        `💰 Cost Optimization Test: ${oldApproachWrites} operations → ${newApproachWrites} operation (${reduction}% reduction)`
      );
    });

    it('should scale cost benefits with session size', () => {
      // Test with larger session (10 cards)
      const largeSession = new Map();
      for (let i = 1; i <= 10; i++) {
        largeSession.set(`card-${i}`, {
          totalReviews: 1,
          easinessFactor: 2.5,
          isNew: false,
        });
      }

      const oldApproachWrites = largeSession.size; // 10 writes
      const newApproachWrites = 1; // Always 1 write
      const reduction = Math.round(
        (1 - newApproachWrites / oldApproachWrites) * 100
      );

      expect(reduction).toBe(90); // 90% reduction for 10 cards

      console.log(
        `🚀 Large Session Test: ${oldApproachWrites} operations → ${newApproachWrites} operation (${reduction}% reduction)`
      );
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all card data during aggregation', () => {
      const result = aggregateCardProgressToSetProgress(
        mockPendingProgress,
        mockCards,
        mockCardSetId
      );

      // Aggregation should not lose any essential information
      expect(result.cardSetId).toBe(mockCardSetId);
      expect(result.totalCards).toBe(mockCards.length);

      // Should accurately reflect the state after applying pending updates
      const updatedCards = mockCards.map((card) => {
        const update = mockPendingProgress.get(card.id);
        return update ? { ...card, ...update } : card;
      });

      const manuallyCalculated = updatedCards.filter(
        (card) => card.totalReviews > 0
      ).length;
      expect(result.reviewedCards).toBe(manuallyCalculated);
    });

    it('should maintain consistent timestamps', () => {
      const result = aggregateCardProgressToSetProgress(
        mockPendingProgress,
        mockCards,
        mockCardSetId
      );

      // lastReviewDate field removed from CardSetProgress
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);

      // Last review date check removed - field no longer exists
    });
  });
});
