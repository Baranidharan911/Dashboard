import React, { useEffect, useState, useRef } from "react";
import { doc, getDoc, onSnapshot, updateDoc, setDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from '../../firebase/firebase'; // Corrected relative path to firebase.js
import { FaPaperclip, FaMicrophone, FaPaperPlane } from "react-icons/fa";
import axios from "axios";


const AdminToTechnicianChat = ({ enquiryId, technicianId, attempt }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [chatStarted, setChatStarted] = useState(false);

  useEffect(() => {
    if (!enquiryId || !technicianId || !attempt) return;

    const chatDocRef = doc(db, "DASHBOARD_CHAT", enquiryId);

    const unsubscribe = onSnapshot(chatDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const chatData = docSnapshot.data();
        const adminToTechnician = chatData["admin_to_technician"] || [];
        const technicianToAdmin = chatData["technician_to_admin"] || [];

        const filteredAdminToTechnician = adminToTechnician.filter(
          (msg) => msg.technicianId === technicianId && msg.attempt === attempt && msg.sender === 'admin'
        );

        const filteredTechnicianToAdmin = technicianToAdmin.filter(
          (msg) => msg.technicianId === technicianId && msg.sender === 'technician'
        );

        const combinedMessages = [...filteredAdminToTechnician, ...filteredTechnicianToAdmin].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setMessages(combinedMessages);
        setChatStarted(chatData.chat_active || false);
      }
    });

    return () => unsubscribe(); // Clean up the listener on unmount
  }, [enquiryId, technicianId, attempt]);

  const sendPushNotification = async (technicianId, message) => {
    try {
      if (!technicianId) {
        console.error("Invalid technicianId");
        return;
      }

      const response = await axios.post("http://localhost:3001/sendNotification", {
        technicianId,
        title: "New Message from Admin",
        body: message,
        data: { enquiryId, message },
      });
      console.log("Notification sent successfully:", response.data);
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "" && files.length === 0 && !audioBlob) return;

    const messageData = {
      attempt: attempt,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      sender: "admin",
      technicianId: technicianId,
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
    const chatDocRef = doc(db, "DASHBOARD_CHAT", enquiryId);

    try {
      const chatDocSnap = await getDoc(chatDocRef);

      if (!chatDocSnap.exists()) {
        const initialData = {
          admin_to_technician: [messageData],
          technician_to_admin: [],
          chat_active: true,
        };
        await setDoc(chatDocRef, initialData);
      } else {
        await updateDoc(chatDocRef, {
          admin_to_technician: arrayUnion(messageData),
        });
      }

      await sendPushNotification(technicianId, newMessage);
    } catch (error) {
      console.error("Error sending message: ", error);
      alert("Failed to send message.");
    }
  };

  const sendMessageWithFile = async (mediaType, mediaUrl) => {
    const messageData = {
      attempt: attempt,
      timestamp: new Date().toISOString(),
      sender: "admin",
      technicianId: technicianId,
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

  const startChat = async () => {
    const chatDocRef = doc(db, "DASHBOARD_CHAT", enquiryId);

    try {
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        const initialData = {
          admin_to_technician: [],
          technician_to_admin: [],
          chat_active: true,
        };
        await setDoc(chatDocRef, initialData);
      } else {
        await updateDoc(chatDocRef, { chat_active: true });
      }
      setChatStarted(true);
    } catch (error) {
      console.error("Error starting chat: ", error);
    }
  };

  const endChat = async () => {
    const chatDocRef = doc(db, "DASHBOARD_CHAT", enquiryId);

    try {
      await updateDoc(chatDocRef, { chat_active: false });
      setChatStarted(false);
      setMessages([]);
    } catch (error) {
      console.error("Error ending chat: ", error);
    }
  };

  return (
    <div style={styles.chatContainer}>
      {!chatStarted ? (
        <button onClick={startChat} style={styles.startChatButton}>Start Chat</button>
      ) : (
        <>
          <div style={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(msg.sender === "admin" ? styles.sentMessage : styles.receivedMessage),
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
                <small>{new Date(msg.timestamp).toLocaleString()} - {msg.sender === "admin" ? "Sent" : "Received"}</small>
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
          <button onClick={endChat} style={styles.endChatButton}>End Chat</button>
        </>
      )}
    </div>
  );
};

const styles = {
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    height: "400px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#f9f9f9",
    overflowY: "scroll",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "scroll",
    padding: "10px",
  },
  message: {
    maxWidth: "70%",
    padding: "10px",
    margin: "5px 0",
    borderRadius: "8px",
  },
  sentMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#e1f5fe",
    marginLeft: "200px",
  },
  receivedMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f1f1",
    marginRight: "200px",
  },
  media: {
    maxWidth: "100%",
    maxHeight: "200px",
  },
  inputContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px",
  },
  input: {
    flex: 1,
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  sendButton: {
    padding: "10px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  fileInputWrapper: {
    display: "flex",
    alignItems: "center",
  },
  previewContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  preview: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  selectedFiles: {
    display: "flex",
    flexDirection: "column",
  },
  startChatButton: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
  },
  endChatButton: {
    padding: "10px 20px",
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    alignSelf: "center",
    marginTop: "10px",
  },
};

export default AdminToTechnicianChat;
