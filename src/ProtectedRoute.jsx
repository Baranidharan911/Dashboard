import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Function to check if the user is authenticated
const isAuthenticated = () => {
  // Check for either admin or technician user in local storage
  const adminUser = localStorage.getItem("adminUser");
  const technicianUser = localStorage.getItem("technicianUser");
  
  return !!adminUser || !!technicianUser;
};

const ProtectedRoute = () => {
  // If the user is authenticated, allow them to access the route
  // Otherwise, redirect them to the login page
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
