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
  source: 'desiremovies';
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
  source: 'desiremovies';
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
}

export interface DesireMoviesMovie {
  id?: string;
  title?: string;
  name?: string;
  url?: string;
  link?: string;
  imageUrl?: string;
  image?: string;
  poster?: string;
  description?: string;
  storyline?: string;
  plot?: string;
  year?: string;
  releaseDate?: string;
  imdbRating?: string;
  genre?: string;
  genres?: string;
  quality?: string;
  downloadLinks?: DownloadLink[];
  links?: DownloadLink[];
}
