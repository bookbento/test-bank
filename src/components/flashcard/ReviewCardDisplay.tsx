// ReviewCardDisplay - Standalone component for displaying a single flashcard
// Used by the review page to show cards outside of the main app context

import React, { useState, useEffect } from 'react';
import type { FlashcardData } from '../../types/flashcard';

// Helper function to convert markdown formatting to HTML tags
const formatText = (text: string): string => {
  return (
    text
      // Bold: **text** or __text__ -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_ -> <em>text</em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
  );
};

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

interface ReviewCardDisplayProps {
  cardData: FlashcardData;
  showBack?: boolean;
  editMode?: boolean;
  theme?: string;
}

const ReviewCardDisplay: React.FC<ReviewCardDisplayProps> = ({
  cardData,
  showBack = false,
  editMode = false,
  theme = 'default',
}) => {
  const [isFlipped, setIsFlipped] = useState(showBack);
  const [customClasses, setCustomClasses] = useState('');

  // Update flip state when showBack prop changes
  useEffect(() => {
    setIsFlipped(showBack);
  }, [showBack]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const side = isFlipped ? cardData.back : cardData.front;
  const titleSize = getDynamicTextSize(side.title, 'title');
  const descriptionSize = getDynamicTextSize(side.description, 'description');

  // Theme-based styling
  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-800 text-white border-gray-700';
      case 'colorful':
        return 'bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 text-white';
      case 'minimal':
        return 'bg-gray-50 text-gray-900 border-gray-200';
      default:
        return 'bg-white text-gray-900 border-gray-300';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div
        data-card-container
        className={`
          relative w-full h-96 cursor-pointer transition-all duration-300 transform
          ${isFlipped ? 'scale-105' : 'hover:scale-105'}
          ${customClasses}
        `}
        onClick={handleFlip}
      >
        {/* Card */}
        <div
          className={`
          w-full h-full rounded-2xl shadow-2xl border-2 p-8
          flex flex-col items-center justify-center text-center
          transition-all duration-300
          ${getThemeClasses()}
          ${isFlipped ? 'transform rotateY-180' : ''}
        `}
        >
          {/* Icon */}
          {side.icon && <div className="text-4xl mb-4">{side.icon}</div>}

          {/* Main Title */}
          <h1
            className={`font-bold mb-4 leading-tight ${titleSize}`}
            dangerouslySetInnerHTML={{
              __html: formatText(side.title),
            }}
          />

          {/* Description */}
          {side.description && (
            <p
              className={`text-gray-600 font-rounded leading-relaxed ${descriptionSize} ${
                theme === 'dark'
                  ? 'text-gray-300'
                  : theme === 'colorful'
                    ? 'text-gray-100'
                    : 'text-gray-600'
              }`}
              dangerouslySetInnerHTML={{
                __html: formatText(side.description),
              }}
            />
          )}

          {/* Side indicator */}
          <div
            className={`
            absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium
            ${
              isFlipped
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }
            ${theme === 'dark' ? 'bg-opacity-20 text-white' : ''}
          `}
          >
            {isFlipped ? 'Back' : 'Front'}
          </div>

          {/* Edit mode indicator */}
          {editMode && (
            <div className="absolute top-4 left-4 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
              Edit Mode
            </div>
          )}
        </div>
      </div>

      {/* Card Controls */}
      <div className="mt-6 flex justify-center space-x-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFlipped(false);
          }}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${
              !isFlipped
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
        >
          Show Front
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFlipped(true);
          }}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${
              isFlipped
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
        >
          Show Back
        </button>

        <button
          onClick={handleFlip}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
        >
          Flip Card
        </button>
      </div>

      {/* Development Tools */}
      {editMode && (
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold mb-4">Live Tailwind Editor</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Custom Classes:
              </label>
              <input
                type="text"
                value={customClasses}
                onChange={(e) => setCustomClasses(e.target.value)}
                placeholder="e.g., rotate-12 scale-110 bg-gradient-to-r from-blue-400 to-purple-500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCustomClasses('rotate-12 scale-110')}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
              >
                Tilted + Scaled
              </button>
              <button
                onClick={() =>
                  setCustomClasses(
                    'bg-gradient-to-r from-purple-400 to-pink-400'
                  )
                }
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
              >
                Gradient
              </button>
              <button
                onClick={() =>
                  setCustomClasses('shadow-2xl ring-4 ring-blue-200')
                }
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                Enhanced Shadow
              </button>
              <button
                onClick={() => setCustomClasses('')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                Clear
              </button>
            </div>

            <div className="text-xs text-gray-600">
              <strong>Quick Tips:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  <code>rotate-3, rotate-6, rotate-12</code> - Rotate the card
                </li>
                <li>
                  <code>scale-105, scale-110, scale-125</code> - Scale the card
                </li>
                <li>
                  <code>bg-gradient-to-r from-blue-400 to-purple-500</code> -
                  Gradient backgrounds
                </li>
                <li>
                  <code>shadow-xl, shadow-2xl</code> - Enhanced shadows
                </li>
                <li>
                  <code>ring-4 ring-blue-200</code> - Colored rings
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Card Data Preview (Development) */}
      {editMode && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
            View Card Data (JSON)
          </summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(cardData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ReviewCardDisplay;
