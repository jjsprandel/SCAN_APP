// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ActivityLog from "./pages/ActivityLog";
import UserManagement from "./pages/UserManagement";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import PrivateRoute from "./components/PrivateRoute";

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
                <ActivityLog />
              </PrivateRoute>
            }
          />
          <Route
            path="user-management"
            element={
              <PrivateRoute>
                <UserManagement />
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
