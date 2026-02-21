import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchAllMovies,
  searchAllMovies,
  fetchHDHub4UDetails,
  fetchKMMoviesDetails,
  resolveMagicLink,
  type Movie
} from '@/services/api';

interface UseMoviesReturn {
  movies: {
    hdhub4u: Movie[];
    kmmovies: Movie[];
    trending: Movie[];
    latest: Movie[];
    highQuality: Movie[];
  };
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  loadMovies: (pageNum?: number) => Promise<void>;
  searchMovies: (query: string) => Promise<void>;
  loadMovieDetails: (movie: Movie) => Promise<Movie | null>;
  resolveKMLink: (url: string) => Promise<string | null>;
  changePage: (direction: number) => void;
}

export function useMovies(): UseMoviesReturn {
  const [movies, setMovies] = useState({
    hdhub4u: [] as Movie[],
    kmmovies: [] as Movie[],
    trending: [] as Movie[],
    latest: [] as Movie[],
    highQuality: [] as Movie[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Organize movies into categories
  const organizeMovies = useCallback((hdhub4u: Movie[], kmmovies: Movie[]) => {
    // Combine all movies for trending (shuffle)
    const allMovies = [...hdhub4u, ...kmmovies];
    const shuffled = [...allMovies].sort(() => Math.random() - 0.5);

    // Latest movies (first 10 from combined)
    const latest = shuffled.slice(0, 10);

    // High quality (movies with 1080p or 4K)
    const highQuality = allMovies.filter(m =>
      m.downloads.some(d =>
        d.quality?.includes('1080') ||
        d.quality?.includes('4K') ||
        d.quality?.includes('2160')
      )
    ).slice(0, 10);

    // Trending (random selection)
    const trending = shuffled.slice(0, 8);

    return {
      hdhub4u: hdhub4u.slice(0, 12),
      kmmovies: kmmovies.slice(0, 12),
      trending,
      latest,
      highQuality: highQuality.length > 0 ? highQuality : shuffled.slice(0, 10)
    };
  }, []);

  const loadMovies = useCallback(async (pageNum: number = 1) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const { hdhub4u, kmmovies } = await fetchAllMovies(pageNum);

      if (hdhub4u.length === 0 && kmmovies.length === 0 && pageNum === 1) {
        setError('No movies found. The servers might be busy, please try again later.');
        setHasMore(false);
      } else {
        const organized = organizeMovies(hdhub4u, kmmovies);
        setMovies(organized);
        setPage(pageNum);
        setHasMore(hdhub4u.length >= 10 || kmmovies.length >= 10);
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
  }, [organizeMovies]);

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
      const { hdhub4u, kmmovies } = await searchAllMovies(query);
      const organized = organizeMovies(hdhub4u, kmmovies);
      setMovies(organized);
      setHasMore(false);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to search movies');
      }
    } finally {
      setLoading(false);
    }
  }, [organizeMovies, loadMovies]);

  const loadMovieDetails = useCallback(async (movie: Movie): Promise<Movie | null> => {
    try {
      if (movie.source === 'hdhub4u') {
        return await fetchHDHub4UDetails(movie.url);
      } else {
        return await fetchKMMoviesDetails(movie.url);
      }
    } catch (err) {
      console.error('Error loading movie details:', err);
      return null;
    }
  }, []);

  const resolveKMLink = useCallback(async (url: string): Promise<string | null> => {
    return await resolveMagicLink(url);
  }, []);

  const changePage = useCallback((direction: number) => {
    const newPage = page + direction;
    if (newPage < 1) return;
    loadMovies(newPage);
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
    resolveKMLink,
    changePage
  };
}
