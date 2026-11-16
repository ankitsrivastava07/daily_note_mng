import React, { useState, useRef, useEffect, useCallback } from 'react';

const LiveVideoRecorderComponent = ({
  getPresignedUploadUrl, // async () => ({ uploadUrl, fileKey })
  onUploadSuccess,       // (fileKey) => void
  onError,               // (errorMessage) => void
  maxDurationSec = 120,
}) => {
  const [status, setStatus] = useState('IDLE'); // IDLE | PREVIEW | RECORDING | STOPPED | UPLOADING
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Stop all active media tracks & clear timers
  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Revoke object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      cleanupStream();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [cleanupStream, previewUrl]);

  // Select best supported MIME type
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  // 1. Initialize Camera & Audio Preview
  const startCamera = async () => {
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setRecordedBlob(null);
      setElapsedSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Prevent audio feedback during live preview
        await videoRef.current.play();
      }
      setStatus('PREVIEW');
    } catch (err) {
      onError?.(`Camera/Microphone access denied or unavailable: ${err.message}`);
    }
  };

  // 2. Start MediaRecorder
  const startRecording = () => {
    if (!mediaStreamRef.current) return;

    try {
      chunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(mediaStreamRef.current, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        const url = URL.createObjectURL(blob);

        setRecordedBlob(blob);
        setPreviewUrl(url);
        cleanupStream();

        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.muted = false;
        }
        setStatus('STOPPED');
      };

      recorder.onerror = (event) => {
        cleanupStream();
        setStatus('IDLE');
        onError?.(`Recording error: ${event.error?.message || 'Unknown error'}`);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect chunks every 1s
      setStatus('RECORDING');
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= maxDurationSec) {
            stopRecording();
            return maxDurationSec;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      onError?.(`Failed to start recording: ${err.message}`);
    }
  };

  // 3. Stop Recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // 4. Upload Recorded Video Blob to S3 via Pre-Signed URL
  const handleUpload = async () => {
    if (!recordedBlob) return;

    try {
      setStatus('UPLOADING');
      const contentType = recordedBlob.type || 'video/webm';
      const { uploadUrl, fileKey } = await getPresignedUploadUrl(contentType);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: recordedBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
      }

      onUploadSuccess?.(fileKey);
      resetRecorder();
    } catch (err) {
      setStatus('STOPPED');
      onError?.(`Upload failed: ${err.message}`);
    }
  };

  // 5. Reset & Cleanup
  const resetRecorder = () => {
    cleanupStream();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setRecordedBlob(null);
    setElapsedSeconds(0);
    setStatus('IDLE');
  };

  const formatTime = (sec) => {
    const mins = String(Math.floor(sec / 60)).padStart(2, '0');
    const secs = String(sec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          playsInline
          controls={status === 'STOPPED'}
          style={{ width: '100%', display: 'block', maxHeight: '400px' }}
        />
        {status === 'RECORDING' && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(220, 38, 38, 0.9)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            ● REC {formatTime(elapsedSeconds)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'center' }}>
        {status === 'IDLE' && (
          <button type="button" onClick={startCamera}>
            Open Camera
          </button>
        )}

        {status === 'PREVIEW' && (
          <>
            <button type="button" onClick={startRecording}>
              Start Recording
            </button>
            <button type="button" onClick={resetRecorder}>
              Cancel
            </button>
          </>
        )}

        {status === 'RECORDING' && (
          <button type="button" onClick={stopRecording}>
            Stop Recording
          </button>
        )}

        {status === 'STOPPED' && (
          <>
            <button type="button" onClick={handleUpload}>
              Upload Video
            </button>
            <button type="button" onClick={startCamera}>
              Retake
            </button>
            <button type="button" onClick={resetRecorder}>
              Discard
            </button>
          </>
        )}

        {status === 'UPLOADING' && <button disabled>Uploading...</button>}
      </div>
    </div>
  );
};

export default LiveVideoRecorderComponent;
