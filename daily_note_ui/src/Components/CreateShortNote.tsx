import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoRecorderComponent from './VideoRecorderComponent';

export const CreateShortNote: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachedVideoKey, setAttachedVideoKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Jab video successfully S3 par upload ho jaye
  const handleVideoUploadSuccess = (fileName: string) => {
    setAttachedVideoKey(fileName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title,
      content,
      videoKey: attachedVideoKey,
      referenceId: `short_note_${Date.now()}`
    };

    try {
      console.log('Saving Short Note with payload:', payload);
      
      setTimeout(() => {
        setLoading(false);
        navigate('/get-all-short-notes');
      }, 800);
    } catch (err) {
      console.error(err);
      setError('Failed to save short note. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>✨ Create Short Note with Studio Recording</h2>
      
      {error && <div style={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Note Title</label>
          <input
            type="text"
            placeholder="Enter quick title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={styles.textInput}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Note Content / Description</label>
          <textarea
            placeholder="Write your quick note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            required
            style={styles.textarea}
          />
        </div>

        {/* Video Recorder Studio - Directly Rendered */}
        <div style={styles.attachmentSection}>
          <label style={styles.label}>🎥 Live Video Recorder Studio</label>
          
          {attachedVideoKey ? (
            <div style={styles.successBadge}>
              <span>✅ Video Attached: {attachedVideoKey}</span>
              <button
                type="button"
                onClick={() => setAttachedVideoKey(null)}
                style={styles.removeBtn}
              >
                Record Again / Change
              </button>
            </div>
          ) : (
            <div style={styles.recorderContainer}>
              <VideoRecorderComponent
                referenceId={`short_note_ref_${Date.now()}`}
                onUploadSuccess={handleVideoUploadSuccess}
              />
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? 'Saving Note...' : 'Save Short Note'}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '40px auto',
    backgroundColor: '#121214',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '32px',
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  heading: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '24px',
    color: '#f4f4f5',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#a1a1aa',
  },
  textInput: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    padding: '12px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  textarea: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    padding: '12px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
  },
  attachmentSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  successBadge: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10b981',
    color: '#34d399',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  recorderContainer: {
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #27272a',
  },
  submitBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'background 0.2s',
  },
};

export default CreateShortNote;