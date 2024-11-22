// /src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_APP_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_APP_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_APP_FIREBASE_MEASUREMENT_ID,
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const messaging = getMessaging(app);
const functions = getFunctions(app);

export { auth, db, storage, signOut, messaging, getToken, onMessage, serverTimestamp, functions };
