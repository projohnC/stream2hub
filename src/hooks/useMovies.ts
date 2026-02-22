import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchHDHub4U,
  searchHDHub4U,
  fetchHDHub4UDetails,
  fetchDesireMovies,
  searchDesireMovies,
  fetchDesireMovieDetails,
  type Movie
} from '@/services/api';

export type Provider = 'hdhub4u' | 'desiremovies';

interface UseMoviesReturn {
  movies: Movie[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  provider: Provider;
  setProvider: (provider: Provider) => void;
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
  const [provider, setProvider] = useState<Provider>('hdhub4u');
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
      const fetchedMovies = provider === 'hdhub4u'
        ? await fetchHDHub4U(pageNum)
        : await fetchDesireMovies(pageNum);

      if (fetchedMovies.length === 0 && pageNum === 1) {
        setError('No movies found. The servers might be busy, please try again later.');
        setHasMore(false);
      } else {
        setMovies(fetchedMovies);
        setPage(pageNum);
        setHasMore(fetchedMovies.length >= 10);
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
  }, [provider]);

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
      const searchedMovies = provider === 'hdhub4u'
        ? await searchHDHub4U(query)
        : await searchDesireMovies(query);
      setMovies(searchedMovies);
      setHasMore(false);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to search movies');
      }
    } finally {
      setLoading(false);
    }
  }, [loadMovies, provider]);

  const loadMovieDetails = useCallback(async (movie: Movie): Promise<Movie | null> => {
    try {
      const details = movie.source === 'hdhub4u'
        ? await fetchHDHub4UDetails(movie.url)
        : await fetchDesireMovieDetails(movie.url);
      if (!details) return null;

      // Merge listing data with details, but prioritize listing data for title/id
      // to ensure consistency and prevent "Unknown" titles
      return {
        ...details,
        id: movie.id, // Keep the same ID
        title: (details.title && details.title !== 'Unknown') ? details.title : movie.title,
        thumb: (details.thumb && !details.thumb.includes('placeholder')) ? details.thumb : movie.thumb,
        year: (details.year && details.year !== '2024') ? details.year : movie.year,
        rating: (details.rating && details.rating !== 'N/A') ? details.rating : movie.rating,
        genre: (details.genre && details.genre !== 'Movie') ? details.genre : movie.genre
      };
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
    provider,
    setProvider,
    loadMovies,
    searchMovies,
    loadMovieDetails,
    changePage
  };
}
