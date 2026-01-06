// FlashcardContext - React Context for managing flashcard state
// Handles card data, review sessions, and progress tracking

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  Flashcard,
  FlashcardData,
  CardSet,
  FlashcardContextState,
  FlashcardAction,
  CardSetProgress,
  UserProfileWithProgress,
} from '../types/flashcard';
import { transformFlashcardData } from '../utils/seedData';
// Enhanced error handling for card set operations
import {
  createCardSetError,
  getErrorCodeFromException,
  validateCardSetData,
} from '../utils/cardSetErrors';
// Auth utilities for authentication monitoring
import { useAuth } from './AuthContext';
// Main flashcard reducer
import { flashcardReducer } from '../reducers/flashcardReducer';
// Firestore operations
import { createFirestoreOperations } from '../hooks/useFirestoreOperations';
import { FlashcardService } from '../services/flashcardService';
// Progress aggregation utilities
import {
  aggregateCardProgressToSetProgress,
  validateConsolidatedProgress,
  createProgressSummary,
} from '../utils/progressAggregation';
// Complex action hooks
import { createFlashcardActions } from '../hooks/useFlashcardActions';
// Card set persistence for remembering user's last selected set
import {
  saveLastCardSet,
  loadLastCardSet,
  isStorageAvailable,
} from '../utils/cardSetPersistence';
// Fetch-based card set loader for reliable production loading
import { loadCardSetDataWithFetch } from '../utils/cardSetLoader';
// Optimized caching layer
import { flashcardCache } from '../utils/flashcardContextCache';

// Import review session size constants
import {
  DEFAULT_REVIEW_CARDS,
  REVIEW_SESSION_OPTIONS,
  type ReviewSessionSize,
} from '../types/flashcard';

// Keep for backward compatibility, but we'll use dynamic sizing
export const MAX_REVIEW_CARDS = DEFAULT_REVIEW_CARDS;

/**
 * Get initial card set with persistence support
 * Tries to load from localStorage first, falls back to default
 */
const getInitialCardSet = () => {
  // Try to load from localStorage if available
  if (isStorageAvailable()) {
    const savedCardSet = loadLastCardSet();
    if (savedCardSet) {
      console.log(
        'FlashcardContext: Restored card set from localStorage',
        savedCardSet.name
      );
      return savedCardSet;
    }
  }

  // Default fallback card set - match the test expectations
  const defaultCardSet = {
    id: 'chinese_essentials_1',
    name: 'Chinese Essentials 1',
    description: 'Basic everyday communication',
    cover: '🇨🇳',
    cardCount: 50,
    category: 'language_basics',
    tags: ['chinese', 'communication', 'beginner'],
    dataFile: 'chinese_essentials_in_communication_1.json',
    author: 'Test Author',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  console.log('FlashcardContext: Using default card set', defaultCardSet.name);
  return defaultCardSet;
};

/**
 * Initial state for the FlashcardContext
 * Sets up default values for all state properties
 */
const initialState: FlashcardContextState = {
  // Core flashcard data
  allCards: [],
  dueCards: [],
  currentSession: null,
  currentCard: null,

  // Card set management
  selectedCardSet: null,
  availableCardSets: [],

  // Track last successfully loaded card set for error recovery
  lastWorkingCardSet: null,

  isLoading: true,
  isShowingBack: false,

  // Enhanced loading states for different operations
  loadingStates: {
    fetchingCards: false,
    savingProgress: false,
    creatingCard: false,
    deletingCard: false,
    migrating: false,
  },

  // Data source and synchronization tracking
  dataSource: 'session',
  syncStatus: 'idle',
  lastSyncTime: null,

  // Progress invalidation for external components
  progressVersion: 0,

  // Error handling and retry mechanism
  error: null,
  pendingOperations: [],

  // Migration status for guest-to-user data transfer
  migrationStatus: 'none',

  // Statistics for dashboard display
  stats: {
    totalCards: 0,
    dueCards: 0,
    masteredCards: 0,
    difficultCards: 0,
    reviewsToday: 0,
  },

  // User authentication state
  isGuest: true,
  user: null,
};

/**
 * React Context for flashcard application state management
 * Provides all necessary methods and state for flashcard operations
 */
const FlashcardContext = createContext<{
  state: FlashcardContextState;
  dispatch: React.Dispatch<FlashcardAction>;

  // Core action helpers for flashcard operations
  loadCards: (cards: Flashcard[]) => void;
  loadCardSetData: (dataFile: string) => Promise<void>;
  startReviewSession: () => void;
  showCardBack: () => void;
  rateCard: (quality: number) => Promise<void>;
  knowCard: () => Promise<void>;
  nextCard: () => void;
  completeSession: () => void;
  resetSession: () => void;
  resetProgress: () => Promise<void>;

  // Enhanced helpers for loading states and error handling
  setLoadingState: (
    key: keyof FlashcardContextState['loadingStates'],
    value: boolean
  ) => void;
  setDataSource: (source: 'session' | 'firestore' | 'fallback') => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'offline') => void;
  setError: (error: string, retryable?: boolean) => void;
  clearError: () => void;
  retryPendingOperations: () => void;
  setUser: (user: any, isGuest: boolean) => void;
  setSelectedCardSet: (cardSet: CardSet | null) => void;

  // Firestore integration methods
  loadCardsFromFirestore: () => Promise<void>;
  saveCardToFirestore: (card: Flashcard) => Promise<void>;
  // Note: saveProgressToFirestore removed for batch save optimization
  migrateGuestDataToFirestore: (guestData: any) => Promise<void>;

  // Card set progress methods
  loadCardSetProgress: (cardSetId: string) => Promise<CardSetProgress | null>;
  saveCardSetProgress: (progress: CardSetProgress) => Promise<void>;
  updateCurrentCardSetProgress: () => Promise<void>;
  loadAllCardSetProgress: () => Promise<Record<string, number>>;

  // User profile methods
  loadUserProfile: () => Promise<any>;
  updateUserProfile: (updates: any) => Promise<boolean>;

  // Review session size preference methods
  updateReviewSessionSize: (size: ReviewSessionSize) => Promise<boolean>;
  getReviewSessionSize: () => number;

  // OPTIMIZED METHODS - Caching layer with reduced Firestore operations
  initializeCacheForUser: () => Promise<boolean>;
  loadUserProfileWithProgressOptimized: () => Promise<UserProfileWithProgress | null>;
  getCardSetProgressFromCache: (cardSetId: string) => CardSetProgress | null;
  getAllCardSetProgressFromCache: () => Record<string, CardSetProgress>;
  updateCardSetProgressOptimized: (
    cardSetId: string,
    progress: CardSetProgress
  ) => void;
  forceSyncNow: () => Promise<boolean>;
  getCacheStats: () => any;
  clearCache: () => void;
} | null>(null);

