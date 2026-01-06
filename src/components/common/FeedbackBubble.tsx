import * as React from 'react';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const FEEDBACK_URL = 'https://forms.gle/ycHYdyPvmHRfsqdHA';

const FeedbackBubble: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleFeedbackClick = () => {
    // Open feedback form in new tab
    window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Feedback Bubble */}
      <div className="relative group">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 w-5 h-5 bg-gray-400 hover:bg-gray-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          title="Hide feedback"
        >
          <FontAwesomeIcon icon={faTimes} className="w-2 h-2" />
        </button>

        {/* Main feedback button */}
        <button
          onClick={handleFeedbackClick}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full px-4 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
          title="Send feedback"
        >
          <span className="text-sm font-rounded font-semibold">Feedback</span>
        </button>

        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
            Open Google form
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackBubble;
