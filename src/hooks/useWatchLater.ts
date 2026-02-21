import { useState, useEffect, useCallback } from 'react';
import type { Movie, WatchLaterItem } from '@/types';

const WATCH_LATER_KEY = 'streamhub_watchlater_v2';

export function useWatchLater() {
  const [watchLater, setWatchLater] = useState<WatchLaterItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCH_LATER_KEY);
      if (stored) {
        setWatchLater(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading watch later:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever watchLater changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(watchLater));
    }
  }, [watchLater, isLoaded]);

  const addToWatchLater = useCallback((movie: Movie) => {
    setWatchLater(prev => {
      if (prev.some(m => m.url === movie.url)) return prev;
      return [...prev, {
        url: movie.url,
        title: movie.title,
        thumb: movie.thumb,
        year: movie.year,
        rating: movie.rating,
        source: movie.source
      }];
    });
  }, []);

  const removeFromWatchLater = useCallback((url: string) => {
    setWatchLater(prev => prev.filter(m => m.url !== url));
  }, []);

  const toggleWatchLater = useCallback((movie: Movie) => {
    setWatchLater(prev => {
      const exists = prev.some(m => m.url === movie.url);
      if (exists) {
        return prev.filter(m => m.url !== movie.url);
      }
      return [...prev, {
        url: movie.url,
        title: movie.title,
        thumb: movie.thumb,
        year: movie.year,
        rating: movie.rating,
        source: movie.source
      }];
    });
  }, []);

  const isInWatchLater = useCallback((url: string) => {
    return watchLater.some(m => m.url === url);
  }, [watchLater]);

  const clearWatchLater = useCallback(() => {
    setWatchLater([]);
  }, []);

  return {
    watchLater,
    isLoaded,
    count: watchLater.length,
    addToWatchLater,
    removeFromWatchLater,
    toggleWatchLater,
    isInWatchLater,
    clearWatchLater
  };
}
