import React, { useState, useEffect } from 'react';

interface VideoItem {
  id: string;
  referenceId: string;
  s3Key: string;
  status: string;
}

export const VideoListModal: React.FC<{ userId: string }> = ({ userId }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Component load hote hi user ki videos ki list fetch karo
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095';
        const res = await fetch(`${apiBaseUrl}/api/v1/video/list/${userId}`);
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error("Failed to fetch video list", err);
      }
    };
    fetchVideos();
  }, [userId]);

  // 2. Video click hone par S3 ka playback presigned URL mangwao aur player kholo
  const handleVideoClick = async (videoId: string) => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("userId") || "ankit0397";
      const apiBaseUrl = import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095';
      const res = await fetch(`${apiBaseUrl}/api/v1/video/playback/${videoId}?userId=${userId}`);
      const url = await res.text(); // ya .json() jo bhi backend return kare
      setSelectedVideoUrl(url);
    } catch (err) {
      console.error("Failed to load playback URL", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#121212', borderRadius: '12px' }}>
      <h3>🎥 My Recorded Mountain Videos</h3>

      {/* Video List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
        {videos.map((vid) => (
          <div
            key={vid.id}
            onClick={() => handleVideoClick(vid.id)}
            style={{ background: '#1e1e1e', padding: '15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #333' }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>Ref: {vid.referenceId}</div>
            <div style={{ fontSize: '12px', color: '#10B981' }}>Status: {vid.status}</div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#3b82f6' }}>▶ Click to Watch</div>
          </div>
        ))}
      </div>

      {/* YouTube Style Popup / Modal Player */}
      {selectedVideoUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
        }}>
          <div style={{ position: 'relative', width: '80%', maxWidth: '800px', background: '#000', borderRadius: '12px', overflow: 'hidden', padding: '10px' }}>
            <button
              onClick={() => setSelectedVideoUrl(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 10, fontWeight: 'bold' }}
            >
              ✕
            </button>
            <video
              src={selectedVideoUrl}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: '70vh', display: 'block', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}

      {loading && <div style={{ marginTop: '10px', color: '#3b82f6' }}>Loading player...</div>}
    </div>
  );
};