// Main FlashcardApp component with simple state-based navigation
// Handles navigation between Dashboard, Review, and Completion screens
// Also supports preloading specific card sets when provided

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  FlashcardProvider,
  useFlashcard,
} from '../../contexts/FlashcardContext';
import { AuthProvider } from '../../contexts/AuthContext';
import Dashboard from './Dashboard.tsx';
import Review from './Review.tsx';
import Completion from './Completion.tsx';
import CardSetSelection from './CardSetSelection.tsx';
import Profile from './Profile.tsx';
import SubscriptionPage from './SubscriptionPage.tsx';
import { DebugPanel } from '../ui/DebugPanel.tsx';
import FeedbackBubble from '../common/FeedbackBubble.tsx';

// Import analytics utilities
import {
  trackAppStateChange,
  trackCardSetSelection,
  trackFlashcardEvent,
} from '../../utils/appAnalytics';

// Navigation types
type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile' | 'subscription' | 'settings';

// Props interface - supports both regular and preload modes
interface FlashcardAppProps {
  preloadCardSet?: string;
  cardSetName?: string;
  cardSetDescription?: string;
}

// Main app wrapper with state-based routing
const FlashcardAppContent = ({
  preloadCardSet,
  cardSetName,
  cardSetDescription,
}: FlashcardAppProps) => {
  const context = useFlashcard();

  // Determine initial route based on preload mode
  const initialRoute: AppRoute = preloadCardSet ? 'dashboard' : 'card-sets';
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(initialRoute);
  const [isPreloading, setIsPreloading] = useState(!!preloadCardSet);
  const preloadedRef = useRef<string | null>(null);

  // Check if context is available
  if (!context) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-rounded text-gray-600">
            Loading context...
          </p>
        </div>
      </div>
    );
  }

  const { state, setSelectedCardSet, loadCardSetData } = context;

  // Track FlashcardApp initialization
  useEffect(() => {
    trackFlashcardEvent('flashcard_app_initialized', {
      initialization_mode: preloadCardSet ? 'preload' : 'normal',
      preload_card_set: preloadCardSet || null,
      initial_route: initialRoute,
    });
  }, []); // Only run once on mount

  // Preload the specified card set when component mounts (only for preload mode)
  useEffect(() => {
    if (!preloadCardSet || preloadedRef.current === preloadCardSet) {
      return;
    }

    const preloadCardSetData = async () => {
      try {
        console.log(`FlashcardApp: Preloading card set ${preloadCardSet}`);

        // Load card set metadata
        const response = await fetch('/data/card_set.json');
        if (!response.ok) {
          throw new Error(`Failed to load card sets: ${response.status}`);
        }

        const cardSetsData = await response.json();
        const cardSet = cardSetsData.find(
          (set: any) => set.id === preloadCardSet
        );

        if (!cardSet) {
          throw new Error(`Card set with ID '${preloadCardSet}' not found`);
        }

        console.log(`FlashcardApp: Found card set:`, cardSet);

        // Set the selected card set in context first
        setSelectedCardSet(cardSet);

        // Track card set selection (preload mode)
        trackCardSetSelection(preloadCardSet, {
          selection_type: 'preload',
          card_set_name: cardSet.name || 'Unknown',
          card_count: cardSet.cardCount || 0,
          language: cardSet.language || 'unknown',
        });

        console.log(
          `FlashcardApp: Set selected card set, now loading data from ${cardSet.dataFile}`
        );

        // Load the actual card data
        await loadCardSetData(cardSet.dataFile);

        console.log(`FlashcardApp: Successfully preloaded ${preloadCardSet}`);
        preloadedRef.current = preloadCardSet;
        setIsPreloading(false);

        // Track successful preload
        trackFlashcardEvent('card_set_preload_complete', {
          card_set_id: preloadCardSet,
          preload_success: true,
        });
      } catch (error) {
        console.error(
          `FlashcardApp: Failed to preload card set ${preloadCardSet}:`,
          error
        );

        // Track preload failure
        trackFlashcardEvent('card_set_preload_error', {
          card_set_id: preloadCardSet,
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          preload_success: false,
        });

        setIsPreloading(false);
      }
    };

    preloadCardSetData();
  }, [preloadCardSet, setSelectedCardSet, loadCardSetData]);

  // Safe navigation handler with validation
  const handleNavigation = useCallback(
    (route: AppRoute) => {
      console.log(
        `FlashcardApp: Navigation requested to '${route}' from '${currentRoute}'`
      );

      // Validate route exists in AppRoute type
      const validRoutes: AppRoute[] = [
        'dashboard',
        'review',
        'complete',
        'card-sets',
        'profile',
        'subscription',
        'settings',
      ];
      if (!validRoutes.includes(route)) {
        console.error(
          `FlashcardApp: Invalid route '${route}', staying on current route`
        );
        return;
      }

      // Track navigation change
      trackAppStateChange(currentRoute, route, {
        navigation_type: 'manual',
        timestamp: new Date().toISOString(),
      });

      setCurrentRoute(route);
    },
    [currentRoute]
  );
  // Auto-navigate based on session state
  useEffect(() => {
    console.log('# FlashcardApp navigation check:', {
      savingProgress: state.loadingStates?.savingProgress,
      currentSession: state.currentSession,
      isComplete: state.currentSession?.isComplete,
      currentRoute,
    });

    // Don't navigate while batch save is in progress to avoid race conditions
    if (state.loadingStates?.savingProgress) {
      console.log('Save in progress, deferring navigation...');
      return;
    }

    // Only auto-navigate if there's an active session or session just completed
    if (state.currentSession) {
      if (state.currentSession.isComplete) {
        console.log('Session complete, navigating to complete screen');

        // Track automatic navigation to completion
        trackAppStateChange(currentRoute, 'complete', {
          navigation_type: 'automatic',
          trigger: 'session_complete',
          session_cards_total: state.currentSession.totalCards,
          session_reviewed_cards: state.currentSession.reviewedCards,
        });

        setCurrentRoute('complete'); // Direct call to avoid double tracking
      } else {
        console.log('Session active, navigating to review screen');

        // Track automatic navigation to review
        trackAppStateChange(currentRoute, 'review', {
          navigation_type: 'automatic',
          trigger: 'session_active',
          session_cards_total: state.currentSession.totalCards,
          session_current_index: state.currentSession.currentIndex,
        });

        setCurrentRoute('review'); // Direct call to avoid double tracking
      }
    } else if (currentRoute === 'review' || currentRoute === 'complete') {
      // Only auto-navigate to dashboard if coming from review/complete routes
      // Preserve manual navigation to card-sets route
      console.log('No session, navigating from review/complete to dashboard');

      // Track automatic navigation to dashboard
      trackAppStateChange(currentRoute, 'dashboard', {
        navigation_type: 'automatic',
        trigger: 'no_session',
      });

      setCurrentRoute('dashboard'); // Direct call to avoid double tracking
    }
    // Note: card-sets route is preserved for manual navigation
  }, [
    state.currentSession?.isComplete,
    state.currentSession,
    currentRoute,
    handleNavigation,
    state.loadingStates?.savingProgress, // Add this to dependencies
  ]);

  // Show loading state during preloading
  if (isPreloading && preloadCardSet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">
            Loading {cardSetName || preloadCardSet}...
          </p>
          {cardSetDescription && (
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              {cardSetDescription}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render current screen
  const renderCurrentScreen = () => {
    console.log(`# FlashcardApp: Rendering route '${currentRoute}'`);

    // Track screen view when route changes
    trackFlashcardEvent('screen_view', {
      screen_name: currentRoute,
      has_session: !!state.currentSession,
      session_progress: state.currentSession
        ? {
          current_index: state.currentSession.currentIndex,
          total_cards: state.currentSession.totalCards,
          reviewed_cards: state.currentSession.reviewedCards,
        }
        : null,
    });

    switch (currentRoute) {
      case 'review':
        return <Review onNavigate={handleNavigation} />;
      case 'complete':
        return <Completion onNavigate={handleNavigation} />;
      case 'card-sets':
        return <CardSetSelection onNavigate={handleNavigation} />;
      case 'profile':
        return <Profile onNavigate={handleNavigation} />;
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigation} />;
      case 'subscription':
        return <SubscriptionPage onNavigate={handleNavigation} />;
      default:
        // Defensive handling for invalid routes
        console.warn(
          `FlashcardApp: Unknown route '${currentRoute}', falling back to dashboard`
        );

        // Track fallback to dashboard
        trackFlashcardEvent('route_fallback', {
          invalid_route: currentRoute,
          fallback_route: 'dashboard',
        });

        setCurrentRoute('dashboard');
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  return renderCurrentScreen();
};

// Main app component with context providers
const FlashcardApp: React.FC<FlashcardAppProps> = (props) => {
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);

  return (
    <AuthProvider>
      <FlashcardProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50 flex">
          {/* Main content area */}
          <div className="flex-1">
            <FlashcardAppContent {...props} />
          </div>
          {/* Debug Panel as right sidebar */}
          <DebugPanel
            position="right"
            defaultVisible={false}
            visible={debugPanelVisible}
            onVisibilityChange={setDebugPanelVisible}
          />
          {/* Feedback Bubble - Available on all pages */}
          <FeedbackBubble />
        </div>
      </FlashcardProvider>
    </AuthProvider>
  );
};

export default FlashcardApp;
