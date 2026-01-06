// Test to verify Dashboard stats behavior after page refresh
// This test simulates the user's issue: complete review session, then check stats persistence

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  FlashcardProvider,
  useFlashcard,
} from '../../src/contexts/FlashcardContext';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

// Mock Firebase and auth
vi.mock('../../src/utils/firebase', () => ({
  auth: {},
  db: {},
  isAnalyticsAvailable: vi.fn(() => false),
  getAnalyticsInstance: vi.fn(() => null),
}));

const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

vi.mock('../../src/utils/auth', () => ({
  onAuthStateChange: vi.fn((callback) => {
    // Immediately call callback with authenticated user for consistent behavior
    setTimeout(() => callback(mockUser), 0);

    return () => {}; // unsubscribe function
  }),
  getCurrentUser: vi.fn(() => mockUser),
}));

// Mock card set loader
vi.mock('../../src/utils/cardSetLoader', () => ({
  loadCardSetDataWithFetch: vi.fn(() =>
    Promise.resolve([
      {
        id: 'test-card-1',
        front: { title: 'Hello', description: 'nǐ hǎo' },
        back: { title: '你好', description: 'Chinese greeting' },
      },
      {
        id: 'test-card-2',
        front: { title: 'Thank you', description: 'xiè xiè' },
        back: { title: '谢谢', description: 'Expression of gratitude' },
      },
    ])
  ),
}));

// Mock FlashcardService to simulate loading cards with progress from Firestore
vi.mock('../../src/services/flashcardService', () => ({
  FlashcardService: {
    loadCardSetData: vi.fn((cardSetId, cardSetDataFile) => {
      console.log('FlashcardService.loadCardSetData called with:', {
        cardSetId,
        cardSetDataFile,
      });

      const testCards = [
        {
          id: 'test-card-1',
          cardSetId: 'chinese_essentials_1',
          front: { title: 'Hello', description: 'nǐ hǎo', icon: '' },
          back: { title: '你好', description: 'Chinese greeting', icon: '' },
          // Simulate card with progress (reviewed today, mastered)
          easinessFactor: 2.6,
          repetitions: 3,
          interval: 3,
          nextReviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          lastReviewDate: new Date(), // reviewed today
          totalReviews: 3,
          correctStreak: 3,
          averageQuality: 4.0,
          isNew: false,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          updatedAt: new Date(),
        },
        {
          id: 'test-card-2',
          cardSetId: 'chinese_essentials_1',
          front: { title: 'Thank you', description: 'xiè xiè', icon: '' },
          back: {
            title: '谢谢',
            description: 'Expression of gratitude',
            icon: '',
          },
          // Simulate card that needs practice (low easiness factor)
          easinessFactor: 1.9,
          repetitions: 2,
          interval: 1,
          nextReviewDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // due yesterday
          lastReviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // reviewed 2 days ago
          totalReviews: 2,
          correctStreak: 0,
          averageQuality: 2.0,
          isNew: false,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ];

      console.log(
        'Mock returning cards:',
        testCards.map((c) => ({
          id: c.id,
          isNew: c.isNew,
          repetitions: c.repetitions,
          easinessFactor: c.easinessFactor,
          totalReviews: c.totalReviews,
        }))
      );

      return Promise.resolve({
        success: true,
        data: {
          cards: testCards,
          source: 'firestore',
        },
      });
    }),
  },
}));

// Test component that uses the context
const TestDashboard = () => {
  const { state } = useFlashcard();

  // Add debug logging to track state changes
  console.log('TestDashboard render - FlashcardContext state:', {
    isGuest: state.isGuest,
    hasUser: !!state.user,
    userUid: state.user?.uid,
    dataSource: state.dataSource,
    isLoading: state.isLoading,
    cardsCount: state.allCards.length,
    selectedCardSet: state.selectedCardSet?.id,
    stats: state.stats,
  });

  return (
    <div data-testid="dashboard-stats">
      <div data-testid="mastered-cards">{state.stats.masteredCards}</div>
      <div data-testid="difficult-cards">{state.stats.difficultCards}</div>
      <div data-testid="reviews-today">{state.stats.reviewsToday}</div>
      <div data-testid="total-cards">{state.stats.totalCards}</div>
      <div data-testid="loading">{state.isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="data-source">{state.dataSource}</div>
      <div data-testid="is-guest">
        {state.isGuest ? 'guest' : 'authenticated'}
      </div>
    </div>
  );
};

// Debug component to track AuthContext state
const DebugAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { state } = useAuth();

  console.log('DebugAuthProvider - AuthContext state:', {
    isGuest: state.isGuest,
    isAuthLoading: state.isAuthLoading,
    hasUser: !!state.user,
    userUid: state.user?.uid,
  });

  return <>{children}</>;
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      <FlashcardProvider>
        <DebugAuthProvider>{component}</DebugAuthProvider>
      </FlashcardProvider>
    </AuthProvider>
  );
};

