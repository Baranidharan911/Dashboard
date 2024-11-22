import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export const sendNotificationToUser = async (userId, title, body, data) => {
  try {
    if (!userId) {
      throw new Error('Invalid userId');
    }

    console.log(`Fetching user document for userId: ${userId}`);
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    console.log('User data:', userData);
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      throw new Error('FCM token not found for the user');
    }

    const message = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: data,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
      return response;
    } catch (error) {
      if (error.code === 'messaging/registration-token-not-registered') {
        console.log(`FCM token ${fcmToken} is not valid. Removing from database.`);
        await db.collection('users').doc(userId).update({
          fcmToken: admin.firestore.FieldValue.delete(),
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};
