import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Download, ExternalLink, Monitor, Volume2, SkipForward, Loader2 } from 'lucide-react';
import { isDirectVideoUrl } from '@/services/api';
import type { Movie, DownloadLink } from '@/types';

interface MovieModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onResolveMagicLink: (url: string) => Promise<string | null>;
}

export const MovieModal: React.FC<MovieModalProps> = ({
  movie,
  isOpen,
  onClose,
  onResolveMagicLink
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);
  const [resolvedLinks, setResolvedLinks] = useState<Map<string, string>>(new Map());
  const [resolvingUrls, setResolvingUrls] = useState<Set<string>>(new Set());
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentLinkIndex(0);
      setPlayerUrl(null);
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

  if (!isOpen || !movie) return null;

  // Filter valid download links
  const validLinks = movie.downloads.filter(link => {
    const url = link.url || '';
    return url && !url.includes('gadgetsweb.xyz') && !url.includes('cryptonewz');
  });

  // Resolve magic link for KMMovies
  const resolveLink = async (link: DownloadLink): Promise<string> => {
    if (!link.isMagicLink) return link.url;

    if (resolvedLinks.has(link.url)) {
      return resolvedLinks.get(link.url)!;
    }

    setResolvingUrls(prev => new Set(prev).add(link.url));
    const resolved = await onResolveMagicLink(link.url);
    setResolvingUrls(prev => {
      const next = new Set(prev);
      next.delete(link.url);
      return next;
    });

    if (resolved) {
      setResolvedLinks(prev => new Map(prev).set(link.url, resolved));
      return resolved;
    }

    return link.url;
  };

  // Watch Online - Open in StreamingHub
  const watchOnline = async () => {
    if (validLinks.length === 0) return;

    const link = validLinks[currentLinkIndex];
    const url = await resolveLink(link);

    if (isDirectVideoUrl(url)) {
      // Open in StreamingHub iframe
      const streamingHubUrl = `https://streaminghub.42web.io/?i=1&url=${encodeURIComponent(url)}`;
      setPlayerUrl(streamingHubUrl);
      setIsPlaying(true);
    } else {
      // Fallback to direct URL
      setPlayerUrl(url);
      setIsPlaying(true);
    }
  };

  // Play in StreamingHub (new tab)
  const playInStreamingHub = async () => {
    if (validLinks.length === 0) return;

    const link = validLinks[currentLinkIndex];
    const url = await resolveLink(link);

    const streamingHubUrl = `https://streaminghub.42web.io/?i=1&url=${encodeURIComponent(url)}`;
    window.open(streamingHubUrl, '_blank');
  };

  // Try next link
  const tryNextLink = () => {
    if (currentLinkIndex < validLinks.length - 1) {
      setCurrentLinkIndex(prev => prev + 1);
      setIsPlaying(false);
      setPlayerUrl(null);
    }
  };

  // Helper to normalize and check for cooldown links
  const getCooldownUrl = (url: string): string | null => {
    if (!url) return null;
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('hub.cooldown.buzz') || lowerUrl.includes('cooldown.buzz')) {
      return url;
    }
    return null;
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
            <span className="meta-source">{movie.source === 'hdhub4u' ? 'HDHub4U' : 'KMMovies'}</span>
          </div>

          <p className="modal-desc">
            {movie.desc || 'No description available.'}
          </p>

          {/* Player Section */}
          {isPlaying && playerUrl && (
            <div className="player-section active">
              <div className="video-container">
                <iframe
                  ref={iframeRef}
                  src={playerUrl}
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              </div>
              <div className="player-controls-bar">
                <span className="player-hint">
                  <Monitor size={16} />
                  Streaming via StreamingHub
                </span>
                {currentLinkIndex < validLinks.length - 1 && (
                  <button className="next-link-btn" onClick={tryNextLink}>
                    <SkipForward size={16} />
                    Try Next Link
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={watchOnline}
              disabled={validLinks.length === 0 || resolvingUrls.has(validLinks[currentLinkIndex]?.url)}
            >
              {resolvingUrls.has(validLinks[currentLinkIndex]?.url) ? (
                <Loader2 size={20} className="spin" />
              ) : (
                <Play size={20} fill="white" />
              )}
              Watch Online
            </button>

            <button
              className="btn btn-secondary"
              onClick={playInStreamingHub}
              disabled={validLinks.length === 0 || resolvingUrls.has(validLinks[currentLinkIndex]?.url)}
            >
              <ExternalLink size={18} />
              Play in StreamingHub
            </button>

            {/* Cooldown Buzz direct button if detected */}
            {validLinks[currentLinkIndex] && getCooldownUrl(resolvedLinks.get(validLinks[currentLinkIndex].url) || validLinks[currentLinkIndex].url) && (
              <button
                className="btn btn-secondary border-blue-500/50 hover:bg-blue-500/10"
                onClick={async () => {
                  const url = await resolveLink(validLinks[currentLinkIndex]);
                  window.open(url, '_blank');
                }}
              >
                <ExternalLink size={18} className="text-blue-400" />
                Open Cooldown Direct
              </button>
            )}
          </div>

          {/* Download Section */}
          <div className="download-section">
            <h3 className="download-title">
              <Download size={18} />
              Download Links
            </h3>

            {validLinks.length > 0 ? (
              <div className="download-grid">
                {validLinks.map((link, index) => (
                  <div
                    key={index}
                    className={`download-item ${index === currentLinkIndex ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentLinkIndex(index);
                      setIsPlaying(false);
                      setPlayerUrl(null);
                    }}
                  >
                    <div className="download-info">
                      <span className="download-quality">{link.quality || 'Unknown'}</span>
                      {link.size && <span className="download-size">{link.size}</span>}
                      {link.badge && <span className="download-badge">{link.badge}</span>}
                      {link.isMagicLink && <span className="magic-badge">Magic</span>}
                    </div>

                    <div className="download-actions">
                      <button
                        className="btn btn-vlc"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = await resolveLink(link);
                          if (isDirectVideoUrl(url)) {
                            // Android VLC Intent
                            const vlcIntent = `intent:${url}#Intent;package=org.videolan.vlc;scheme=https;end`;
                            window.location.href = vlcIntent;
                          } else {
                            alert('This link cannot be opened in VLC.');
                          }
                        }}
                        disabled={resolvingUrls.has(link.url)}
                        title="Play with VLC"
                      >
                        <Volume2 size={16} />
                        VLC
                      </button>

                      <button
                        className="btn btn-download"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = await resolveLink(link);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${movie.title}_${link.quality || 'HD'}.mp4`;
                          a.target = '_blank';
                          a.rel = 'noopener noreferrer';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        disabled={resolvingUrls.has(link.url)}
                      >
                        {resolvingUrls.has(link.url) ? (
                          <Loader2 size={16} className="spin" />
                        ) : (
                          <Download size={16} />
                        )}
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
