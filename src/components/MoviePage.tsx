import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Download, Loader2, Calendar, Star, Tag } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Hls from 'hls.js';
import { useMovies } from '@/hooks/useMovies';
import { slugify } from '@/utils/slugify';
import type { Movie } from '@/types';

interface MoviePageProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const MoviePage: React.FC<MoviePageProps> = ({ onShowToast }) => {
  const { movieSlug } = useParams<{ movieSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { movies, loading, loadMovies, loadMovieDetails } = useMovies();

  const [movie, setMovie] = useState<Movie | null>((location.state as { movie?: Movie } | null)?.movie || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (movies.length === 0 && !loading) {
      loadMovies(1);
    }
  }, [movies.length, loading, loadMovies]);

  useEffect(() => {
    const findAndLoadMovie = async () => {
      if (!movieSlug) return;

      const stateMovie = (location.state as { movie?: Movie } | null)?.movie;
      const foundMovie = stateMovie || movies.find(m => slugify(m.title) === movieSlug);

      if (!foundMovie) return;

      setMovie(foundMovie);
      setIsDetailsLoading(true);
      const details = await loadMovieDetails(foundMovie);
      if (details) {
        setMovie(details);
      }
      setIsDetailsLoading(false);
    };

    findAndLoadMovie();
  }, [movieSlug, movies, location.state, loadMovieDetails]);

  const initPlayer = useCallback((url: string) => {
    if (!videoRef.current) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          capLevelToPlayerSize: true,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setIsPlaying(false);
                break;
            }
          }
        });

        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(url);
        });

        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = url;
      }
    } else {
      videoRef.current.src = url;
    }

    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => undefined);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isPlaying && playerUrl && videoRef.current) {
      initPlayer(playerUrl);
    }
  }, [isPlaying, playerUrl, initPlayer]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, []);

  if (loading && !movie) {
    return (
      <div className="movie-page-loading">
        <Loader2 className="animate-spin" size={48} />
        <p>Loading Movie Details...</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="movie-page-error">
        <h2>Movie Not Found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/home')}>Go Back Home</button>
      </div>
    );
  }

  const validLinks = movie.downloads;

  const watchOnline = () => {
    if (validLinks.length === 0) return;
    const link = validLinks[currentLinkIndex];
    setPlayerUrl(link.url);
    setIsPlaying(true);
  };

  const tryNextServer = () => {
    if (currentLinkIndex < validLinks.length - 1) {
      const nextIndex = currentLinkIndex + 1;
      setCurrentLinkIndex(nextIndex);
      setPlayerUrl(validLinks[nextIndex].url);
      onShowToast('Current server failed. Switched to another server.', 'info');
    } else {
      onShowToast('All servers failed. Please try another movie.', 'error');
    }
  };

  return (
    <div className="movie-page">
      <div className="movie-page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
          <span>Back</span>
        </button>
      </div>

      <div className="movie-page-content">
        <div className="movie-hero-section">
          <div className="movie-poster">
            <img src={movie.thumb} alt={movie.title} />
            <div className="poster-overlay"></div>
          </div>

          <div className="movie-info-summary">
            <h1 className="movie-title">{movie.title}</h1>

            <div className="movie-meta-pills">
              <span className="pill rating"><Star size={14} fill="currentColor" /> {movie.rating}</span>
              <span className="pill year"><Calendar size={14} /> {movie.year}</span>
              <span className="pill genre"><Tag size={14} /> {movie.genre}</span>
            </div>

            <p className="movie-description">{movie.desc || 'No description available for this movie.'}</p>

            <div className="movie-main-actions">
              <button className="btn btn-primary btn-large" onClick={watchOnline} disabled={validLinks.length === 0}>
                <Play size={20} fill="white" />
                Watch Now
              </button>
            </div>
          </div>
        </div>

        {isPlaying && playerUrl && (
          <div className="movie-player-container">
            <div className="video-wrapper">
              <video
                ref={videoRef}
                controls
                playsInline
                autoPlay
                className="main-video"
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onCanPlay={() => setIsBuffering(false)}
                onError={() => {
                  setIsBuffering(false);
                  tryNextServer();
                }}
                crossOrigin={playerUrl.includes('.m3u8') ? 'anonymous' : undefined}
              />
              {isBuffering && (
                <div className="player-loader">
                  <Loader2 className="animate-spin" size={48} />
                </div>
              )}
            </div>

            <div className="server-list">
              <h3>Select Server:</h3>
              <div className="server-buttons">
                {validLinks.map((link, idx) => (
                  <button
                    key={idx}
                    className={`server-btn ${idx === currentLinkIndex ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentLinkIndex(idx);
                      setPlayerUrl(link.url);
                    }}
                  >
                    Server {idx + 1} ({link.quality || 'HD'})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="movie-downloads-section">
          <h2 className="section-title"><Download size={24} /> Download Options</h2>

          {isDetailsLoading ? (
            <div className="downloads-loading">
              <Loader2 className="animate-spin" />
              <p>Fetching download links...</p>
            </div>
          ) : validLinks.length > 0 ? (
            <div className="downloads-grid">
              {validLinks.map((link, index) => (
                <div key={index} className="download-card">
                  <div className="download-card-info">
                    <span className="quality">{link.quality || 'HD'}</span>
                    {link.size && <span className="size">{link.size}</span>}
                  </div>
                  <div className="download-card-actions">
                    <button
                      className="btn btn-download"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = link.url;
                        a.download = `${movie.title}_${link.quality || 'HD'}.mp4`;
                        a.target = '_blank';
                        a.click();
                      }}
                    >
                      <Download size={16} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-links">No valid links available.</p>
          )}
        </div>
      </div>
    </div>
  );
};
