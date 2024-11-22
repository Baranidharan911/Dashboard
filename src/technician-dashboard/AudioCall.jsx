import React, { useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useLocation, useNavigate } from 'react-router-dom';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

const AudioCall = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const enquiryId = query.get('enquiryId');

  const [localTrack, setLocalTrack] = useState(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const initClient = async () => {
      try {
        const appId = '9c8a0a30302e44a4b60f1620f355d8bb';
        const channel = enquiryId;
        const tokenResponse = await fetch('http://localhost:3001/generate-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channelName: channel, uid: null, role: 'publisher', enquiryId }),
        });
        const { token } = await tokenResponse.json();

        await client.join(appId, channel, token);
        setJoined(true);

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalTrack(audioTrack);

        await client.publish(audioTrack);

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'audio') {
            user.audioTrack.play();
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'audio') {
            user.audioTrack.stop();
          }
        });
      } catch (error) {
        console.error('Failed to initialize Agora client: ', error);
      }
    };

    initClient();

    return () => {
      leaveCall();
    };
  }, [enquiryId]);

  const leaveCall = async () => {
    if (!joined) return;
    try {
      if (localTrack) {
        localTrack.stop();
        localTrack.close();
      }
      await client.unpublish(localTrack);
      await client.leave();
      navigate(`/tech-enquiry-details/${enquiryId}`);
    } catch (error) {
      console.error('Failed to leave the call: ', error);
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={leaveCall} style={styles.leaveButton}>
        Leave Call
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
  },
  leaveButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: 'red',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default AudioCall;
