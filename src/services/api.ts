// API Service with caching, timeout, and parallel fetching
import type { Movie, DownloadLink, HDHub4UMovie, KMMoviesMovie } from '@/types';

export type { Movie, DownloadLink } from '@/types';

const CONFIG = {
  baseUrl: 'https://scarperapi-8lk0.onrender.com',
  apiKey: 'sk_Wv4v8TwKE4muWoxW-2UD8zG0CW_CLT6z',
  timeout: 15000, // 15 seconds max
  // Domains to block (ads/redirects)
  blockedDomains: [
    'gadgetsweb.xyz',
    'cryptonewz.one',
    'crypto-news.one',
    'adclick.com',
    'redirect.com',
    'adf.ly',
    'bit.ly',
    'short.link',
    'tinyurl.com',
    'ow.ly',
    'short.link'
  ],
  // Allowed direct video domains
  allowedDomains: [
    'hub.cooldown.buzz',
    'cooldown.buzz',
    'r2.dev',
    'pub-',
    'cdn.',
    'stream.',
    'video.',
    'direct.'
  ]
};

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch with timeout and abort controller
async function fetchWithTimeout(
  endpoint: string,
  params: string = '',
  options: RequestInit = {},
  retries: number = 2
): Promise<any> {
  const cacheKey = `${endpoint}${params}`;

  // Check cache first
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
        console.log(`Retrying request to ${endpoint} (Attempt ${attempt}/${retries})...`);
        // Exponential backoff
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
        // Retry on 5xx errors
        if (response.status >= 500 && attempt < retries) {
          console.warn(`HTTP ${response.status} on ${endpoint}, retrying...`);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Cache the response
      cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;

      const isTimeout = error instanceof Error && error.name === 'AbortError';

      // Retry on timeout
      if (isTimeout && attempt < retries) {
        console.warn(`Timeout on ${endpoint}, retrying...`);
        continue;
      }

      if (isTimeout) {
        throw new Error('Request timeout after multiple attempts');
      }

      throw error;
    }
  }

  throw lastError || new Error('Request failed');
}

// Check if URL is blocked
export function isBlockedUrl(url: string): boolean {
  if (!url) return true;
  const lowerUrl = url.toLowerCase();
  return CONFIG.blockedDomains.some(domain => lowerUrl.includes(domain));
}

// Check if URL is a direct video URL
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();

  // Check for direct video file extensions
  const videoExtensions = /\.(mp4|mkv|webm|m3u8|mov|avi|flv)$/i;
  const hasExtension = videoExtensions.test(url.split('?')[0]);

  // Check for allowed domains
  const isAllowedDomain = CONFIG.allowedDomains.some(domain =>
    lowerUrl.includes(domain.toLowerCase())
  );

  return hasExtension || isAllowedDomain;
}

// Filter valid download links for HDHub4U
export function filterHDHub4ULinks(links: DownloadLink[]): DownloadLink[] {
  return links.filter(link => {
    const url = (link.url || '').toLowerCase();

    // Must not contain blocked domains
    if (isBlockedUrl(url)) return false;

    // Prefer hub.cooldown.buzz or direct video files
    const hasAllowedDomain = url.includes('hub.cooldown.buzz') ||
      url.includes('cooldown.buzz') ||
      isDirectVideoUrl(url);

    return hasAllowedDomain;
  });
}

// Extract array from API response
function extractArrayFromResponse(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.data && typeof data.data === 'object') {
    for (const key in data.data) {
      if (Array.isArray(data.data[key])) return data.data[key];
    }
    return Object.values(data.data).filter(v => typeof v === 'object');
  }
  return [];
}

// Clean movie title
function cleanTitle(title: string): string {
  return title ? title.replace(/How\s+to\s+download/gi, '').trim() : 'Unknown';
}

