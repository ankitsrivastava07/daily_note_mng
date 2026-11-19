import React, { useState, useRef, useEffect, useCallback } from 'react';
import './CSS/VideoRecorderComponent.css';

interface VideoRecorderProps {
  referenceId?: string;
  onUploadSuccess?: (fileName: string) => void;
  maxDurationSeconds?: number;
}

type StreamState = 'IDLE' | 'PREVIEW_LIVE' | 'RECORDING' | 'REVIEW' | 'UPLOADING' | 'MERGING';
type SourceMode = 'CAMERA' | 'SCREEN';
type VideoResolution = '720P' | '1080P' | '4K';

const DEFAULT_USER_ID = 'ankit0397';
const TARGET_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB OOM-safe buffer threshold
const MAX_RETRIES = 3;

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
  ScreenShare: ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="m9 10 3-3 3 3" />
      <line x1="12" y1="7" x2="12" y2="14" />
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
  Retake: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  CloudUpload: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  ),
  StopSquare: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
  RecordCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
};

export const VideoRecorderComponent: React.FC<VideoRecorderProps> = ({
  referenceId = 'note_123',
  onUploadSuccess,
  maxDurationSeconds = 10800,
}) => {
  const [streamState, setStreamState] = useState<StreamState>('IDLE');
  const [sourceMode, setSourceMode] = useState<SourceMode>('CAMERA');
  const [isFullView, setIsFullView] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedResolution, setSelectedResolution] = useState<VideoResolution>('1080P');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [useRearCamera, setUseRearCamera] = useState<boolean>(true);

  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const studioContainerRef = useRef<HTMLDivElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 10 MB chunk buffer + sequential upload queue
  const currentBatchChunksRef = useRef<Blob[]>([]);
  const currentBatchSizeRef = useRef<number>(0);
  const partCounterRef = useRef<number>(1);
  const baseFileNameRef = useRef<string>('');
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const hasUploadErrorRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const initializeMedia = useCallback(
    async (mode: SourceMode = 'CAMERA', overrideRear?: boolean, resOverride?: VideoResolution) => {
      setErrorMsg(null);
      stopAllTracks();
      setZoomLevel(1);
      setIsCameraOff(false);

      const rearPreferred = overrideRear !== undefined ? overrideRear : useRearCamera;
      const targetRes = resOverride || selectedResolution;

      try {
        let stream: MediaStream;

        if (mode === 'SCREEN') {
          const displayOptions: DisplayMediaStreamOptions & { selfBrowserSurface?: string } = {
            video: { frameRate: { ideal: 30 } },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            } as MediaTrackConstraints,
            selfBrowserSurface: 'exclude',
          };

          const displayStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);

          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            });
            stream = new MediaStream([
              ...displayStream.getVideoTracks(),
              ...micStream.getAudioTracks(),
            ]);
          } catch {
            stream = displayStream;
          }

          displayStream.getVideoTracks()[0].onended = () => {
            if (mediaRecorderRef.current?.state === 'recording') {
              stopRecording();
            } else {
              initializeMedia('CAMERA', rearPreferred, targetRes);
            }
          };
        } else {
          let videoConstraints: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } };
          if (targetRes === '720P') {
            videoConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
          } else if (targetRes === '4K') {
            videoConstraints = { width: { ideal: 3840 }, height: { ideal: 2160 } };
          }

          const constraints: MediaStreamConstraints = {
            video: rearPreferred
              ? { facingMode: 'environment', ...videoConstraints }
              : { facingMode: 'user', ...videoConstraints },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          };

          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: videoConstraints,
              audio: true,
            });
          }
        }

        streamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }

        setSourceMode(mode);
        setStreamState('PREVIEW_LIVE');
      } catch (err) {
        console.error('[MediaStreamError]:', err);
        setErrorMsg(
          mode === 'SCREEN'
            ? 'Screen share cancelled or permission denied.'
            : 'Camera/Mic access denied or unavailable.'
        );
        if (mode === 'SCREEN') {
          setSourceMode('CAMERA');
        }
        setStreamState('IDLE');
      }
    },
    [selectedResolution, stopAllTracks, useRearCamera]
  );

  useEffect(() => {
    initializeMedia('CAMERA', true);
    return () => {
      stopAllTracks();
    };
  }, []);

  const toggleFullAndCompactView = async () => {
    try {
      if (!isFullView) {
        if (studioContainerRef.current?.requestFullscreen) {
          await studioContainerRef.current.requestFullscreen();
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

  const applyZoom = (newZoom: number) => {
    const clamped = Math.min(3, Math.max(1, Number(newZoom.toFixed(1))));
    setZoomLevel(clamped);
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });
    setIsMuted(!isMuted);
  };

  const toggleVideoFeed = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = isCameraOff;
    });
    setIsCameraOff(!isCameraOff);
  };

  const handleFlipCamera = () => {
    if (sourceMode === 'SCREEN' || isCameraOff) return;
    const nextRear = !useRearCamera;
    setUseRearCamera(nextRear);
    initializeMedia('CAMERA', nextRear);
  };

  const enqueuePresignedChunkUpload = (chunkBlob: Blob, partIndex: number, baseFileName: string): Promise<void> => {
    const runUpload = async () => {
      const contentType = chunkBlob.type || 'video/webm';
      const apiBaseUrl = import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095';
      const userId = localStorage.getItem('userId') || DEFAULT_USER_ID;
      const partFileName = `part_${String(partIndex).padStart(5, '0')}_${Date.now()}.webm`;

      let lastErr: unknown;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const presignUrl =
            `${apiBaseUrl}/api/v1/video/presign-chunk` +
            `?userId=${encodeURIComponent(userId)}` +
            `&baseFileName=${encodeURIComponent(baseFileName)}` +
            `&referenceId=${encodeURIComponent(referenceId)}` +
            `&fileName=${encodeURIComponent(partFileName)}` +
            `&contentType=${encodeURIComponent(contentType)}`;

          const signRes = await fetch(presignUrl);
          if (!signRes.ok) {
            throw new Error(`Presign failed (${signRes.status})`);
          }

          const signData = await signRes.json();
          const uploadUrl: string | undefined = signData.uploadUrl || signData.data;
          if (!uploadUrl) {
            throw new Error('Missing uploadUrl in presign response');
          }

          const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: chunkBlob,
          });

          if (!putRes.ok) {
            throw new Error(`Direct S3 PUT failed (${putRes.status})`);
          }

          return;
        } catch (err) {
          lastErr = err;
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }
      }

      throw lastErr instanceof Error ? lastErr : new Error(`Part ${partIndex} upload failed`);
    };

    uploadQueueRef.current = uploadQueueRef.current
      .then(runUpload)
      .catch((err) => {
        console.error(`[PresignedChunkError - Part ${partIndex}]:`, err);
        hasUploadErrorRef.current = true;
        setErrorMsg(`Part ${partIndex} upload fail hua. Save block kiya gaya hai.`);
        throw err;
      });

    return uploadQueueRef.current;
  };

  const flushBuffer = (forceFinal: boolean, mimeType: string) => {
    if (currentBatchSizeRef.current === 0) return;
    if (!forceFinal && currentBatchSizeRef.current < TARGET_CHUNK_SIZE) return;

    const chunkBlob = new Blob(currentBatchChunksRef.current, { type: mimeType });
    const partIdx = partCounterRef.current++;

    currentBatchChunksRef.current = [];
    currentBatchSizeRef.current = 0;

    enqueuePresignedChunkUpload(chunkBlob, partIdx, baseFileNameRef.current);
  };

  const handleFinishAndMerge = async () => {
    if (hasUploadErrorRef.current) {
      setErrorMsg('Pehle upload issue resolve karein, tab video save hogi.');
      setStreamState('REVIEW');
      return;
    }

    setStreamState('MERGING');
    setErrorMsg(null);
    setNotification({ message: 'Video save ho rahi hai, kripya ruken...', type: 'success' });

    try {
      const apiBaseUrl = import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095';
      const userId = localStorage.getItem('userId') || DEFAULT_USER_ID;

      const res = await fetch(
        `${apiBaseUrl}/api/v1/video/merge-chunks?baseFileName=${encodeURIComponent(baseFileNameRef.current)}&referenceId=${encodeURIComponent(referenceId)}&userId=${encodeURIComponent(userId)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );

      if (!res.ok) throw new Error('Failed to merge video chunks on server');

      const data = await res.json();
      const mergedUrl = data.finalUrl || data.data;
      if (!mergedUrl) throw new Error('Missing merged video URL');

      setFinalVideoUrl(mergedUrl);
      setStreamState('REVIEW');
      setNotification({ message: 'Video ready hai aur play ho rahi hai!', type: 'success' });
      setTimeout(() => setNotification(null), 4000);

      if (onUploadSuccess) {
        onUploadSuccess(baseFileNameRef.current);
      }
    } catch (err) {
      console.error('[MergeError]:', err);
      setErrorMsg('Video save karne mein error aaya. Retry Save dabayein.');
      setStreamState('REVIEW');
      setNotification({ message: 'Video save nahi ho paayi. Retry Save dabayein.', type: 'error' });
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    setErrorMsg(null);
    setFinalVideoUrl(null);
    hasUploadErrorRef.current = false;

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const recorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 1800000,
      });

      mediaRecorderRef.current = recorder;
      currentBatchChunksRef.current = [];
      currentBatchSizeRef.current = 0;
      partCounterRef.current = 1;
      uploadQueueRef.current = Promise.resolve();

      const prefix = sourceMode === 'SCREEN' ? 'screen_capture' : 'video_capture';
      baseFileNameRef.current = `${prefix}_${Date.now()}`;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          currentBatchChunksRef.current.push(e.data);
          currentBatchSizeRef.current += e.data.size;
          flushBuffer(false, mimeType);
        }
      };

      recorder.onstop = async () => {
        flushBuffer(true, mimeType);
        stopAllTracks();
        setStreamState('UPLOADING');

        try {
          await uploadQueueRef.current;
          await handleFinishAndMerge();
        } catch {
          setStreamState('REVIEW');
          setNotification({ message: 'Upload fail hua. Retry Save dabakar try karein.', type: 'error' });
        }
      };

      recorder.start(5000);
      setElapsedSeconds(0);
      setStreamState('RECORDING');

      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            stopRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('[MediaRecorderError]:', err);
      setErrorMsg('Unable to start recording.');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDiscardAndRestart = () => {
    setFinalVideoUrl(null);
    setErrorMsg(null);
    setElapsedSeconds(0);
    initializeMedia('CAMERA', useRearCamera);
  };

  const formatTimer = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return hours > 0 ? `${hours}:${mins}:${secs}` : `${mins}:${secs}`;
  };

  const isVideoHidden = isCameraOff || sourceMode === 'SCREEN';
  const dynamicVideoTransform = `${useRearCamera && sourceMode === 'CAMERA' ? 'scaleX(1)' : 'scaleX(-1)'} scale(${zoomLevel})`;

  return (
    <div
      ref={studioContainerRef}
      className={`vrc-shell ${isFullView ? 'vrc-shell--full' : 'vrc-shell--compact'}`}
    >
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: notification.type === 'success' ? '#10B981' : '#EF4444',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 500,
          }}
        >
          <span>{notification.type === 'success' ? '🚀' : '⚠️'}</span>
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="vrc-header">
        <div className="vrc-header__left">
          <span className={`vrc-status-dot ${streamState === 'RECORDING' ? 'vrc-status-dot--recording' : ''}`} />
          <span className="vrc-header__title">
            {sourceMode === 'SCREEN' ? 'Screen Share Studio' : 'Live Video Studio'}
          </span>
          <span className="vrc-timer-badge">
            {streamState === 'RECORDING' ? `REC ${formatTimer(elapsedSeconds)}` : formatTimer(elapsedSeconds)}
          </span>
        </div>

        <div className="vrc-header__right">
          {sourceMode === 'CAMERA' && streamState !== 'REVIEW' && streamState !== 'MERGING' && streamState !== 'UPLOADING' && (
            <>
              <select
                value={selectedResolution}
                onChange={(e) => {
                  const newRes = e.target.value as VideoResolution;
                  setSelectedResolution(newRes);
                  initializeMedia(sourceMode, useRearCamera, newRes);
                }}
                disabled={streamState === 'RECORDING'}
                className="vrc-resolution-select"
              >
                <option value="720P">720p HD</option>
                <option value="1080P">1080p FHD</option>
                <option value="4K">4K UHD</option>
              </select>

              <div className="vrc-zoom-group">
                <button
                  onClick={() => applyZoom(zoomLevel - 0.5)}
                  disabled={zoomLevel <= 1}
                  className="vrc-zoom-btn"
                >
                  −
                </button>
                <span className="vrc-zoom-label">{zoomLevel.toFixed(1)}x</span>
                <button
                  onClick={() => applyZoom(zoomLevel + 0.5)}
                  disabled={zoomLevel >= 3}
                  className="vrc-zoom-btn"
                >
                  +
                </button>
              </div>
            </>
          )}

          <button onClick={toggleFullAndCompactView} className="vrc-view-toggle">
            {isFullView ? <Icons.Shrink /> : <Icons.Expand />}
            <span>{isFullView ? 'Short View' : 'Full View'}</span>
          </button>
        </div>
      </div>

      <div className="vrc-stage">
        {errorMsg && <div className="vrc-error-banner">{errorMsg}</div>}

        {streamState === 'UPLOADING' || streamState === 'MERGING' ? (
          <div className="vrc-placeholder">
            <div className="vrc-spinner" />
            <div className="vrc-placeholder__heading">
              {streamState === 'UPLOADING' ? 'Saving your recording...' : 'Preparing your video...'}
            </div>
            <div className="vrc-placeholder__sub">Please wait while your video is being processed.</div>
          </div>
        ) : streamState !== 'REVIEW' ? (
          <>
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className={`vrc-video-stream ${isVideoHidden ? 'vrc-video-stream--hidden' : ''}`}
              style={{ transform: dynamicVideoTransform }}
            />

            {sourceMode === 'SCREEN' && (
              <div className="vrc-placeholder">
                <div className="vrc-screen-icon-circle">
                  <Icons.ScreenShare size={28} />
                </div>
                <div className="vrc-placeholder__heading">Screen Capture Active</div>
                <div className="vrc-placeholder__sub">Recording and auto-saving in progress.</div>
              </div>
            )}

            {sourceMode === 'CAMERA' && isCameraOff && (
              <div className="vrc-placeholder">
                <div className="vrc-avatar-circle">
                  <Icons.VideoOff />
                </div>
                <span className="vrc-avatar-subtext">Camera is turned off</span>
              </div>
            )}
          </>
        ) : finalVideoUrl ? (
          <video
            src={finalVideoUrl}
            controls
            autoPlay
            playsInline
            className="vrc-review-stream"
          />
        ) : (
          <div className="vrc-placeholder">
            <div className="vrc-placeholder__heading">Recording Stopped</div>
            <div className="vrc-placeholder__sub">
              {errorMsg
                ? 'Video save nahi ho paayi. Neeche "Retry Save" dabayein.'
                : 'Aapki video process ho rahi hai...'}
            </div>
          </div>
        )}

        <div className="vrc-dock">
          {streamState === 'IDLE' && (
            <button onClick={() => initializeMedia('CAMERA', useRearCamera)} className="vrc-btn vrc-btn--primary">
              <Icons.VideoOn />
              <span>Enable Camera</span>
            </button>
          )}

          {(streamState === 'PREVIEW_LIVE' || streamState === 'RECORDING') && (
            <>
              <button
                onClick={toggleMic}
                className={`vrc-dock__icon-btn ${isMuted ? 'vrc-dock__icon-btn--danger' : ''}`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? <Icons.MicOff /> : <Icons.MicOn />}
              </button>

              {sourceMode === 'CAMERA' && (
                <button
                  onClick={toggleVideoFeed}
                  className={`vrc-dock__icon-btn ${isCameraOff ? 'vrc-dock__icon-btn--danger' : ''}`}
                  title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isCameraOff ? <Icons.VideoOff /> : <Icons.VideoOn />}
                </button>
              )}

              {sourceMode === 'CAMERA' && (
                <button
                  onClick={handleFlipCamera}
                  className={`vrc-dock__icon-btn ${useRearCamera ? 'vrc-dock__icon-btn--active' : ''}`}
                  disabled={streamState === 'RECORDING' || isCameraOff}
                  title="Flip Camera"
                >
                  <Icons.SwitchCamera />
                </button>
              )}

              <button
                onClick={() =>
                  initializeMedia(
                    sourceMode === 'CAMERA' ? 'SCREEN' : 'CAMERA',
                    useRearCamera
                  )
                }
                disabled={streamState === 'RECORDING'}
                className={`vrc-dock__icon-btn ${sourceMode === 'SCREEN' ? 'vrc-dock__icon-btn--active' : ''}`}
                title="Share Screen"
              >
                <Icons.ScreenShare />
              </button>

              <div className="vrc-dock__divider" />

              {streamState === 'PREVIEW_LIVE' ? (
                <button onClick={startRecording} className="vrc-btn vrc-btn--record">
                  <Icons.RecordCircle />
                  <span>Start</span>
                </button>
              ) : (
                <button onClick={stopRecording} className="vrc-btn vrc-btn--stop">
                  <Icons.StopSquare />
                  <span>Stop Recording</span>
                </button>
              )}
            </>
          )}

          {streamState === 'REVIEW' && (
            <>
              <button onClick={handleDiscardAndRestart} className="vrc-btn vrc-btn--secondary">
                <Icons.Retake />
                <span>Record New</span>
              </button>
              {!finalVideoUrl && errorMsg && (
                <button onClick={handleFinishAndMerge} className="vrc-btn vrc-btn--save">
                  <Icons.CloudUpload />
                  <span>Retry Save</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoRecorderComponent;