import React, { useState, useRef, useEffect, useCallback } from 'react';

const EnterpriseVideoRecorder = ({
  onGeneratePresignedUrl, // async (contentType) => ({ uploadUrl, fileKey })
  onUploadComplete,       // (fileKey) => void
  onError,                // (errorMsg) => void
  maxDurationSeconds = 180,
}) => {
  const [recorderState, setRecorderState] = useState('IDLE'); // IDLE | PREVIEW | RECORDING | STOPPED | UPLOADING
  const [videoBlob, setVideoBlob] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoElementRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Enterprise cleanup mechanism to prevent memory leaks and dangling hardware streams
  const terminateMediaStream = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      terminateMediaStream();
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
      }
    };
  }, [terminateMediaStream, previewSrc]);

  // Robust cross-browser codec selection
  const resolveSupportedMimeType = () => {
    const supportedTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const handleInitializeCamera = async () => {
    try {
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
        setPreviewSrc(null);
      }
      setVideoBlob(null);
      setTimerSeconds(0);
      setUploadProgress(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      mediaStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.muted = true;
        await videoElementRef.current.play();
      }
      setRecorderState('PREVIEW');
    } catch (err) {
      onError?.(`Hardware Access Exception: ${err.message}`);
    }
  };

  const handleStartRecording = () => {
    if (!mediaStreamRef.current) return;

    try {
      recordedChunksRef.current = [];
      const mimeType = resolveSupportedMimeType();
      const recorder = new MediaRecorder(mediaStreamRef.current, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlobType = recorder.mimeType || 'video/webm';
        const generatedBlob = new Blob(recordedChunksRef.current, { type: finalBlobType });
        const objectUrl = URL.createObjectURL(generatedBlob);

        setVideoBlob(generatedBlob);
        setPreviewSrc(objectUrl);
        terminateMediaStream();

        if (videoElementRef.current) {
          videoElementRef.current.srcObject = null;
          videoElementRef.current.src = objectUrl;
          videoElementRef.current.muted = false;
        }
        setRecorderState('STOPPED');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500); // 500ms time slice chunks
      setRecorderState('RECORDING');
      setTimerSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            handleStopRecording();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      onError?.(`Recording Initialization Failure: ${err.message}`);
    }
  };

  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // High-performance direct binary S3 upload via Pre-signed URL
  const handleCloudUpload = async () => {
    if (!videoBlob) return;

    try {
      setRecorderState('UPLOADING');
      setUploadProgress(10);

      const contentType = videoBlob.type || 'video/webm';
      const { uploadUrl, fileKey } = await onGeneratePresignedUrl(contentType);
      setUploadProgress(40);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: videoBlob,
      });

      if (!response.ok) {
        throw new Error(`Cloud storage upload rejected with status code ${response.status}`);
      }

      setUploadProgress(100);
      onUploadComplete?.(fileKey);
      handleReset();
    } catch (err) {
      setRecorderState('STOPPED');
      onError?.(`Cloud Sync Error: ${err.message}`);
    }
  };

  const handleReset = () => {
    terminateMediaStream();
    if (previewSrc) URL.revokeObjectURL(previewSrc);
    setPreviewSrc(null);
    setVideoBlob(null);
    setTimerSeconds(0);
    setUploadProgress(0);
    setRecorderState('IDLE');
  };

    const formatTimerDisplay = (sec) => {
    const mins = String(Math.floor(sec / 60)).padStart(2, '0');
    const secs = String(sec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="enterprise-recorder-container" style={{ maxWidth: '720px', margin: '0 auto', background: '#1e1e1e', padding: '20px', borderRadius: '12px', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
        <video
          ref={videoElementRef}
          playsInline
          controls={recorderState === 'STOPPED'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {recorderState === 'RECORDING' && (
          <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(239, 68, 68, 0.9)', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
            REC {formatTimerDisplay(timerSeconds)}
          </div>
        )}
      </div>

      {recorderState === 'UPLOADING' && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span>Uploading securely to Cloud Storage...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center' }}>
        {recorderState === 'IDLE' && (
          <button onClick={handleInitializeCamera} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
            Initialize Camera
          </button>
        )}

        {recorderState === 'PREVIEW' && (
          <>
            <button onClick={handleStartRecording} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Start Recording
            </button>
            <button onClick={handleReset} style={{ background: '#4b5563', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </>
        )}

        {recorderState === 'RECORDING' && (
          <button onClick={handleStopRecording} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
            Stop Recording
          </button>
        )}

        {recorderState === 'STOPPED' && (
          <>
            <button onClick={handleCloudUpload} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Upload to Cloud
            </button>
            <button onClick={handleInitializeCamera} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Retake Video
            </button>
            <button onClick={handleReset} style={{ background: '#4b5563', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Discard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EnterpriseVideoRecorder;
