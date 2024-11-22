import React, { useEffect, useState, useRef } from "react";
import { db, storage } from '../../firebase/firebase'; // Correct relative path to firebase.js
import { doc, getDoc, onSnapshot, updateDoc, setDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { FaPaperclip, FaMicrophone, FaPaperPlane, FaVideo, FaPhone } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import AgoraRTC from 'agora-rtc-sdk-ng';


const APP_ID = '9c8a0a30302e44a4b60f1620f355d8bb';  // Replace with your Agora App ID

const TechnicianCustomer = ({ enquiryId, userRole }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [technicianEmail, setTechnicianEmail] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [chatActive, setChatActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!enquiryId) return;

    const fetchEnquiryData = async () => {
      try {
        const responseDocRef = doc(db, "responses", enquiryId);
        const responseDocSnap = await getDoc(responseDocRef);
        if (responseDocSnap.exists()) {
          const responseData = responseDocSnap.data();

          const userDocRef = doc(db, "users", responseData.userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserEmail(userData.email);
          } else {
            console.error("User document does not exist.");
          }
        } else {
          console.error("Response document does not exist.");
        }
      } catch (error) {
        console.error("Error fetching enquiry data:", error);
      }
    };

    const fetchTechnicianData = async () => {
      try {
        const responseModifiedDocRef = doc(db, "response_modified", enquiryId);
        const responseModifiedDocSnap = await getDoc(responseModifiedDocRef);
        if (responseModifiedDocSnap.exists()) {
          const responseModifiedData = responseModifiedDocSnap.data();
          setTechnicianId(responseModifiedData.assignedTechnicianId);
        } else {
          console.error("Response_modified document does not exist.");
        }
      } catch (error) {
        console.error("Error fetching technician data from response_modified:", error);
      }
    };

    const chatDocRef = doc(db, "chat", enquiryId);

    const unsubscribe = onSnapshot(chatDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const chatData = docSnapshot.data();
        setMessages(chatData.messages.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds));
        setChatActive(chatData.chat_active || false);
      }
    });

    fetchEnquiryData();
    fetchTechnicianData();

    return () => unsubscribe(); 
  }, [enquiryId]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" && files.length === 0 && !audioBlob) return;

    if (!technicianId || !userEmail) {
      console.error("Technician ID or User Email is undefined");
      return;
    }

    const messageData = {
      timestamp: Timestamp.fromDate(new Date()),
      senderId: technicianId,
      text: newMessage.trim(),
      status: "unread",
    };

    if (files.length > 0) {
      for (const file of files) {
        const mediaType = file.type.startsWith("image/") ? "image" :
                        file.type.startsWith("video/") ? "video" :
                        file.type.startsWith("audio/") ? "audio" : "document";
        const mediaUrl = await handleFileUpload(file);
        await sendMessageWithFile(mediaType, mediaUrl);
      }
      setFiles([]);
    }

    if (audioBlob) {
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
      const mediaUrl = await handleFileUpload(audioFile);
      await sendMessageWithFile("audio", mediaUrl);
      setAudioBlob(null);
    }

    if (newMessage.trim() !== "") {
      await saveMessageToFirestore(messageData);
      setNewMessage("");
    }
  };

  const saveMessageToFirestore = async (messageData) => {
    const chatDocRef = doc(db, "chat", enquiryId);

    try {
      const chatDocSnap = await getDoc(chatDocRef);

      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          enquiryId: enquiryId,
          userId: userEmail,
          technicianId: technicianId,
          messages: [messageData],
          chat_active: true,
        });
      } else {
        await updateDoc(chatDocRef, {
          messages: arrayUnion(messageData),
          userId: userEmail,
          technicianId: technicianId,
        });
      }
    } catch (error) {
      console.error("Error saving message: ", error);
      alert("Failed to save message.");
    }
  };

  const sendMessageWithFile = async (mediaType, mediaUrl) => {
    const messageData = {
      timestamp: Timestamp.fromDate(new Date()),
      senderId: technicianId,
      mediaType,
      mediaUrl,
      status: "unread",
    };

    await saveMessageToFirestore(messageData);
  };

  const handleFileUpload = (file) => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `chat_files/${enquiryId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
        },
        (error) => {
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    });
  };

  const handleVoiceRecording = async () => {
    if (!isRecording) {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (event) => {
        setAudioBlob(event.data);
      };
      mediaRecorder.current.start();
    } else {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    } else if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      setNewMessage(newMessage + "\n");
    } else if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      setNewMessage(newMessage + "\n");
    }
  };

  const generateToken = async (channelName, uid, role, enquiryId) => {
    const response = await fetch('http://localhost:3001/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelName, uid, role, enquiryId }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate token');
    }

    const data = await response.json();
    return data.token;
  };

  const initAgoraClient = async (channelName, uid, role, enquiryId) => {
    try {
      const token = await generateToken(channelName, uid, role, enquiryId);
      console.log('Token received:', token);

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      await client.join(APP_ID, channelName, token, uid);

      // Additional Agora SDK setup here...
    } catch (error) {
      console.error('Failed to initialize Agora client:', error);
    }
  };

  const handleVideoCall = async () => {
    await initAgoraClient(enquiryId, technicianId, 'publisher', enquiryId);
    navigate(`/video-call?enquiryId=${enquiryId}`);
  };

  const handleAudioCall = async () => {
    await initAgoraClient(enquiryId, technicianId, 'publisher', enquiryId);
    navigate(`/audio-call?enquiryId=${enquiryId}`);
  };

  return (
    <div style={styles.chatContainer}>
      {chatActive ? (
        <>
          <div style={styles.header}>
            <FaVideo style={styles.icon} onClick={handleVideoCall} />
            <FaPhone style={styles.icon} onClick={handleAudioCall} />
          </div>
          <div style={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(msg.senderId === technicianId ? styles.sentMessage : styles.receivedMessage),
                }}
              >
                {msg.text && (
                  <p>
                    {msg.text.split("\n").map((line, idx) => (
                      <React.Fragment key={idx}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                    {msg.editedAt && <small>(edited)</small>}
                  </p>
                )}
                {msg.mediaType && (
                  <>
                    {msg.mediaType === "image" && <img src={msg.mediaUrl} alt="uploaded file" style={styles.media} />}
                    {msg.mediaType === "video" && <video controls src={msg.mediaUrl} style={styles.media}></video>}
                    {msg.mediaType === "audio" && <audio controls src={msg.mediaUrl} style={styles.media}></audio>}
                    {msg.mediaType === "document" && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">Open Document</a>}
                  </>
                )}
                <small>{new Date(msg.timestamp.seconds * 1000).toLocaleString()}</small>
              </div>
            ))}
          </div>
          <div style={styles.inputContainer}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              style={styles.input}
            />
            <div style={styles.previewContainer}>
              {files.map((file, index) => {
                const mediaType = file.type.startsWith("image/") ? "image" :
                                 file.type.startsWith("video/") ? "video" :
                                 file.type.startsWith("audio/") ? "audio" : "document";
                return (
                  <div key={index} style={styles.preview}>
                    {mediaType === "image" && <img src={URL.createObjectURL(file)} alt="preview" style={styles.media} />}
                    {mediaType === "video" && <video controls src={URL.createObjectURL(file)} style={styles.media}></video>}
                    {mediaType === "audio" && <audio controls src={URL.createObjectURL(file)} style={styles.media}></audio>}
                    {mediaType === "document" && <p>{file.name}</p>}
                  </div>
                );
              })}
              {audioBlob && (
                <audio controls src={URL.createObjectURL(audioBlob)} style={styles.media}></audio>
              )}
            </div>
            <button onClick={sendMessage} style={styles.sendButton}>
              <FaPaperPlane />
            </button>
            <div style={styles.fileInputWrapper}>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => setFiles(Array.from(e.target.files))}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                style={styles.sendButton}
              >
                <FaPaperclip />
              </button>
            </div>
            <button onClick={handleVoiceRecording} style={styles.sendButton}>
              {isRecording ? "Stop Recording" : <FaMicrophone />}
            </button>
          </div>
        </>
      ) : (
        <p style={styles.waitingText}>Wait a moment we connect you with the customer</p>
      )}
      <style jsx>{`
        @media (max-width: 768px) {
          .chatContainer {
            height: auto;
            padding: 5px;
          }
          .messagesContainer {
            padding: 5px;
          }
          .inputContainer {
            flex-direction: column;
            gap: 5px;
          }
          .input {
            width: 100%;
          }
          .sendButton {
            width: 100%;
          }
          .fileInputWrapper {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .message {
            max-width: 100%;
          }
          .media {
            max-width: 100%;
            max-height: 150px;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '400px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    overflowY: 'scroll',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '10px',
  },
  icon: {
    cursor: 'pointer',
    fontSize: '24px',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'scroll',
    padding: '10px',
  },
  message: {
    maxWidth: '70%',
    padding: '10px',
    margin: '5px 0',
    borderRadius: '8px',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e1f5fe',
    marginLeft: '200px',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f1f1',
    marginRight: '200px',
  },
  media: {
    maxWidth: '100%',
    maxHeight: '200px',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '10px',
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  sendButton: {
    padding: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInputWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  preview: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  selectedFiles: {
    display: 'flex',
    flexDirection: 'column',
  },
  waitingText: {
    textAlign: 'center',
    marginTop: '35%',
    fontSize: '16px',
    color: '#666',
  }
};

export default TechnicianCustomer;
