// Dashboard component - main landing screen with statistics and start review button
// Shows progress stats and provides navigation to begin reviewing flashcards

import * as React from 'react';
import { useFlashcard } from '../../contexts/FlashcardContext';
import LoginButton from '../auth/LoginButton';
import EmojiText from '../EmojiSVG';
import { faShareFromSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile';

interface DashboardProps {
  onNavigate: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    state,
    startReviewSession,
    resetProgress,
    clearError,
    getReviewSessionSize,
  } = useFlashcard();

  const handleStartReview = () => {
    console.log('Dashboard: Start Review button clicked', {
      dueCards: state.stats.dueCards,
      isLoading: state.isLoading,
    });
    if (state.stats.dueCards > 0 && !state.isLoading) {
      startReviewSession();
      onNavigate('review');
    }
  };

  const handleResetProgress = async () => {
    console.log('Dashboard: Reset Progress button clicked');
    try {
      await resetProgress();
    } catch (error) {
      console.error('Failed to reset progress:', error);
      // You could add user-facing error handling here if needed
    }
  };

  // Show loading state while cards are loading
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">
            Loading flashcards...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Main content - now full width */}
      <div className="w-full flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-lg">
          {/* Enhanced Error Display with specific error handling */}
          {state.error && (
            <div className="mb-2 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">
                  {/* Show different icons based on error type */}
                  {state.error.code.includes('CARD_SET')
                    ? '📚'
                    : state.error.code.includes('NETWORK')
                      ? '🌐'
                      : state.error.code.includes('FIRESTORE')
                        ? '☁️'
                        : '⚠️'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">
                    {state.error.message}
                  </p>
                  {/* Show additional context for development/debugging */}
                  {state.error.context?.cardSetId && (
                    <p className="text-xs text-red-600 mt-1">
                      Card Set: {state.error.context.cardSetId}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                {/* Dismiss button */}
                <button
                  onClick={() => clearError()}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>

                {/* Retry button for retryable errors */}
                {state.error.retryable && state.selectedCardSet?.dataFile && (
                  <button
                    onClick={() => {
                      clearError();
                      // Retry loading the current card set
                      if (state.selectedCardSet?.dataFile) {
                        console.log('Dashboard: Retrying card set load');
                        // The loadCardSetData function will be triggered by the useEffect
                        // when selectedCardSet changes or when manually called
                      }
                    }}
                    className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded transition-colors duration-200"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Back Button - Absolutely positioned at top left of card */}
          <button
            onClick={() => {
              console.log('Dashboard: All Sets button clicked');
              onNavigate('card-sets');
            }}
            className="absolute -top-10 left-5 flex py-1 px-0 items-center text-sm font-rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            style={{ zIndex: 20 }}
          >
            <span>← Back</span>
          </button>

          {/* Share Button - Top Right (remains in card, but not in flex row with Back) */}
          <div className="absolute top-5 right-5">
            <button
              onClick={(event) => {
                const cardSetName = state.selectedCardSet?.name || 'Flashcards';
                const cardSetId = state.selectedCardSet?.id;

                // Build the shareable URL with card set path
                let shareUrl = window.location.origin;
                if (cardSetId) {
                  shareUrl += `/${cardSetId}`;
                } else {
                  // Fallback to current URL if no card set ID
                  shareUrl = window.location.href;
                }

                // Check if it's a desktop/laptop (screen width > 768px or no touch support)
                const isDesktop =
                  window.innerWidth > 768 || !('ontouchstart' in window);

                if (navigator.share && !isDesktop) {
                  // Use native share API only on mobile/tablet
                  navigator
                    .share({
                      title: `${cardSetName} - Smart Flashcards`,
                      text: `Check out this flashcard set: ${cardSetName}`,
                      url: shareUrl,
                    })
                    .catch((error) => {
                      console.log('Error sharing:', error);
                    });
                } else {
                  // Always use clipboard copy on desktop, or as fallback
                  navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => {
                      // Show a temporary notification
                      const button = event.target as HTMLElement;
                      const originalText = button.textContent;
                      button.textContent = '✓ Copied!';
                      setTimeout(() => {
                        button.textContent = originalText;
                      }, 2000);
                    })
                    .catch((error) => {
                      console.log('Error copying to clipboard:', error);
                    });
                }
              }}
              className="flex py-1 px-2 items-center text-sm font-rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              title="Share this card set"
            >
              <FontAwesomeIcon icon={faShareFromSquare} className="w-4 h-4" />
              &nbsp;
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              <EmojiText size={64}>{state.selectedCardSet?.cover || '🇨🇳'}</EmojiText>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {state.selectedCardSet?.name || 'Chinese HSK-1'}
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              {state.selectedCardSet?.description || 'HSK level 1 vocabulary set 1 with English translations'}
            </p>
            <p className="text-gray-400 font-medium">
              {state.stats.totalCards || 10} cards
            </p>
          </div>

          {/* Stats Cards */}
          <div className="w-full bg-white border border-gray-50 rounded-[32px] grid grid-cols-3 py-6 px-2 mb-10 shadow-[0_0_20px_rgba(0,0,0,0.02)]">
            {/* Completed */}
            <div className="text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-4xl font-bold text-green-500 leading-none mb-1">
                {state.stats.masteredCards}
              </div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">Completed</div>
            </div>

            {/* Learning */}
            <div className="text-center">
              <div className="text-2xl mb-1">💪</div>
              <div className="text-4xl font-bold text-orange-400 leading-none mb-1">
                {state.stats.difficultCards}
              </div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">Learning</div>
            </div>

            {/* Updated Today */}
            <div className="text-center">
              <div className="text-2xl mb-1">⭐</div>
              <div className="text-4xl font-bold text-yellow-400 leading-none mb-1">
                {state.stats.reviewsToday}
              </div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase">Updated Today</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            {/* Start Review Button */}
            <button
              onClick={handleStartReview}
              disabled={state.stats.dueCards === 0 || state.isLoading}
              className={`
                w-full py-3 rounded-2xl font-bold font-child text-3xl 
                transform transition-all duration-200
                ${state.stats.dueCards > 0 && !state.isLoading
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:scale-[102%] hover:shadow-2xl hover:shadow-primary-500/30 active:scale-95 active:shadow-lg active:shadow-primary-500/20'
                  : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                }
              `}
            >
              {state.isLoading ? (
                <div className="flex items-center justify-center">
                  <span>Loading cards...</span>
                </div>
              ) : state.stats.dueCards > 0 ? (
                <div className="flex items-center justify-center">
                  <span>Start Review</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span>🎉 Done! See you tomorrow</span>
                </div>
              )}
            </button>

            <div className="flex flex-col">
              {!state.isLoading && state.stats.dueCards > 0 ? (
                <div className="w-full text-center text-md text-primary-900"></div>
              ) : null}

              {/* Reset Progress Button */}
              <button
                onClick={handleResetProgress}
                disabled={state.loadingStates.savingProgress}
                className={`
                w-full font-rounded text-xs transition-colors duration-200
                py-2
                ${state.loadingStates.savingProgress
                    ? 'bg-transparent text-gray-300 cursor-not-allowed'
                    : 'bg-transparent text-gray-400 hover:text-gray-500'
                  }
              `}
              >
                {state.loadingStates.savingProgress ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-300 mr-1"></div>
                    Resetting...
                  </span>
                ) : (
                  'Reset progress'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Login Section */}
        <div className="mt-4">
          <LoginButton onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;