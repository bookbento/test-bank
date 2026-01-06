// Utility functions for card set data transformation
import type { CardSet } from '../types/flashcard';

// Extended card set with progress for display
export interface CardSetWithProgress extends CardSet {
  progress: number; // 0-100 percentage
}

/**
 * Merges card sets with progress data
 */
export function mergeCardSetsWithProgress(
  cardSets: CardSet[],
  progressData: Record<string, number>
): CardSetWithProgress[] {
  return cardSets.map((cardSet) => ({
    ...cardSet,
    progress: progressData[cardSet.id] || 0,
  }));
}

/**
 * Groups card sets by category
 */
export function groupCardSetsByCategory(
  cardSets: CardSetWithProgress[]
): Record<string, CardSetWithProgress[]> {
  return cardSets.reduce(
    (groups, cardSet) => {
      const category = cardSet.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cardSet);
      return groups;
    },
    {} as Record<string, CardSetWithProgress[]>
  );
}

/**
 * Filters card sets that have progress > 0
 */
export function filterCardSetsWithProgress(
  cardSets: CardSetWithProgress[]
): CardSetWithProgress[] {
  return cardSets.filter((cardSet) => cardSet.progress > 0);
}
