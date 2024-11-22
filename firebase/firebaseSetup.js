import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
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
const firestore = getFirestore(app);
const messaging = getMessaging(app);
const functions = getFunctions(app);

const getFcmToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_APP_FIREBASE_VAPID_KEY,
    });

    if (currentToken) {
      console.log("FCM Token:", currentToken);
      return currentToken;
    } else {
      console.log("No registration token available. Request permission to generate one.");
    }
  } catch (error) {
    console.error("An error occurred while retrieving token.", error);
  }
};

export const signInAdmin = async () => {
  try {
    const email = import.meta.env.VITE_APP_ADMIN_EMAIL;
    const password = import.meta.env.VITE_APP_ADMIN_PASSWORD;
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Admin signed in successfully");

    const newFcmToken = await getFcmToken();

    if (newFcmToken) {
      const adminDocRef = doc(firestore, "users", "admin");
      await updateDoc(adminDocRef, {
        fcmToken: newFcmToken,
      });
      console.log("FCM Token updated in Firestore");
    }
  } catch (error) {
    console.error("Error signing in admin:", error.message);
    if (error.code === 'auth/quota-exceeded') {
      console.log('Quota exceeded. Please wait and try again later.');
    }
    throw error;
  }
};

// Export the required modules including onMessage
export { auth, signInWithEmailAndPassword, signOut, firestore, messaging, getFcmToken, onMessage, functions };
