import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Home from './Components/Home';
import About from './Components/About';
import Contact from './Components/Contact';
import DailyNoteForm from './Components/DailyNoteForm';
import CreateWorkspace from './Components/CreateWorkspace';
import GetAllNote from './Components/GetAllNote';
import PageNotFound from './Components/PageNotFound';
import GetAllShortNotes from './Components/GetAllShortNotes';
import CreateShortNote from './Components/CreateShortNote';
import AllWorkspace from './Components/AllWorkspace';
import TodayTask from './Components/TodayTask';
import TaskComponent from './Components/TaskComponent';
import GetAllTask from './Components/GetAllTask';
import CameraUploadComponent from './Components/CameraUploadComponent';
import VideoRecorderComponent from './Components/VideoRecorderComponent';
import LiveStreamComponent from './Components/LiveStreamComponent';
import ShortNoteView from './Components/ShortNoteView';
import ShortNoteUpdate from './Components/ShortNoteUpdate';

function App() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Dropdown ko safely close karne ke liye helper function
  const closeDropdown = () => setActiveDropdown(null);

  return (
    <BrowserRouter>
      {/* TCS-Style Corporate Header */}
      <header 
        style={tcsNavStyles.header} 
        onMouseLeave={closeDropdown}
      >
        <div style={tcsNavStyles.topBar}>
          {/* Brand Logo & Name */}
          <Link to="/" style={tcsNavStyles.logoArea} onClick={closeDropdown}>
            <span style={tcsNavStyles.logoIcon}>🏢</span>
            <div style={tcsNavStyles.logoTextGroup}>
              <span style={tcsNavStyles.logoTitle}>DAILYNOTES</span>
              <span style={tcsNavStyles.logoSubtitle}>STUDIO ENTERPRISE</span>
            </div>
          </Link>

          {/* Main Corporate Navigation Categories */}
          <nav style={tcsNavStyles.mainNav}>
            <div
              style={tcsNavStyles.navItem}
              onMouseEnter={() => setActiveDropdown('notes')}
            >
              <span style={tcsNavStyles.navLinkText}>
                Notes & Vault <span style={tcsNavStyles.caret}>▾</span>
              </span>
            </div>

            <div
              style={tcsNavStyles.navItem}
              onMouseEnter={() => setActiveDropdown('workspace')}
            >
              <span style={tcsNavStyles.navLinkText}>
                Workspaces & Tasks <span style={tcsNavStyles.caret}>▾</span>
              </span>
            </div>

            <div
              style={tcsNavStyles.navItem}
              onMouseEnter={() => setActiveDropdown('media')}
            >
              <span style={tcsNavStyles.navLinkText}>
                Media & Studios <span style={tcsNavStyles.caret}>▾</span>
              </span>
            </div>

            <div style={tcsNavStyles.navItem}>
              <Link to="/about" style={tcsNavStyles.directLink} onClick={closeDropdown}>
                About
              </Link>
            </div>

            <div style={tcsNavStyles.navItem}>
              <Link to="/contact" style={tcsNavStyles.directLink} onClick={closeDropdown}>
                Contact
              </Link>
            </div>
          </nav>
        </div>

        {/* Mega Menu / Dropdown Panel */}
        {activeDropdown && (
          <div 
            style={tcsNavStyles.megaMenu} 
            onMouseEnter={() => {}} 
            onMouseLeave={closeDropdown}
          >
            <div style={tcsNavStyles.megaMenuContent}>
              {activeDropdown === 'notes' && (
                <div style={tcsNavStyles.menuGrid}>
                  <div style={tcsNavStyles.menuColumn}>
                    <h4 style={tcsNavStyles.columnHeading}>Core Notes</h4>
                    <Link to="/" style={tcsNavStyles.subLink} onClick={closeDropdown}>Home Dashboard</Link>
                    <Link to="/create-note" style={tcsNavStyles.subLink} onClick={closeDropdown}>Create New Note</Link>
                    <Link to="/all-note" style={tcsNavStyles.subLink} onClick={closeDropdown}>View All Notes</Link>
                  </div>
                  <div style={tcsNavStyles.menuColumn}>
                    <h4 style={tcsNavStyles.columnHeading}>Short Notes</h4>
                    <Link to="/short-note" style={tcsNavStyles.subLink} onClick={closeDropdown}>Create Short Note</Link>
                    <Link to="/get-all-short-notes" style={tcsNavStyles.subLink} onClick={closeDropdown}>Short Notes Archive</Link>
                  </div>
                </div>
              )}

              {activeDropdown === 'workspace' && (
                <div style={tcsNavStyles.menuGrid}>
                  <div style={tcsNavStyles.menuColumn}>
                    <h4 style={tcsNavStyles.columnHeading}>Workspaces</h4>
                    <Link to="/workspace" style={tcsNavStyles.subLink} onClick={closeDropdown}>Create Workspace</Link>
                    <Link to="/all-workspace" style={tcsNavStyles.subLink} onClick={closeDropdown}>All Workspaces</Link>
                  </div>
                  <div style={tcsNavStyles.menuColumn}>
                    <h4 style={tcsNavStyles.columnHeading}>Task Management</h4>
                    <Link to="/task" style={tcsNavStyles.subLink} onClick={closeDropdown}>Task Configuration</Link>
                    <Link to="/today-task" style={tcsNavStyles.subLink} onClick={closeDropdown}>Today's Tasks</Link>
                    <Link to="/get-all-tasks" style={tcsNavStyles.subLink} onClick={closeDropdown}>All Assigned Tasks</Link>
                  </div>
                </div>
              )}

              {activeDropdown === 'media' && (
                <div style={tcsNavStyles.menuGrid}>
                  <div style={tcsNavStyles.menuColumn}>
                    <h4 style={tcsNavStyles.columnHeading}>Capture & Stream Studios</h4>
                    <Link to="/camera-upload" style={tcsNavStyles.subLink} onClick={closeDropdown}>📸 Capture & Attach</Link>
                    <Link to="/video-recorder" style={tcsNavStyles.subLink} onClick={closeDropdown}>🎥 Mountain Video Recorder</Link>
                    <Link to="/live-stream" style={tcsNavStyles.subLink} onClick={closeDropdown}>📡 Live Broadcaster Studio</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main App Content */}
      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace" element={<CreateWorkspace />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/all-note" element={<GetAllNote />} />
          <Route path="/create-note" element={<DailyNoteForm />} />
          <Route path="/short-note" element={<CreateShortNote />} />
          <Route path="/short-note/:id" element={<ShortNoteView />} />
          <Route path="/short-note/:id/update" element={<ShortNoteUpdate />} />
          <Route path="/camera-upload" element={<CameraUploadComponent />} />
          <Route path="/get-all-short-notes" element={<GetAllShortNotes />} />
          <Route path="/all-workspace" element={<AllWorkspace />} />
          <Route path="/task" element={<TaskComponent />} />
          <Route path="/today-task" element={<TodayTask />} />
          <Route path="/get-all-tasks" element={<GetAllTask />} />
          <Route path="/video-recorder" element={<VideoRecorderComponent />} />
          <Route path="/live-stream" element={<LiveStreamComponent />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

// TCS Enterprise Mega Menu Corporate Styles
const tcsNavStyles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: '#121214',
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    borderBottom: '1px solid #27272a',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: '#ffffff',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoTextGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoTitle: {
    fontWeight: 800,
    fontSize: '15px',
    letterSpacing: '1px',
    color: '#ffffff',
  },
  logoSubtitle: {
    fontSize: '9px',
    fontWeight: 600,
    color: '#71717a',
    letterSpacing: '1.5px',
  },
  mainNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  navItem: {
    cursor: 'pointer',
    padding: '8px 0',
    position: 'relative',
  },
  navLinkText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e4e4e7',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  directLink: {
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    color: '#f4f4f5',
    display: 'flex',
    alignItems: 'center',
  },
  caret: {
    fontSize: '11px',
    color: '#a1a1aa',
  },
  megaMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100vw',
    backgroundColor: '#18181b',
    borderBottom: '1px solid #27272a',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
  },
  megaMenuContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '32px',
  },
  menuColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  columnHeading: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#38bdf8',
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  subLink: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#d4d4d8',
    textDecoration: 'none',
    padding: '4px 0',
  },
};

export default App;