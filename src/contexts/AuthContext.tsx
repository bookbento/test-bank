/**
 * AuthContext - Authentication and User Management
 *
 * Handles user authentication state, guest mode, and user session management.
 * Separated from FlashcardContext to provide clear separation of concerns.
 *
 * Features:
 * - Guest/authenticated user state management
 * - Firebase authentication monitoring
 * - Migration status tracking for guest-to-user data transfer
 * - Clean auth state persistence
 */

import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChange,
  signOutUser,
  createUserProfile,
} from '../utils/auth';
import { FlashcardService } from '../services/flashcardService';
import analyticsService from '../services/analyticsService';

/**
 * Authentication state interface
 * Defines all auth-related state properties
 */
export interface AuthState {
  /** Current user object from Firebase Auth (null if guest) */
  user: any | null;

  /** Whether the user is in guest mode */
  isGuest: boolean;

  /** Migration status for transferring guest data to authenticated user */
  migrationStatus: 'none' | 'in-progress' | 'completed' | 'failed';

  /** Loading state for auth operations */
  isAuthLoading: boolean;

  /** Auth-specific error state */
  authError: string | null;
}

/**
 * Authentication action types
 * Defines all possible auth state mutations
 */
export type AuthAction =
  | { type: 'SET_USER'; payload: { user: any; isGuest: boolean } }
  | { type: 'SET_MIGRATION_STATUS'; payload: AuthState['migrationStatus'] }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_AUTH_ERROR'; payload: string | null }
  | { type: 'CLEAR_AUTH_ERROR' };

/**
 * Initial authentication state
 * Sets safe defaults for all auth properties
 */
const initialAuthState: AuthState = {
  user: null,
  isGuest: true,
  migrationStatus: 'none',
  isAuthLoading: true, // Start as loading since we need to check auth state
  authError: null,
};

/**
 * Authentication reducer
 * Handles all auth state updates with clear, predictable logic
 *
 * @param state Current auth state
 * @param action Auth action to process
 * @returns Updated auth state
 */
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_USER': {
      const { user, isGuest } = action.payload;
      return {
        ...state,
        user,
        isGuest,
        isAuthLoading: false,
        authError: null, // Clear any previous auth errors on successful auth change
      };
    }

    case 'SET_MIGRATION_STATUS': {
      return {
        ...state,
        migrationStatus: action.payload,
      };
    }

    case 'SET_AUTH_LOADING': {
      return {
        ...state,
        isAuthLoading: action.payload,
      };
    }

    case 'SET_AUTH_ERROR': {
      return {
        ...state,
        authError: action.payload,
        isAuthLoading: false, // Stop loading on error
      };
    }

    case 'CLEAR_AUTH_ERROR': {
      return {
        ...state,
        authError: null,
      };
    }

    default: {
      console.warn(`AuthContext: Unknown action type: ${(action as any).type}`);
      return state;
    }
  }
};

/**
 * Authentication context interface
 * Defines all methods and state available to consumers
 */
interface AuthContextValue {
  /** Current authentication state */
  state: AuthState;

  /** Raw dispatch function for advanced use cases */
  dispatch: React.Dispatch<AuthAction>;

  /** Set user and guest status (typically called by auth state change listener) */
  setUser: (user: any, isGuest: boolean) => void;

  /** Update migration status during guest-to-user data transfer */
  setMigrationStatus: (status: AuthState['migrationStatus']) => void;

  /** Set loading state for auth operations */
  setAuthLoading: (loading: boolean) => void;

  /** Set auth-specific error */
  setAuthError: (error: string | null) => void;

  /** Clear auth error */
  clearAuthError: () => void;

  /** Sign out the current user (returns to guest mode) */
  signOut: () => Promise<void>;
}

