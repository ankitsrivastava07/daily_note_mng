import React, { useState, useEffect } from 'react';

interface VideoItem {
  id: string;
  referenceId: string;
  s3Key: string;
  status: string;
}

// Simple in-memory cache object UI level par (Component unmount hone tak data store rahega)
const clientVideoCache: { [userId: string]: VideoItem[] } = {};

export const VideoListModal: React.FC<{ userId: string }> = ({ userId }) => {
  // Agar cache mein pehle se data pada hai, toh usko initial state bana lo (Instant UI load!)
  const [videos, setVideos] = useState<VideoItem[]>(clientVideoCache[userId] || []);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Component load hote hi videos fetch karo (Cache check karne ke baad)
  useEffect(() => {
    const fetchVideos = async () => {
      // Agar cache already hai toh background mein fresh data laane ke liye silent fetch kar sakte hain
      if (clientVideoCache[userId] && clientVideoCache[userId].length > 0) {
        setVideos(clientVideoCache[userId]);
        return;
      }

      try {
        setLoading(true);
        const apiBaseUrl = import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095';
        const res = await fetch(`${apiBaseUrl}/api/v1/video/list/${userId}`);
        const data = await res.json();
        const fetchedList = Array.isArray(data) ? data : data.data || [];

        // Cache mein store kar lo
        clientVideoCache[userId] = fetchedList;
        setVideos(fetchedList);
      } catch (err) {
        console.error("Failed to fetch video list", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [userId]);

  // 2. Video click hone par S3 ka playback presigned URL mangwao
  const handleVideoClick = async (videoId: string) => {
    try {
      setLoading(true);
      const currentUserId = localStorage.getItem("userId") || userId;
      const apiBaseUrl = import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095';
      const res = await fetch(`${apiBaseUrl}/api/v1/video/playback/${videoId}?userId=${currentUserId}`);
      const url = await res.text();
      setSelectedVideoUrl(url);
    } catch (err) {
      console.error("Failed to load playback URL", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Delete Video Handler (UI se bhi hatega aur Cache se bhi update hoga)
  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Taaki video play na khul jaye click par
    if (!window.confirm("Are you sure you want to delete this video ?")) return;

    try {
      const currentUserId = localStorage.getItem("userId") || userId;
      const apiBaseUrl = import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095';

      const res = await fetch(`${apiBaseUrl}/api/v1/video/${videoId}?userId=${currentUserId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Updated list filter out karke state aur cache dono update kar do
        const updatedList = videos.filter(v => v.id !== videoId);
        setVideos(updatedList);
        clientVideoCache[userId] = updatedList;
      } else {
        alert("Unable to delete video.");
      }
    } catch (err) {
      console.error("Failed to delete video", err);
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#121212', borderRadius: '12px' }}>
      <h3>🎥 My Recorded Mountain Videos</h3>

      {loading && videos.length === 0 && <div style={{ color: '#3b82f6', marginBottom: '10px' }}>Loading videos...</div>}

      {/* Video List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
        {videos.map((vid) => (
          <div
            key={vid.id}
            onClick={() => handleVideoClick(vid.id)}
            style={{ background: '#1e1e1e', padding: '15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #333', position: 'relative' }}
          >
            {/* 🗑️ Delete Button */}
            <button
              onClick={(e) => handleDeleteVideo(vid.id, e)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '16px' }}
              title="Delete Video"
            >
              🗑️
            </button>

            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', paddingRight: '20px' }}>Ref: {vid.referenceId}</div>
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
    </div>
  );
};