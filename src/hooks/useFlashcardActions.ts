// Complex Action Hooks
// Handles complex action helpers with side effects and business logic

import type { FlashcardContextState } from '../types/flashcard';
import { QUALITY_RATINGS } from '../utils/sm2';
import { FlashcardService } from '../services/flashcardService';
import { getCurrentUser } from '../utils/auth';

/**
 * Dependencies required by complex action hooks
 */
export interface FlashcardActionsDeps {
  state: FlashcardContextState;
  dispatch: React.Dispatch<any>;
  setLoadingState: (
    key: keyof FlashcardContextState['loadingStates'],
    value: boolean
  ) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'offline') => void;
  setError: (error: string, retryable?: boolean) => void;
  clearError: () => void;
  loadCardSetData: (dataFile: string) => Promise<void>;
  // Note: saveProgressToFirestore removed for batch save optimization
}

/**
 * Creates complex action helper methods with the provided dependencies
 * @param deps Dependencies for the action helpers
 * @returns Object containing all complex action helper methods
 */
export const createFlashcardActions = (deps: FlashcardActionsDeps) => {
  const {
    state,
    dispatch,
    setLoadingState,
    setSyncStatus,
    setError,
    clearError,
    loadCardSetData,
  } = deps;

  /**
   * Rate a flashcard with quality score and handle Firestore synchronization
   * @param quality Quality rating (0-5 scale)
   */
  const rateCard = async (quality: number): Promise<void> => {
    if (state.currentCard) {
      const currentCard = state.currentCard;

      // First, update the local state immediately (optimistic update)
      dispatch({
        type: 'RATE_CARD',
        payload: { cardId: currentCard.id, quality },
      });

      // OPTIMIZATION: Defer Firestore writes for batch save at session completion
      // This reduces Firestore read/write operations during review session
      // Progress is tracked in sessionReducer.pendingProgress for batch save later

      // Note: All progress calculation and storage is now handled in sessionReducer
      // The updated card data is already stored in pendingProgress Map
      // Batch save will happen when:
      // 1. Session completes (isComplete = true)
      // 2. User navigates away from review screen
      // 3. Browser unload events (beforeunload)

      console.log(
        'Card rated:',
        currentCard.id,
        'quality:',
        quality,
        'batch save will occur at session completion'
      );

      // Previous immediate Firestore save code commented out for optimization:
      /*
      if (!state.isGuest && state.dataSource === "firestore") {
        try {
          const updatedProgress = calculateSM2(currentCard, quality as QualityRating);
          await saveProgressToFirestore(currentCard.id, { ...progressData });
        } catch (error) {
          console.warn("Failed to save card rating to Firestore, will retry later:", error);
        }
      }
      */
    }
  };

  /**
   * Mark a card as "known" (equivalent to Easy rating)
   */
  const knowCard = async (): Promise<void> => {
    // "I Know" button is equivalent to "Easy" rating
    await rateCard(QUALITY_RATINGS.EASY);
  };

  /**
   * Reset all cards' progress - delete Firestore data and reload from original data
   */
  const resetProgress = async (): Promise<void> => {
    try {
      setLoadingState('savingProgress', true);
      clearError();

      // If user is authenticated and data source is Firestore, delete progress in Firestore
      if (!state.isGuest && state.dataSource === 'firestore') {
        setSyncStatus('syncing');

        const currentUser = getCurrentUser();
        if (!currentUser) {
          setError(
            'User must be authenticated to reset progress in Firestore.'
          );
          return;
        }

        if (!state.selectedCardSet) {
          setError('No card set selected to reset.');
          return;
        }

        // Delete card set collection (complete reset)
        const deleteCollectionResult =
          await FlashcardService.deleteCardSetCollection(
            state.selectedCardSet.id
          );

        if (!deleteCollectionResult.success) {
          throw new Error(
            deleteCollectionResult.error ||
              'Failed to delete card set collection'
          );
        }

        // Delete progress metadata (complete cleanup)
        const deleteProgressResult =
          await FlashcardService.deleteCardSetProgress(
            state.selectedCardSet.id
          );

        if (!deleteProgressResult.success) {
          console.warn(
            `Failed to delete progress metadata for ${state.selectedCardSet.id}: ${deleteProgressResult.error}`
          );
          // Don't throw error here - main reset succeeded, this is just cleanup
        }

        console.log(
          `Successfully reset all progress for card set: ${state.selectedCardSet.name}`
        );
        setSyncStatus('idle');

        // Load fresh data from JSON for local state reload
        const freshCards = await FlashcardService.loadCardsFromJSON(
          state.selectedCardSet.dataFile
        );

        if (!freshCards.success || !freshCards.data) {
          throw new Error('Failed to load fresh card data for local state');
        }
      }

      // Reset local state first
      dispatch({ type: 'RESET_PROGRESS' });

      // Increment progress version to trigger external component reloads
      dispatch({ type: 'INCREMENT_PROGRESS_VERSION' });

      // Reload fresh data from original JSON file
      if (state.selectedCardSet?.dataFile) {
        await loadCardSetData(state.selectedCardSet.dataFile);
        console.log('Successfully reloaded fresh card data');
      }
    } catch (error) {
      console.error('Error resetting progress:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to reset progress'
      );
      setSyncStatus('error');
    } finally {
      setLoadingState('savingProgress', false);
    }
  };

  return {
    rateCard,
    knowCard,
    resetProgress,
  };
};
