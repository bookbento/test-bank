import type { AppRoute } from '../../types/flashcard';

interface SubscriptionPageProps {
    onNavigate: (route: AppRoute) => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f7efe7] to-[#f2e6db] flex flex-col items-center justify-center pb-20">

            <div className="w-full max-w-md px-4 pt-8 flex items-center relative">
                <button
                    onClick={() => onNavigate('card-sets')}
                    className="absolute left-4 text-blue-500 text-base hover:underline"
                >
                    ← Back
                </button>

                <h1 className="w-full text-center text-4xl font-normal text-black">
                    Subscription
                </h1>
            </div>

            <div className="mt-10 w-[460px] h-[680px] bg-[#1c1c1c] rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.25)] p-7 text-white flex flex-col">
                <h2 className="text-[26px] font-normal mb-3">Plus</h2>

                <div className="flex items-start gap-2">
                    <span className="text-[58px] leading-none font-semibold">
                        259
                    </span>
                    <span className="text-sm text-gray-300 font-light mt-3">
                        THB / month
                    </span>
                </div>

                <p className="text-sm text-gray-300 font-light mt-2 mb-6 tracking-wide">
                    Unlock premium features
                </p>

                <button
                    className="w-full bg-white text-black py-3 rounded-full text-base font-normal
                               hover:bg-gray-200 active:scale-[0.98] transition"
                >
                    Get Plus
                </button>

                <ul className="mt-8 space-y-4 text-sm text-gray-300 font-light">
                    <li className="flex items-center gap-3">
                        <span className="mt-[2px]"><img
                            src="/assets/iconsub.png"
                            alt="Plus"
                            className="w-4 h-4"
                        /></span>
                        <span>Choose how many cards to review per session</span>
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="mt-[2px]"><img
                            src="/assets/iconsub.png"
                            alt="Plus"
                            className="w-4 h-4"
                        /></span>
                        <span>Advanced accessibility options</span>
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="mt-[2px]"><img
                            src="/assets/iconsub.png"
                            alt="Plus"
                            className="w-4 h-4"
                        /></span>
                        <span>Access to future premium features</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default SubscriptionPage;



