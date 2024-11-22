import AgoraRTC from 'agora-rtc-sdk-ng';
import axios from 'axios';

const appId = '9c8a0a30302e44a4b60f1620f355d8bb';    
export const initAgoraClient = async (channelName, callType) => {
  const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  try {
    const response = await axios.post('http://localhost:3001/generate-token', { channelName, role: 'publisher' });
    const token = response.data.token;

    await client.join(appId, channelName, token, null);
    
    if (callType === 'video') {
      const localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
      localTracks[1].play('agora_local');
      await client.publish(localTracks);
      return { client, localTracks };
    } else if (callType === 'audio') {
      const localTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await client.publish(localTrack);
      return { client, localTracks: { audioTrack: localTrack } };
    }
  } catch (error) {
    console.error('Failed to initialize Agora client:', error);
    throw error;
  }
};

export const leaveAgoraClient = async (client, localTracks) => {
  if (localTracks) {
    if (localTracks.videoTrack) {
      localTracks.videoTrack.stop();
      localTracks.videoTrack.close();
    }
    if (localTracks.audioTrack) {
      localTracks.audioTrack.stop();
      localTracks.audioTrack.close();
    }
  }
  await client.leave();
};
