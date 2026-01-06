// Simple test for FlashcardService card set logic
// Tests the straightforward logic: Firestore → JSON + Save → Firestore again

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FlashcardService } from '../../src/services/flashcardService';
import * as firestoreUtils from '../../src/utils/firestore';
import * as authUtils from '../../src/utils/auth';
import * as cardSetLoader from '../../src/utils/cardSetLoader';

// Mock Firebase Auth
vi.mock('../../src/utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Firestore utilities
vi.mock('../../src/utils/firestore', () => ({
  getUserFlashcards: vi.fn(),
  saveFlashcardsBatch: vi.fn(),
  // New single document methods
  getCardSetDocument: vi.fn(),
  saveAllCardsInSingleWrite: vi.fn(),
  updateCardsInSingleDocument: vi.fn(),
}));

// Mock card set loader for fetch-based loading
vi.mock('../../src/utils/cardSetLoader', () => ({
  loadCardSetDataWithFetch: vi.fn(),
}));

describe('FlashcardService - Simple Card Set Logic', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (authUtils.getCurrentUser as any).mockReturnValue(mockUser);

    // Mock card set loader to return test data
    (cardSetLoader.loadCardSetDataWithFetch as any).mockResolvedValue([
      {
        id: 'biz-001',
        front: {
          icon: '💼',
          title: '商务',
          description: 'Business',
        },
        back: {
          icon: '📊',
          title: 'shāngwù',
          description: 'Commercial activities',
        },
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return cards from Firestore when they exist', async () => {
    // Mock: Single document has data
    const mockFirestoreCards = [
      {
        id: 'biz-001',
        front: { icon: '💼', title: '商务', description: 'Business' },
        back: {
          icon: '📊',
          title: 'shāngwù',
          description: 'Commercial activities',
        },
        cardSetId: 'business_chinese',
        easinessFactor: 2.5,
        nextReviewDate: new Date(),
      },
    ];

    (firestoreUtils.getCardSetDocument as any).mockResolvedValue({
      success: true,
      data: {
        cards: mockFirestoreCards,
        totalCards: mockFirestoreCards.length,
      },
    });

    const result = await FlashcardService.loadCardSetData(
      'business_chinese',
      'business_chinese.json'
    );

    expect(result.success).toBe(true);
    expect(result.data?.source).toBe('firestore');
    expect(result.data?.cards).toHaveLength(1);
    expect(result.data?.cards[0].id).toBe('biz-001');

    // Should only call getCardSetDocument once (single document read)
    expect(firestoreUtils.getCardSetDocument).toHaveBeenCalledTimes(1);
    expect(firestoreUtils.getCardSetDocument).toHaveBeenCalledWith(
      'test-user-123',
      'business_chinese'
    );

    // Should NOT call saveAllCardsInSingleWrite since data exists
    expect(firestoreUtils.saveAllCardsInSingleWrite).not.toHaveBeenCalled();
  });

  it('should create from JSON and save when Firestore is empty', async () => {
    // Mock: No data in single document initially, but succeeds after save
    (firestoreUtils.getCardSetDocument as any)
      .mockResolvedValueOnce({
        // First call - empty
        success: true,
        data: null,
      })
      .mockResolvedValueOnce({
        // Second call - after save
        success: true,
        data: {
          cards: [
            {
              id: 'biz-001',
              front: { icon: '💼', title: '商务', description: 'Business' },
              cardSetId: 'business_chinese',
              easinessFactor: 2.6,
              nextReviewDate: new Date(),
            },
          ],
          totalCards: 1,
        },
      });

    // Mock: Single document save succeeds
    (firestoreUtils.saveAllCardsInSingleWrite as any).mockResolvedValue({
      success: true,
    });

    const result = await FlashcardService.loadCardSetData(
      'business_chinese',
      'business_chinese.json'
    );

    expect(result.success).toBe(true);
    expect(result.data?.source).toBe('firestore');
    expect(result.data?.cards).toHaveLength(1);

    // Should call getCardSetDocument twice (before and after save)
    expect(firestoreUtils.getCardSetDocument).toHaveBeenCalledTimes(2);

    // Should call saveAllCardsInSingleWrite once
    expect(firestoreUtils.saveAllCardsInSingleWrite).toHaveBeenCalledTimes(1);
    expect(firestoreUtils.saveAllCardsInSingleWrite).toHaveBeenCalledWith(
      'test-user-123',
      'business_chinese',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'biz-001',
          cardSetId: 'business_chinese',
        }),
      ])
    );
  });

  it('should fallback to JSON when save fails', async () => {
    // Mock: Single document is empty
    (firestoreUtils.getCardSetDocument as any).mockResolvedValue({
      success: true,
      data: null,
    });

    // Mock: Single document save fails
    (firestoreUtils.saveAllCardsInSingleWrite as any).mockResolvedValue({
      success: false,
      error: 'Save failed',
    });

    const result = await FlashcardService.loadCardSetData(
      'business_chinese',
      'business_chinese.json'
    );

    expect(result.success).toBe(true);
    expect(result.data?.source).toBe('json');
    expect(result.data?.cards).toHaveLength(1);
    expect(result.data?.cards[0].id).toBe('biz-001');

    // Should try to save but fall back to JSON
    expect(firestoreUtils.saveAllCardsInSingleWrite).toHaveBeenCalledTimes(1);
  });

  it('should fail gracefully for invalid JSON files', async () => {
    // Mock: Single document is empty
    (firestoreUtils.getCardSetDocument as any).mockResolvedValue({
      success: true,
      data: null,
    });

    // Mock: JSON loading fails
    (cardSetLoader.loadCardSetDataWithFetch as any).mockRejectedValue(
      new Error('File not found')
    );

    const result = await FlashcardService.loadCardSetData(
      'invalid_set',
      'nonexistent.json'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to load JSON data');
  });
});
