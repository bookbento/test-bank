// Custom hook for loading card sets from JSON
import { useState, useEffect } from 'react';
import type { CardSet } from '../types/flashcard';

export function useCardSets() {
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCardSets = async () => {
      setIsLoading(true);
      try {
        // Add cache-busting parameter for data freshness
        // This ensures users get the latest card sets after deployment
        const cacheBuster = `?v=${Date.now()}`;
        const response = await fetch(`/data/card_set.json${cacheBuster}`);
        if (!response.ok) throw new Error(`Failed to load: ${response.status}`);

        const jsonData = await response.json();
        const transformed: CardSet[] = jsonData.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          cover: item.cover,
          cardCount: item.cardCount,
          category: item.category,
          tags: item.tags,
          dataFile: item.dataFile,
          author: item.author,
          isActive: item.isActive,
          difficulty: item.difficulty,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));

        setCardSets(transformed);
        console.log('useCardSets: Loaded', transformed.length, 'card sets');
      } catch (error) {
        console.error('useCardSets: Error:', error);
        setCardSets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCardSets();
  }, []);

  return { cardSets, isLoading };
}
