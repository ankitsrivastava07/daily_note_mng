import React, { useState } from 'react';

const CameraUploadComponent = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);

    try {
      const referenceId = "note_123";

      const res = await fetch(`/api/v1/documents/presigned-url?referenceId=${referenceId}&fileNames=${encodeURIComponent(selectedFile.name)}`);
      const data = await res.json();
      const uploadUrl = data.data[0];

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile,
      });

      alert('Photo uploaded successfully to S3!');
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload photo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '20px auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3>Attach Photo to Note</h3>

      {preview && (
        <div style={{ position: 'relative', width: '100%', height: '200px', marginBottom: '15px' }}>
          <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
          <button
            onClick={() => { setSelectedFile(null); setPreview(null); }}
            style={{ position: 'absolute', top: '10px', right: '10px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ cursor: 'pointer', background: '#f0f0f0', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}>
          📸 Open Camera / Gallery
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>

        <button
          onClick={handleUpload}
          disabled={loading || !selectedFile}
          style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
};

export default CameraUploadComponent;
