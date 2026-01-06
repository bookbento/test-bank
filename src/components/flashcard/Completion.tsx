// Completion component - shown when review session is finished
// Displays session results and provides options to continue or return to dashboard

import { useEffect, useRef } from 'react';
import { useFlashcard } from '../../contexts/FlashcardContext';

type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile';

interface CompletionProps {
  onNavigate: (route: AppRoute) => void;
}

const Completion: React.FC<CompletionProps> = ({ onNavigate }) => {
  const {
    state,
    resetSession,
    startReviewSession,
    updateCurrentCardSetProgress,
  } = useFlashcard();
  const progressUpdatedRef = useRef(false);

  // Update card set progress when session completes (only once)
  useEffect(() => {
    const updateProgress = async () => {
      if (
        state.currentSession?.isComplete &&
        !state.isGuest &&
        !progressUpdatedRef.current
      ) {
        console.log(
          'Completion: Updating card set progress after session completion'
        );
        progressUpdatedRef.current = true;
        try {
          await updateCurrentCardSetProgress();
        } catch (error) {
          console.error('Completion: Failed to update progress:', error);
        }
      }
    };

    updateProgress();
  }, [state.currentSession?.isComplete, state.isGuest]);

  // Show loading while we wait for session state to stabilize OR batch save to complete
  if (!state.currentSession || state.loadingStates?.savingProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-yellow-300 border-r-green-200 border-b-blue-300 mx-auto mb-4 opacity-70"></div>
          <p className="text-lg font-rounded text-yellow-900/60">
            {state.loadingStates?.savingProgress
              ? 'Saving your progress...'
              : 'Loading results...'}
          </p>
        </div>
      </div>
    );
  }

  // Redirect if no completed session
  if (!state.currentSession.isComplete) {
    console.log('Session not complete, redirecting to dashboard');
    onNavigate('dashboard');
    return null;
  }

  const { currentSession } = state;

  // Calculate accuracy based on Easy responses vs total unique cards reviewed
  const accuracy =
    currentSession.reviewedCards > 0
      ? Math.round(
        (currentSession.easyCount / currentSession.reviewedCards) * 100
      )
      : 0;

  const handleReturnToDashboard = () => {
    progressUpdatedRef.current = false; // Reset for next session
    resetSession();
    onNavigate('card-sets');
  };

  const handleReviewAgain = () => {
    if (state.stats.dueCards > 0) {
      progressUpdatedRef.current = false; // Reset for next session
      resetSession();
      startReviewSession();
      onNavigate('review');
    } else {
      handleReturnToDashboard();
    }
  };

  // Determine celebration message based on performance
  const getCelebrationMessage = () => {
    if (accuracy >= 90) {
      return {
        emoji: '🌟',
        message: 'Outstanding!',
        subtext: "You're a vocabulary superstar!",
      };
    } else if (accuracy >= 75) {
      return {
        emoji: '🎉',
        message: 'Great job!',
        subtext: "You're making excellent progress!",
      };
    } else if (accuracy >= 50) {
      return {
        emoji: '👍',
        message: 'Good work!',
        subtext: "Keep practicing and you'll improve!",
      };
    } else {
      return {
        emoji: '💪',
        message: 'Keep trying!',
        subtext: 'Every practice session makes you stronger!',
      };
    }
  };

  const celebration = getCelebrationMessage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
      <div className="max-w-md w-full">
        {/* Celebration header */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-4 animate-bounce-slow">
            {celebration.emoji}
          </div>
          <h1 className="text-4xl font-bold font-child text-primary-600 mb-2">
            {celebration.message}
          </h1>
          <p className="text-lg font-rounded text-gray-600">
            {celebration.subtext}
          </p>
        </div>

        {/* Results card - Redesigned to match provided image */}
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-white p-8 mb-8 flex flex-col items-center">
          {/* Main stats row */}
          <div className="w-full grid grid-cols-2 gap-4 mb-2">
            <div className="text-center">
              <div className="text-4xl font-bold font-child text-sky-600">{currentSession.reviewedCards}</div>
              <div className="text-base font-rounded text-gray-500 mt-1">Card</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold font-child text-green-600">{accuracy} <span className="text-4xl">%</span></div>
              <div className="text-base font-rounded text-gray-500 mt-1">Accuracy</div>
            </div>
          </div>
          {/* Divider */}
          <hr className="w-full border-gray-200 my-2" />
          {/* Sub stats row */}
          <div className="w-full grid grid-cols-3 gap-4 mb-2">
            <div className="text-center">
              <div className="text-3xl font-bold font-child text-rose-400">{currentSession.againCount ?? 0}</div>
              <div className="text-base font-rounded text-gray-500 mt-1">Skip</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-child text-orange-400">{currentSession.hardCount}</div>
              <div className="text-base font-rounded text-gray-500 mt-1">Hard</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-child text-green-500">{currentSession.easyCount}</div>
              <div className="text-base font-rounded text-gray-500 mt-1">Confident</div>
            </div>
          </div>
          {/* Divider */}
          <hr className="w-full border-gray-200 my-2" />
          {/* Time used */}
          <div className="w-full text-center mt-2 mb-1">
            <span className="text-base font-rounded text-gray-500">Time used <span className="font-bold text-gray-700">{Math.round((Date.now() - currentSession.startTime.getTime()) / 1000 / 60)} minutes</span></span>
          </div>
        </div>

        {/* Action buttons - match provided image */}
        <div className="flex flex-col items-center gap-6">
          {/* Continue/Review again button */}
          {state.stats.dueCards > 0 ? (
            <button
              onClick={handleReviewAgain}
              className="w-full py-4 px-6 bg-sky-600 text-white rounded-2xl font-bold font-child text-xl shadow-lg hover:bg-sky-700 transform hover:scale-[1.03] active:scale-95 transition-all duration-200 flex items-center justify-center"
            >
              <span className="mr-2 text-2xl">→</span> Continue ({state.stats.dueCards} left)
            </button>
          ) : null}

          {/* Return to main menu */}
          <button
            onClick={handleReturnToDashboard}
            className="mt-2 text-gray-700 font-rounded text-lg flex items-center justify-center gap-2 hover:text-black transition-colors duration-200 bg-transparent"
          >
            <span className="text-xl">←</span> Main menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default Completion;