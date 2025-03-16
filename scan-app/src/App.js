// src/App.js
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import PrivateRoute from "./components/PrivateRoute";

// Lazy load the ActivityLog and UserManagement components
const ActivityLog = lazy(() => import("./pages/ActivityLog"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const KioskManagement = lazy(() => import("./pages/KioskManagement"));

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route
            path="activity-log"
            element={
              <PrivateRoute>
                <Suspense fallback={<div>Loading...</div>}>
                  <ActivityLog />
                </Suspense>
              </PrivateRoute>
            }
          />
          <Route
            path="user-management"
            element={
              <PrivateRoute>
                <Suspense fallback={<div>Loading...</div>}>
                  <UserManagement />
                </Suspense>
              </PrivateRoute>
            }
          />
          <Route
            path="kiosk-management"
            element={
              <PrivateRoute>
                <Suspense fallback={<div>Loading...</div>}>
                  <KioskManagement />
                </Suspense>
              </PrivateRoute>
            }
          />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
