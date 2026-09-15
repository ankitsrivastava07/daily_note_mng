import React, { useState } from 'react';

export function NoteManager() {
  const [showForm, setShowForm] = useState(false);

  // 1. Click handler to toggle or open the form
  const handleCreateNoteClick = (e) => {
    e.preventDefault(); // Prevents page reload if using an <a> tag
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  return (
    <div>
      <h2>Daily Notes</h2>

      {/* Trigger event on click */}
      <ul>
        <li>
          <a href="#" onClick={handleCreateNoteClick}>
            Create Note
          </a>
        </li>
      </ul>

      {/* Render form conditionally based on state */}
      {showForm && (
        <form style={{ marginTop: '16px', border: '1px solid #ccc', padding: '16px' }}>
          <h3>New Note</h3>
          <div>
            <label>Title: </label>
            <input type="text" placeholder="Note title" />
          </div>
          <div style={{ marginTop: '8px' }}>
            <label>Content: </label>
            <textarea placeholder="Write content..." />
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button type="submit">Save</button>
            <button type="button" onClick={handleCloseForm}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}