// CardSetCard - Reusable card component for displaying card set information
// Used in both progress section and category sections

import EmojiText from '../EmojiSVG';
import type { CardSet } from '../../types/flashcard';

interface CardSetCardProps {
    cardSet: CardSet;
    progress?: number;
    showProgress?: boolean;
    onClick: () => void;
    theme?: 'light' | 'dark';
}

const CardSetCard: React.FC<CardSetCardProps> = ({
    cardSet,
    progress = 0,
    showProgress = false,
    onClick,
    theme = 'light',
}) => {

    const bgColorClass =
        theme === 'light'
            ? 'bg-white text-gray-700'
            : 'bg-[#E3F2FD] text-gray-700';

    const emojiSize = theme === 'dark' ? 40 : 40;

    return (
        <div
            onClick={onClick}
            className={`${bgColorClass} backdrop-blur-md px-4 py-4 sm:px-4 sm:py-4 rounded-2xl sm:rounded-3xl shadow-md hover:shadow-xl hover:scale-[102%] transition-all duration-200 cursor-pointer`}

        >

            {/* Card Set Header */}
            <div className="flex items-center">
                <div className="text-2xl sm:text-3xl mr-3">
                    <EmojiText size={emojiSize}>{cardSet.cover}</EmojiText>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-medium font-child mb-1 truncate">
                        {cardSet.name}
                    </h3>

                    {!showProgress && (
                        <p
                            className="text-xs sm:text-sm font-rounded h-10"
                            style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: '1.25rem',
                            }}
                        >
                            {cardSet.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {showProgress && (
                <div className="mb-3">
                    <div className="flex justify-end text-xs font-rounded mb-1">
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2.5">
                        <div
                            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Card Count & Status */}
            <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-rounded pt-3">
                    {cardSet.cardCount} cards left
                </span>

                {showProgress && (
                    <>
                        {progress === 100 ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-rounded rounded-full">
                                ✓ Complete
                            </span>
                        ) : progress > 0 ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-s font-rounded rounded-full">
                                Continue →
                            </span>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
};

export default CardSetCard;
