// SimpleFlashCardApp - Basic app to test FlashCard component
// Just shows one card with flip functionality

import { useState, useEffect } from 'react';
import FlashCard from './FlashCard';
import { formatText } from '../../utils/textFormatting';
import type { FlashcardData } from '../../types/flashcard';

interface SimpleFlashCardAppProps {
  testCard: FlashcardData;
}

/**
 * Simple app that just displays a FlashCard component for testing
 * Perfect for testing responsive behavior on different screen sizes
 */
const SimpleFlashCardApp: React.FC<SimpleFlashCardAppProps> = ({ testCard }) => {
  const [isShowingBack, setIsShowingBack] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [screenWidth, setScreenWidth] = useState<number | null>(null);

  // Update screen width on mount and resize
  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };

    // Set initial value
    updateScreenWidth();

    // Listen for resize events
    window.addEventListener('resize', updateScreenWidth);
    
    return () => {
      window.removeEventListener('resize', updateScreenWidth);
    };
  }, []);

  const handleFlip = () => {
    setIsFlipping(true);
    setIsShowingBack(!isShowingBack);
    
    // Reset flip animation
    setTimeout(() => {
      setIsFlipping(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple header */}
      <header className="bg-white shadow-sm border-b p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">FlashCard Test</h1>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </a>
        </div>
      </header>

      {/* Main content - centered FlashCard */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          
          {/* The actual FlashCard component we're testing */}
          <FlashCard
            card={testCard}
            isShowingBack={isShowingBack}
            isFlipping={isFlipping}
            formatText={formatText}
          />

          {/* Simple flip button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleFlip}
              className="py-3 px-6 bg-blue-500 text-white rounded-lg text-lg font-medium
                         hover:bg-blue-600 transform hover:scale-105 active:scale-95 
                         transition-all duration-200 shadow-lg"
            >
              {isShowingBack ? 'Show Front' : 'Show Back'}
            </button>
          </div>

          {/* Debug info - only show after hydration */}
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500 bg-gray-100 rounded p-2 inline-block">
              Side: {isShowingBack ? 'Back' : 'Front'} | 
              Screen: {screenWidth ? `${screenWidth}px` : 'Loading...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleFlashCardApp;