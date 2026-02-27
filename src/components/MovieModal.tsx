import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Download, Monitor, SkipForward, Loader2 } from 'lucide-react';
import Hls from 'hls.js';
import type { Movie } from '@/types';

interface MovieModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const MovieModal: React.FC<MovieModalProps> = ({
  movie,
  isOpen,
  onClose,
  onShowToast
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentLinkIndex(0);
      setPlayerUrl(null);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  const initPlayer = useCallback((url: string) => {
    if (!videoRef.current) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        console.log('Initializing HLS.js for:', url);
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
                console.error('Fatal network error encountered, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error encountered, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal error, cannot recover:', data.type);
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
        console.log('Using native HLS support for:', url);
        videoRef.current.src = url;
      }
    } else {
      console.log('Loading direct video source:', url);
      videoRef.current.src = url;
    }

    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((error: Error) => {
        console.error('Auto-play failed or was interrupted:', error);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch((e: Error) => console.error('Play with mute also failed:', e));
        }
      });
    }
  }, []);

  // Handle player initialization
  useEffect(() => {
    if (isOpen && movie && isPlaying && playerUrl && videoRef.current) {
      initPlayer(playerUrl);
    }
  }, [isOpen, movie, isPlaying, playerUrl, initPlayer]);

  if (!isOpen || !movie) return null;

  const extractEpisodeNumber = (text: string) => {
    const episodeMatch = text.match(/(?:episode|ep)\s*(\d+)/i);
    return episodeMatch ? Number(episodeMatch[1]) : null;
  };

  const sortedLinks = [...movie.downloads].sort((a, b) => {
    const aText = `${a.quality || ''} ${a.badge || ''}`;
    const bText = `${b.quality || ''} ${b.badge || ''}`;
    const aEpisode = extractEpisodeNumber(aText);
    const bEpisode = extractEpisodeNumber(bText);

    if (aEpisode !== null && bEpisode !== null) return aEpisode - bEpisode;
    if (aEpisode !== null) return -1;
    if (bEpisode !== null) return 1;
    return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
  });

  const validLinks = sortedLinks;

  const watchOnline = () => {
    if (validLinks.length === 0) return;
    const link = validLinks[currentLinkIndex];
    setPlayerUrl(link.url);
    setIsPlaying(true);
  };

  const playExternal = (player: 'vlc' | 'other' = 'vlc', index?: number) => {
    if (validLinks.length === 0) return;
    const targetIndex = typeof index === 'number' ? index : currentLinkIndex;
    const url = validLinks[targetIndex].url;
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      let intent = '';
      if (player === 'vlc') {
        intent = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;end`;
      } else {
        intent = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;end`;
      }
      window.location.href = intent;
    } else {
      // Desktop - vlc:// protocol needs special care for encoded URLs
      const vlcUrl = url.replace('https://', 'https/').replace('http://', 'http/');
      window.location.href = `vlc://${vlcUrl}`;

      // Only fallback on desktop where vlc:// might not be registered
      setTimeout(() => {
        if (!isAndroid) {
          window.open(url, '_blank');
        }
      }, 2000);
    }
  };



  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-hero">
          <img
            src={movie.thumb}
            alt={movie.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x450?text=No+Image';
            }}
          />
          <div className="modal-gradient"></div>
        </div>

        <div className="modal-content-info">
          <h2 className="modal-title">{movie.title}</h2>

          <div className="modal-meta">
            <span className="meta-rating">IMDb: {movie.rating}</span>
            <span className="meta-year">{movie.year}</span>
            <span className="meta-genre">{movie.genre}</span>
            <span className="meta-source">HDHub4U</span>
          </div>

          <p className="modal-desc">
            {movie.desc || 'No description available.'}
          </p>

          {/* Player Section */}
          {isPlaying && playerUrl && (
            <div className="player-section active">
              <div className="video-container bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  autoPlay
                  className="w-full h-full aspect-video"
                  onWaiting={() => setIsBuffering(true)}
                  onPlaying={() => setIsBuffering(false)}
                  onCanPlay={() => setIsBuffering(false)}
                  onError={() => {
                    console.error('Video element error');
                    setIsBuffering(false);
                    onShowToast('Server error: Please choose another server from the list below.', 'error');
                  }}
                  // Only apply crossOrigin if it's an HLS stream, otherwise it can block direct CDN links
                  crossOrigin={playerUrl?.includes('.m3u8') ? "anonymous" : undefined}
                />
                {isBuffering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* Server Selection */}
              <div className="server-selector">
                <button
                  className="server-btn"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
                  onClick={() => playerUrl && initPlayer(playerUrl)}
                >
                  <SkipForward size={14} className="rotate-180" />
                  Reload Player
                </button>
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
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={watchOnline}
              disabled={validLinks.length === 0}
            >
              <Play size={20} fill="white" />
              Watch Online
            </button>

            {/Android/i.test(navigator.userAgent) && (
              <div className="external-players-group">
                <button
                  className="btn btn-secondary"
                  onClick={() => playExternal('vlc')}
                  disabled={validLinks.length === 0}
                >
                  <Monitor size={18} />
                  VLC
                </button>

              </div>
            )}
          </div>

          {/* Download Section */}
          <div className="download-section">
            <h3 className="download-title">
              <Download size={18} />
              Download Links
            </h3>

            {(!movie.downloads || movie.downloads.length === 0) ? (
              <div className="download-loading">
                <div className="spinner"></div>
                <p>Please wait Loading movies...</p>
              </div>
            ) : validLinks.length > 0 ? (
              <div className="download-grid">
                {validLinks.map((link, index) => (
                  <div
                    key={index}
                    className={`download-item ${index === currentLinkIndex ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentLinkIndex(index);
                      // If the player is already showing, just change the source to prevent closing the player
                      if (isPlaying) {
                        setPlayerUrl(link.url);
                      }
                    }}
                  >
                    <div className="download-info">
                      <span className="download-quality">{link.quality || 'Unknown'}</span>
                      {link.size && <span className="download-size">{link.size}</span>}
                      {link.badge && <span className="download-badge">{link.badge}</span>}
                      {link.isMagicLink && <span className="magic-badge">Magic</span>}
                    </div>

                    <div className="download-actions">
                      {/Android/i.test(navigator.userAgent) && (
                        <div className="player-badges">
                          <button
                            className="btn btn-vlc btn-orange"
                            title="Play in VLC"
                            onClick={(e) => {
                              e.stopPropagation();
                              playExternal('vlc', index);
                            }}
                          >
                            VLC
                          </button>
                        </div>
                      )}
                      <button
                        className="btn btn-download centered-download-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentLinkIndex(index);
                          const a = document.createElement('a');
                          a.href = link.url;
                          a.download = `${movie.title}_${link.quality || 'HD'}.mp4`;
                          a.target = '_blank';
                          a.rel = 'noopener noreferrer';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-links">No download links available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
