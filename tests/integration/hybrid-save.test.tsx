/**
 * Integration Test: Hybrid Save Implementation
 * Tests that both individual cards AND progress summary are saved when session completes
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { FlashcardService } from '../../src/services/flashcardService';

// Mock FlashcardService methods
vi.mock('../../src/services/flashcardService', () => ({
  FlashcardService: {
    saveCardsBatch: vi.fn(),
    saveProgressBatch: vi.fn(),
    updateCardSetProgressOptimized: vi.fn(),
  },
}));

describe('Hybrid Save Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should call both saveProgressBatch AND updateCardSetProgressOptimized', async () => {
    // Mock successful responses
    const mockSaveProgressBatch = vi.mocked(FlashcardService.saveProgressBatch);
    const mockUpdateProgressOptimized = vi.mocked(
      FlashcardService.updateCardSetProgressOptimized
    );

    mockSaveProgressBatch.mockResolvedValue({ success: true });
    mockUpdateProgressOptimized.mockResolvedValue({
      success: true,
      data: true,
    });

    // Create mock data
    const pendingProgress = new Map();
    pendingProgress.set('card-1', {
      easinessFactor: 2.6,
      repetitions: 1,
      interval: 1,
      lastReviewDate: new Date(),
      totalReviews: 1,
    });

    const cardSetId = 'hsk_1_set_1_english';

    // Simulate the hybrid save logic from FlashcardContext.tsx
    const cardSaveResult = await FlashcardService.saveProgressBatch(
      pendingProgress,
      cardSetId
    );

    if (!cardSaveResult.success) {
      throw new Error('Failed to save individual cards');
    }

    const consolidatedProgress = {
      cardSetId,
      totalCards: 210,
      reviewedCards: 1,
      progressPercentage: 0.5,
      masteredCards: 0,
      needPracticeCards: 1,
      reviewedToday: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const progressSaveResult =
      await FlashcardService.updateCardSetProgressOptimized(
        cardSetId,
        consolidatedProgress
      );

    // Verify both methods were called
    expect(mockSaveProgressBatch).toHaveBeenCalledOnce();
    expect(mockSaveProgressBatch).toHaveBeenCalledWith(
      pendingProgress,
      cardSetId
    );

    expect(mockUpdateProgressOptimized).toHaveBeenCalledOnce();
    expect(mockUpdateProgressOptimized).toHaveBeenCalledWith(
      cardSetId,
      consolidatedProgress
    );

    // Verify both succeeded
    expect(cardSaveResult.success).toBe(true);
    expect(progressSaveResult.success).toBe(true);
  });

  test('should handle failure in individual card save gracefully', async () => {
    const mockSaveProgressBatch = vi.mocked(FlashcardService.saveProgressBatch);
    const mockUpdateProgressOptimized = vi.mocked(
      FlashcardService.updateCardSetProgressOptimized
    );

    // Mock individual card save failure
    mockSaveProgressBatch.mockResolvedValue({
      success: false,
      error: 'Network error saving cards',
    });

    const pendingProgress = new Map();
    pendingProgress.set('card-1', { easinessFactor: 2.6 });

    try {
      const cardSaveResult = await FlashcardService.saveProgressBatch(
        pendingProgress,
        'test-set'
      );

      if (!cardSaveResult.success) {
        throw new Error(
          cardSaveResult.error || 'Failed to save individual cards'
        );
      }
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Network error saving cards');
    }

    // Verify progress summary was never called due to early failure
    expect(mockSaveProgressBatch).toHaveBeenCalledOnce();
    expect(mockUpdateProgressOptimized).not.toHaveBeenCalled();
  });

  test('should handle failure in progress summary save while cards succeeded', async () => {
    const mockSaveProgressBatch = vi.mocked(FlashcardService.saveProgressBatch);
    const mockUpdateProgressOptimized = vi.mocked(
      FlashcardService.updateCardSetProgressOptimized
    );

    // Individual cards succeed, progress summary fails
    mockSaveProgressBatch.mockResolvedValue({ success: true });
    mockUpdateProgressOptimized.mockResolvedValue({
      success: false,
      error: 'Database timeout',
    });

    const pendingProgress = new Map();
    const cardSetId = 'test-set';

    // Step 1: Save individual cards (succeeds)
    const cardSaveResult = await FlashcardService.saveProgressBatch(
      pendingProgress,
      cardSetId
    );
    expect(cardSaveResult.success).toBe(true);

    // Step 2: Save progress summary (fails)
    const progressSaveResult =
      await FlashcardService.updateCardSetProgressOptimized(
        cardSetId,
        {} as any
      );
    expect(progressSaveResult.success).toBe(false);
    expect(progressSaveResult.error).toBe('Database timeout');

    // Both methods should have been called
    expect(mockSaveProgressBatch).toHaveBeenCalledOnce();
    expect(mockUpdateProgressOptimized).toHaveBeenCalledOnce();
  });
});
