import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'agora-access-token';
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const { RtcTokenBuilder, RtcRole } = pkg;

const serviceAccount = JSON.parse(await readFile(new URL('./serviceAccountKey.json', import.meta.url)));

const app = express();
const PORT = process.env.PORT || 3001;

const APP_ID = '9c8a0a30302e44a4b60f1620f355d8bb';  // Replace with your Agora App ID
const APP_CERTIFICATE = 'df242caa852048f99a9c8b55d7a250d4';  // Replace with your Agora App Certificate

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.use(cors());
app.use(bodyParser.json());

app.post('/generate-token', async (req, res) => {
  const { channelName, uid, role, enquiryId } = req.body;
  console.log('Request body:', req.body); // Log request body for debugging
  if (!channelName || !enquiryId) {
    console.error('Channel name or enquiry ID is missing');
    return res.status(400).json({ error: 'Channel name and enquiry ID are required' });
  }

  const currentRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid || 0, currentRole, privilegeExpiredTs);
  console.log('Generated Token:', token); // Log the generated token for debugging

  // Save the token to Firestore with a unique document ID
  const tokenDoc = {
    timestamp: currentTimestamp,
    token: token,
  };

  try {
    await db.collection('videoTokens').doc(enquiryId).set(tokenDoc);
    return res.json({ token });
  } catch (error) {
    console.error('Error saving token to Firestore:', error);
    return res.status(500).json({ error: 'Error saving token to Firestore' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
