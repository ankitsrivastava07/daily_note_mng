import React, { useState, useRef, useEffect, useCallback } from 'react';
import './CSS/VideoRecorderComponent.css';

interface VideoRecorderProps {
  referenceId?: string;
  onUploadSuccess?: (fileName: string) => void;
  maxDurationSeconds?: number;
}

type StreamState = 'IDLE' | 'PREVIEW_LIVE' | 'RECORDING' | 'REVIEW' | 'UPLOADING' | 'SAVING';
type VideoResolution = '480P' | '720P' | '1080P' | '1440P' | '4K';

const DEFAULT_USER_ID = 'ankit0397';
const TARGET_CHUNK_SIZE = 10 * 1024 * 1024;
const MAX_CONCURRENCY = 1;
const MAX_RETRIES = 2;
const TIMESLICE_MS = 2500;
const VIDEO_BITRATE_BY_RESOLUTION: Record<VideoResolution, number> = {
  '480P': 1500000,
  '720P': 3000000,
  '1080P': 6000000,
  '1440P': 10000000,
  '4K': 18000000,
};

const RESOLUTION_CONSTRAINTS: Record<VideoResolution, { width: number; height: number }> = {
  '480P': { width: 854, height: 480 },
  '720P': { width: 1280, height: 720 },
  '1080P': { width: 1920, height: 1080 },
  '1440P': { width: 2560, height: 1440 },
  '4K': { width: 3840, height: 2160 },
};

interface PendingChunkTask {
  chunkBlob: Blob;
  partIndex: number;
  baseFileName: string;
}

