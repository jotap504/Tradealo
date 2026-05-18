'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

interface Props {
  videoId: string;
}

let apiReady = false;
const pending: Array<() => void> = [];

if (typeof window !== 'undefined' && !(window as any).__ytApiLoaded) {
  (window as any).__ytApiLoaded = true;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

function whenReady(): Promise<void> {
  return new Promise((resolve) => {
    if (apiReady) return resolve();
    pending.push(resolve);
  });
}

(window as any).onYouTubeIframeAPIReady = () => {
  apiReady = true;
  pending.forEach((fn) => fn());
  pending.length = 0;
};

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function YouTubePlayer({ videoId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const seekRel = useCallback((delta: number) => {
    const t = playerRef.current?.getCurrentTime() ?? 0;
    playerRef.current?.seekTo(Math.max(0, t + delta), true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const id = `ytp-${Math.random().toString(36).slice(2, 9)}`;
    containerRef.current.id = id;

    whenReady().then(() => {
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(id, {
        videoId,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          controls: 0,
          fs: 0,
        },
        events: {
          onReady: () => {
            setReady(true);
            setDuration(playerRef.current.getDuration());
            playerRef.current.playVideo();
          },
          onStateChange: (e: any) => {
            const isPlaying = e.data === YT.PlayerState.PLAYING;
            setPlaying(isPlaying);
            if (isPlaying) {
              setDuration(playerRef.current.getDuration());
            }
          },
        },
      });
    });

    intervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setTime(playerRef.current.getCurrentTime());
      }
    }, 500);

    return () => {
      clearInterval(intervalRef.current);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
  }, [videoId]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (muted) playerRef.current.unMute();
    else playerRef.current.mute();
    setMuted(!muted);
  };

  const show = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const hide = () => {
    hideTimer.current = setTimeout(() => setShowControls(false), 1500);
  };

  return (
    <div
      className="relative w-full h-full bg-black"
      onMouseMove={show}
      onMouseLeave={hide}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Click central para play/pause */}
      {ready && (
        <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />
      )}

      {/* Overlay de play cuando está pausado */}
      {ready && !playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-4 rounded-full bg-white/20 backdrop-blur">
            <Play size={36} className="text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controles inferiores */}
      {ready && showControls && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-12 transition-opacity pointer-events-auto">
          {/* Barra de progreso */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={time}
            onChange={(e) => playerRef.current?.seekTo(parseFloat(e.target.value), true)}
            className="w-full h-1 accent-red-600 cursor-pointer mb-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600"
          />

          <div className="flex items-center gap-3 text-white">
            {/* Retroceder 10s */}
            <button onClick={(e) => { e.stopPropagation(); seekRel(-10); }} className="hover:text-white/70 transition-colors" aria-label="Retroceder 10s">
              <SkipBack size={18} />
            </button>

            {/* Play / Pause */}
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors" aria-label={playing ? 'Pausar' : 'Reproducir'}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Adelantar 10s */}
            <button onClick={(e) => { e.stopPropagation(); seekRel(10); }} className="hover:text-white/70 transition-colors" aria-label="Adelantar 10s">
              <SkipForward size={18} />
            </button>

            {/* Volumen */}
            <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="hover:text-white/70 transition-colors" aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Tiempo */}
            <span className="text-xs tabular-nums ml-auto opacity-80">
              {fmt(time)} / {fmt(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
