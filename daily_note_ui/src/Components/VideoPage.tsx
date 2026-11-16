import React from 'react';
import EnterpriseVideoRecorder from './components/EnterpriseVideoRecorder';

function VideoPage() {
  // Backend API call jo S3 pre-signed URL generate karke degi
  const handleGeneratePresignedUrl = async (contentType) => {
    const response = await fetch('/api/upload/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType }),
    });
    
    if (!response.ok) throw new Error('Failed to fetch pre-signed URL');
    
    // Backend se { uploadUrl, fileKey } return hona chahiye
    return await response.json(); 
  };

  const handleUploadComplete = (fileKey) => {
    console.log('Video successfully uploaded to S3! File key:', fileKey);
    alert('Video upload ho gaya!');
  };

  const handleError = (errorMsg) => {
    console.error(errorMsg);
    alert(errorMsg);
  };

  return (
    <div style={{ padding: '40px', background: '#121212', minHeight: '100vh' }}>
      <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '24px' }}>
        Record & Upload Video
      </h2>
      
      <EnterpriseVideoRecorder
        onGeneratePresignedUrl={handleGeneratePresignedUrl}
        onUploadComplete={handleUploadComplete}
        onError={handleError}
        maxDurationSeconds={180} // Max 3 minutes
      />
    </div>
  );
}

export default VideoPage;