// Map HDHub4U movie to our Movie type
function mapHDHub4UMovie(m: HDHub4UMovie, index: number): Movie {
  const downloads = m.downloadLinks || m.links || [];
  return {
    id: `hdhub_${index}_${Date.now()}`,
    title: cleanTitle(m.title || m.name || 'Unknown'),
    thumb: m.imageUrl || m.image || m.poster || 'https://via.placeholder.com/800x450?text=No+Image',
    url: m.url || m.link || '#',
    year: m.movieInfo?.releaseDate || m.releaseDate || m.year || '2024',
    rating: m.movieInfo?.imdbRating || m.imdbRating || 'N/A',
    genre: m.movieInfo?.genres || m.genres || 'Movie',
    desc: m.storyline || m.description || m.plot || '',
    downloads: filterHDHub4ULinks(downloads),
    source: 'hdhub4u'
  };
}

// Map KMMovies movie to our Movie type
function mapKMMoviesMovie(m: KMMoviesMovie, index: number): Movie {
  const downloads = m.downloadLinks || m.links || [];
  return {
    id: `kmmovies_${index}_${Date.now()}`,
    title: cleanTitle(m.title || m.name || 'Unknown'),
    thumb: m.imageUrl || m.image || m.poster || 'https://via.placeholder.com/800x450?text=No+Image',
    url: m.url || m.link || '#',
    year: m.movieInfo?.releaseDate || m.releaseDate || m.year || '2024',
    rating: m.movieInfo?.imdbRating || m.imdbRating || 'N/A',
    genre: m.movieInfo?.genres || m.genres || 'Movie',
    desc: m.storyline || m.description || m.plot || '',
    downloads: downloads.map(d => ({ ...d, isMagicLink: true })),
    source: 'kmmovies'
  };
}

// Fetch HDHub4U movies
export async function fetchHDHub4U(page: number = 1): Promise<Movie[]> {
  try {
    const data = await fetchWithTimeout('/api/hdhub4u', `?page=${page}`);
    const movies = extractArrayFromResponse(data);

    if (!movies || movies.length === 0) {
      // Fallback to search if home is empty
      const searchData = await fetchWithTimeout('/api/hdhub4u/search', `?q=%20&page=${page}`);
      const searchMovies = extractArrayFromResponse(searchData);
      return searchMovies.map((m: HDHub4UMovie, i: number) => mapHDHub4UMovie(m, i));
    }

    return movies.map((m: HDHub4UMovie, i: number) => mapHDHub4UMovie(m, i));
  } catch (error) {
    console.error('Error fetching HDHub4U:', error);
    return [];
  }
}

// Search HDHub4U movies
export async function searchHDHub4U(query: string): Promise<Movie[]> {
  try {
    const data = await fetchWithTimeout('/api/hdhub4u/search', `?q=${encodeURIComponent(query)}`);
    const movies = extractArrayFromResponse(data);
    return movies.map((m: HDHub4UMovie, i: number) => mapHDHub4UMovie(m, i));
  } catch (error) {
    console.error('Error searching HDHub4U:', error);
    return [];
  }
}

// Fetch HDHub4U movie details
export async function fetchHDHub4UDetails(url: string): Promise<Movie | null> {
  try {
    const data = await fetchWithTimeout('/api/hdhub4u/details', `?url=${encodeURIComponent(url)}`);
    if (!data?.data) return null;

    const movie = data.data;
    const downloads = movie.downloadLinks || movie.links || [];

    return {
      id: `hdhub_detail_${Date.now()}`,
      title: cleanTitle(movie.title || movie.name || 'Unknown'),
      thumb: movie.imageUrl || movie.image || movie.poster || 'https://via.placeholder.com/800x450?text=No+Image',
      url: url,
      year: movie.movieInfo?.releaseDate || movie.releaseDate || movie.year || '2024',
      rating: movie.movieInfo?.imdbRating || movie.imdbRating || 'N/A',
      genre: movie.movieInfo?.genres || movie.genres || 'Movie',
      desc: movie.storyline || movie.description || movie.plot || '',
      downloads: filterHDHub4ULinks(downloads),
      source: 'hdhub4u'
    };
  } catch (error) {
    console.error('Error fetching HDHub4U details:', error);
    return null;
  }
}

