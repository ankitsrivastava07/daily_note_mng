import React, { useState, useRef, useEffect, useCallback } from 'react';
import './CSS/LiveStreamComponent.css';

interface LiveStreamProps {
  streamId?: string;
  onStreamStateChange?: (isLive: boolean) => void;
}

type StreamState = 'IDLE' | 'PREVIEW' | 'LIVE';

const Icons = {
  MicOn: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  MicOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  VideoOn: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  ),
  VideoOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196" />
      <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  SwitchCamera: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
      <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
      <circle cx="12" cy="12" r="3" />
      <path d="m18 22-3-3 3-3" />
      <path d="m6 2 3 3-3 3" />
    </svg>
  ),
  Expand: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  Shrink: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  Users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Radio: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
  Square: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
};

export const LiveStreamComponent: React.FC<LiveStreamProps> = ({
  onStreamStateChange,
}) => {
  const [streamState, setStreamState] = useState<StreamState>('IDLE');
  const [isFullView, setIsFullView] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [useRearCamera, setUseRearCamera] = useState<boolean>(true);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const initializePreview = useCallback(async (rearPreferred: boolean = true) => {
    setErrorMsg(null);
    stopAllTracks();
    setIsCameraOff(false);

    try {
      const constraints: MediaStreamConstraints = {
        video: rearPreferred
          ? { facingMode: { exact: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setStreamState('PREVIEW');
    } catch (err) {
      console.error('[StreamInitError]:', err);
      setErrorMsg('Camera access denied or hardware unavailable.');
      setStreamState('IDLE');
    }
  }, [stopAllTracks]);

  useEffect(() => {
    initializePreview(true);
    return () => {
      stopAllTracks();
    };
  }, [initializePreview, stopAllTracks]);

  const toggleFullscreen = async () => {
    try {
      if (!isFullView) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullView(true);
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullView(false);
      }
    } catch {
      setIsFullView((prev) => !prev);
    }
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = isMuted;
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = isCameraOff;
    });
    setIsCameraOff(!isCameraOff);
  };

  const flipCamera = () => {
    const nextRear = !useRearCamera;
    setUseRearCamera(nextRear);
    initializePreview(nextRear);
  };

  const startLiveBroadcast = () => {
    setStreamState('LIVE');
    setViewerCount(1); // Simulated initial viewer
    if (onStreamStateChange) onStreamStateChange(true);
  };

  const stopLiveBroadcast = () => {
    setStreamState('PREVIEW');
    setViewerCount(0);
    if (onStreamStateChange) onStreamStateChange(false);
  };

  return (
    <div
      ref={containerRef}
      className={`lsc-shell ${isFullView ? 'lsc-shell--full' : 'lsc-shell--compact'}`}
    >
      {/* Telemetry Header */}
      <div className="lsc-header">
        <div className="lsc-header__left">
          <span className={`lsc-status-dot ${streamState === 'LIVE' ? 'lsc-status-dot--live' : ''}`} />
          <span className="lsc-header__title">
            {streamState === 'LIVE' ? '🔴 LIVE Broadcaster' : 'Live Stream Lobby'}
          </span>
          {streamState === 'LIVE' && (
            <div className="lsc-viewer-badge">
              <Icons.Users />
              <span>{viewerCount} Watching</span>
            </div>
          )}
        </div>

        <div className="lsc-header__right">
          <button onClick={toggleFullscreen} className="lsc-view-toggle">
            {isFullView ? <Icons.Shrink /> : <Icons.Expand />}
            <span>{isFullView ? 'Short View' : 'Full View'}</span>
          </button>
        </div>
      </div>

      {/* Viewport Stage */}
      <div className="lsc-stage">
        {errorMsg && <div className="lsc-error-banner">{errorMsg}</div>}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`lsc-video-stream ${isCameraOff ? 'lsc-video-stream--hidden' : ''}`}
          style={{ transform: useRearCamera ? 'scaleX(1)' : 'scaleX(-1)' }}
        />

        {isCameraOff && (
          <div className="lsc-avatar-placeholder">
            <div className="lsc-avatar-circle">
              <Icons.VideoOff />
            </div>
            <span className="lsc-avatar-subtext">Camera is muted</span>
          </div>
        )}

        {/* Floating Control Dock */}
        <div className="lsc-dock">
          {streamState === 'IDLE' && (
            <button onClick={() => initializePreview(useRearCamera)} className="lsc-btn lsc-btn--primary">
              <Icons.VideoOn />
              <span>Initialize Camera</span>
            </button>
          )}

          {streamState === 'PREVIEW' && (
            <>
              <button
                onClick={toggleMic}
                className={`lsc-dock__icon-btn ${isMuted ? 'lsc-dock__icon-btn--danger' : ''}`}
              >
                {isMuted ? <Icons.MicOff /> : <Icons.MicOn />}
              </button>

              <button
                onClick={toggleVideo}
                className={`lsc-dock__icon-btn ${isCameraOff ? 'lsc-dock__icon-btn--danger' : ''}`}
              >
                {isCameraOff ? <Icons.VideoOff /> : <Icons.VideoOn />}
              </button>

              <button onClick={flipCamera} className="lsc-dock__icon-btn">
                <Icons.SwitchCamera />
              </button>

              <div className="lsc-dock__divider" />

              <button onClick={startLiveBroadcast} className="lsc-btn lsc-btn--live">
                <Icons.Radio />
                <span>Go Live</span>
              </button>
            </>
          )}

          {streamState === 'LIVE' && (
            <>
              <button
                onClick={toggleMic}
                className={`lsc-dock__icon-btn ${isMuted ? 'lsc-dock__icon-btn--danger' : ''}`}
              >
                {isMuted ? <Icons.MicOff /> : <Icons.MicOn />}
              </button>

              <button onClick={stopLiveBroadcast} className="lsc-btn lsc-btn--end">
                <Icons.Square />
                <span>End Stream</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveStreamComponent;