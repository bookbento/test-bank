// Card Management Reducer
// Handles flashcard data operations, statistics, and progress management

import type { FlashcardContextState, Flashcard } from '../types/flashcard';
import {
  getDueFlashcards,
  calculateFlashcardStats,
} from '../utils/flashcardHelpers';

/**
 * Card-related action types that this reducer handles
 */
export type CardAction =
  | { type: 'LOAD_CARDS'; payload: Flashcard[] }
  | { type: 'UPDATE_STATS' }
  | { type: 'RESET_PROGRESS' }
  | { type: 'SET_LOADING'; payload: boolean };

/**
 * Card reducer - handles all card-related state updates
 * @param state Current flashcard context state
 * @param action Card action to process
 * @returns Updated state
 */
export const cardReducer = (
  state: FlashcardContextState,
  action: CardAction
): Partial<FlashcardContextState> => {
  switch (action.type) {
    case 'LOAD_CARDS': {
      const allCards = action.payload;
      const dueCards = getDueFlashcards(allCards);
      const stats = calculateFlashcardStats(allCards);

      // DEBUG: Log stats calculation
      console.log('CardReducer: LOAD_CARDS - Stats calculated:', {
        cardsCount: allCards.length,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: stats.reviewsToday,
        },
        sampleCard: allCards[0]
          ? {
              id: allCards[0].id,
              isNew: allCards[0].isNew,
              totalReviews: allCards[0].totalReviews,
              repetitions: allCards[0].repetitions,
              easinessFactor: allCards[0].easinessFactor,
            }
          : null,
      });

      return {
        allCards,
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: stats.reviewsToday,
        },
        isLoading: false,
      };
    }

    case 'SET_LOADING': {
      return {
        isLoading: action.payload,
      };
    }

    case 'UPDATE_STATS': {
      const stats = calculateFlashcardStats(state.allCards);
      const dueCards = getDueFlashcards(state.allCards);

      return {
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: stats.reviewsToday, // Now calculated from actual card data
        },
      };
    }

    case 'RESET_PROGRESS': {
      // Clear current session state - fresh data will be loaded by the action handler
      return {
        currentSession: null,
        currentCard: null,
        isShowingBack: false,
      };
    }

    default:
      return {}; // No changes for unknown actions
  }
};