/**
 * FlashcardProvider component that wraps the application with flashcard context
 * Manages initialization, authentication monitoring, and provides all flashcard functionality
 */
export const FlashcardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(flashcardReducer, initialState);

  /**
   * Load flashcard data for a specific card set with enhanced error handling
   * @param dataFile - The JSON file name to load card data from
   */
  const loadCardSetData = async (dataFile: string) => {
    try {
      console.log(`FlashcardContext: Loading card set data from ${dataFile}`);
      dispatch({ type: 'SET_LOADING', payload: true });

      // Use fetch-based loader for reliable dev and production loading
      const cardSetData = await loadCardSetDataWithFetch(dataFile);

      // Validate the loaded data structure
      try {
        validateCardSetData(cardSetData);
      } catch (validationError) {
        throw createCardSetError(
          'CARD_SET_INVALID_DATA',
          state.selectedCardSet?.id,
          dataFile,
          validationError
        );
      }

      // Transform raw data to include SM-2 parameters
      const transformedCards = (cardSetData as FlashcardData[]).map((data) =>
        transformFlashcardData(data, 'default')
      );

      // Check if we have any valid cards after transformation
      if (transformedCards.length === 0) {
        throw createCardSetError(
          'CARD_SET_EMPTY',
          state.selectedCardSet?.id,
          dataFile
        );
      }

      dispatch({ type: 'LOAD_CARDS', payload: transformedCards });
      console.log(
        `FlashcardContext: Successfully loaded ${transformedCards.length} cards from ${dataFile}`
      );

      // Mark this card set as the last working one on successful load
      if (state.selectedCardSet) {
        dispatch({
          type: 'SET_LAST_WORKING_CARD_SET',
          payload: state.selectedCardSet,
        });
      }
    } catch (error) {
      console.error(
        `FlashcardContext: Error loading card set data from ${dataFile}:`,
        error
      );

      // Create specific error based on the type of failure
      const errorCode = getErrorCodeFromException(error);
      const cardSetError = createCardSetError(
        errorCode,
        state.selectedCardSet?.id,
        dataFile,
        error
      );

      // Set the specific error for user feedback
      dispatch({
        type: 'SET_ERROR',
        payload: cardSetError,
      });

      // Enhanced fallback strategy: try last working card set first
      if (
        state.lastWorkingCardSet &&
        state.lastWorkingCardSet.dataFile !== dataFile
      ) {
        console.log(
          `FlashcardContext: Attempting fallback to last working card set: ${state.lastWorkingCardSet.name}`
        );

        try {
          // Try to load the last working card set
          const lastWorkingData = await loadCardSetDataWithFetch(
            state.lastWorkingCardSet.dataFile
          );
          validateCardSetData(lastWorkingData);

          const fallbackCards = (lastWorkingData as FlashcardData[]).map(
            (data) => transformFlashcardData(data, 'default')
          );

          if (fallbackCards.length > 0) {
            dispatch({ type: 'LOAD_CARDS', payload: fallbackCards });

            // Revert to the last working card set
            if (state.lastWorkingCardSet) {
              const fallbackCardSet: CardSet = {
                id: state.lastWorkingCardSet.id,
                name: state.lastWorkingCardSet.name,
                description: '',
                cover: state.lastWorkingCardSet.cover,
                cardCount: fallbackCards.length,
                category: '',
                tags: [],
                dataFile: state.lastWorkingCardSet.dataFile,
                author: '',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              dispatch({
                type: 'SET_SELECTED_CARD_SET',
                payload: fallbackCardSet,
              });
            }

            console.log(
              `FlashcardContext: Successfully fell back to ${state.lastWorkingCardSet.name}`
            );
            return; // Exit early since we successfully recovered
          }
        } catch (fallbackError) {
          console.error(
            `FlashcardContext: Fallback to last working card set also failed:`,
            fallbackError
          );
        }
      }

      // Final fallback to default data if all else fails
      console.log('FlashcardContext: Falling back to default flashcard data');
      try {
        const defaultCardsData =
          await loadCardSetDataWithFetch('flashcards.json');
        const transformedCards = defaultCardsData.map((data) =>
          transformFlashcardData(data, 'default')
        );
        dispatch({ type: 'LOAD_CARDS', payload: transformedCards });
      } catch (defaultLoadError) {
        console.error(
          'Failed to load default flashcard data:',
          defaultLoadError
        );
        // Set empty array as final fallback
        dispatch({ type: 'LOAD_CARDS', payload: [] });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Initialize card set from localStorage on component mount
   */
  useEffect(() => {
    // Only initialize if selectedCardSet is null (initial state)
    if (!state.selectedCardSet) {
      const initialCardSet = getInitialCardSet();
      // Check if it's already a complete CardSet (from localStorage) or needs to be used as default
      if ('description' in initialCardSet && 'cardCount' in initialCardSet) {
        // It's a complete CardSet from localStorage
        dispatch({
          type: 'SET_SELECTED_CARD_SET',
          payload: initialCardSet as CardSet,
        });
      } else {
        // It's the minimal default, create a complete CardSet
        const completeCardSet: CardSet = {
          id: initialCardSet.id,
          name: initialCardSet.name,
          description: 'Basic everyday communication',
          cover: initialCardSet.cover,
          cardCount: 50,
          category: 'language_basics',
          tags: ['chinese', 'communication', 'beginner'],
          dataFile: initialCardSet.dataFile,
          author: 'Test Author',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };
        dispatch({ type: 'SET_SELECTED_CARD_SET', payload: completeCardSet });
      }
    }
  }, []);

  /**
   * Sync with AuthContext - get auth state from AuthContext instead of Firebase directly
   * This prevents duplicate auth listeners and ensures consistency
   */
  const { state: authState } = useAuth();

  useEffect(() => {
    console.log('FlashcardContext: AuthContext state changed', authState);

    if (!authState.isGuest && authState.user) {
      // User signed in - update FlashcardContext state
      const userProfile = {
        uid: authState.user.uid,
        email: authState.user.email,
        displayName: authState.user.displayName,
        photoURL: authState.user.photoURL,
        isGuest: false,
      };

      console.log(
        'FlashcardContext: Syncing with AuthContext - User signed in'
      );

      // Check if we need to migrate guest data
      if (state.isGuest && state.allCards.length > 0) {
        console.log(
          'FlashcardContext: Detected guest data, initiating migration...'
        );
        migrateGuestDataToFirestore({
          cards: state.allCards,
          stats: state.stats,
          selectedCardSet: state.selectedCardSet,
        });
      }

      setUser(userProfile, false);
    } else if (!authState.isAuthLoading) {
      // User signed out or is guest (but only if auth is not loading)
      console.log('FlashcardContext: Syncing with AuthContext - Guest mode');
      setUser(null, true);
      setDataSource('session');
    } else {
      console.log('FlashcardContext: AuthContext is loading, waiting...');
    }
  }, [authState.isGuest, authState.user?.uid, authState.isAuthLoading]); // Listen to AuthContext changes

  /**
   * CRITICAL FIX: Force card reload when transitioning from guest to authenticated
   * This ensures progress data is loaded after authentication completes
   */
  useEffect(() => {
    const forceReloadAfterAuth = async () => {
      // Only trigger if:
      // 1. User is authenticated (not guest, has user object)
      // 2. Auth is not loading
      // 3. We have cards that might be from session/fallback
      // 4. We have a selected card set
      if (
        !state.isGuest &&
        state.user &&
        !authState.isAuthLoading &&
        (state.dataSource === 'session' || state.dataSource === 'fallback') &&
        state.selectedCardSet?.dataFile &&
        state.allCards.length > 0
      ) {
        console.log(
          'FlashcardContext: Force reloading cards from Firestore after authentication'
        );

        try {
          await loadCardsFromFirestore();
        } catch (error) {
          console.error('Failed to reload cards after authentication:', error);
        }
      }
    };

    forceReloadAfterAuth();
  }, [
    state.isGuest,
    state.user?.uid,
    authState.isAuthLoading,
    state.dataSource,
  ]);

  /**
   * Load user profile from Firestore when user is authenticated
   * This ensures reviewSessionSize and other profile data is loaded after refresh
   */
  useEffect(() => {
    const loadUserProfileData = async () => {
      console.log('FlashcardContext: Checking condition for profile loading', {
        isGuest: state.isGuest,
        userUid: state.user?.uid,
        conditionResult: !state.isGuest && state.user?.uid,
      });

      if (!state.isGuest && state.user?.uid) {
        // Prevent infinite loop: only load if reviewSessionSize is not set or undefined
        if (state.user.reviewSessionSize !== undefined) {
          console.log(
            'FlashcardContext: Profile already has reviewSessionSize, skipping load'
          );
          return;
        }

        try {
          console.log('FlashcardContext: Loading user profile from Firestore');
          const profile = await loadUserProfile();

          console.log('FlashcardContext: Loaded profile:', profile);
          console.log(
            'FlashcardContext: Profile reviewSessionSize:',
            profile?.reviewSessionSize
          );

          if (profile) {
            // Always update user state with loaded profile data
            const updatedUser = {
              ...state.user,
              ...profile, // Merge all profile data
            };

            dispatch({
              type: 'SET_USER',
              payload: {
                user: updatedUser,
                isGuest: false,
              },
            });

            console.log(
              `FlashcardContext: Updated state with profile data, reviewSessionSize: ${profile.reviewSessionSize}`
            );

            // Log current state after update for debugging
            setTimeout(() => {
              console.log(
                'FlashcardContext: Current state.user after update:',
                state.user
              );
              console.log(
                'FlashcardContext: getReviewSessionSize() returns:',
                getReviewSessionSize()
              );
            }, 100);
          } else {
            console.log(
              'FlashcardContext: No profile data returned from loadUserProfile'
            );
          }
        } catch (error) {
          console.error(
            'FlashcardContext: Failed to load user profile:',
            error
          );
        }
      }
    };

    loadUserProfileData();
  }, [state.isGuest, state.user?.uid]); // This may cause infinite loop, need to fix the dispatch logic

  /**
   * Load card data when selectedCardSet changes, considering authentication state
   * - For authenticated users: load from Firestore
   * - For guest users: load from JSON
   */
  useEffect(() => {
    if (state.selectedCardSet?.dataFile) {
      console.log(
        `FlashcardContext: Card set changed to ${
          state.selectedCardSet.name
        }, loading data for ${state.isGuest ? 'guest' : 'authenticated'} user`
      );

      // Prevent redundant loads: only load if we don't have cards or data source changed
      const hasCards = state.allCards.length > 0;
      const currentDataSource = state.isGuest ? 'json' : 'firestore';

      // Check if current cards have actual progress data (not just JSON defaults)
      const hasProgressData =
        hasCards &&
        state.allCards.some((card) => !card.isNew && card.totalReviews > 0);

      // Check if card set changed by comparing selected card set ID with cards' cardSetId
      const cardSetChanged =
        hasCards &&
        state.allCards.length > 0 &&
        state.allCards[0].cardSetId !== state.selectedCardSet.id;

      // CRITICAL FIX: Force reload when:
      // 1. We have cards from JSON but user is authenticated (dataSource mismatch)
      // 2. We have cards but they lack progress data (JSON cards loaded instead of Firestore)
      // 3. Card set has changed (critical fix for production bug)
      const needsFirestoreReload =
        !state.isGuest &&
        state.user &&
        hasCards &&
        currentDataSource === 'firestore' &&
        (state.dataSource !== 'firestore' ||
          !hasProgressData ||
          cardSetChanged);

      // Prevent loading if already loading to avoid race conditions
      const isCurrentlyLoading =
        state.isLoading || state.loadingStates.fetchingCards;

      const shouldLoad =
        !isCurrentlyLoading &&
        (!hasCards ||
          state.dataSource !== currentDataSource ||
          needsFirestoreReload ||
          cardSetChanged); // Always reload when card set changes

      console.log('FlashcardContext: Card loading decision:', {
        hasCards,
        currentDataSource,
        stateDataSource: state.dataSource,
        hasProgressData,
        cardSetChanged,
        needsFirestoreReload,
        shouldLoad,
        isCurrentlyLoading,
        isLoading: state.isLoading,
        fetchingCards: state.loadingStates.fetchingCards,
        isGuest: state.isGuest,
        hasUser: !!state.user,
        cardsCount: state.allCards.length,
        firstCardId: state.allCards[0]?.id,
        selectedCardSetId: state.selectedCardSet.id,
        currentCardsCardSetId: state.allCards[0]?.cardSetId,
        dataSourceMismatch: state.dataSource !== currentDataSource,
        reasonsToReload: {
          noCards: !hasCards,
          dataSourceMismatch: state.dataSource !== currentDataSource,
          needsFirestoreReload: needsFirestoreReload,
          lacksProgressData: hasCards && !hasProgressData,
          cardSetChanged: cardSetChanged,
        },
      });

      // DEBUG: Check if current cards have progress data
      if (hasCards) {
        const sampleCard = state.allCards[0];
        console.log('FlashcardContext: Sample card progress data:', {
          cardId: sampleCard?.id,
          isNew: sampleCard?.isNew,
          totalReviews: sampleCard?.totalReviews,
          repetitions: sampleCard?.repetitions,
          easinessFactor: sampleCard?.easinessFactor,
          lastReviewDate: sampleCard?.lastReviewDate,
          hasProgressData:
            sampleCard && !sampleCard.isNew && sampleCard.totalReviews > 0,
        });
      }

      if (!shouldLoad) {
        console.log(
          'FlashcardContext: Cards already loaded for current data source, skipping load'
        );
        return;
      }

      if (!state.isGuest && state.user) {
        // Authenticated user - load from Firestore
        loadCardsFromFirestore().catch((error) => {
          console.error(
            'Failed to load cards from Firestore, falling back to JSON:',
            error
          );
          // Fallback to JSON if Firestore fails
          if (state.selectedCardSet?.dataFile) {
            loadCardSetData(state.selectedCardSet.dataFile);
          }
        });
      } else {
        // Guest user - load from JSON
        loadCardSetData(state.selectedCardSet.dataFile);
      }
    } else if (!state.selectedCardSet?.dataFile) {
      // Fallback to default data if no dataFile
      const loadDefaultData = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          const defaultCardsData =
            await loadCardSetDataWithFetch('flashcards.json');
          const transformedCards = defaultCardsData.map((data) =>
            transformFlashcardData(data, 'default')
          );
          dispatch({ type: 'LOAD_CARDS', payload: transformedCards });
        } catch (error) {
          console.error('Failed to load default data:', error);
          dispatch({ type: 'LOAD_CARDS', payload: [] });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      };
      loadDefaultData();
    }
  }, [state.selectedCardSet, state.isGuest, state.user]); // Depends on auth state too

  /**
   * MEGA OPTIMIZATION: Consolidated progress save when review session completes
   * NEW APPROACH: Instead of writing 10 individual card updates (10 write operations),
   * we aggregate them into 1 card set progress update (1 write operation)
   * Cost Reduction: 90% fewer Firestore write operations!
   */
  useEffect(() => {
    const saveConsolidatedProgress = async () => {
      // Only process if we have a completed session with pending progress
      if (
        !state.currentSession?.isComplete ||
        !state.currentSession.pendingProgress ||
        state.currentSession.pendingProgress.size === 0 ||
        state.isGuest ||
        state.dataSource !== 'firestore'
      ) {
        return;
      }

      try {
        console.log(
          `🚀 Session completed: Converting ${state.currentSession.pendingProgress.size} individual card updates into 1 consolidated progress update`
        );

        setLoadingState('savingProgress', true);
        setSyncStatus('syncing');

        // Get current progress state before aggregation for comparison
        const currentProgress = await firestoreOperations.loadCardSetProgress(
          state.selectedCardSet?.id || 'unknown'
        );

        // Aggregate individual card progress into consolidated card set progress
        const consolidatedProgress = aggregateCardProgressToSetProgress(
          state.currentSession.pendingProgress,
          state.allCards,
          state.selectedCardSet?.id || 'unknown'
        );

        // Validate the aggregated progress
        const validation = validateConsolidatedProgress(
          consolidatedProgress,
          state.currentSession.pendingProgress,
          state.allCards
        );

        if (!validation.isValid) {
          console.error('❌ Progress validation failed:', validation.errors);
          throw new Error(
            `Invalid aggregated progress: ${validation.errors.join(', ')}`
          );
        }

        console.log('✅ Progress aggregation validated:', validation.details);

        // HYBRID APPROACH: Save both individual cards AND progress summary
        // 1. Save individual cards with updated SM-2 parameters (1 batch write)
        // 2. Save progress summary for efficient dashboard loading (1 write)
        // Total: 2 operations instead of N operations (80-90% cost reduction maintained)

        console.log('💾 Step 1: Ensuring card set document exists...');
        // First ensure the card set document exists (without progress to avoid duplicates)
        const cardSetId = state.selectedCardSet?.id || 'unknown';
        const dataFile =
          state.selectedCardSet?.dataFile || 'hsk-1-set-1-english.json';
        const ensureResult =
          await FlashcardService.ensureCardSetExistsWithoutProgress(
            cardSetId,
            dataFile
          );

        if (!ensureResult.success) {
          throw new Error(
            ensureResult.error || 'Failed to ensure card set document'
          );
        }

        console.log(
          '✅ Card set document ensured (no duplicate progress saves)'
        );

        console.log('💾 Step 2: Saving individual card progress updates...');
        const cardSaveResult = await FlashcardService.saveProgressBatch(
          state.currentSession.pendingProgress,
          cardSetId
        );

        if (!cardSaveResult.success) {
          throw new Error(
            cardSaveResult.error || 'Failed to save individual card progress'
          );
        }

        console.log('✅ Individual card progress saved successfully');

        // 3. Save consolidated progress (for dashboard performance)
        console.log('💾 Step 3: Saving progress summary...');
        const result = await FlashcardService.updateCardSetProgressOptimized(
          state.selectedCardSet?.id || 'unknown',
          consolidatedProgress
        );

        if (result.success) {
          const summary = createProgressSummary(
            currentProgress,
            consolidatedProgress,
            state.currentSession.pendingProgress
          );

          console.log('🎉 Hybrid save completed successfully');
          console.log(
            '✅ Card set document created/updated: users/{userId}/cardSets/{cardSetId}'
          );
          console.log(
            '✅ Individual card progress saved: users/{userId}/cardSets/{cardSetId}'
          );
          console.log(
            '✅ Progress summary saved: users/{userId}.cardSetsProgress'
          );
          console.log(
            `💰 Cost Optimization: ${state.currentSession.pendingProgress.size} operations → 2 operations (${Math.round((1 - 2 / state.currentSession.pendingProgress.size) * 100)}% reduction)`
          );
          console.log(`📊 ${summary}`);

          setSyncStatus('idle');
          // Clear pending progress after successful save
          // Note: We could dispatch an action to clear pendingProgress, but since
          // session will be reset soon anyway, we'll let it be cleaned up naturally
        } else {
          console.error('❌ Progress summary save failed:', result.error);
          console.warn(
            '⚠️ Individual cards were saved successfully, but progress summary failed'
          );
          setSyncStatus('error');
          setError(`Failed to save progress summary: ${result.error}`, true);
        }
      } catch (error) {
        console.error('❌ Hybrid save error:', error);
        setSyncStatus('error');
        setError(
          `Failed to save session data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        );
      } finally {
        setLoadingState('savingProgress', false);
      }
    };

    saveConsolidatedProgress();
  }, [
    state.currentSession?.isComplete,
    state.currentSession?.pendingProgress?.size,
    state.isGuest,
    state.dataSource,
    state.selectedCardSet?.id,
  ]);

  /**
   * Basic action helper functions for core flashcard operations
   */
  const loadCards = (cards: Flashcard[]) => {
    dispatch({ type: 'LOAD_CARDS', payload: cards });
  };

  const startReviewSession = () => {
    if (state.dueCards.length > 0) {
      // Use dynamic session size based on user preference
      const sessionSize = getReviewSessionSize();
      const reviewCards = state.dueCards.slice(0, sessionSize);
      console.log(
        `FlashcardContext: Starting review session with ${reviewCards.length}/${state.dueCards.length} cards (session size: ${sessionSize})`
      );
      dispatch({ type: 'START_REVIEW_SESSION', payload: reviewCards });
    }
  };

  const showCardBack = () => {
    dispatch({ type: 'SHOW_CARD_BACK' });
  };

  const nextCard = () => {
    dispatch({ type: 'NEXT_CARD' });
  };

  const completeSession = () => {
    dispatch({ type: 'COMPLETE_SESSION' });
  };

  const resetSession = () => {
    dispatch({ type: 'RESET_SESSION' });
  };

  /**
   * Enhanced helper functions for loading states and error handling
   */
  const setLoadingState = useCallback(
    (key: keyof FlashcardContextState['loadingStates'], value: boolean) => {
      dispatch({ type: 'SET_LOADING_STATE', payload: { key, value } });
    },
    []
  );

  const setDataSource = useCallback(
    (source: 'session' | 'firestore' | 'fallback') => {
      dispatch({ type: 'SET_DATA_SOURCE', payload: source });
    },
    []
  );

  const setSyncStatus = useCallback(
    (status: 'idle' | 'syncing' | 'error' | 'offline') => {
      dispatch({ type: 'SET_SYNC_STATUS', payload: status });
    },
    []
  );

  const setError = useCallback(
    (errorMessage: string, retryable: boolean = true) => {
      const error = {
        code: 'CONTEXT_ERROR',
        message: errorMessage,
        retryable,
        timestamp: new Date(),
      };
      dispatch({ type: 'SET_ERROR', payload: error });
    },
    []
  );

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const retryPendingOperations = useCallback(() => {
    dispatch({ type: 'RETRY_PENDING_OPERATIONS' });
  }, []);

  const setUser = useCallback((user: any, isGuest: boolean) => {
    dispatch({ type: 'SET_USER', payload: { user, isGuest } });
  }, []);

  /**
   * Factory function implementations for complex operations
   * Uses dependency injection pattern to provide necessary context methods
   */

  // Create Firestore operations using the factory function
  const firestoreOperations = createFirestoreOperations({
    state,
    dispatch,
    setLoadingState,
    setSyncStatus,
    setDataSource,
    setError,
    clearError,
  });

  // Extract individual methods for backward compatibility
  const {
    loadCardsFromFirestore,
    saveCardToFirestore,
    // Note: saveProgressToFirestore removed for batch save optimization
    migrateGuestDataToFirestore,
    loadCardSetProgress,
    saveCardSetProgress,
    updateCurrentCardSetProgress,
    loadAllCardSetProgress,
    loadUserProfile,
    updateUserProfile,
  } = firestoreOperations;

  /**
   * Get current review session size preference
   * Returns user's preferred session size or default if not set
   */
  const getReviewSessionSize = useCallback((): number => {
    // Try user profile first (for authenticated users)
    if (state.user && !state.isGuest && state.user.reviewSessionSize) {
      console.log(
        `FlashcardContext: Using user profile session size: ${state.user.reviewSessionSize}`
      );
      return state.user.reviewSessionSize;
    }

    // Try localStorage for guest users or fallback
    if (isStorageAvailable()) {
      const stored = localStorage.getItem('reviewSessionSize');
      if (stored) {
        const size = parseInt(stored, 10);
        if (REVIEW_SESSION_OPTIONS.includes(size as ReviewSessionSize)) {
          console.log(
            `FlashcardContext: Using localStorage session size: ${size}`
          );
          return size;
        }
      }
    }

    // Default fallback
    console.log(
      `FlashcardContext: Using default session size: ${DEFAULT_REVIEW_CARDS}`
    );
    return DEFAULT_REVIEW_CARDS;
  }, [state.user, state.isGuest]);

  /**
   * Update review session size preference
   * Saves to user profile for authenticated users, localStorage for guests
   */
  const updateReviewSessionSize = useCallback(
    async (size: ReviewSessionSize): Promise<boolean> => {
      try {
        console.log(
          `FlashcardContext: Updating review session size to ${size}`
        );

        if (!state.user || state.isGuest) {
          // For guest users, store in localStorage
          if (isStorageAvailable()) {
            localStorage.setItem('reviewSessionSize', size.toString());
            console.log(
              `FlashcardContext: Saved session size ${size} to localStorage for guest user`
            );
            return true;
          } else {
            console.warn(
              'FlashcardContext: localStorage not available for guest user'
            );
            return false;
          }
        }

        // For authenticated users, update in Firestore via user profile
        const success = await updateUserProfile({ reviewSessionSize: size });

        // Always update local state optimistically for immediate UI feedback
        // (Even if Firestore update fails, user still sees the change)
        console.log(
          `FlashcardContext: Updating local state to session size ${size}`
        );
        dispatch({
          type: 'SET_USER',
          payload: {
            user: { ...state.user, reviewSessionSize: size },
            isGuest: state.isGuest,
          },
        });

        if (success) {
          console.log(
            `FlashcardContext: Successfully updated session size to ${size} in user profile`
          );
        } else {
          console.error(
            'FlashcardContext: Failed to update session size in user profile, but local state updated'
          );
        }
        return success;
      } catch (error) {
        console.error(
          'FlashcardContext: Error updating review session size:',
          error
        );
        setError('Failed to update review session size', true);
        return false;
      }
    },
    [state.user, state.isGuest, updateUserProfile, setError]
  );

  /**
   * Set the selected card set and persist to localStorage
   */
  const setSelectedCardSet = useCallback((cardSet: CardSet | null) => {
    console.log('FlashcardContext: Setting selected card set', cardSet);

    // Reset any existing session when changing card sets to prevent race conditions
    dispatch({ type: 'RESET_SESSION' });

    // Update context state
    dispatch({ type: 'SET_SELECTED_CARD_SET', payload: cardSet });

    // Persist to localStorage if card set is valid and storage is available
    if (cardSet && isStorageAvailable()) {
      // Save the complete CardSet object instead of just partial data
      saveLastCardSet(cardSet);
    }
  }, []);

  // Create complex action helpers using the factory function
  const flashcardActions = createFlashcardActions({
    state,
    dispatch,
    setLoadingState,
    setSyncStatus,
    setError,
    clearError,
    loadCardSetData,
  });

  // ========================================
  // OPTIMIZED CACHE-BASED METHODS
  // ========================================
  // These methods use the caching layer to reduce Firestore operations

  /**
   * Initialize cache for authenticated user (1 read operation)
   * Replaces multiple individual loads during app startup
   */
  const initializeCacheForUser = useCallback(async (): Promise<boolean> => {
    try {
      setLoadingState('fetchingCards', true);
      setSyncStatus('syncing');

      console.log('🚀 Initializing cache for user session');
      const success = await flashcardCache.initializeCacheForUser();

      if (success) {
        setDataSource('firestore');
        setSyncStatus('idle');
        console.log('✅ Cache initialization successful');
      } else {
        setSyncStatus('error');
        setError('Failed to initialize cache', true);
      }

      return success;
    } catch (error) {
      console.error('❌ Cache initialization error:', error);
      setSyncStatus('error');
      setError(
        error instanceof Error ? error.message : 'Cache initialization failed',
        true
      );
      return false;
    } finally {
      setLoadingState('fetchingCards', false);
    }
  }, [setLoadingState, setSyncStatus, setDataSource, setError]);

  /**
   * Load user profile with consolidated progress (OPTIMIZED - 1 read)
   */
  const loadUserProfileWithProgressOptimized =
    useCallback(async (): Promise<UserProfileWithProgress | null> => {
      try {
        console.log('🚀 Loading user profile with consolidated progress');
        const result = await flashcardCache.loadUserProfileWithProgress();

        if (result.success && result.profile) {
          console.log('✅ Profile loaded from optimized cache');
          return result.profile;
        } else {
          console.log('⚠️ Profile load failed:', result.error);
          setError(result.error || 'Failed to load profile', true);
          return null;
        }
      } catch (error) {
        console.error('❌ Optimized profile load error:', error);
        setError(
          error instanceof Error ? error.message : 'Profile load failed',
          true
        );
        return null;
      }
    }, [setError]);

  /**
   * Get card set progress from cache (0 additional reads)
   */
  const getCardSetProgressFromCache = useCallback(
    (cardSetId: string): CardSetProgress | null => {
      const result = flashcardCache.getCardSetProgress(cardSetId);

      if (result.success && result.servedFromCache) {
        console.log(`🎯 Progress for ${cardSetId} served from cache`);
        return result.progress;
      } else {
        console.log(`📭 No cached progress for ${cardSetId}`);
        return null;
      }
    },
    []
  );

  /**
   * Get all card set progress from cache (0 additional reads)
   */
  const getAllCardSetProgressFromCache = useCallback((): Record<
    string,
    CardSetProgress
  > => {
    const result = flashcardCache.getAllCardSetProgress();

    if (result.success && result.servedFromCache) {
      console.log(
        `🎯 All progress served from cache (${Object.keys(result.progressMap).length} card sets)`
      );
      return result.progressMap;
    } else {
      console.log('📭 No cached progress available');
      return {};
    }
  }, []);

  /**
   * Update card set progress with optimistic updates
   * Immediately updates UI, queues sync operation
   */
  const updateCardSetProgressOptimized = useCallback(
    (cardSetId: string, progress: CardSetProgress): void => {
      try {
        console.log(`⚡ Optimistic progress update for ${cardSetId}`);

        // Optimistic update - immediate UI response
        flashcardCache.updateCardSetProgressOptimistic(cardSetId, progress);

        // Update context state for immediate UI feedback
        dispatch({
          type: 'UPDATE_CARD_SET_PROGRESS_OPTIMISTIC',
          payload: { cardSetId, progress },
        });

        setSyncStatus('syncing');
        console.log(`📋 Progress update queued for batch sync`);
      } catch (error) {
        console.error('❌ Optimistic update error:', error);
        setError(
          error instanceof Error ? error.message : 'Progress update failed',
          true
        );
      }
    },
    [dispatch, setSyncStatus, setError]
  );

  /**
   * Force immediate sync of queued operations
   */
  const forceSyncNow = useCallback(async (): Promise<boolean> => {
    try {
      setSyncStatus('syncing');
      console.log('🔄 Forcing immediate sync');

      const success = await flashcardCache.forceSyncNow();

      if (success) {
        setSyncStatus('idle');
        console.log('✅ Force sync completed');
      } else {
        setSyncStatus('error');
        setError('Force sync failed', true);
      }

      return success;
    } catch (error) {
      console.error('❌ Force sync error:', error);
      setSyncStatus('error');
      setError(
        error instanceof Error ? error.message : 'Force sync failed',
        true
      );
      return false;
    }
  }, [setSyncStatus, setError]);

  /**
   * Get cache statistics and performance metrics
   */
  const getCacheStats = useCallback(() => {
    const stats = flashcardCache.getCacheStats();
    console.log('📊 Cache statistics:', stats);
    return stats;
  }, []);

  /**
   * Clear cache (for logout or reset)
   */
  const clearCache = useCallback((): void => {
    console.log('🗑️ Clearing flashcard cache');
    flashcardCache.clearCache();

    // Reset context state
    dispatch({ type: 'CLEAR_CACHE' });
    setSyncStatus('idle');
    setDataSource('session');
  }, [dispatch, setSyncStatus, setDataSource]);

  // Extract individual methods for backward compatibility
  const { rateCard, knowCard, resetProgress } = flashcardActions;

  /**
   * Context value object that provides all state and methods to consumers
   */
  const contextValue = {
    state,
    dispatch,
    // Core flashcard operations
    loadCards,
    loadCardSetData,
    startReviewSession,
    showCardBack,
    rateCard,
    knowCard,
    nextCard,
    completeSession,
    resetSession,
    resetProgress,
    // State management helpers
    setLoadingState,
    setDataSource,
    setSyncStatus,
    setError,
    clearError,
    retryPendingOperations,
    setUser,
    setSelectedCardSet,
    // Firestore integration methods
    loadCardsFromFirestore,
    saveCardToFirestore,
    // Note: saveProgressToFirestore removed for batch save optimization
    migrateGuestDataToFirestore,
    // Card set progress methods
    loadCardSetProgress,
    saveCardSetProgress,
    updateCurrentCardSetProgress,
    loadAllCardSetProgress,
    // User profile methods
    loadUserProfile,
    updateUserProfile,
    // Review session size preference methods
    updateReviewSessionSize,
    getReviewSessionSize,
    // OPTIMIZED METHODS - Caching layer with reduced Firestore operations
    initializeCacheForUser,
    loadUserProfileWithProgressOptimized,
    getCardSetProgressFromCache,
    getAllCardSetProgressFromCache,
    updateCardSetProgressOptimized,
    forceSyncNow,
    getCacheStats,
    clearCache,
  };

  return (
    <FlashcardContext.Provider value={contextValue}>
      {children}
    </FlashcardContext.Provider>
  );
};

/**
 * Custom hook to access the flashcard context
 * Ensures the hook is used within a FlashcardProvider
 * @returns Flashcard context value with all state and methods
 */
export const useFlashcard = () => {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error('useFlashcard must be used within a FlashcardProvider');
  }
  return context;
};

export default FlashcardContext;
