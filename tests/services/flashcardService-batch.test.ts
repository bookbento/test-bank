// Test for FlashcardService batch save optimization
// Tests the new saveProgressBatch method and session completion workflow

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlashcardService } from '../../src/services/flashcardService';
import * as authUtils from '../../src/utils/auth';
import * as firestoreUtils from '../../src/utils/firestore';

// Mock Firebase Auth
vi.mock('../../src/utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Firestore utilities
vi.mock('../../src/utils/firestore', () => ({
  saveFlashcardsBatch: vi.fn(),
  // New single document methods
  getCardSetDocument: vi.fn(),
  saveAllCardsInSingleWrite: vi.fn(),
  updateCardsInSingleDocument: vi.fn(),
}));

describe('FlashcardService - Batch Save Optimization', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  };

  const mockProgressUpdates = new Map([
    [
      'card-1',
      {
        easinessFactor: 2.6,
        repetitions: 1,
        interval: 1,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        totalReviews: 1,
        correctStreak: 1,
        averageQuality: 4.0,
        isNew: false,
      },
    ],
    [
      'card-2',
      {
        easinessFactor: 2.5,
        repetitions: 1,
        interval: 1,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        totalReviews: 1,
        correctStreak: 1,
        averageQuality: 3.0,
        isNew: false,
      },
    ],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    (authUtils.getCurrentUser as any).mockReturnValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should batch save progress updates successfully', async () => {
    // Mock successful single document update (load→merge→save pattern)
    (firestoreUtils.updateCardsInSingleDocument as any).mockResolvedValue({
      success: true,
      data: [],
    });

    const result = await FlashcardService.saveProgressBatch(
      mockProgressUpdates,
      'test_card_set'
    );

    expect(result.success).toBe(true);

    // Verify updateCardsInSingleDocument was called with correct parameters
    expect(firestoreUtils.updateCardsInSingleDocument).toHaveBeenCalledWith(
      'test-user-123',
      'test_card_set',
      mockProgressUpdates
    );
  });

  it('should handle empty progress updates gracefully', async () => {
    const emptyMap = new Map();

    const result = await FlashcardService.saveProgressBatch(
      emptyMap,
      'test_card_set'
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);

    // Should not call Firestore for empty updates
    expect(firestoreUtils.updateCardsInSingleDocument).not.toHaveBeenCalled();
  });

  it('should fail when user is not authenticated', async () => {
    (authUtils.getCurrentUser as any).mockReturnValue(null);

    const result = await FlashcardService.saveProgressBatch(
      mockProgressUpdates,
      'test_card_set'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
    expect(firestoreUtils.updateCardsInSingleDocument).not.toHaveBeenCalled();
  });

  it('should handle Firestore errors gracefully', async () => {
    (firestoreUtils.updateCardsInSingleDocument as any).mockResolvedValue({
      success: false,
      error: 'Network error',
    });

    const result = await FlashcardService.saveProgressBatch(
      mockProgressUpdates,
      'test_card_set'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should pass correct parameters to single document update', async () => {
    (firestoreUtils.updateCardsInSingleDocument as any).mockResolvedValue({
      success: true,
      data: [],
    });

    await FlashcardService.saveProgressBatch(
      mockProgressUpdates,
      'business_chinese'
    );

    // Verify the method was called with correct user, cardSet, and progress map
    expect(firestoreUtils.updateCardsInSingleDocument).toHaveBeenCalledWith(
      'test-user-123',
      'business_chinese',
      mockProgressUpdates
    );
  });
});
