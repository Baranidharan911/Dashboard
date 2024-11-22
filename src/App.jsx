import React, { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from "./Login";
import LoginAdmin from './LoginAdmin';
import LandingPage from "./LandingPage";
import LoginTechnician from './LoginTechnician';
import ProtectedRoute from "./ProtectedRoute";
import Signup from "./Signup";
import AdminDashboard from "./admin-dashboard/AdminDashboard";
import AdminEnquiryDetails from "./admin-dashboard/AdminEnquiryDetails";
import AdminNotification from "./admin-dashboard/AdminNotification";
import { messaging, onMessage, signInAdmin } from '../firebase/firebaseSetup';
import TechEnquiryDetails from "./technician-dashboard/TechEnquiryDetails";
import TechNotification from "./technician-dashboard/TechNotification";
import Technician from "./technician-dashboard/Technician";
import TechSettings from "./technician-dashboard/TechSettings"; // Import the new TechSettings page
import VideoCall from "./technician-dashboard/VideoCall";
import AudioCall from "./technician-dashboard/AudioCall";
import NotFound from "./NotFound";
import NotificationInstructions from './NotificationInstructions';  // Import the new Notification Instructions page
import AdvertisementManagement from './admin-dashboard/AdvertisementManagement'; // Adjust the path as needed
import TechnicianBankDetails from './admin-dashboard/TechnicianBankDetails'; // Adjust the path as needed
import PrivacyPolicy from './PrivacyPolicy'; // Import the new Privacy Policy page

const App = () => {
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    outstandingCount: 0,
    inProcessCount: 0,
    completedCount: 0,
    droppedCount: 0,
  });

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      toast.info(`${payload.notification.title}: ${payload.notification.body}`);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    signInAdmin().then(() => {
      console.log('Admin signed in and FCM token retrieved');
    }).catch((error) => {
      console.error('Failed to sign in admin and get FCM token:', error);
    });
  }, []);

  return (
    <Router>
      <div>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login-admin" element={<LoginAdmin />} />
          <Route path="/login-technician" element={<LoginTechnician />} />
          <Route path="/notification-instructions" element={<NotificationInstructions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} /> 

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/*" element={<AdminDashboard stats={stats} setStats={setStats} />} />
            <Route path="/technician" element={<Technician />} />
            <Route path="/enquiries/:id" element={<AdminEnquiryDetails />} />
            <Route path="/admin-enquiry-details/:id" element={<AdminEnquiryDetails />} />
            <Route path="/tech-enquiry-details/:enquiryId" element={<TechEnquiryDetails />} />
            <Route path="/admin-notifications" element={<AdminNotification />} />
            <Route path="/tech-notifications" element={<TechNotification />} />
            <Route path="/video-call" element={<VideoCall />} />
            <Route path="/audio-call" element={<AudioCall />} />
            <Route path="/technician-settings" element={<TechSettings />} />
            <Route path="/advertisement-management" element={<AdvertisementManagement />} /> 
            <Route path="/technician-bank-details" element={<TechnicianBankDetails />} /> 
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
