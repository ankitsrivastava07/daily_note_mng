import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
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
import ShortNoteView from './Components/ShortNoteView';

// Navigate to all workspaces after successful creation.
function WorkspaceRoute() {
  const navigate = useNavigate();

  const handleWorkspaceCreated = () => {
    navigate('/all-workspace');
  };

  return (
    <CreateWorkspace
      onWorkspaceCreated={handleWorkspaceCreated}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Daily Note</Link> |{' '}
        <Link to="/about">About</Link> |{' '}
        <Link to="/contact">Contact</Link> |{' '}
        <Link to="/create-note">Create Note</Link> |{' '}
        <Link to="/all-note">All Notes</Link> |{' '}
        <Link to="/short-note">Short Note</Link> |{' '}
        <Link to="/workspace">Create Workspace</Link> |{' '}
        <Link to="/all-workspace">All Workspaces</Link> |{' '}
        <Link to="/task">Task</Link> |{' '}
        <Link to="/today-task">Today Task</Link> |{' '}
        <Link to="/get-all-tasks">Get All Tasks</Link> |{' '}
        <Link to="/get-all-short-notes">Get All Short Notes</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/create-note" element={<DailyNoteForm />} />
        <Route path="/all-note" element={<GetAllNote />} />

        <Route path="/short-note" element={<CreateShortNote />} />
        <Route
          path="/get-all-short-notes"
          element={<GetAllShortNotes />}
        />

        <Route path="/workspace" element={<WorkspaceRoute />} />
        <Route path="/all-workspace" element={<AllWorkspace />} />
        <Route
          path="/short-note/:id"
          element={<ShortNoteView />}
        />

        <Route path="/task" element={<TaskComponent />} />
        <Route path="/today-task" element={<TodayTask />} />
        <Route path="/get-all-tasks" element={<GetAllTask />} />

        {/* Keep the fallback route last for readability. */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;