import { getToken } from "firebase/messaging";
import { db, messaging } from "./firebase/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

const saveAdminToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_APP_FIREBASE_VAPID_KEY,
    });

    if (currentToken) {
      console.log("FCM Token:", currentToken);

      // Reference to the admin document in Firestore
      const adminDocRef = doc(db, "users", "admin");

      // Update the admin document, adding the new token to the fcmTokens array
      await updateDoc(adminDocRef, {
        fcmTokens: arrayUnion(currentToken), // arrayUnion adds the token to the array, avoiding duplicates
      });

      console.log("Admin token saved successfully in the Firestore fcmTokens array.");
    } else {
      console.log("No registration token available. Request permission to generate one.");
    }
  } catch (error) {
    console.error("An error occurred while retrieving or saving the token: ", error);
  }
};

export { saveAdminToken };
