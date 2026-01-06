// CardSetSelection component - displays available card sets for user selection
// Shows list of card sets with progress, descriptions, and navigation

import { useState } from 'react';
import EmojiText from '../EmojiSVG';
import CardSetCard from './CardSetCard';
import LoadingState from './LoadingState';
import SettingsModal from './SettingsModal';
import { useFlashcard } from '../../contexts/FlashcardContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCardSets } from '../../hooks/useCardSets';
import { useCardSetProgress } from '../../hooks/useCardSetProgress';
import {
  mergeCardSetsWithProgress,
  groupCardSetsByCategory,
  type CardSetWithProgress,
} from '../../utils/cardSetHelpers';

// Navigation type to match existing patterns
type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile' | 'settings' | 'subscription';

interface CardSetSelectionProps {
  onNavigate: (route: AppRoute) => void;
}

const CardSetSelection: React.FC<CardSetSelectionProps> = ({ onNavigate }) => {
  // Access FlashcardContext to set the current card set
  const { setSelectedCardSet } = useFlashcard();

  // Access AuthContext for auth state
  const { state: authState } = useAuth();

  // Load card sets and progress data using custom hooks
  const { cardSets, isLoading: isLoadingCardSets } = useCardSets();
  const { progressData } = useCardSetProgress();

  // State for scroll shadow effect
  const [isScrolled, setIsScrolled] = useState(false);
  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardsPerSession, setCardsPerSession] = useState<number>(20);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [accessibility, setAccessibilityState] = useState({
    voice: true,
    translation: false,
    pronunciation: false,
    example: true,
  });

  const setAccessibility = (key: keyof typeof accessibility) => {
    setAccessibilityState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Merge card sets with progress data and group by category using utility functions
  const cardSetsWithProgress = mergeCardSetsWithProgress(
    cardSets,
    progressData
  );
  const groupedCardSets = groupCardSetsByCategory(cardSetsWithProgress);

  // Handle scroll event to show/hide shadow
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setIsScrolled(target.scrollTop > 0);
  };

  // Handle card set selection
  const handleCardSetSelect = async (
    cardSetWithProgress: CardSetWithProgress
  ) => {
    console.log('CardSetSelection: Card set selected', {
      id: cardSetWithProgress.id,
      name: cardSetWithProgress.name,
      cardCount: cardSetWithProgress.cardCount,
      progress: cardSetWithProgress.progress,
    });

    // Remove the progress property before passing to setSelectedCardSet
    const { progress: _, ...cardSet } = cardSetWithProgress;

    // Set the selected card set in the context
    // The FlashcardContext useEffect will handle loading the card data automatically
    setSelectedCardSet(cardSet);

    console.log(
      `CardSetSelection: Set selected card set to ${cardSet.name} (${cardSet.dataFile})`
    );

    // Navigate to dashboard using client-side routing (no reload)
    // Card data will be loaded by FlashcardContext useEffect
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen from-blue-50">
      <div className="h-screen flex flex-col">
        {/* Navigation Header - Sticky */}
        <div
          className={`sticky top-0 z-10 backdrop-blur-md border-b border-white/20 p-4 pb-2 transition-shadow duration-300 ${isScrolled ? 'shadow-md shadow-black/10' : ''
            }`}
        >
          <div className="max-w-7xl w-full mx-auto">
            <div className="flex items-center justify-between">

              {/* Left (empty for balance / future use) */}
              <div className="w-10" />

              {/* Center title */}
              <h1 className="text-xl sm:text-2xl font-child text-gray-700">
                Card Sets
              </h1>

              {/* Right - Profile button */}
              <div className="flex items-center gap-3">
                {/* Settings */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-gray-600 hover:text-gray-800 transition"
                  title="Settings"
                >
                  <img
                    src="/assets/setting.png"
                    alt="Settings"
                    className="w-5 h-5 transition-transform hover:rotate-180 duration-300"
                  />
                </button>

                {/* ------------------------------------------------------------------------------------------------------ */}
                {/* Profile - Show for authenticated users */}
                {!authState.isGuest && authState.user ? (
                  <button
                    onClick={() => onNavigate('profile')}
                    className="flex items-center gap-2 text-sm font-rounded font-semibold text-green-800 hover:text-green-600 transition-colors"
                  >
                    {authState.user.photoURL ? (
                      <img
                        src={authState.user.photoURL}
                        alt="Profile"
                        className="w-8 h-8 rounded-full border border-green-300"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs">
                        👤
                      </span>
                    )}
                    <span className="hidden sm:inline">
                      {authState.user.displayName || authState.user.email}
                    </span>
                  </button>
                ) : null}

                {/* ------------------------------------------------------------------------------------------------------ */}
                {/* Subscription */}
                <button
                  onClick={() => onNavigate('subscription')}
                  className="px-3 py-1.5 text-xs sm:text-sm font-rounded font-thin
                             bg-[#F59E0B] text-white rounded-full
                             hover:bg-gray-800 transition-all duration-200
                             flex items-center gap-1.5"
                >
                  <img
                    src="/assets/plus.png"
                    alt="Plus"
                    className="w-4 h-4"
                  />
                  Upgrade Plus
                </button>


              </div>
            </div>
          </div>
        </div>



        {/* Card Sets List - Scrollable */}
        <div className="flex-1 overflow-auto" onScroll={handleScroll}>
          <div className="max-w-7xl w-full mx-auto p-4 pt-6">
            {/* Your Progress Section - Only show for authenticated users with progress */}
            {!authState.isGuest &&
              cardSetsWithProgress.some(
                (cardSet: CardSetWithProgress) => cardSet.progress > 0
              ) && (
                <div className="mb-8">
                  {/* Progress Section Header */}
                  <div className="flex items-center p-1 mb-3">
                    <div className="text-2xl mr-3">
                    </div>
                    <div className="flex- mr-5">
                      <h1 className="text-2xl font-semibold sm:text-[1.65rem] font-child text-[#374151]">
                        Your Progress
                      </h1>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 font-normal text-blue-700 text-xs font-rounded rounded-full">
                      {
                        cardSetsWithProgress.filter(
                          (cardSet: CardSetWithProgress) => cardSet.progress > 0
                        ).length
                      }
                      {cardSetsWithProgress.filter(
                        (cardSet: CardSetWithProgress) => cardSet.progress > 0
                      ).length === 1
                        ? ' set'
                        : ' sets'}
                    </span>
                  </div>

                  {/* Progress Cards Grid */}
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                    {cardSetsWithProgress
                      .filter(
                        (cardSet: CardSetWithProgress) => cardSet.progress > 0
                      )
                      .map((cardSet: CardSetWithProgress) => (
                        <CardSetCard
                          key={`progress-${cardSet.id}`}
                          cardSet={cardSet}
                          progress={cardSet.progress}
                          showProgress={true}
                          onClick={() => handleCardSetSelect(cardSet)}
                          theme="dark"
                        />
                      ))}
                  </div>
                </div>
              )}

            {/* Display card sets grouped by category */}
            {Object.entries(groupedCardSets).map(
              ([category, cardSetsInCategory]) => (
                <div key={category} className="mb-8">
                  {/* Category Header */}
                  <div className="flex items-center p-4 rounded-2xl">
                    <h2 className="text-lg font-medium sm:text-xl font-child text-gray-700">
                      {category}
                    </h2>
                    <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-rounded rounded-full">
                      {cardSetsInCategory.length}{' '}
                      {cardSetsInCategory.length === 1 ? 'set' : 'sets'}
                    </span>
                  </div>

                  {/* Card Sets Grid - Always show */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-10">
                    {cardSetsInCategory.map((cardSet) => (
                      <CardSetCard
                        key={cardSet.id}
                        cardSet={cardSet}

                        // progress={cardSet.progress}
                        // showProgress={
                        //   !authState.isGuest && cardSet.progress > 0
                        // }

                        onClick={() => handleCardSetSelect(cardSet)}
                      />
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Loading state */}
            {isLoadingCardSets && (
              <LoadingState
                message="Loading Card Sets..."
                description="Please wait while we load your flashcards"
              />
            )}

            {/* Empty state message if no card sets - only show when not loading */}
            {!isLoadingCardSets && cardSets.length === 0 && (
              <div className="text-center py-12">
                <EmojiText size={64}>📚</EmojiText>
                <h2 className="text-xl font-child text-gray-600 mt-4 mb-2">
                  No Card Sets Available
                </h2>
                <p className="text-sm font-rounded text-gray-500">
                  Check back later for new content!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal (opens from the ⚙️ button) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        cardsPerSession={cardsPerSession}
        setCardsPerSession={setCardsPerSession}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        accessibility={accessibility}
        setAccessibility={setAccessibility}
      />

    </div>
  );
};

export default CardSetSelection;
