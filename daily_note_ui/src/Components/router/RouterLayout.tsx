import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Link, Outlet } from 'react-router-dom';
import GetAllNote from '../GetAllNote';

// Layout component with shared navigation and an Outlet for dynamic pages
function Layout() {
  return (
    <div>
      <nav style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <Link to="/">Home</Link>
        <Link to="/all-note">All Notes</Link>
        <Link to="/about">About</Link>
      </nav>
      <hr />
      {/* Outlet renders the active child route component */}
      <Outlet />
    </div>
  );
}

function Home() { return <h2>Home Page</h2>; }
function About() { return <h2>About Page</h2>; }

// Defining routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {path: 'all-note', element: <GetAllNote></GetAllNote>},
      { path: 'about', element: <About /> }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);