// Fetch KMMovies
export async function fetchKMMovies(page: number = 1): Promise<Movie[]> {
  try {
    const data = await fetchWithTimeout('/api/kmmovies', `?page=${page}`);
    const movies = extractArrayFromResponse(data);
    return movies.map((m: KMMoviesMovie, i: number) => mapKMMoviesMovie(m, i));
  } catch (err) {
    console.error('Error fetching KMMovies:', err);
    return [];
  }
}

// Search KMMovies
export async function searchKMMovies(query: string): Promise<Movie[]> {
  try {
    const data = await fetchWithTimeout('/api/kmmovies/search', `?q=${encodeURIComponent(query)}`);
    const movies = extractArrayFromResponse(data);
    return movies.map((m: KMMoviesMovie, i: number) => mapKMMoviesMovie(m, i));
  } catch (error) {
    console.error('Error searching KMMovies:', error);
    return [];
  }
}

// Fetch KMMovies details
export async function fetchKMMoviesDetails(url: string): Promise<Movie | null> {
  try {
    const data = await fetchWithTimeout('/api/kmmovies/details', `?url=${encodeURIComponent(url)}`);
    if (!data?.data) return null;

    const movie = data.data;
    const downloads = movie.downloadLinks || movie.links || [];

    return {
      id: `kmmovies_detail_${Date.now()}`,
      title: cleanTitle(movie.title || movie.name || 'Unknown'),
      thumb: movie.imageUrl || movie.image || movie.poster || 'https://via.placeholder.com/800x450?text=No+Image',
      url: url,
      year: movie.movieInfo?.releaseDate || movie.releaseDate || movie.year || '2024',
      rating: movie.movieInfo?.imdbRating || movie.imdbRating || 'N/A',
      genre: movie.movieInfo?.genres || movie.genres || 'Movie',
      desc: movie.storyline || movie.description || movie.plot || '',
      downloads: downloads.map((d: DownloadLink) => ({ ...d, isMagicLink: true })),
      source: 'kmmovies'
    };
  } catch (error) {
    console.error('Error fetching KMMovies details:', error);
    return null;
  }
}

// Resolve magic link for KMMovies
export async function resolveMagicLink(magicUrl: string): Promise<string | null> {
  try {
    const data = await fetchWithTimeout('/api/kmmovies/magiclinks', `?url=${encodeURIComponent(magicUrl)}`);
    if (!data?.downloadLinks || data.downloadLinks.length === 0) return null;

    // Get the first valid R2 link
    const r2Link = data.downloadLinks.find((l: { url: string }) =>
      l.url && (l.url.includes('r2.dev') || isDirectVideoUrl(l.url))
    );

    return r2Link?.url || null;
  } catch (error) {
    console.error('Error resolving magic link:', error);
    return null;
  }
}

// Fetch all movies in parallel (HDHub4U + KMMovies)
export async function fetchAllMovies(page: number = 1): Promise<{
  hdhub4u: Movie[];
  kmmovies: Movie[];
}> {
  const [hdhub4u, kmmovies] = await Promise.all([
    fetchHDHub4U(page),
    fetchKMMovies(page)
  ]);

  return { hdhub4u, kmmovies };
}

// Search all movies in parallel
export async function searchAllMovies(query: string): Promise<{
  hdhub4u: Movie[];
  kmmovies: Movie[];
}> {
  const [hdhub4u, kmmovies] = await Promise.all([
    searchHDHub4U(query),
    searchKMMovies(query)
  ]);

  return { hdhub4u, kmmovies };
}

// Clear cache
export function clearAPICache(): void {
  cache.clear();
}