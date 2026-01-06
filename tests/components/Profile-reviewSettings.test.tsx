/**
 * Profile Review Settings Tests
 * Tests the new review session size selection functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../../src/components/flashcard/Profile';
import { REVIEW_SESSION_OPTIONS } from '../../src/types/flashcard';

// Mock contexts
vi.mock('../../src/contexts/AuthContext');
vi.mock('../../src/contexts/FlashcardContext');

describe('Profile Review Settings', () => {
  const mockOnNavigate = vi.fn();
  const mockUpdateReviewSessionSize = vi.fn();
  const mockGetReviewSessionSize = vi.fn();
  const mockLoadUserProfile = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAuth } = await import('../../src/contexts/AuthContext');
    const { useFlashcard } = await import(
      '../../src/contexts/FlashcardContext'
    );

    // Mock authenticated user
    (useAuth as any).mockReturnValue({
      state: {
        user: {
          uid: 'test-uid',
          displayName: 'Test User',
          email: 'test@example.com',
        },
        isGuest: false,
      },
      signOut: mockSignOut,
    });

    // Mock flashcard context
    (useFlashcard as any).mockReturnValue({
      loadUserProfile: mockLoadUserProfile.mockResolvedValue({
        uid: 'test-uid',
        displayName: 'Test User',
        email: 'test@example.com',
        totalReviewsCount: 150,
        reviewSessionSize: 20,
      }),
      updateReviewSessionSize: mockUpdateReviewSessionSize,
      getReviewSessionSize: mockGetReviewSessionSize,
    });
  });

  it('should show review settings section', async () => {
    mockGetReviewSessionSize.mockReturnValue(10);

    render(<Profile onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Review Settings')).toBeInTheDocument();
      expect(screen.getByText('Cards per review session:')).toBeInTheDocument();
    });
  });

  it('should display all session size options', async () => {
    mockGetReviewSessionSize.mockReturnValue(10);

    render(<Profile onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      REVIEW_SESSION_OPTIONS.forEach((size) => {
        const button = buttons.find((btn) =>
          btn.textContent?.includes(`${size} cards`)
        );
        expect(button).toBeInTheDocument();
      });
    });
  });

  it('should highlight current session size', async () => {
    mockGetReviewSessionSize.mockReturnValue(20);

    render(<Profile onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      // Find the button with specific class attributes
      const buttons = screen.getAllByText('20 cards');
      const button20 = buttons.find((btn) =>
        btn.closest('button')?.classList.contains('bg-primary-500')
      );
      expect(button20).toBeDefined();
      expect(button20?.closest('button')).toHaveClass('bg-primary-500');
    });
  });

  it('should show current session size in description', async () => {
    mockGetReviewSessionSize.mockReturnValue(30);

    render(<Profile onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      // Check for text in the description paragraph
      expect(
        screen.getByText(/Choose how many cards to review in each session/)
      ).toBeInTheDocument();
      // Check that 30 appears in the description as current size
      const description = screen.getByText(
        /Choose how many cards to review in each session/
      );
      expect(description.parentElement?.textContent).toMatch(/30.*cards/);
    });
  });

  it('should call updateReviewSessionSize when button clicked', async () => {
    mockGetReviewSessionSize.mockReturnValue(10);
    mockUpdateReviewSessionSize.mockResolvedValue(true);

    render(<Profile onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const button30 = buttons.find((btn) =>
        btn.textContent?.includes('30 cards')
      );
      expect(button30).toBeDefined();
      fireEvent.click(button30!);
    });

    expect(mockUpdateReviewSessionSize).toHaveBeenCalledWith(30);
  });

  it('should show loading state during update', async () => {
    mockGetReviewSessionSize.mockReturnValue(10);
    mockUpdateReviewSessionSize.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
    );

    render(<Profile onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const button20 = buttons.find((btn) =>
        btn.textContent?.includes('20 cards')
      );
      expect(button20).toBeDefined();
      fireEvent.click(button20!);
    });

    // Check if loading state appears
    const buttons = screen.getAllByRole('button');
    const button20 = buttons.find((btn) =>
      btn.textContent?.includes('20 cards')
    );
    expect(button20).toHaveClass('opacity-50');
    expect(button20).toHaveClass('cursor-not-allowed');
  });

  it('should show error message on update failure', async () => {
    mockGetReviewSessionSize.mockReturnValue(10);
    mockUpdateReviewSessionSize.mockResolvedValue(false);

    render(<Profile onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const button30 = buttons.find((btn) =>
        btn.textContent?.includes('30 cards')
      );
      expect(button30).toBeDefined();
      fireEvent.click(button30!);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to update review session size/)
      ).toBeInTheDocument();
    });
  });

  it('should allow dismissing error messages', async () => {
    mockGetReviewSessionSize.mockReturnValue(10);
    mockUpdateReviewSessionSize.mockResolvedValue(false);

    render(<Profile onNavigate={mockOnNavigate} />);

    // Trigger error
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const button30 = buttons.find((btn) =>
        btn.textContent?.includes('30 cards')
      );
      expect(button30).toBeDefined();
      fireEvent.click(button30!);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to update review session size/)
      ).toBeInTheDocument();
    });

    // Dismiss error
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(
        screen.queryByText(/Failed to update review session size/)
      ).not.toBeInTheDocument();
    });
  });

  it('should disable buttons during update', async () => {
    mockGetReviewSessionSize.mockReturnValue(10);
    let resolveUpdate: (value: boolean) => void;
    mockUpdateReviewSessionSize.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
    );

    render(<Profile onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      // Find button elements specifically, not just text
      const buttons = screen.getAllByRole('button');
      const button20 = buttons.find((btn) =>
        btn.textContent?.includes('20 cards')
      );
      expect(button20).toBeDefined();
      fireEvent.click(button20!);
    });

    // All buttons should be disabled during update
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      REVIEW_SESSION_OPTIONS.forEach((size) => {
        const button = buttons.find(
          (btn) =>
            btn.textContent?.includes(`${size} cards`) ||
            btn.textContent?.includes(`${size}`)
        );
        expect(button).toBeDefined();
        expect(button).toBeDisabled();
      });
    });

    // Resolve the update
    resolveUpdate!(true);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      REVIEW_SESSION_OPTIONS.forEach((size) => {
        const button = buttons.find(
          (btn) =>
            btn.textContent?.includes(`${size} cards`) ||
            btn.textContent?.includes(`${size}`)
        );
        expect(button).toBeDefined();
        expect(button).not.toBeDisabled();
      });
    });
  });

  it('should handle guest users gracefully', async () => {
    const { useAuth } = await import('../../src/contexts/AuthContext');

    // Mock guest user
    (useAuth as any).mockReturnValue({
      state: {
        user: null,
        isGuest: true,
      },
      signOut: mockSignOut,
    });

    render(<Profile onNavigate={mockOnNavigate} />);

    // Should redirect to dashboard for guest users
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
  });
});
