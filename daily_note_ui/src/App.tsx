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

function App() {
  return (
    <BrowserRouter>
      {/* Modern Enterprise Header */}
      <header style={navStyles.header}>
        <div style={navStyles.logoArea}>
          <span style={navStyles.logoIcon}>📝</span>
          <span style={navStyles.logoText}>DailyNotes Studio</span>
        </div>

        <nav style={navStyles.navLinksContainer}>
          <div style={navStyles.navGroup}>
            <span style={navStyles.groupTitle}>Notes</span>
            <Link to="/" style={navStyles.link}>Home</Link>
            <Link to="/create-note" style={navStyles.link}>New Note</Link>
            <Link to="/all-note" style={navStyles.link}>All Notes</Link>
            <Link to="/short-note" style={navStyles.link}>Short Note</Link>
            <Link to="/get-all-short-notes" style={navStyles.link}>Short Notes List</Link>
          </div>

          <div style={navStyles.navDivider} />

          <div style={navStyles.navGroup}>
            <span style={navStyles.groupTitle}>Workspace & Tasks</span>
            <Link to="/workspace" style={navStyles.link}>New Workspace</Link>
            <Link to="/all-workspace" style={navStyles.link}>Workspaces</Link>
            <Link to="/task" style={navStyles.link}>Task</Link>
            <Link to="/today-task" style={navStyles.link}>Today's Task</Link>
            <Link to="/get-all-tasks" style={navStyles.link}>All Tasks</Link>
          </div>

          <div style={navStyles.navDivider} />

          <div style={navStyles.navGroup}>
            <span style={navStyles.groupTitle}>Media & Studio</span>
            <Link to="/camera-upload" style={navStyles.link}>📸 Capture</Link>
            <Link to="/video-recorder" style={navStyles.link}>🎥 Video Recorder</Link>
            <Link to="/live-stream" style={navStyles.link}>📡 Live Stream</Link>
          </div>

          <div style={navStyles.navDivider} />

          <div style={navStyles.navGroup}>
            <span style={navStyles.groupTitle}>General</span>
            <Link to="/about" style={navStyles.link}>About</Link>
            <Link to="/contact" style={navStyles.link}>Contact</Link>
          </div>
        </nav>
      </header>

      {/* App Routes */}
      <main style={{ padding: '0 24px 24px 24px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace" element={<CreateWorkspace onWorkspaceCreated={undefined} />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/all-note" element={<GetAllNote />} />
          <Route path="/create-note" element={<DailyNoteForm />} />
          <Route path="/short-note" element={<CreateShortNote />} />
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

// Clean Professional Navbar Styles
const navStyles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: '#18181b',
    color: '#f4f4f5',
    padding: '14px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderBottom: '1px solid #27272a',
    marginBottom: '24px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 700,
    fontSize: '16px',
    color: '#ffffff',
  },
  logoIcon: {
    fontSize: '18px',
  },
  logoText: {
    letterSpacing: '-0.3px',
  },
  navLinksContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '16px',
  },
  navGroup: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  groupTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#71717a',
    marginRight: '4px',
    letterSpacing: '0.5px',
  },
  navDivider: {
    width: '1px',
    height: '20px',
    backgroundColor: '#27272a',
  },
  link: {
    color: '#d4d4d8',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: '#27272a',
    transition: 'all 0.15s ease',
  },
};

export default App;