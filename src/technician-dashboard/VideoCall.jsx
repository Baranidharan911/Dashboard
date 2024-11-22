import React, { useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

const VideoCall = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const enquiryId = query.get('enquiryId');

  const [remoteUsers, setRemoteUsers] = useState([]);
  const [localTracks, setLocalTracks] = useState({ videoTrack: null, audioTrack: null });
  const [joined, setJoined] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

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

        const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalTracks({ videoTrack: cameraTrack, audioTrack: microphoneTrack });

        await client.publish([microphoneTrack, cameraTrack]);
        cameraTrack.play('local-player');

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            setRemoteUsers((prevRemoteUsers) => [...prevRemoteUsers, user]);
            user.videoTrack.play(`remote-player`);
          }
          if (mediaType === 'audio') {
            user.audioTrack.play();
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            setRemoteUsers((prevRemoteUsers) => prevRemoteUsers.filter((u) => u.uid !== user.uid));
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

  const toggleAudio = async () => {
    if (isAudioMuted) {
      await localTracks.audioTrack.setMuted(false);
      setIsAudioMuted(false);
    } else {
      await localTracks.audioTrack.setMuted(true);
      setIsAudioMuted(true);
    }
  };

  const toggleVideo = async () => {
    if (isVideoMuted) {
      await localTracks.videoTrack.setMuted(false);
      setIsVideoMuted(false);
    } else {
      await localTracks.videoTrack.setMuted(true);
      setIsVideoMuted(true);
    }
  };

  const leaveCall = async () => {
    if (!joined) return;
    try {
      if (localTracks.videoTrack) {
        localTracks.videoTrack.stop();
        localTracks.videoTrack.close();
      }
      if (localTracks.audioTrack) {
        localTracks.audioTrack.stop();
        localTracks.audioTrack.close();
      }
      await client.unpublish(Object.values(localTracks));
      await client.leave();
      navigate(`/tech-enquiry-details/${enquiryId}`, { replace: true });
    } catch (error) {
      console.error('Failed to leave the call: ', error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.videoContainer}>
        <div id="local-player" style={styles.localVideo}></div>
        <div id="remote-player" style={styles.remoteVideo}></div>
      </div>
      <div style={styles.controls}>
        <button onClick={toggleAudio} style={styles.controlButton}>
          {isAudioMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        <button onClick={toggleVideo} style={styles.controlButton}>
          {isVideoMuted ? <FaVideoSlash /> : <FaVideo />}
        </button>
        <button onClick={leaveCall} style={styles.controlButton}>
          <FaPhoneSlash />
        </button>
      </div>
      <style jsx>{`
        #local-player,
        #remote-player {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    height: '100vh', // Full height of the viewport
  },
  videoContainer: {
    display: 'flex',
    width: '100%',
    height: '80%', // Adjust as needed to fit the page layout
  },
  localVideo: {
    flex: '1',
    backgroundColor: 'black',
  },
  remoteVideo: {
    flex: '1',
    backgroundColor: 'black',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '10px',
  },
  controlButton: {
    padding: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
  },
};

export default VideoCall;
