import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from '../../firebase/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { IoArrowBackCircleSharp } from 'react-icons/io5';
import TechnicianToAdminChat from "./TechnicianToAdminChat";
import TechnicianCustomer from "./TechnicianCustomer";
import fileIcon from '../assets/file.png'; 

const TechEnquiryDetails = () => {
  const { enquiryId } = useParams();
  const [enquiryDetails, setEnquiryDetails] = useState(null);
  const [technicianId, setTechnicianId] = useState("");
  const [technicianData, setTechnicianData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const navigate = useNavigate();

  const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;

  useEffect(() => {
    const fetchEnquiryDetails = async () => {
      try {
        const enquiryDoc = await getDoc(doc(db, "response_modified", enquiryId));
        if (enquiryDoc.exists()) {
          setEnquiryDetails(enquiryDoc.data());
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching enquiry details: ", error);
      }
    };

    const fetchTechnicianId = () => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const q = query(collection(db, 'technicians'), where('email', '==', user.email));
          onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
              const technicianDoc = querySnapshot.docs[0];
              setTechnicianId(technicianDoc.data().technicianID);
              setTechnicianData(technicianDoc.data());
            }
          });
        }
      });
    };

    fetchEnquiryDetails();
    fetchTechnicianId();
  }, [enquiryId]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  const detailsToShow = {
    enquiryId: "Enquiry ID",
    leadTime: "Lead Time",
    purpose: "Purpose",
    domain: "Domain",
    fieldOfCategory: "Field of Category",
    hardwareUsed: "Hardware Used",
    softwareUsed: "Software Used",
    problemStatement: "Problem Statement",
    problemDescription: "Problem Description",
    documentsFiles: "Files"
  };

  if (!enquiryDetails) {
    return <div>Loading...</div>;
  }

  const handleViewClick = (urls) => {
    const files = Array.isArray(urls) ? urls : urls.split(",");
    setModalContent(files);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent([]);
  };

  const renderModalContent = () => {
    if (!modalContent) return null;

    const getMimeType = (fileExtension) => {
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        bmp: 'image/bmp',
        tiff: 'image/tiff',
        mp4: 'video/mp4',
        webm: 'video/webm',
        ogg: 'audio/ogg',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        wmv: 'video/x-ms-wmv',
        flv: 'video/x-flv',
        mkv: 'video/x-matroska',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        flac: 'audio/flac',
        pdf: 'application/pdf',
      };
      return mimeTypes[fileExtension] || '';
    };

    return modalContent.map((file, index) => {
      const fileExtension = file.split('.').pop().split('?')[0].toLowerCase();
      const mimeType = getMimeType(fileExtension);

      if (mimeType.startsWith('image/')) {
        return <img key={index} src={file} alt={`file-${index}`} style={{ maxWidth: '100%', maxHeight: '80vh', marginBottom: '10px' }} />;
      } else if (mimeType.startsWith('video/')) {
        return <video key={index} controls src={file} style={{ maxWidth: '100%', maxHeight: '80vh', marginBottom: '10px' }} />;
      } else if (mimeType.startsWith('audio/')) {
        return (
          <audio key={index} controls style={{ width: '100%', marginBottom: '10px' }}>
            <source src={file} type={mimeType} />
            Your browser does not support the audio element.
          </audio>
        );
      } else if (mimeType === 'application/pdf') {
        return <iframe key={index} src={file} style={{ width: '100%', height: '80vh', marginBottom: '10px' }} title={`file-${index}`} />;
      }
    });
  };

  const handleBack = () => {
    navigate('/technician');
  };

  return (
    <>
      <IoArrowBackCircleSharp
        style={styles.backIcon}
        onClick={handleBack}
      />
      <div style={styles.container}>
        <div style={styles.detailsContainer}>
          <table style={styles.table}>
            <tbody>
              {Object.keys(detailsToShow).map((key) => (
                <tr key={key}>
                  <td style={styles.tableKey}>{detailsToShow[key]}</td>
                  <td style={styles.tableValue}>
                    {key === 'documentsFiles' 
                      ? (enquiryDetails[key] === "N/A" || !enquiryDetails[key])
                        ? "N/A"
                        : <img 
                            src={fileIcon} 
                            alt="View Documents" 
                            style={{ cursor: 'pointer', width: '30px', height: '30px' }} 
                            onClick={() => handleViewClick(enquiryDetails[key])}
                          />
                      : enquiryDetails[key]?.seconds !== undefined 
                        ? formatTimestamp(enquiryDetails[key]) 
                        : enquiryDetails[key]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div id="chat-container" style={styles.chatContainer}>
          <div id="admin-chat" style={styles.chatBox}>
            <h3>Admin Chat</h3>
            <TechnicianToAdminChat enquiryId={enquiryId} technicianId={technicianId} adminId={adminEmail} />
          </div>
          <div id="customer-chat" style={styles.chatBox}>
            <h3>Customer Chat</h3>
            <TechnicianCustomer enquiryId={enquiryId} userRole="technician" />
          </div>
        </div>

        {showModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <span style={styles.close} onClick={closeModal}>&times;</span>
              {renderModalContent()}
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          #chat-container {
            flex-direction: column;
          }
          #admin-chat {
            order: 1;
          }
          #customer-chat {
            order: 2;
          }
        }
      `}</style>
    </>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    position: 'relative',
  },
  backIcon: {
    fontSize: '36px',
    cursor: 'pointer',
    position: 'fixed',
    top: '10px',
    left: '10px',
    zIndex: '1000',
  },
  detailsContainer: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    marginTop: '30px', // This moves the container down from the top without reducing its size
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableKey: {
    fontWeight: 'bold',
    padding: '10px',
    border: '1px solid #ddd',
    backgroundColor: '#f1f1f1',
    width: '30%',
  },
  tableValue: {
    padding: '10px',
    border: '1px solid #ddd',
    width: '70%',
    wordWrap: 'break-word',
  },
  chatContainer: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'space-between',
  },
  chatBox: {
    flex: '1',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#fff',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  modal: {
    position: 'fixed',
    zIndex: 1,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    overflow: 'auto',
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fefefe',
    margin: 'auto',
    padding: '20px',
    border: '1px solid #888',
    width: '80%',
    maxWidth: '600px',
    borderRadius: '8px',
  },
  close: {
    color: '#aaa',
    float: 'right',
    fontSize: '28px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default TechEnquiryDetails;
