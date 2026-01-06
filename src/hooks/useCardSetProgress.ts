// Custom hook for loading card set progress from Firebase
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFlashcard } from '../contexts/FlashcardContext';

export function useCardSetProgress() {
  const { state: authState } = useAuth();
  const { state, loadAllCardSetProgress } = useFlashcard();
  const [progressData, setProgressData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);

  useEffect(() => {
    const loadProgress = async () => {
      // Wait for auth loading
      if (authState.isAuthLoading) return;
      if (isLoading) return;

      // Authenticated user
      if (!authState.isGuest && authState.user) {
        const currentUserId = authState.user.uid;

        // Skip if already loaded for this user
        if (
          loadedForUser === currentUserId &&
          Object.keys(progressData).length > 0
        ) {
          return;
        }

        setIsLoading(true);
        try {
          const progress = await loadAllCardSetProgress();
          setProgressData(progress);
          setLoadedForUser(currentUserId);
          console.log(
            'useCardSetProgress: Loaded',
            Object.keys(progress).length,
            'sets'
          );
        } catch (error) {
          console.error('useCardSetProgress: Error:', error);
          setProgressData({});
        } finally {
          setIsLoading(false);
        }
      } else {
        // Guest mode - mock data
        setLoadedForUser(null);
        setProgressData({
          hsk_1_set_1_english: 25,
          chinese_essentials_1: 60,
          ielts_adjective_thai: 0,
        });
      }
    };

    loadProgress();
  }, [
    authState.isGuest,
    authState.user,
    authState.isAuthLoading,
    loadAllCardSetProgress,
    state.progressVersion,
  ]);

  return { progressData, isLoading };
}
