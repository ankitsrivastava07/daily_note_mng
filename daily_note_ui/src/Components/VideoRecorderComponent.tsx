import React, { useState, useRef, useEffect, useCallback } from 'react';
import './CSS/VideoRecorderComponent.css';

interface VideoRecorderProps {
  referenceId?: string;
  onUploadSuccess?: (fileName: string) => void;
  maxDurationSeconds?: number;
}

type StreamState = 'IDLE' | 'PREVIEW_LIVE' | 'RECORDING' | 'REVIEW' | 'UPLOADING';
type SourceMode = 'CAMERA' | 'SCREEN';

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
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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
  maxDurationSeconds = 300,
}) => {
  const [streamState, setStreamState] = useState<StreamState>('IDLE');
  const [sourceMode, setSourceMode] = useState<SourceMode>('CAMERA');
  const [isFullView, setIsFullView] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [useRearCamera, setUseRearCamera] = useState<boolean>(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const studioContainerRef = useRef<HTMLDivElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
    async (mode: SourceMode = 'CAMERA', overrideRear?: boolean, deviceId?: string) => {
      setErrorMsg(null);
      stopAllTracks();
      setZoomLevel(1);
      setIsCameraOff(false);

      const rearPreferred = overrideRear !== undefined ? overrideRear : useRearCamera;

      try {
        let stream: MediaStream;

        if (mode === 'SCREEN') {
          const displayOptions: DisplayMediaStreamOptions & { selfBrowserSurface?: string } = {
            video: { frameRate: { ideal: 30 } },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainCount: false,
            } as any,
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
              initializeMedia('CAMERA', rearPreferred, selectedDeviceId || undefined);
            }
          };
        } else {
          // Audio constraints configured to prevent background speaker / YouTube ducking/muting
          const constraints: MediaStreamConstraints = {
            video: deviceId
              ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
              : rearPreferred
              ? { facingMode: { exact: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
              : { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          };

          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
              audio: { echoCancellation: false, noiseSuppression: false },
            });
          }
        }

        streamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoInputs);

        setSourceMode(mode);
        setStreamState('PREVIEW_LIVE');
      } catch (err) {
        console.error('[MediaStreamError]:', err);
        setErrorMsg(
          mode === 'SCREEN'
            ? 'Screen share cancelled or permission denied.'
            : 'Camera access denied or rear camera unavailable.'
        );
        if (mode === 'SCREEN') {
          setSourceMode('CAMERA');
        }
        setStreamState('IDLE');
      }
    },
    [selectedDeviceId, stopAllTracks, useRearCamera]
  );

  useEffect(() => {
    initializeMedia('CAMERA', true);
    return () => {
      stopAllTracks();
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullView) {
        setIsFullView(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullView]);

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

    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
      const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities & {
        zoom?: { min: number; max: number };
      };
      if (capabilities.zoom) {
        const hwZoom = Math.min(capabilities.zoom.max, Math.max(capabilities.zoom.min, clamped));
        videoTrack.applyConstraints({ advanced: [{ zoom: hwZoom } as MediaTrackConstraintSet] }).catch(() => {});
      }
    }
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

  const startRecording = () => {
    if (!streamRef.current) return;
    setErrorMsg(null);

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setReviewUrl(objectUrl);
        stopAllTracks();
        setStreamState('REVIEW');
      };

      recorder.start(250);
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
      setErrorMsg('Unable to start recording stream.');
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
    if (reviewUrl) {
      URL.revokeObjectURL(reviewUrl);
    }
    setReviewUrl(null);
    setVideoBlob(null);
    setElapsedSeconds(0);
    initializeMedia('CAMERA', useRearCamera);
  };

  const handleDownloadLocal = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mountain_view_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadToS3 = async () => {
    if (!videoBlob) return;
    setStreamState('UPLOADING');
    setErrorMsg(null);

    try {
      const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const prefix = sourceMode === 'SCREEN' ? 'screen_capture' : 'mountain_capture';
      const fileName = `${prefix}_${Date.now()}.${ext}`;

      const dmsRes = await fetch(
        `/api/v1/documents/presigned-url?referenceId=${encodeURIComponent(referenceId)}&fileNames=${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!dmsRes.ok) {
        throw new Error(`DMS API Error (HTTP ${dmsRes.status})`);
      }

      const payload = await dmsRes.json();
      const presignedUrl: string | undefined = Array.isArray(payload.data)
        ? payload.data[0]
        : Array.isArray(payload)
        ? payload[0]
        : undefined;

      if (!presignedUrl) {
        throw new Error('Pre-signed URL missing in DMS response.');
      }

      const s3Res = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': videoBlob.type },
        body: videoBlob,
      });

      if (!s3Res.ok) {
        throw new Error(`S3 Upload Failed (HTTP ${s3Res.status})`);
      }

      if (onUploadSuccess) {
        onUploadSuccess(fileName);
      }

      alert('Mountain recording uploaded successfully to S3!');
      handleDiscardAndRestart();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network drop detected.';
      console.error('[S3UploadError]:', err);
      setErrorMsg(`${message} S3 upload failed, but you can download local backup below.`);
      setStreamState('REVIEW');
    }
  };

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const isVideoHidden = isCameraOff || sourceMode === 'SCREEN';
  const dynamicVideoTransform = `${useRearCamera && sourceMode === 'CAMERA' ? 'scaleX(1)' : 'scaleX(-1)'} scale(${zoomLevel})`;

  return (
    <div
      ref={studioContainerRef}
      className={`vrc-shell ${isFullView ? 'vrc-shell--full' : 'vrc-shell--compact'}`}
    >
      <div className="vrc-header">
        <div className="vrc-header__left">
          <span className={`vrc-status-dot ${streamState === 'RECORDING' ? 'vrc-status-dot--recording' : ''}`} />
          <span className="vrc-header__title">
            {sourceMode === 'SCREEN' ? 'Screen Share Studio' : useRearCamera ? '🏔️ Mountain View Studio' : 'Live Video Studio'}
          </span>
          <span className="vrc-timer-badge">
            {streamState === 'RECORDING' ? `REC ${formatTimer(elapsedSeconds)}` : formatTimer(elapsedSeconds)}
          </span>
        </div>

        <div className="vrc-header__right">
          {sourceMode === 'CAMERA' && streamState !== 'REVIEW' && (
            <div className="vrc-zoom-group">
              <button
                onClick={() => applyZoom(zoomLevel - 0.5)}
                disabled={zoomLevel <= 1}
                className="vrc-zoom-btn"
                title="Zoom Out"
              >
                −
              </button>
              <span className="vrc-zoom-label">{zoomLevel.toFixed(1)}x</span>
              <button
                onClick={() => applyZoom(zoomLevel + 0.5)}
                disabled={zoomLevel >= 3}
                className="vrc-zoom-btn"
                title="Zoom In"
              >
                +
              </button>
            </div>
          )}

          <button
            onClick={toggleFullAndCompactView}
            className="vrc-view-toggle"
            title={isFullView ? 'Switch to Compact View' : 'Expand to Full Screen'}
          >
            {isFullView ? <Icons.Shrink /> : <Icons.Expand />}
            <span>{isFullView ? 'Short View' : 'Full View'}</span>
          </button>
        </div>
      </div>

      <div className="vrc-stage">
        {errorMsg && <div className="vrc-error-banner">{errorMsg}</div>}

        {streamState !== 'REVIEW' && streamState !== 'UPLOADING' ? (
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
                <div className="vrc-placeholder__sub">
                  Switch to another tab or window to record. Preview is hidden here to prevent mirror loop.
                </div>
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
        ) : (
          <video
            src={reviewUrl || ''}
            controls
            playsInline
            className="vrc-review-stream"
          />
        )}

        {streamState === 'UPLOADING' && (
          <div className="vrc-upload-overlay">
            <div className="vrc-upload-text">
              <Icons.CloudUpload />
              <span>Uploading stream to AWS S3...</span>
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
                  title={isCameraOff ? 'Turn camera on to flip' : useRearCamera ? 'Switch to Selfie Camera' : 'Switch to Mountain Rear Camera'}
                >
                  <Icons.SwitchCamera />
                </button>
              )}

              <button
                onClick={() =>
                  initializeMedia(
                    sourceMode === 'CAMERA' ? 'SCREEN' : 'CAMERA',
                    useRearCamera,
                    selectedDeviceId || undefined
                  )
                }
                disabled={streamState === 'RECORDING'}
                className={`vrc-dock__icon-btn ${sourceMode === 'SCREEN' ? 'vrc-dock__icon-btn--active' : ''}`}
                title={sourceMode === 'SCREEN' ? 'Switch to Camera' : 'Share Screen'}
              >
                <Icons.ScreenShare />
              </button>

              <div className="vrc-dock__divider" />

              {streamState === 'PREVIEW_LIVE' ? (
                <button onClick={startRecording} className="vrc-btn vrc-btn--record">
                  <Icons.RecordCircle />
                  <span>Start Record</span>
                </button>
              ) : (
                <button onClick={stopRecording} className="vrc-btn vrc-btn--stop">
                  <Icons.StopSquare />
                  <span>Stop</span>
                </button>
              )}
            </>
          )}

          {streamState === 'REVIEW' && (
            <>
              <button onClick={handleDiscardAndRestart} className="vrc-btn vrc-btn--secondary">
                <Icons.Retake />
                <span>Retake</span>
              </button>
              <button onClick={handleDownloadLocal} className="vrc-btn vrc-btn--secondary" title="Save copy to phone storage">
                <Icons.Download />
                <span>Save Local</span>
              </button>
              <button onClick={handleUploadToS3} className="vrc-btn vrc-btn--save">
                <Icons.CloudUpload />
                <span>Upload to S3</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoRecorderComponent;