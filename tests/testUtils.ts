// Test utilities for creating mock data
import type {
  CardSetProgress,
  UserProfileWithProgress,
} from '../src/types/flashcard';

/**
 * Create a mock CardSetProgress object with all required fields
 */
export function createMockCardSetProgress(
  cardSetId: string,
  overrides: Partial<CardSetProgress> = {}
): CardSetProgress {
  return {
    cardSetId,
    totalCards: 40,
    reviewedCards: 20,
    progressPercentage: 50,
    masteredCards: 10,
    needPracticeCards: 10,
    reviewedToday: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-10'),
    ...overrides,
  };
}

/**
 * Create a mock UserProfileWithProgress object
 */
export function createMockUserProfile(
  uid: string,
  cardSetsProgress: Record<string, CardSetProgress> = {}
): UserProfileWithProgress {
  return {
    uid,
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-10'),
    lastLoginAt: new Date('2024-01-10'),
    preferredLanguage: 'en',
    theme: 'system',
    reviewSessionSize: 10,
    isActive: true,
    cardSetsProgress,
  };
}
