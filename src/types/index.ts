// Types for StreamHub Premium

export interface Movie {
  id: string;
  title: string;
  thumb: string;
  url: string;
  year: string;
  rating: string;
  genre: string;
  desc: string;
  downloads: DownloadLink[];
  source: 'hdhub4u' | 'kmmovies';
  quality?: string;
  badge?: string;
}

export interface DownloadLink {
  quality: string;
  url: string;
  size?: string;
  badge?: string;
  isMagicLink?: boolean;
  resolvedUrl?: string;
}

export interface MagicLinkResponse {
  downloadLinks: {
    label: string;
    url: string;
  }[];
}

export interface CategorySection {
  id: string;
  title: string;
  icon: string;
  movies: Movie[];
}

export interface WatchLaterItem {
  url: string;
  title: string;
  thumb: string;
  year: string;
  rating: string;
  source: 'hdhub4u' | 'kmmovies';
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
}

export interface HDHub4UMovie {
  title?: string;
  name?: string;
  imageUrl?: string;
  image?: string;
  poster?: string;
  url?: string;
  link?: string;
  movieInfo?: {
    releaseDate?: string;
    imdbRating?: string;
    genres?: string;

  };
  releaseDate?: string;
  year?: string;
  imdbRating?: string;
  genres?: string;
  storyline?: string;
  description?: string;
  plot?: string;
  downloadLinks?: DownloadLink[];
  links?: DownloadLink[];
}

export interface KMMoviesMovie {
  title?: string;
  name?: string;
  imageUrl?: string;
  image?: string;
  poster?: string;
  url?: string;
  link?: string;
  movieInfo?: {
    releaseDate?: string;
    imdbRating?: string;
    genres?: string;
  };
  releaseDate?: string;
  year?: string;
  imdbRating?: string;
  genres?: string;
  storyline?: string;
  description?: string;
  plot?: string;
  downloadLinks?: DownloadLink[];
  links?: DownloadLink[];
}
