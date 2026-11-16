import React, { useState, useRef, useEffect } from 'react';

interface LiveVideoRecorderProps {
  referenceId?: string;
  onUploadSuccess?: (fileName: string) => void;
}

const LiveVideoRecorderComponent: React.FC<LiveVideoRecorderProps> = ({
  referenceId = 'note_123',
  onUploadSuccess,
}) => {
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Component unmount hone par camera/mic resources properly release karo
  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // 1. Live Camera Stream & Recording Start
  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Mobile par rear camera prefer karega
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const generatedUrl = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoUrl(generatedUrl);
        stopMediaTracks();
      };

      mediaRecorder.start(250); // Har 250ms mein data chunks collect karega
      setRecording(true);
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setErrorMsg('Camera access nahi mila. Browser permissions check karo.');
    }
  };

  // 2. Recording Stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // 3. Reset State
  const resetRecorder = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoBlob(null);
    setErrorMsg(null);
  };

  // 4. DMS API -> S3 Pre-signed URL Upload
  const handleUpload = async () => {
    if (!videoBlob) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const fileName = `video_note_${Date.now()}.webm`;

      // DMS API se pre-signed URL fetch karo
      const dmsResponse = await fetch(
        `/api/v1/documents/presigned-url?referenceId=${encodeURIComponent(referenceId)}&fileNames=${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!dmsResponse.ok) {
        throw new Error(`DMS API Error: ${dmsResponse.status}`);
      }

      const result = await dmsResponse.json();
      const uploadUrl = result.data ? result.data[0] : result[0];

      if (!uploadUrl) {
        throw new Error('Pre-signed URL missing in backend response.');
      }

      // Direct S3 Bucket Upload
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/webm',
        },
        body: videoBlob,
      });

      if (!s3Response.ok) {
        throw new Error(`S3 Upload Failed: ${s3Response.status}`);
      }

      alert('Video note successfully S3 par upload ho gaya!');
      if (onUploadSuccess) onUploadSuccess(fileName);
      resetRecorder();
    } catch (err: any) {
      console.error('Upload flow error:', err);
      setErrorMsg(err.message || 'Video upload fail ho gaya.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '480px', margin: '20px auto', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <h3 style={{ marginBottom: '12px' }}>🎥 Live Video Note</h3>

      {errorMsg && (
        <div style={{ padding: '10px', marginBottom: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      {/* Video Preview / Playback Frame */}
      <div style={{ width: '100%', height: '260px', background: '#111', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
        {!videoUrl ? (
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <video src={videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {recording && (
          <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(220, 38, 38, 0.9)', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            ● REC
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {!recording && !videoUrl && (
          <button
            onClick={startRecording}
            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            🔴 Start Live Recording
          </button>
        )}

        {recording && (
          <button
            onClick={stopRecording}
            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            ⏹ Stop Recording
          </button>
        )}

        {videoUrl && (
          <>
            <button
              onClick={resetRecorder}
              disabled={loading}
              style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
            >
              🔄 Retake
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
            >
              {loading ? 'Uploading...' : '☁️ Upload Video Note'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveVideoRecorderComponent;
