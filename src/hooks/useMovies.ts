import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchHDHub4U,
  searchHDHub4U,
  fetchHDHub4UDetails,
  type Movie
} from '@/services/api';

interface UseMoviesReturn {
  movies: Movie[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  loadMovies: (pageNum?: number) => Promise<void>;
  searchMovies: (query: string) => Promise<void>;
  loadMovieDetails: (movie: Movie) => Promise<Movie | null>;
  changePage: (direction: number) => void;
}

export function useMovies(): UseMoviesReturn {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadMovies = useCallback(async (pageNum: number = 1) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const hdhub4u = await fetchHDHub4U(pageNum);

      if (hdhub4u.length === 0 && pageNum === 1) {
        setError('No movies found. The servers might be busy, please try again later.');
        setHasMore(false);
      } else {
        setMovies(hdhub4u);
        setPage(pageNum);
        setHasMore(hdhub4u.length >= 10);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const message = err.message || 'Failed to load movies';
        setError(message.includes('timeout')
          ? 'Request timed out. The server is taking too long to respond.'
          : message
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const searchMovies = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadMovies(1);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const hdhub4u = await searchHDHub4U(query);
      setMovies(hdhub4u);
      setHasMore(false);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to search movies');
      }
    } finally {
      setLoading(false);
    }
  }, [loadMovies]);

  const loadMovieDetails = useCallback(async (movie: Movie): Promise<Movie | null> => {
    try {
      return await fetchHDHub4UDetails(movie.url);
    } catch (err) {
      console.error('Error loading movie details:', err);
      return null;
    }
  }, []);

  const changePage = useCallback((direction: number) => {
    const newPage = page + direction;
    if (newPage < 1) return;
    loadMovies(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, loadMovies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    movies,
    loading,
    error,
    page,
    hasMore,
    loadMovies,
    searchMovies,
    loadMovieDetails,
    changePage
  };
}
