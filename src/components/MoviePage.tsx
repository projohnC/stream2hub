import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Download, Loader2, Calendar, Star, Tag } from "lucide-react";
import { useNavigate, useParams } from 'react-router-dom';
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
    const { movies, loading, loadMovies, loadMovieDetails } = useMovies();

    const [movie, setMovie] = useState<Movie | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLinkIndex, setCurrentLinkIndex] = useState(0);
    const [playerUrl, setPlayerUrl] = useState<string | null>(null);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    // Initialize movies if list is empty
    useEffect(() => {
        if (movies.length === 0 && !loading) {
            loadMovies(1);
        }
    }, [movies.length, loading, loadMovies]);

    // Find movie and load details
    useEffect(() => {
        const findAndLoadMovie = async () => {
            if (!movieSlug) return;

            // Try to find in current list
            let foundMovie = movies.find(m => slugify(m.title) === movieSlug);

            if (foundMovie) {
                setMovie(foundMovie);
                setIsDetailsLoading(true);
                const details = await loadMovieDetails(foundMovie);
                if (details) {
                    setMovie(details);
                }
                setIsDetailsLoading(false);
            } else if (movies.length > 0 && !loading) {
                // If movies are loaded and still not found, we might need a search or handle error
                // For now, let's just wait or show nothing
            }
        };

        findAndLoadMovie();
    }, [movieSlug, movies, loading, loadMovieDetails]);

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
            playPromise.catch((error: Error) => {
                console.error('Auto-play failed:', error);
                if (videoRef.current) {
                    videoRef.current.muted = true;
                    videoRef.current.play().catch((e: Error) => console.error('Play with mute failed:', e));
                }
            });
        }
    }, []);

    useEffect(() => {
        if (isPlaying && playerUrl && videoRef.current) {
            initPlayer(playerUrl);
        }
    }, [isPlaying, playerUrl, initPlayer]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
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
                <button className="btn btn-primary" onClick={() => navigate('/')}>Go Back Home</button>
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

    const playExternal = (player: 'vlc' | 'mx' | 'other' = 'vlc', index?: number) => {
        if (validLinks.length === 0) return;
        const targetIndex = typeof index === 'number' ? index : currentLinkIndex;
        const url = validLinks[targetIndex].url;
        const isAndroid = /Android/i.test(navigator.userAgent);

        if (isAndroid) {
            let intent = '';
            if (player === 'vlc') {
                intent = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;end`;
            } else if (player === 'mx') {
                intent = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.ad;end`;
            } else {
                intent = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;end`;
            }
            window.location.href = intent;
        } else {
            const vlcUrl = url.replace('https://', 'https/').replace('http://', 'http/');
            window.location.href = `vlc://${vlcUrl}`;
            setTimeout(() => {
                if (!isAndroid) window.open(url, '_blank');
            }, 2000);
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

                        <p className="movie-description">
                            {movie.desc || 'No description available for this movie.'}
                        </p>

                        <div className="movie-main-actions">
                            <button
                                className="btn btn-primary btn-large"
                                onClick={watchOnline}
                                disabled={validLinks.length === 0}
                            >
                                <Play size={20} fill="white" />
                                Watch Now
                            </button>

                            {/Android/i.test(navigator.userAgent) && (
                                <div className="external-players">
                                    <button className="btn btn-secondary" onClick={() => playExternal('vlc')}>VLC</button>
                                    <button className="btn btn-secondary" onClick={() => playExternal('mx')}>MX Player</button>
                                </div>
                            )}
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
                                    onShowToast('Server error: Please choose another server.', 'error');
                                }}
                                crossOrigin={playerUrl?.includes('.m3u8') ? "anonymous" : undefined}
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
                                                a.download = `${movie.title}_${link.quality}.mp4`;
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
                        <p className="no-links">No download links available for this movie.</p>
                    )}
                </div>
            </div>
        </div>
    );
};



