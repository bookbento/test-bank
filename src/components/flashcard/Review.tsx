// Review component - main flashcard review interface
// Handles showing cards, flipping to back, and rating responses

import { useEffect, useState } from 'react';
import { useFlashcard } from '../../contexts/FlashcardContext';
import { QUALITY_RATINGS } from '../../utils/sm2';
import { formatText } from '../../utils/textFormatting';
import FlashCard from './FlashCard';
import ReviewProgress from './ReviewProgress';
import LoadingSpinner from '../ui/LoadingSpinner';

type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile';

interface ReviewProps {
  onNavigate: (route: AppRoute) => void;
}

const Review: React.FC<ReviewProps> = ({ onNavigate }) => {
  const {
    state,
    showCardBack,
    rateCard,
    knowCard,
    resetSession,
    updateCurrentCardSetProgress,
  } = useFlashcard();
  const [isFlipping, setIsFlipping] = useState(false);

  // All hooks must be called before any conditional returns
  // Reset flip animation when card changes
  useEffect(() => {
    if (state.currentCard?.id) {
      setIsFlipping(false);
    }
  }, [state.currentCard?.id]);

  // Handle navigation based on session state (fix for setState during render)
  useEffect(() => {
    // If no session exists, redirect to dashboard
    if (!state.currentSession) {
      console.log('Review: No session found, redirecting to dashboard');
      onNavigate('dashboard');
      return;
    }

    // If session is complete, redirect to complete screen
    if (state.currentSession.isComplete) {
      console.log(
        'Review: Session is complete, redirecting to complete screen'
      );
      onNavigate('complete');
      return;
    }
  }, [state.currentSession, state.currentSession?.isComplete, onNavigate]);

  // Handle "I Know" button
  const handleKnowCard = () => {
    knowCard();
    setIsFlipping(false); // Reset flip state for next card
  };

  // Handle back to dashboard - reset session first and update progress
  const handleBackToDashboard = async () => {
    // Update progress before leaving review
    if (!state.isGuest && state.currentSession) {
      console.log(
        'Review: Updating card set progress before returning to dashboard'
      );
      try {
        await updateCurrentCardSetProgress();
      } catch (error) {
        console.error('Review: Failed to update progress:', error);
      }
    }

    resetSession();
    onNavigate('dashboard');
  };

  // Handle card flip animation
  const handleShowCard = () => {
    setIsFlipping(true);
    // Add a slight delay before showing the back to make the flip visible
    setTimeout(() => {
      showCardBack();
    }, 300); // Half of the animation duration
  };

  // Handle rating selection
  const handleRating = (quality: number) => {
    rateCard(quality);
    setIsFlipping(false);
    state.isShowingBack = false;
    setTimeout(() => {
      state.isShowingBack = true;
    }, 300); // Half of the animation duration
  };

  // Show loading or redirect if no session
  console.log('Review component state check:', {
    hasSession: !!state.currentSession,
    hasCard: !!state.currentCard,
    isComplete: state.currentSession?.isComplete,
    savingProgress: state.loadingStates?.savingProgress,
  });

  // Early returns for invalid states (navigation handled by useEffect above)
  if (!state.currentSession) {
    return null; // Navigation handled by useEffect
  }

  if (state.currentSession.isComplete) {
    return null; // Navigation handled by useEffect
  }

  // If no current card, show loading (this is normal during card transitions)
  if (!state.currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner
          size="large"
          message="Preparing next card..."
          type="primary"
        />
      </div>
    );
  }

  // Validate card-to-cardset consistency
  // Ensure current card belongs to the session cards (which should match current card set)
  const isCardValid = state.currentSession.cards.some(
    (sessionCard) => sessionCard.id === state.currentCard?.id
  );

  if (!isCardValid) {
    console.warn(
      "Review: Card validation failed - current card doesn't belong to session cards",
      {
        currentCardId: state.currentCard.id,
        sessionCardIds: state.currentSession.cards.map((c) => c.id),
        currentCardSet: state.selectedCardSet?.name,
      }
    );

    // Reset session and redirect to dashboard for safety
    // This prevents showing cards from wrong card sets
    resetSession();
    onNavigate('dashboard');

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-lg font-rounded text-gray-600 mb-4">
            Card set mismatch detected. Returning to dashboard...
          </p>
          <LoadingSpinner size="medium" type="error" />
        </div>
      </div>
    );
  }

  const { currentSession, currentCard, isShowingBack } = state;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
      {/* Header with progress */}
      <ReviewProgress session={currentSession} />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Flashcard */}
          <FlashCard
            card={currentCard}
            isShowingBack={isShowingBack}
            isFlipping={isFlipping}
            formatText={formatText}
          />

          {/* Action buttons */}
          <div className="space-y-4">
            {!isShowingBack ? (
              // Front side buttons
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleShowCard}
                  className="
                    py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white 
                    rounded-2xl font-medium font-child text-lg shadow-lg
                    hover:from-blue-600 hover:to-blue-700 
                    transform hover:scale-105 active:scale-95 transition-all duration-200
                  "
                >
                  Show Me
                </button>

                <button
                  onClick={handleKnowCard}
                  className="
                    py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white 
                    rounded-2xl font-medium font-child text-lg shadow-lg
                    hover:from-green-600 hover:to-green-700 
                    transform hover:scale-105 active:scale-95 transition-all duration-200
                  "
                >
                  Confident  ✔ 
                </button>
              </div>
            ) : (
              // Back side rating buttons
              <div className="space-y-3">
                <div className="text-center mb-4">
                  {/* <p className="text-lg font-rounded text-gray-600">How did you do?</p> */}
                </div>

                <div className="flex gap-4">
                  {/* Ask Me Again - Red */}
                  <button
                    onClick={() => handleRating(QUALITY_RATINGS.SKIP)}
                    className="
                      w-full py-4 px-6
                      bg-gradient-to-r from-[#1976D2] to-[#1976D2]
                      text-white 
                      rounded-2xl
                      font-bold
                      font-child
                      text-lg
                      shadow-lg                      
                      hover:from-blue-700 hover:to-[#1976D2]
                      transform hover:scale-105 active:scale-95
                      transition-all duration-200
                      flex items-center justify-center space-x-2
                      [text-shadow:2px_2px_10px_rgba(0,0,0,0.4)]
                    "
                  >
                    <span>Skip</span>
                  </button>

                  {/* Hard - Orange */}
                  <button
                    onClick={() => handleRating(QUALITY_RATINGS.HARD)}
                    className="
                      w-full py-4 px-6 
                      bg-gradient-to-r from-red-600 to-red-500
                      text-white
                      rounded-2xl
                      font-bold
                      font-child 
                      text-lg
                      shadow-lg
                      hover:from-[#DE2929] hover:to-[#DE2929]
                      transform hover:scale-105 active:scale-95
                      transition-all duration-200
                      flex items-center justify-center space-x-2
                      [text-shadow:2px_2px_10px_rgba(0,0,0,0.4)]
                    "
                  >
                    <span>Hard</span>
                  </button>

                  {/* Got It - Green */}
                  <button
                    onClick={() => handleRating(QUALITY_RATINGS.GOOD)}
                    className="
                      w-full py-4 px-6 
                      bg-gradient-to-r from-[#2E7D32] to-[#2E7D32]
                      text-white
                      rounded-2xl 
                      font-bold 
                      font-child 
                      text-lg 
                      shadow-lg
                      hover:from-green-600 hover:to-green-600
                      transform hover:scale-105 active:scale-95 
                      transition-all duration-200
                      flex items-center justify-center space-x-2
                      [text-shadow:2px_2px_10px_rgba(0,0,0,0.4)]
                    "
                  >
                    <span>Got It</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Exit button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleBackToDashboard}
              className="
                py-2 px-4 text-gray-500 font-rounded text-sm
                hover:text-gray-700 transition-colors duration-200
              "
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;
