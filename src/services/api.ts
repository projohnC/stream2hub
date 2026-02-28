// API Service with caching, timeout, and download-link filtering
import type { Movie, DownloadLink, DesireMoviesMovie } from '@/types';

export type { Movie, DownloadLink } from '@/types';

const CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://scarperapi-8lk0.onrender.com',
  apiKey: import.meta.env.VITE_API_KEY || 'sk_Np9lerLj76MiTGBXm1nL-kr4HVeGKPMb',
  timeout: 15000
};

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

async function fetchWithTimeout(
  endpoint: string,
  params: string = '',
  options: RequestInit = {},
  retries: number = 2
): Promise<unknown> {
  const cacheKey = `${endpoint}${params}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const url = `${CONFIG.baseUrl}${endpoint}${params}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'x-api-key': CONFIG.apiKey,
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      if (isTimeout && attempt < retries) continue;
      if (isTimeout) throw new Error('Request timeout after multiple attempts');
      throw error;
    }
  }

  throw lastError || new Error('Request failed');
}

function extractArrayFromResponse(data: unknown): DesireMoviesMovie[] {
  if (Array.isArray(data)) return data as DesireMoviesMovie[];

  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;

    if (Array.isArray(record.data)) return record.data as DesireMoviesMovie[];
    if (Array.isArray(record.results)) return record.results as DesireMoviesMovie[];

    if (typeof record.data === 'object' && record.data !== null) {
      const nested = record.data as Record<string, unknown>;
      for (const key of Object.keys(nested)) {
        if (Array.isArray(nested[key])) return nested[key] as DesireMoviesMovie[];
      }
    }
  }

  return [];
}

function cleanTitle(title: string): string {
  if (!title) return 'Unknown';
  return title
    .replace(/\s+/g, ' ')
    .trim() || 'Unknown';
}

function isPotentialVideoUrl(url: string): boolean {
  return /\.(mp4|mkv|m3u8|webm|mov|avi)(\?|$)/i.test(url);
}

function isCleanDriveLink(url: string): boolean {
  return /(drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)/i.test(url);
}

function isBlockedDesireUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('filesgram.site/?start=') ||
    /[?&]bot=[^&]+/i.test(url) ||
    normalized.includes('gdflix') ||
    normalized.includes('hubcloud.foo/drive/')
  );
}

export function filterDesireMoviesLinks(links: DownloadLink[]): DownloadLink[] {
  return links.filter((link) => {
    const url = link.url?.trim();
    if (!url) return false;
    if (isBlockedDesireUrl(url)) return false;
    return isPotentialVideoUrl(url) || isCleanDriveLink(url) || /(stream|video|cdn|r2\.dev|m3u8|play)/i.test(url);
  });
}

function mapDesireMovie(m: DesireMoviesMovie, index: number): Movie {
  const downloads = filterDesireMoviesLinks(m.downloadLinks || m.links || []);

  return {
    id: m.id || `desire_${index}_${Date.now()}`,
    title: cleanTitle(m.title || m.name || 'Unknown'),
    thumb: m.imageUrl || m.image || m.poster || 'https://via.placeholder.com/800x450?text=No+Image',
    url: m.url || m.link || '#',
    year: m.year || m.releaseDate || '2024',
    rating: m.imdbRating || 'N/A',
    genre: m.genre || m.genres || 'Movie',
    desc: m.description || m.storyline || m.plot || '',
    downloads,
    source: 'desiremovies',
    quality: m.quality
  };
}

export async function fetchDesireMovies(page: number = 1): Promise<Movie[]> {
  try {
    const data = await fetchWithTimeout('/api/desiremovies', `?page=${page}`);
    const movies = extractArrayFromResponse(data);
    return movies.map((m: DesireMoviesMovie, i: number) => mapDesireMovie(m, i));
  } catch (error) {
    console.error('Error fetching DesireMovies:', error);
    return [];
  }
}

export async function searchDesireMovies(query: string): Promise<Movie[]> {
  try {
    const data = await fetchWithTimeout('/api/desiremovies/search', `?q=${encodeURIComponent(query)}`);
    const resultMovies = extractArrayFromResponse(data);
    return resultMovies.map((m: DesireMoviesMovie, i: number) => mapDesireMovie(m, i));
  } catch (error) {
    console.error('Error searching DesireMovies:', error);
    return [];
  }
}

export async function fetchDesireMovieDetails(url: string): Promise<Movie | null> {
  try {
    const data = await fetchWithTimeout('/api/desiremovies/details', `?url=${encodeURIComponent(url)}`);
    const movie = (typeof data === 'object' && data !== null && 'data' in data)
      ? (data as { data?: unknown }).data ?? data
      : data;
    if (!movie || typeof movie !== 'object') return null;
    return mapDesireMovie(movie as DesireMoviesMovie, 0);
  } catch (error) {
    console.error('Error fetching DesireMovies details:', error);
    return null;
  }
}

export function clearAPICache(): void {
  cache.clear();
}