export const VideoRecorderComponent: React.FC<VideoRecorderProps> = ({
  referenceId = 'note_123',
  onUploadSuccess,
  maxDurationSeconds = 10800,
}) => {
  const [streamState, setStreamState] = useState<StreamState>('IDLE');
  const [isFullView, setIsFullView] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedResolution, setSelectedResolution] = useState<VideoResolution>('720P');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [useRearCamera, setUseRearCamera] = useState<boolean>(true);

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const studioContainerRef = useRef<HTMLDivElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentBatchChunksRef = useRef<Blob[]>([]);
  const currentBatchSizeRef = useRef<number>(0);
  const totalUploadedBytesRef = useRef<number>(0);
  const partCounterRef = useRef<number>(1);
  const baseFileNameRef = useRef<string>('');
  const videoIdRef = useRef<string>('');
  const uploadIdRef = useRef<string>('');
  const completedPartsRef = useRef<Map<number, string>>(new Map());
  const failedTasksRef = useRef<PendingChunkTask[]>([]);
  const recordingMimeTypeRef = useRef<string>('video/webm');
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecondsRef = useRef<number>(0);

  const taskQueueRef = useRef<PendingChunkTask[]>([]);
  const activeWorkersRef = useRef<number>(0);
  const hasUploadErrorRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const drainResolversRef = useRef<Array<{ resolve: () => void; reject: (err: unknown) => void }>>([]);

  const getApiBaseUrl = () =>
    (import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095').replace(/\/+$/, '');

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      streamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      isStoppingRef.current = false;
    }
  }, []);

  const initializeMedia = useCallback(
    async (overrideRear?: boolean, resOverride?: VideoResolution) => {
      setErrorMsg(null);
      stopAllTracks();
      setZoomLevel(1);
      setIsCameraOff(false);

      const rearPreferred = overrideRear !== undefined ? overrideRear : useRearCamera;
      const targetRes = resOverride || selectedResolution;

      try {
        const requestedSize = RESOLUTION_CONSTRAINTS[targetRes];
        // "ideal" asks the camera for this resolution without failing when
        // the device/browser cannot provide it.
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: requestedSize.width },
          height: { ideal: requestedSize.height },
        };

        const audioConstraints: MediaTrackConstraints | boolean = isMuted
          ? false
          : {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          };

        const constraints: MediaStreamConstraints = {
          video: rearPreferred
            ? { facingMode: 'environment', ...videoConstraints }
            : { facingMode: 'user', ...videoConstraints },
          audio: audioConstraints,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: !isMuted,
          });
        }

        // If the user switched tabs while the permission dialog was open,
        // do not leave the camera running in the background.
        if (!isMountedRef.current || document.visibilityState === 'hidden') {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }

        setStreamState('PREVIEW_LIVE');
      } catch (err) {
        console.error('[MediaStreamError]:', err);
        if (!isMountedRef.current) return;
        setErrorMsg('Camera/Mic access denied or unavailable.');
        setStreamState('IDLE');
      }
    },
    [isMuted, selectedResolution, stopAllTracks, useRearCamera]
  );

  useEffect(() => {
    isMountedRef.current = true;
    initializeMedia(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;

      // A tab switch ends an active recording cleanly; onstop flushes the
      // final chunk and the existing multipart upload flow continues.
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        setIsCameraOff(true);
        // Stop MediaRecorder first so its final dataavailable event is queued,
        // then release the camera/microphone hardware immediately.
        stopRecording();
        stopAllTracks();
        return;
      }

      // Preview-only camera: release hardware immediately. It will NOT
      // automatically restart when the user returns to this tab.
      if (streamRef.current) {
        stopAllTracks();
        setIsCameraOff(true);
        setStreamState((current) =>
          current === 'UPLOADING' || current === 'SAVING' || current === 'REVIEW'
            ? current
            : 'IDLE'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      isMountedRef.current = false;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Ignore cleanup errors on unmount
        }
      }
      mediaRecorderRef.current = null;
      stopAllTracks();
    };
  }, []);

  const notifyDrainIfIdle = () => {
    if (activeWorkersRef.current === 0 && taskQueueRef.current.length === 0) {
      const resolvers = drainResolversRef.current.splice(0, drainResolversRef.current.length);
      if (hasUploadErrorRef.current) {
        resolvers.forEach((r) => r.reject(new Error('One or more chunk uploads failed')));
      } else {
        resolvers.forEach((r) => r.resolve());
      }
    }
  };

  const uploadSingleChunkWithRetry = async (task: PendingChunkTask): Promise<void> => {
    const contentType = task.chunkBlob.type || recordingMimeTypeRef.current || 'video/webm';
    const apiBaseUrl = getApiBaseUrl();
    const userId = localStorage.getItem('userId') || DEFAULT_USER_ID;

    if (!videoIdRef.current || !uploadIdRef.current) {
      throw new Error('Multipart upload session missing. Please restart recording.');
    }

    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const partUrl =
          `${apiBaseUrl}/api/v1/video/multipart/part-url` +
          `?userId=${encodeURIComponent(userId)}` +
          `&videoId=${encodeURIComponent(videoIdRef.current)}` +
          `&partNumber=${encodeURIComponent(String(task.partIndex))}`;

        const signRes = await fetch(partUrl, { method: 'GET' });
        if (!signRes.ok) {
          throw new Error(`Part URL request failed (${signRes.status})`);
        }

        const signData: { uploadUrl?: string } = await signRes.json();
        if (!signData.uploadUrl) {
          throw new Error('Missing uploadUrl in multipart part-url response');
        }

        const putRes = await fetch(signData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: task.chunkBlob,
        });

        if (!putRes.ok) {
          throw new Error(`S3 multipart PUT failed (${putRes.status})`);
        }

        const eTag = putRes.headers.get('ETag');
        if (!eTag) {
          throw new Error(
            'S3 ETag browser ko nahi mila. Bucket CORS mein ExposeHeaders: ["ETag"] add karo.'
          );
        }

        // Map prevents duplicate entries if the same part is retried.
        completedPartsRef.current.set(task.partIndex, eTag);
        totalUploadedBytesRef.current += task.chunkBlob.size;
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error(`Multipart part ${task.partIndex} upload failed`);
  };

  const pumpUploadQueue = () => {
    while (activeWorkersRef.current < MAX_CONCURRENCY && taskQueueRef.current.length > 0) {
      const nextTask = taskQueueRef.current.shift();
      if (!nextTask) break;

      activeWorkersRef.current += 1;
      uploadSingleChunkWithRetry(nextTask)
        .catch((err) => {
          console.error(`[PresignedChunkError - Part ${nextTask.partIndex}]:`, err);
          hasUploadErrorRef.current = true;
          failedTasksRef.current.push(nextTask);
          if (isMountedRef.current) {
            setErrorMsg(`Part ${nextTask.partIndex} upload fail hua. Retry Save dabakar try karein.`);
          }
        })
        .finally(() => {
          activeWorkersRef.current -= 1;
          pumpUploadQueue();
          notifyDrainIfIdle();
        });
    }
  };

  const waitForAllUploads = (): Promise<void> => {
    if (activeWorkersRef.current === 0 && taskQueueRef.current.length === 0) {
      return hasUploadErrorRef.current
        ? Promise.reject(new Error('Chunk upload failed'))
        : Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      drainResolversRef.current.push({ resolve, reject });
    });
  };

  const enqueuePresignedChunkUpload = (chunkBlob: Blob, partIndex: number, baseFileName: string) => {
    taskQueueRef.current.push({ chunkBlob, partIndex, baseFileName });
    pumpUploadQueue();
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

  const loadSinglePlaybackUrl = async () => {
    const apiBaseUrl = getApiBaseUrl();
    const userId = localStorage.getItem('userId') || DEFAULT_USER_ID;

    const res = await fetch(
      `${apiBaseUrl}/api/v1/video/playback/${encodeURIComponent(videoIdRef.current)}` +
      `?userId=${encodeURIComponent(userId)}`
    );

    if (!res.ok) {
      throw new Error(`Playback URL request failed (${res.status})`);
    }

    const responseText = await res.text();
    let url = responseText;
    try {
      url = JSON.parse(responseText);
    } catch {
      // Spring ResponseEntity<String> may return a plain URL.
    }

    if (typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error('Invalid playback URL returned by backend');
    }

    if (isMountedRef.current) {
      setPlaybackUrl(url);
    }
  };

  const handleRegisterVideo = async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setStreamState('SAVING');
    setErrorMsg(null);

    try {
      // Requeue only tasks that failed; successful parts keep their ETags.
      if (failedTasksRef.current.length > 0) {
        const retryTasks = failedTasksRef.current.splice(0);
        hasUploadErrorRef.current = false;
        retryTasks.forEach((task) => taskQueueRef.current.push(task));
        pumpUploadQueue();
      }

      await waitForAllUploads();

      const parts = Array.from(completedPartsRef.current.entries())
        .sort(([partA], [partB]) => partA - partB)
        .map(([partNumber, eTag]) => ({ partNumber, eTag }));

      if (parts.length === 0) {
        throw new Error('No uploaded video parts found');
      }

      const apiBaseUrl = getApiBaseUrl();
      const userId = localStorage.getItem('userId') || DEFAULT_USER_ID;

      const completeRes = await fetch(
        `${apiBaseUrl}/api/v1/video/multipart/complete` +
        `?userId=${encodeURIComponent(userId)}` +
        `&videoId=${encodeURIComponent(videoIdRef.current)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts,
            fileSizeBytes: totalUploadedBytesRef.current,
            durationSeconds: elapsedSecondsRef.current,
          }),
        }
      );

      if (!completeRes.ok) {
        const errorText = await completeRes.text().catch(() => '');
        throw new Error(`Multipart complete failed (${completeRes.status}): ${errorText}`);
      }

      await loadSinglePlaybackUrl();

      if (!isMountedRef.current) return;
      setIsRegistered(true);
      setStreamState('REVIEW');
      setNotification({ message: 'Single video successfully saved!', type: 'success' });
      setTimeout(() => {
        if (isMountedRef.current) setNotification(null);
      }, 4000);

      if (onUploadSuccess) {
        onUploadSuccess(baseFileNameRef.current);
      }
    } catch (err) {
      console.error('[MultipartVideoSaveError]:', err);
      if (!isMountedRef.current) return;
      setIsRegistered(false);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Video save nahi ho paayi. Retry Save dabayein.'
      );
      setStreamState('REVIEW');
      setNotification({ message: 'Save failed. Please retry.', type: 'error' });
    } finally {
      isSavingRef.current = false;
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) return;

    setErrorMsg(null);
    setPlaybackUrl(null);
    setIsRegistered(false);
    totalUploadedBytesRef.current = 0;
    completedPartsRef.current.clear();
    failedTasksRef.current = [];
    hasUploadErrorRef.current = false;
    isStoppingRef.current = false;
    isSavingRef.current = false;
    taskQueueRef.current = [];
    drainResolversRef.current = [];
    partCounterRef.current = 1;
    videoIdRef.current = '';
    uploadIdRef.current = '';

    try {
      // Keep the stored S3 object extension and MIME type consistent.
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';

      if (!mimeType) {
        throw new Error('This browser does not support WebM recording.');
      }

      recordingMimeTypeRef.current = mimeType;
      baseFileNameRef.current = `video_capture_${Date.now()}`;

      const apiBaseUrl = getApiBaseUrl();
      const userId = localStorage.getItem('userId') || DEFAULT_USER_ID;
      const initiateUrl =
        `${apiBaseUrl}/api/v1/video/multipart/initiate` +
        `?userId=${encodeURIComponent(userId)}` +
        `&baseFileName=${encodeURIComponent(baseFileNameRef.current)}` +
        `&referenceId=${encodeURIComponent(referenceId)}` +
        `&mimeType=${encodeURIComponent(mimeType)}`;

      const initiateRes = await fetch(initiateUrl, { method: 'POST' });
      if (!initiateRes.ok) {
        throw new Error(`Multipart initiate failed (${initiateRes.status})`);
      }

      const initiateData: { videoId?: string; uploadId?: string } = await initiateRes.json();
      if (!initiateData.videoId || !initiateData.uploadId) {
        throw new Error('Multipart initiate response must contain videoId and uploadId');
      }

      videoIdRef.current = initiateData.videoId;
      uploadIdRef.current = initiateData.uploadId;

      const recorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: VIDEO_BITRATE_BY_RESOLUTION[selectedResolution],
      });

      mediaRecorderRef.current = recorder;
      currentBatchChunksRef.current = [];
      currentBatchSizeRef.current = 0;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          currentBatchChunksRef.current.push(event.data);
          currentBatchSizeRef.current += event.data.size;
          flushBuffer(false, mimeType);
        }
      };

      recorder.onstop = async () => {
        mediaRecorderRef.current = null;
        flushBuffer(true, mimeType);
        stopAllTracks();
        isStoppingRef.current = false;

        if (!isMountedRef.current) return;
        setStreamState('UPLOADING');

        // Allow the last queued part to finish before CompleteMultipartUpload.
        try {
          await waitForAllUploads();
          await handleRegisterVideo();
        } catch (err) {
          if (!isMountedRef.current) return;
          setStreamState('REVIEW');
          setErrorMsg(
            err instanceof Error ? err.message : 'Part upload failed. Retry Save dabayein.'
          );
          setNotification({ message: 'Upload fail hua. Retry Save dabakar try karein.', type: 'error' });
        }
      };

      recorder.start(TIMESLICE_MS);
      elapsedSecondsRef.current = 0;
      setElapsedSeconds(0);
      setStreamState('RECORDING');

      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((previous) => {
          const next = previous + 1;
          elapsedSecondsRef.current = next;
          if (next >= maxDurationSeconds) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('[MediaRecorderError]:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Unable to start recording.');
      setStreamState('PREVIEW_LIVE');
    }
  };

  const handleDiscardAndRestart = () => {
    setPlaybackUrl(null);
    setIsRegistered(false);
    setErrorMsg(null);
    setElapsedSeconds(0);
    initializeMedia(useRearCamera);
  };

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
    const nextMuted = !isMuted;
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    setIsMuted(nextMuted);
  };

  const toggleVideoFeed = () => {
    // Camera is currently off: explicitly request a fresh stream.
    if (isCameraOff) {
      initializeMedia(useRearCamera);
      return;
    }

    // Turning the camera off must release the hardware, not merely set
    // track.enabled=false (that keeps the camera device active).
    setIsCameraOff(true);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      // Stopping the video track ends this recording session; onstop flushes
      // the final chunk and the existing multipart upload flow saves it.
      stopRecording();
      stopAllTracks();
      return;
    }

    stopAllTracks();
    setStreamState('IDLE');
  };

  const handleFlipCamera = () => {
    if (isCameraOff) return;
    const nextRear = !useRearCamera;
    setUseRearCamera(nextRear);
    initializeMedia(nextRear);
  };

  const formatTimer = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return hours > 0 ? `${hours}:${mins}:${secs}` : `${mins}:${secs}`;
  };

  const dynamicVideoTransform = `${useRearCamera ? 'scaleX(1)' : 'scaleX(-1)'} scale(${zoomLevel})`;

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
          <span className="vrc-header__title">Live Video Studio</span>
          <span className="vrc-timer-badge">
            {streamState === 'RECORDING' ? `REC ${formatTimer(elapsedSeconds)}` : formatTimer(elapsedSeconds)}
          </span>
        </div>

        <div className="vrc-header__right">
          {streamState !== 'REVIEW' && streamState !== 'SAVING' && streamState !== 'UPLOADING' && (
            <>
              <select
                value={selectedResolution}
                onChange={(e) => {
                  const newRes = e.target.value as VideoResolution;
                  setSelectedResolution(newRes);
                  initializeMedia(useRearCamera, newRes);
                }}
                disabled={streamState === 'RECORDING'}
                className="vrc-resolution-select"
              >
                <option value="480P">480p SD</option>
                <option value="720P">720p HD</option>
                <option value="1080P">1080p Full HD</option>
                <option value="1440P">1440p QHD</option>
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
            <span>{isFullView ? 'Short View' : 'Full View'}</span>
          </button>
        </div>
      </div>

      <div className="vrc-stage">
        {errorMsg && <div className="vrc-error-banner">{errorMsg}</div>}

        {streamState === 'UPLOADING' || streamState === 'SAVING' ? (
          <div className="vrc-placeholder">
            <div className="vrc-spinner" />
            <div className="vrc-placeholder__heading">
              {streamState === 'UPLOADING' ? 'Uploading video parts to S3...' : 'Completing video upload...'}
            </div>
            <div className="vrc-placeholder__sub">Please wait while your recording is being saved.</div>
          </div>
        ) : streamState !== 'REVIEW' ? (
          <>
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className={`vrc-video-stream ${isCameraOff ? 'vrc-video-stream--hidden' : ''}`}
              style={{ transform: dynamicVideoTransform }}
            />

            {isCameraOff && (
              <div className="vrc-placeholder">
                <span className="vrc-avatar-subtext">Camera is turned off</span>
              </div>
            )}
          </>
        ) : playbackUrl ? (
          <video
            key={playbackUrl}
            src={playbackUrl}
            controls
            playsInline
            preload="metadata"
            className="vrc-review-stream"
          />
        ) : (
          <div className="vrc-placeholder">
            <div className="vrc-placeholder__heading">
              {isRegistered ? 'Recording Saved' : 'Recording Stopped'}
            </div>
            <div className="vrc-placeholder__sub">
              {errorMsg
                ? 'Video save nahi ho paayi. Neeche "Retry Save" dabayein.'
                : 'Video parts upload hone ke baad final video complete hogi.'}
            </div>
          </div>
        )}

        <div className="vrc-dock">
          {streamState === 'IDLE' && (
            <button onClick={() => initializeMedia(useRearCamera)} className="vrc-btn vrc-btn--primary">
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
                {isMuted ? 'Mic Off' : 'Mic On'}
              </button>

              <button
                onClick={toggleVideoFeed}
                className={`vrc-dock__icon-btn ${isCameraOff ? 'vrc-dock__icon-btn--danger' : ''}`}
                title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCameraOff ? 'Cam Off' : 'Cam On'}
              </button>

              <button
                onClick={handleFlipCamera}
                className={`vrc-dock__icon-btn ${useRearCamera ? 'vrc-dock__icon-btn--active' : ''}`}
                disabled={streamState === 'RECORDING' || isCameraOff}
                title="Flip Camera"
              >
                Flip
              </button>

              <div className="vrc-dock__divider" />

              {streamState === 'PREVIEW_LIVE' ? (
                <button onClick={startRecording} className="vrc-btn vrc-btn--record">
                  <span>Start</span>
                </button>
              ) : (
                <button onClick={stopRecording} className="vrc-btn vrc-btn--stop">
                  <span>Stop Recording</span>
                </button>
              )}
            </>
          )}

          {streamState === 'REVIEW' && (
            <>
              <button onClick={handleDiscardAndRestart} className="vrc-btn vrc-btn--secondary">
                <span>Record New</span>
              </button>
              {!isRegistered && (
                <button onClick={handleRegisterVideo} className="vrc-btn vrc-btn--save">
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