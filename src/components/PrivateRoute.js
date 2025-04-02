// src/components/PrivateRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // You can replace this with a spinner or loading component
  }

  return currentUser ? children : <Navigate to="/Auth" />;
}

export default PrivateRoute;
