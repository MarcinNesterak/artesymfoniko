import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { storage } from './services/api';
import Login from './components/auth/Login';
import ConductorDashboard from './components/conductor/ConductorDashboard';
import CreateEvent from './components/conductor/CreateEvent';
import EventDetails from './components/conductor/EventDetails';
import ConductorArchive from './components/conductor/ConductorArchive';
import ManageMusicians from './components/conductor/ManageMusicians';
import MusicianDashboard from './components/musician/MusicianDashboard';
import EventParticipation from './components/musician/EventParticipation';
import MusicianEventDetails from './components/musician/EventDetails';
import MusicianArchive from './components/musician/MusicianArchive';
import MyProfile from './components/musician/MyProfile';
import Navbar from './components/common/Navbar';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const user = storage.getUser();
  
  if (!user || !user.token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'conductor' ? '/conductor/dashboard' : '/musician/dashboard'} replace />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Conductor Routes */}
          <Route 
            path="/conductor/dashboard" 
            element={
              <ProtectedRoute allowedRole="conductor">
                <ConductorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/conductor/create-event" 
            element={
              <ProtectedRoute allowedRole="conductor">
                <CreateEvent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/conductor/events/:id" 
            element={
              <ProtectedRoute allowedRole="conductor">
                <EventDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/conductor/archive" 
            element={
              <ProtectedRoute allowedRole="conductor">
                <ConductorArchive />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/conductor/musicians" 
            element={
              <ProtectedRoute allowedRole="conductor">
                <ManageMusicians />
              </ProtectedRoute>
            } 
          />
          
          {/* Musician Routes */}
          <Route 
            path="/musician/dashboard" 
            element={
              <ProtectedRoute allowedRole="musician">
                <MusicianDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/musician/events/:id/participate/:invitationId" 
            element={
              <ProtectedRoute allowedRole="musician">
                <EventParticipation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/musician/events/:id/details" 
            element={
              <ProtectedRoute allowedRole="musician">
                <MusicianEventDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/musician/archive" 
            element={
              <ProtectedRoute allowedRole="musician">
                <MusicianArchive />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/musician/profile" 
            element={
              <ProtectedRoute allowedRole="musician">
                <MyProfile />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirect to login if no route matches */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;