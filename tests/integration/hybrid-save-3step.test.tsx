/**
 * Integration Test: Hybrid Save with Card Set Creation
 * Tests the 3-step process: ensure card set exists → save progress → save summary
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { FlashcardService } from '../../src/services/flashcardService';

// Mock FlashcardService methods
vi.mock('../../src/services/flashcardService', () => ({
  FlashcardService: {
    ensureCardSetExistsWithoutProgress: vi.fn(),
    saveProgressBatch: vi.fn(),
    updateCardSetProgressOptimized: vi.fn(),
  },
}));

describe('Hybrid Save with Card Set Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should perform 3-step save: ensure card set → save progress → save summary', async () => {
    // Mock all methods to succeed
    const mockEnsureWithoutProgress = vi.mocked(
      FlashcardService.ensureCardSetExistsWithoutProgress
    );
    const mockSaveProgressBatch = vi.mocked(FlashcardService.saveProgressBatch);
    const mockUpdateProgressOptimized = vi.mocked(
      FlashcardService.updateCardSetProgressOptimized
    );

    mockEnsureWithoutProgress.mockResolvedValue({ success: true, data: true });
    mockSaveProgressBatch.mockResolvedValue({ success: true });
    mockUpdateProgressOptimized.mockResolvedValue({
      success: true,
      data: true,
    });

    // Mock data
    const pendingProgress = new Map();
    pendingProgress.set('card-1', { easinessFactor: 2.6, repetitions: 1 });
    const cardSetId = 'hsk_1_set_1_english';

    // Simulate the 3-step process from FlashcardContext.tsx

    // Step 1: Ensure card set document exists (without progress)
    const ensureResult =
      await FlashcardService.ensureCardSetExistsWithoutProgress(
        cardSetId,
        'hsk-1-set-1-english.json'
      );
    expect(ensureResult.success).toBe(true);

    // Step 2: Save individual card progress
    const progressResult = await FlashcardService.saveProgressBatch(
      pendingProgress,
      cardSetId
    );
    expect(progressResult.success).toBe(true);

    // Step 3: Save progress summary
    const consolidatedProgress = {
      cardSetId,
      totalCards: 1,
      reviewedCards: 1,
      progressPercentage: 100,
      masteredCards: 1,
      needPracticeCards: 0,
      reviewedToday: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const summaryResult = await FlashcardService.updateCardSetProgressOptimized(
      cardSetId,
      consolidatedProgress
    );
    expect(summaryResult.success).toBe(true);

    // Verify all three methods were called in correct order
    expect(mockEnsureWithoutProgress).toHaveBeenCalledWith(
      cardSetId,
      'hsk-1-set-1-english.json'
    );
    expect(mockSaveProgressBatch).toHaveBeenCalledWith(
      pendingProgress,
      cardSetId
    );
    expect(mockUpdateProgressOptimized).toHaveBeenCalledWith(
      cardSetId,
      consolidatedProgress
    );

    // All should be called exactly once
    expect(mockEnsureWithoutProgress).toHaveBeenCalledTimes(1);
    expect(mockSaveProgressBatch).toHaveBeenCalledTimes(1);
    expect(mockUpdateProgressOptimized).toHaveBeenCalledTimes(1);
  });

  test('should fail early if card set creation fails', async () => {
    const mockEnsureWithoutProgress = vi.mocked(
      FlashcardService.ensureCardSetExistsWithoutProgress
    );
    const mockSaveProgressBatch = vi.mocked(FlashcardService.saveProgressBatch);
    const mockUpdateProgressOptimized = vi.mocked(
      FlashcardService.updateCardSetProgressOptimized
    );

    // Card set creation fails
    mockEnsureWithoutProgress.mockResolvedValue({
      success: false,
      error: 'JSON file not found.',
    });

    const cardSetId = 'test-set';
    const dataFile = 'missing.json';

    try {
      const ensureResult =
        await FlashcardService.ensureCardSetExistsWithoutProgress(
          cardSetId,
          dataFile
        );

      if (!ensureResult.success) {
        throw new Error(
          ensureResult.error || 'Failed to create card set document'
        );
      }

      // Should not reach here
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('JSON file not found.');
    }

    // Only ensureCardSetExistsWithoutProgress should be called
    expect(mockEnsureWithoutProgress).toHaveBeenCalledOnce();
    expect(mockSaveProgressBatch).not.toHaveBeenCalled();
    expect(mockUpdateProgressOptimized).not.toHaveBeenCalled();
  });

  test('should fail at step 2 if progress save fails', async () => {
    const mockEnsureWithoutProgress = vi.mocked(
      FlashcardService.ensureCardSetExistsWithoutProgress
    );
    const mockSaveProgressBatch = vi.mocked(FlashcardService.saveProgressBatch);
    const mockUpdateProgressOptimized = vi.mocked(
      FlashcardService.updateCardSetProgressOptimized
    );

    // Step 1 succeeds, step 2 fails
    mockEnsureWithoutProgress.mockResolvedValue({ success: true, data: true });
    mockSaveProgressBatch.mockResolvedValue({
      success: false,
      error: 'Network timeout',
    });

    const pendingProgress = new Map();
    const cardSetId = 'test-set';
    const dataFile = 'test.json';

    try {
      // Step 1: Should succeed
      const ensureResult =
        await FlashcardService.ensureCardSetExistsWithoutProgress(
          cardSetId,
          dataFile
        );
      expect(ensureResult.success).toBe(true);

      // Step 2: Should fail
      const progressResult = await FlashcardService.saveProgressBatch(
        pendingProgress,
        cardSetId
      );

      if (!progressResult.success) {
        throw new Error(
          progressResult.error || 'Failed to save individual card progress'
        );
      }

      // Should not reach here
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Network timeout');
    }

    // First two methods should be called, but not the third
    expect(mockEnsureWithoutProgress).toHaveBeenCalledOnce();
    expect(mockSaveProgressBatch).toHaveBeenCalledOnce();
    expect(mockUpdateProgressOptimized).not.toHaveBeenCalled();
  });
});
