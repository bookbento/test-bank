// FlashCard component - displays individual flashcard with flip animation
// Handles card presentation, text formatting, and dynamic sizing

import type { FlashcardData } from '../../types/flashcard';

// Helper function to get dynamic text size based on text length
const getDynamicTextSize = (
  text: string,
  type: 'title' | 'description' = 'title'
): string => {
  const length = text.length;

  if (type === 'title') {
    // For card titles - main text
    if (length <= 5) return 'text-6xl'; // Very short: 爱, 你好
    if (length <= 12) return 'text-5xl'; // Short: 谢谢你, 再见
    if (length <= 19) return 'text-4xl'; // Medium: 你好吗？, 我很好
    if (length <= 35) return 'text-2xl'; // Long: longer phrases
    return 'text-xl'; // Very long text
  } else {
    // For descriptions/subtitles
    if (length <= 10) return 'text-2xl';
    if (length <= 20) return 'text-xl';
    if (length <= 35) return 'text-lg';
    return 'text-base';
  }
};

interface FlashCardProps {
  /** The flashcard data to display */
  card: FlashcardData;
  /** Whether to show the back of the card */
  isShowingBack: boolean;
  /** Whether the card is currently flipping (for animation) */
  isFlipping: boolean;
  /** Function to format text with markdown-like styling */
  formatText: (text: string) => string;
}

/**
 * FlashCard component renders a single flashcard with flip animation
 *
 * Features:
 * - Dynamic text sizing based on content length
 * - Smooth flip animation between front and back
 * - Responsive design with proper text wrapping
 * - Support for icons and formatted descriptions
 *
 * @param card - The flashcard data containing front/back content
 * @param isShowingBack - Controls which side of the card to show
 * @param isFlipping - Triggers flip animation state
 * @param formatText - Function to apply text formatting (markdown-like)
 */
const FlashCard: React.FC<FlashCardProps> = ({
  card,
  isShowingBack,
  isFlipping,
  formatText,
}) => {
  // Validate card data to prevent render errors
  if (!card || !card.front || !card.back) {
    console.warn('FlashCard: Invalid card data provided', { card });
    return (
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-white overflow-hidden flex flex-col justify-center items-center text-center p-8 min-h-[300px]">
        <div className="text-red-500 text-xl mb-4">⚠️</div>
        <p className="text-lg font-rounded text-gray-600">
          Card data is missing or invalid
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flashcard-flip ${
        isShowingBack || isFlipping ? 'flipped' : ''
      } mb-8 min-h-[300px]`}
    >
      <div className="flashcard-inner">
        {/* Front of card */}
        <div
          className="flashcard-front bg-white rounded-3xl shadow-2xl 
          border-4 border-white overflow-hidden flex flex-col 
          justify-center items-center text-center p-8"
        >
          <div className="space-y-4">
            <div
              className={`${getDynamicTextSize(
                card.front.title,
                'title'
              )} font-bold text-gray-800 mb-2 break-words leading-tight`}
            >
              {card.front.title}
            </div>
            <div
              className={`${getDynamicTextSize(
                card.front.description,
                'description'
              )} font-rounded text-primary-600 break-words`}
            >
              {card.front.description}
            </div>
            {card.front.icon && (
              <div className="text-4xl mt-4">{card.front.icon}</div>
            )}
          </div>
        </div>

        {/* Back of card */}
        <div
          className="flashcard-back bg-white rounded-3xl px-3
          shadow-2xl border-4 border-white overflow-hidden 
          flex flex-col justify-center items-center text-center"
        >
          <div
            className={`flex flex-col items-center gap-0 ${isShowingBack ? '' : 'hidden'}`}
          >
            <div className="text-4xl">{card.back.icon}</div>
            <div
              className={`${getDynamicTextSize(
                card.back.title,
                'title'
              )} font-bold font-child text-success-600 mb-2 break-words leading-tight`}
            >
              {card.back.title}
            </div>
            <div
              className="text-lg font-rounded text-gray-600"
              dangerouslySetInnerHTML={{
                __html: formatText(card.back.description),
              }}
            />

            {/* Show original on back too */}
            <div className="text-xs mt-6 pt-4 border-t border-gray-200">
              <div className="font-rounded text-gray-500 mb-1">Original:</div>
              <div className="text-gray-700 break-words text-sm">
                {card.front.title}
                &nbsp; ({card.front.description})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashCard;
