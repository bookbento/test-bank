/**
 * Profile Component - User Profile Information and Settings
 *
 * Shows authenticated user's profile information including:
 * - User info (name, email, photo)
 * - Account statistics (reviews, progress)
 * - Logout functionality
 * - Navigation back to dashboard
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFlashcard } from '../../contexts/FlashcardContext';
import type {
  AppRoute,
  UserProfile,
  ReviewSessionSize,
} from '../../types/flashcard';
import { REVIEW_SESSION_OPTIONS } from '../../types/flashcard';

interface ProfileProps {
  onNavigate: (route: AppRoute) => void;
}

const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { state: authState, signOut } = useAuth();
  const { loadUserProfile, updateReviewSessionSize, getReviewSessionSize } =
    useFlashcard();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUpdatingSessionSize, setIsUpdatingSessionSize] = useState(false);
  const [sessionSizeError, setSessionSizeError] = useState<string | null>(null);

  // Get current review session size
  const currentSessionSize = getReviewSessionSize();

  // Load user profile when component mounts
  useEffect(() => {
    const loadProfile = async () => {
      if (authState.isGuest || !authState.user) {
        // Guest user - redirect to dashboard
        console.log('Profile: Guest user detected, redirecting to dashboard');
        onNavigate('dashboard');
        return;
      }

      try {
        setIsLoading(true);
        const profile = await loadUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error('Profile: Error loading user profile:', error);
        // On error, still show basic info from auth state
        setUserProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [authState.isGuest, authState.user, loadUserProfile, onNavigate]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      // Navigation to dashboard will happen automatically via auth state change
    } catch (error) {
      console.error('Profile: Error signing out:', error);
      // Error is already handled by AuthContext
    } finally {
      setIsSigningOut(false);
    }
  };

  // Handle back to main
  const handleBackToMain = () => {
    console.log('Profile: Navigating back to main');
    onNavigate('card-sets');
  };

  /**
   * Handle review session size change
   * Updates user preference and provides feedback
   */
  const handleSessionSizeChange = async (size: ReviewSessionSize) => {
    try {
      setIsUpdatingSessionSize(true);
      setSessionSizeError(null);

      console.log(`Profile: Updating review session size to ${size}`);

      const success = await updateReviewSessionSize(size);

      if (!success) {
        throw new Error('Failed to update review session size');
      }

      console.log(
        `Profile: Review session size updated successfully to ${size}`
      );
    } catch (error) {
      console.error('Profile: Error updating session size:', error);
      setSessionSizeError(
        error instanceof Error
          ? error.message
          : 'Failed to update review session size. Please try again.'
      );
    } finally {
      setIsUpdatingSessionSize(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center from-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // Get display data (from profile or fallback to auth state)
  const displayName =
    userProfile?.displayName || authState.user?.displayName || 'User';
  const email = userProfile?.email || authState.user?.email || '';
  const photoURL = userProfile?.photoURL || authState.user?.photoURL || '';
  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString()
    : 'Recently';

  return (
    <div className="min-h-screen from-blue-50">
      <div className="h-screen flex flex-col">
        {/* Navigation Header - Sticky */}
        <div className="sticky top-0 z-10 from-blue-50 backdrop-blur-md border-b border-white/20 p-4 pb-2">
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToMain}
                className="flex items-center px-3 py-2 text-sm font-rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              >
                <span className="mr-2">←</span>
                <span>Back</span>
              </button>

              <h1 className="text-2xl font-child text-gray-700">Profile</h1>

              {/* Spacer for centering */}
              <div className="w-16"></div>
            </div>
          </div>
        </div>

        {/* Profile Content - Scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-md w-full mx-auto p-4 pt-6">
            {/* Profile Card */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-md p-4 mb-4">
              {/* Profile Header */}
              <div className="text-center mb-4">
                {/* Profile Picture */}
                <div className="mb-3">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={`${displayName}'s profile`}
                      className="w-16 h-16 rounded-full mx-auto border-2 border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                  )}
                </div>

                {/* Name and Email */}
                <h2 className="text-lg font-bold font-child text-gray-800 mb-1">
                  {displayName}
                </h2>
                {email && (
                  <p className="text-gray-600 font-rounded text-sm">{email}</p>
                )}
              </div>

              {/* Review Settings Section - NEW */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-bold font-child text-gray-800 mb-3">
                  Review Settings
                </h3>

                {/* Session Size Error Display */}
                {sessionSizeError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center">
                      <span className="text-red-500 mr-2">⚠️</span>
                      <p className="text-sm text-red-700 font-medium">
                        {sessionSizeError}
                      </p>
                    </div>
                    <button
                      onClick={() => setSessionSizeError(null)}
                      className="text-xs text-red-600 hover:text-red-800 underline mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-rounded text-gray-600 mb-2">
                      Cards per review session:
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      {REVIEW_SESSION_OPTIONS.map((size) => (
                        <button
                          key={size}
                          onClick={() => handleSessionSizeChange(size)}
                          disabled={isUpdatingSessionSize}
                          className={`
                            py-2 px-3 rounded-lg text-sm font-rounded font-medium transition-all duration-200
                            ${
                              currentSessionSize === size
                                ? 'bg-primary-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
                            ${
                              isUpdatingSessionSize
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:shadow-md active:scale-95'
                            }
                          `}
                        >
                          {isUpdatingSessionSize &&
                          currentSessionSize === size ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                              {size}
                            </div>
                          ) : (
                            `${size} cards`
                          )}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Choose how many cards to review in each session. Current:{' '}
                      <span className="font-medium">
                        {currentSessionSize} cards
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="mb-4">
                <h3 className="text-lg font-bold font-child text-gray-800 mb-3">
                  Account Information
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="font-rounded text-gray-600 text-sm">
                      Member since:
                    </span>
                    <span className="font-rounded text-gray-800 text-sm">
                      {memberSince}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="font-rounded text-gray-600 text-sm">
                      Account type:
                    </span>
                    <span className="font-rounded text-primary-600 font-medium text-sm">
                      Free
                    </span>
                  </div>
                </div>
              </div>

              {/* Sign Out Section */}
              <div className="pt-3 border-t border-gray-200">
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className={`
                    w-full py-3 px-4 rounded-2xl font-rounded font-medium transition-all duration-200 text-sm
                    ${
                      isSigningOut
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-lg hover:shadow-red-500/20 active:scale-95'
                    }
                  `}
                >
                  {isSigningOut ? <>Signing out...</> : <>Sign out</>}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pb-4">
              <p className="text-xs font-rounded text-gray-500">
                Your progress is automatically synced across all devices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