describe('Dashboard Stats After Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage to avoid interference between tests
    localStorage.clear();
  });

  it('should display correct stats when cards are loaded from Firestore with progress', async () => {
    renderWithProviders(<TestDashboard />);

    // Wait for authentication and card loading
    await waitFor(
      () => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      },
      { timeout: 5000 }
    );

    // Verify that stats are calculated correctly from loaded cards
    await waitFor(() => {
      const masteredCards = screen.getByTestId('mastered-cards');
      const difficultCards = screen.getByTestId('difficult-cards');
      const reviewsToday = screen.getByTestId('reviews-today');
      const totalCards = screen.getByTestId('total-cards');

      // Based on our mock data:
      // - Card 1: mastered (easinessFactor 2.6, repetitions 3, reviewed today)
      // - Card 2: difficult (easinessFactor 1.9, not reviewed today)
      expect(masteredCards).toHaveTextContent('1'); // Card 1 is mastered
      expect(difficultCards).toHaveTextContent('1'); // Card 2 needs practice
      expect(reviewsToday).toHaveTextContent('1'); // Card 1 reviewed today
      expect(totalCards).toHaveTextContent('2'); // Total 2 cards
    });

    // Verify that data is loaded from Firestore (not JSON fallback)
    expect(screen.getByTestId('data-source')).toHaveTextContent('firestore');
  });

  it('should maintain stats after simulated refresh (context recreation)', async () => {
    // First render - simulate initial page load
    const { unmount } = renderWithProviders(<TestDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // Verify initial state is correct - capture the values for comparison
    await waitFor(() => {
      expect(screen.getByTestId('mastered-cards')).toHaveTextContent('1');
      expect(screen.getByTestId('difficult-cards')).toHaveTextContent('1');
      expect(screen.getByTestId('reviews-today')).toHaveTextContent('1');
      expect(screen.getByTestId('data-source')).toHaveTextContent('firestore');
      expect(screen.getByTestId('is-guest')).toHaveTextContent('authenticated');
    });

    // Capture initial stats for comparison
    const initialMastered = screen.getByTestId('mastered-cards').textContent;
    const initialDifficult = screen.getByTestId('difficult-cards').textContent;
    const initialReviewsToday = screen.getByTestId('reviews-today').textContent;

    // Unmount to simulate page refresh
    unmount();

    // Re-render to simulate fresh page load after refresh
    renderWithProviders(<TestDashboard />);

    await waitFor(
      () => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      },
      { timeout: 5000 }
    );

    // CRITICAL: Ensure authentication is established after refresh
    await waitFor(() => {
      expect(screen.getByTestId('is-guest')).toHaveTextContent('authenticated');
    });

    // Wait for stats to be calculated after card loading
    await waitFor(
      () => {
        const masteredCards = screen.getByTestId('mastered-cards');
        const difficultCards = screen.getByTestId('difficult-cards');
        const reviewsToday = screen.getByTestId('reviews-today');
        const dataSource = screen.getByTestId('data-source');

        // Stats should persist after refresh
        expect(masteredCards).toHaveTextContent(initialMastered || '1');
        expect(difficultCards).toHaveTextContent(initialDifficult || '1');
        expect(reviewsToday).toHaveTextContent(initialReviewsToday || '1');
        expect(dataSource).toHaveTextContent('firestore');
      },
      { timeout: 5000 }
    );
  });
});
