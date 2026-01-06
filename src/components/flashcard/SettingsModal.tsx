import React from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardsPerSession: number;
    setCardsPerSession: (value: number) => void;
    darkMode: boolean;
    setDarkMode: (value: boolean) => void;
    accessibility: {
        voice: boolean;
        translation: boolean;
        pronunciation: boolean;
        example: boolean;
    };
    setAccessibility: (key: keyof SettingsModalProps['accessibility']) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    cardsPerSession,
    setCardsPerSession,
    darkMode,
    setDarkMode,
    accessibility,
    setAccessibility,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-lg font-medium font-child mb-4">Review</h2>

                {/* Cards per session */}
                <div className="flex gap-2 mb-3">
                    {[10, 20, 30].map((num) => (
                        <button
                            key={num}
                            onClick={() => setCardsPerSession(num)}
                            className={`px-4 py-2 rounded-full text-sm font-rounded transition
                ${cardsPerSession === num
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {num} Cards
                        </button>
                    ))}
                </div>

                <p className="text-xs font-light text-gray-500 mb-6">
                    Choose how many cards to review in each session. Current: {cardsPerSession}
                </p>

                <div className="flex items-center justify-between py-3 border-t">
                    <span className="font-rounded font-light text-sm">Theme</span>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-10 h-6 rounded-full flex items-center px-1 transition ${darkMode ? 'bg-yellow-400' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`w-4 h-4 bg-white rounded-full transition ${darkMode ? 'translate-x-4' : ''
                                }`}
                        />
                    </button>
                </div>

                <h3 className="text-lg font-medium font-child mb-4">Accessibility</h3>
                {[
                    ['voice', 'Voice over'],
                    ['translation', 'Translation options'],
                    ['pronunciation', 'Pronunciation'],
                    ['example', 'Example sentence '],
                ].map(([key, label]) => (
                    <div
                        key={key}
                        className="flex items-center justify-between py-2"
                    >
                        <span className="text-sm font-light font-rounded">{label}</span>
                        <button
                            onClick={() =>
                                setAccessibility(key as keyof typeof accessibility)
                            }
                            className={`w-10 h-6 rounded-full flex items-center px-1 transition ${accessibility[key as keyof typeof accessibility]
                                    ? 'bg-blue-500'
                                    : 'bg-gray-300'
                                }`}
                        >
                            <span
                                className={`w-4 h-4 bg-white rounded-full transition ${accessibility[key as keyof typeof accessibility]
                                        ? 'translate-x-4'
                                        : ''
                                    }`}
                            />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SettingsModal;
