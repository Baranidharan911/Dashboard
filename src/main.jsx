import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { EnquiryProvider } from './context/EnquiryContext';
import * as serviceWorkerRegistration from '../serviceWorkerRegistration'; // Correct path to root directory
import { signInAdmin } from '../firebase/firebaseSetup'; // Correct path to firebaseSetup.js



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EnquiryProvider>
      <App />
    </EnquiryProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
        return navigator.serviceWorker.ready;
      })
      .then((registration) => {
        console.log('Service Worker is active:', registration);
        // Sign in admin to get FCM token
        signInAdmin().then(() => {
          console.log('Admin signed in and FCM token retrieved');
        }).catch((error) => {
          console.error('Failed to sign in admin and get FCM token:', error);
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

serviceWorkerRegistration.register();
