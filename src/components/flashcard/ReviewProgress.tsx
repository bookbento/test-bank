// ReviewProgress component - displays progress bar and session statistics
// Handles progress calculations and visual states independently

import type { ReviewSession } from '../../types/flashcard';

interface ReviewProgressProps {
  /** Current review session data */
  session: ReviewSession;
}

/**
 * ReviewProgress component displays the current review session progress
 *
 * Features:
 * - Visual progress bar with percentage completion
 * - Session statistics (reviewed, easy, hard counts)
 * - Responsive layout optimized for mobile
 * - Real-time updates as user progresses through cards
 *
 * @param session - The current review session containing progress data
 */
const ReviewProgress: React.FC<ReviewProgressProps> = ({ session }) => {
  // Validate session data to prevent calculation errors
  if (!session) {
    console.warn('ReviewProgress: No session data provided');
    return null;
  }

  // Calculate progress percentage safely
  const progress =
    session.totalCards > 0
      ? (session.reviewedCards / session.totalCards) * 100
      : 0;

  // Ensure progress doesn't exceed 100% due to floating point errors
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="p-4 bg-white shadow-sm">
      <div className="max-w-md mx-auto">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm font-rounded text-gray-700 mb-1">
            <span>Progress</span>
            <span>
              {session.reviewedCards} / {session.totalCards} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${safeProgress}%` }}
              role="progressbar"
              aria-valuenow={safeProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress: ${Math.round(safeProgress)}% complete`}
            />
          </div>
        </div>

        {/* Session statistics */}
        <div className="flex justify-between text-sm font-rounded text-gray-700">
          <span>Reviewed: {session.reviewedCards}</span>

          {/* <span>
            Easy: {session.easyCount} | Hard: {session.hardCount}
          </span> */}

        </div>
      </div>
    </div>
  );
};

export default ReviewProgress;
