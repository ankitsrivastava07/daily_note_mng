import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import Home from './Components/Home';
import About from './Components/About'
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
import CameraUploadComponent from './Components/CameraUploadComponent'; // <-- Yeh naya import add kiya hai
import LiveVideoRecorderComponent from "./Components/LiveVideoRecorderComponent";

function App() {
  return (
    <>
      <BrowserRouter>
        <nav style={{ padding: '10px', background: '#f5f5f5', marginBottom: '20px' }}>
          <Link to="/">Daily Note</Link> |{" "}
          <Link to="/about">About</Link> |{" "}
          <Link to="/contact">Contact</Link> |{" "}
          <Link to="/create-note">Create Note</Link> |{" "}
          <Link to="/all-note">All Notes</Link> |{" "}
          <Link to="/short-note">Short Note</Link> |{" "}
          <Link to="/camera-upload">📸 Capture & Attach </Link> |{" "} {/* <-- Yeh nav link add kiya hai */}
          <Link to="/workspace">Create Work Space</Link> |{" "}
          <Link to="/all-workspace">All Work Space</Link> |{" "}
          <Link to="/task">Task</Link> |{" "}
          <Link to="/today-task">Today Task</Link> |{" "}
          <Link to="/get-all-tasks">Get All Tasks</Link> |{" "}
          <Link to="/get-all-short-notes">Get All Short Notes</Link>
          <Link to="/live-video">🎥 Live Video</Link>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace" element={<CreateWorkspace onWorkspaceCreated={undefined} />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/all-note" element={<GetAllNote />} />
          <Route path="/create-note" element={<DailyNoteForm />} />
          <Route path="/short-note" element={<CreateShortNote />} />
          <Route path="/camera-upload" element={<CameraUploadComponent />} /> {/* <-- Yeh naya route add kiya hai */}
          <Route path="/get-all-short-notes" element={<GetAllShortNotes />} />
          <Route path="/all-workspace" element={<AllWorkspace />} />
          <Route path="/task" element={<TaskComponent />} />
          <Route path="/today-task" element={<TodayTask />} />
          <Route path="/get-all-tasks" element={<GetAllTask />} />
          <Route path="*" element={<PageNotFound />} />
         <Route path="/live-video" element={<LiveVideoRecorderComponent />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App;