/**
 * React Context for authentication state management
 * Provides authentication state and methods to all child components
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider component
 * Wraps the application with authentication context and handles auth state monitoring
 *
 * @param children React children to wrap with auth context
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  /**
   * Set user and guest status
   * Typically called by the auth state change listener
   *
   * @param user Firebase user object or null
   * @param isGuest Whether the user is in guest mode
   */
  const setUser = (user: any, isGuest: boolean) => {
    console.log('AuthContext: Setting user', {
      hasUser: !!user,
      isGuest,
      userId: user?.uid,
    });

    // Track authentication state change
    const currentUserType = state.isGuest ? 'guest' : 'authenticated';
    const newUserType = isGuest ? 'guest' : 'authenticated';

    // Only track if the user type is actually changing
    if (currentUserType !== newUserType) {
      if (!isGuest && user) {
        // User signed in
        analyticsService.setAuthenticatedUser(user);
        analyticsService.trackEvent('sign_in', {
          user_id: user.uid,
          sign_in_method: user.providerData?.[0]?.providerId || 'unknown',
          is_new_user:
            user.metadata?.creationTime === user.metadata?.lastSignInTime,
          timestamp: new Date().toISOString(),
        });
      } else {
        // User signed out or switched to guest
        analyticsService.setGuestUser();
        if (currentUserType === 'authenticated') {
          analyticsService.trackEvent('sign_out', {
            previous_user_type: 'authenticated',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    dispatch({
      type: 'SET_USER',
      payload: { user, isGuest },
    });
  };

  /**
   * Update migration status during guest-to-user data transfer
   *
   * @param status New migration status
   */
  const setMigrationStatus = (status: AuthState['migrationStatus']) => {
    console.log('AuthContext: Setting migration status', status);
    dispatch({ type: 'SET_MIGRATION_STATUS', payload: status });
  };

  /**
   * Set loading state for auth operations
   *
   * @param loading Whether auth is currently loading
   */
  const setAuthLoading = (loading: boolean) => {
    dispatch({ type: 'SET_AUTH_LOADING', payload: loading });
  };

  /**
   * Set auth-specific error
   *
   * @param error Error message or null to clear
   */
  const setAuthError = (error: string | null) => {
    if (error) {
      console.error('AuthContext: Auth error occurred', error);
    }
    dispatch({ type: 'SET_AUTH_ERROR', payload: error });
  };

  /**
   * Clear auth error
   */
  const clearAuthError = () => {
    dispatch({ type: 'CLEAR_AUTH_ERROR' });
  };

  /**
   * Sign out the current user
   * This will trigger the auth state change listener and return to guest mode
   */
  const signOut = async (): Promise<void> => {
    try {
      setAuthLoading(true);

      // Track sign out attempt
      analyticsService.trackEvent('sign_out_initiated', {
        user_type: state.isGuest ? 'guest' : 'authenticated',
        user_id: state.user?.uid || null,
        timestamp: new Date().toISOString(),
      });

      const result = await signOutUser();

      if (!result.success) {
        // Track sign out failure
        analyticsService.trackEvent('sign_out_failed', {
          error_message: result.error || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw new Error(result.error || 'Sign out failed');
      }

      console.log('AuthContext: User signed out successfully');

      // Track successful sign out
      analyticsService.trackEvent('sign_out_success', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('AuthContext: Error signing out', error);

      // Track unexpected sign out error
      analyticsService.trackEvent('sign_out_error', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      setAuthError(
        `Failed to sign out: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error; // Re-throw so components can handle if needed
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Monitor authentication state changes
   * Listens to Firebase auth state and updates context accordingly
   * Auto-saves user profile when user signs in
   */
  useEffect(() => {
    console.log('AuthContext: Setting up auth state listener');

    // Track auth listener initialization
    analyticsService.trackEvent('auth_listener_initialized', {
      timestamp: new Date().toISOString(),
    });

    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('AuthContext: Auth state changed', {
        hasUser: !!firebaseUser,
        userId: firebaseUser?.uid,
      });

      // Track auth state change event
      analyticsService.trackEvent('auth_state_changed', {
        has_user: !!firebaseUser,
        user_id: firebaseUser?.uid || null,
        timestamp: new Date().toISOString(),
      });

      if (firebaseUser) {
        // User is signed in - auto-save user profile
        try {
          setAuthLoading(true);

          // Use FlashcardService directly (now imported statically)

          // Create user profile from Firebase user data
          const userProfile = createUserProfile(firebaseUser);

          // Auto-save to Firestore (creates if not exists, updates lastLoginAt if exists)
          const saveResult =
            await FlashcardService.saveUserProfile(userProfile);

          if (saveResult.success) {
            console.log(
              'AuthContext: Successfully auto-saved user profile on sign in'
            );

            // Track successful profile save
            analyticsService.trackEvent('user_profile_auto_saved', {
              user_id: firebaseUser.uid,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.warn(
              'AuthContext: Failed to auto-save user profile:',
              saveResult.error
            );

            // Track profile save failure
            analyticsService.trackEvent('user_profile_save_failed', {
              user_id: firebaseUser.uid,
              error_message: saveResult.error || 'Unknown error',
              timestamp: new Date().toISOString(),
            });

            // Don't throw error - we still want to proceed with authentication
          }
        } catch (error) {
          console.error('AuthContext: Error during profile auto-save:', error);

          // Track profile save exception
          analyticsService.trackEvent('user_profile_save_exception', {
            user_id: firebaseUser.uid,
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });

          // Don't block authentication on profile save failure
        } finally {
          setAuthLoading(false);
        }

        // Update auth state regardless of profile save result
        setUser(firebaseUser, false);
      } else {
        // User is signed out or was never signed in - switch to guest mode
        setUser(null, true);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('AuthContext: Cleaning up auth state listener');

      // Track auth listener cleanup
      analyticsService.trackEvent('auth_listener_cleanup', {
        timestamp: new Date().toISOString(),
      });

      unsubscribe();
    };
  }, []); // Empty dependency array - this should only run once on mount

  /**
   * Context value object that provides all auth state and methods to consumers
   */
  const contextValue: AuthContextValue = {
    state,
    dispatch,
    setUser,
    setMigrationStatus,
    setAuthLoading,
    setAuthError,
    clearAuthError,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

/**
 * Custom hook to access the authentication context
 * Ensures the hook is used within an AuthProvider and provides type safety
 *
 * @returns Authentication context value with all state and methods
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
        'Make sure your component is wrapped in an AuthProvider.'
    );
  }

  return context;
};

export default AuthContext;
