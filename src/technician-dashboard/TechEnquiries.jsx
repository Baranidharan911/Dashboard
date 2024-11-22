import React, { useState, useEffect } from 'react';
import { db, functions } from '../../firebase/firebase'; // Corrected path to firebase.js
import { collection, doc, updateDoc, getDoc, query, where, getDocs, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import noDataImage from '../assets/no-data.png';
import fileIcon from '../assets/file.png';
import DatePicker from 'react-datepicker';
import Modal from 'react-modal';
import Lottie from 'react-lottie';
import Confetti from 'react-confetti';
import successAnimation from '../assets/Animation - 1723105688925.json';
import 'react-datepicker/dist/react-datepicker.css';
import './TechEnquries.css';
import { FaRegIdCard, FaGlobe, FaThLarge, FaClock, FaBullseye, FaInfoCircle } from 'react-icons/fa'; // Added react-icons for icons

Modal.setAppElement('#root');

const TechEnquiries = ({ modifiedData, handleViewClick, handleReplyClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeEnquiryTab, setActiveEnquiryTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const [enquiriesData, setEnquiriesData] = useState(modifiedData);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [totalWorkingHours, setTotalWorkingHours] = useState(0);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const entriesPerPage = 10;

  const tabs = {
    all: enquiriesData.length,
    outstanding: enquiriesData.filter(data => data.status === 'Pending').length,
    in_process: enquiriesData.filter(data => data.status === 'In_process').length,
    completed: enquiriesData.filter(data => data.status === 'Completed').length,
    dropped: enquiriesData.filter(data => data.status === 'Dropped').length,
  };

  useEffect(() => {
    if (startDate && endDate) {
      calculateWorkingHours();
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (totalWorkingHours > 0 && assignedTechnicianId) {
      fetchAndCalculateEstimatedCost(assignedTechnicianId);
    }
  }, [totalWorkingHours]);

  const calculateWorkingHours = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const difference = Math.abs(end - start);
    const hours = difference / (1000 * 60 * 60); // Convert milliseconds to hours
    setTotalWorkingHours(hours.toFixed(2)); // Set the total working hours with two decimal places
  };

  const fetchAndCalculateEstimatedCost = async (technicianId) => {
    if (!technicianId) {
      console.error('Technician ID is undefined');
      return;
    }

    try {
      const technicianQuery = query(
        collection(db, 'technician_response'),
        where('technicianId', '==', technicianId),where("enquiryId","==",selectedEnquiry.enquiryId),
        where("status","==","accepted")
      );

      const querySnapshot = await getDocs(technicianQuery);

      if (!querySnapshot.empty) {
        const technicianDoc = querySnapshot.docs[0]; // Assuming there is only one document per technician
        const budgetPerHour = parseFloat(technicianDoc.data().budgetPerHour);
        const calculatedCost = budgetPerHour * totalWorkingHours;
        setEstimatedCost(calculatedCost.toFixed(2));
      } else {
        console.error(`No technician found with ID ${technicianId}`);
      }
    } catch (error) {
      console.error('Error fetching technician data:', error);
    }
  };

  const handleCompleteClick = async (enquiryId) => {
    try {
      const enquiryDoc = await getDoc(doc(db, 'response_modified', enquiryId));
      if (enquiryDoc.exists()) {
        const enquiryData = enquiryDoc.data();
        const { assignedTechnicianId } = enquiryData;
        setAssignedTechnicianId(assignedTechnicianId);
        setSelectedEnquiry({ enquiryId, ...enquiryData }); // Set selectedEnquiry with the correct data

        if (assignedTechnicianId) {
          openCustomModal(enquiryData);
        } else {
          console.error('Assigned Technician ID is missing or undefined');
        }
      } else {
        console.error('Enquiry document does not exist');
      }
    } catch (error) {
      console.error('Error fetching enquiry data:', error);
    }
  };

  const openCustomModal = (enquiryData) => {
    setIsCustomModalOpen(true);
  };

  const closeCustomModal = () => {
    setIsCustomModalOpen(false);
    setStartDate(null);
    setEndDate(null);
    setEstimatedCost('');
    setTotalWorkingHours(0);
    setAssignedTechnicianId(null);
    setSelectedEnquiry(null);
  };

  const handleConfirm = async () => {
    setIsLoading(true); // Start loading spinner
    if (selectedEnquiry && selectedEnquiry.enquiryId) {
      await completeEnquiry(selectedEnquiry.enquiryId);
      closeCustomModal(); // Close modal on confirm
      displaySuccess(); // Display success animation and confetti
    } else {
      console.error('No valid enquiry selected for completion');
      closeCustomModal(); // Close modal on error
    }
    setIsLoading(false); // Stop loading spinner
  };

  const completeEnquiry = async (enquiryId) => {
    try {
      const enquiryRef = doc(db, 'response_modified', enquiryId);
      await updateDoc(enquiryRef, {
        status: 'Completed',
        startDate: startDate,
        endDate: endDate,
        estimatedCost: estimatedCost * 1.3,
        totalWorkingHours: totalWorkingHours,
      });

      const updatedData = enquiriesData.map((enquiry) =>
        enquiry.enquiryId === enquiryId ? { ...enquiry, status: 'Completed' } : enquiry
      );
      setEnquiriesData(updatedData);

      const technicianDoc = await getDoc(doc(db, 'technicians', assignedTechnicianId));
      let technicianName = 'Technician';
      if (technicianDoc.exists()) {
        technicianName = technicianDoc.data().name; // Assuming the technician's name is stored under the 'name' field
      }

      const sendNotification = httpsCallable(functions, 'sendCompletionNotificationToAdmin');
      const notificationResponse = await sendNotification({ technicianName, enquiryId });

      if (notificationResponse.data.success) {
        console.log('Notification sent successfully');
      } else {
        console.error('Failed to send notification:', notificationResponse.data.error);
      }

      const technicianEmail = technicianDoc.data().email;
      const sendTechnicianEmail = httpsCallable(functions, 'sendTechnicianEmail');
      const emailResponse = await sendTechnicianEmail({
        to: technicianEmail,
        subject: 'Enquiry Completed',
        text: `The enquiry with ID ${enquiryId} has been completed. Estimated cost: ₹${estimatedCost}.`,
      });

      if (emailResponse.data.success) {
        console.log(`Email sent to technician ${technicianEmail}`);
      } else {
        console.error('Failed to send email:', emailResponse.data.error);
      }

      const notificationDocRef = await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        message: `Enquiry ${enquiryId} has been completed by ${technicianName}.`,
        timestamp: new Date(),
        status: 'unread'
      });

      if (notificationDocRef.id) {
        console.log('Notification logged in Firestore:', notificationDocRef.id);
      } else {
        console.error('Failed to log notification in Firestore');
      }

    } catch (error) {
      console.error('Failed to complete enquiry:', error);
    }
  };

  const displaySuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000); // Display success animation for 3 seconds
  };

  const NoDataComponent = () => (
    <div style={styles.noDataContainer}>
      <h2 style={styles.noDataText}>There is no data</h2>
    </div>
  );

  const renderPagination = (data) => {
    const totalPages = Math.ceil(data.length / entriesPerPage);

    const handleNext = () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    };

    const handlePrevious = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    };

    return (
      totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{
              ...styles.paginationButton,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
            onClick={handlePrevious}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
            <button
              key={number}
              style={{ ...styles.paginationButton, ...(currentPage === number ? styles.activePage : {}) }}
              onClick={() => setCurrentPage(number)}
            >
              {number}
            </button>
          ))}
          <button
            style={{
              ...styles.paginationButton,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )
    );
  };

  const handleViewClickInternal = (documents) => {
    setModalContent(documents);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent([]);
  };

  const renderModalContent = () => {
    if (!modalContent) return null;

    const getMimeType = (fileExtension) => {
      const mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        bmp: "image/bmp",
        tiff: "image/tiff",
        mp4: "video/mp4",
        webm: "video/webm",
        ogg: "audio/ogg",
        mov: "video/quicktime",
        avi: "video/x-msvideo",
        wmv: "video/x-ms-wmv",
        flv: "video/x-flv",
        mkv: "video/x-matroska",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/mp4",
        aac: "audio/aac",
        flac: "audio/flac",
        pdf: "application/pdf",
      };
      return mimeTypes[fileExtension] || '';
    };

    return modalContent.map((file, index) => {
      const fileExtension = file.split('.').pop().split('?')[0].toLowerCase();
      const mimeType = getMimeType(fileExtension);

      if (mimeType.startsWith('image/')) {
        return (
          <div key={index} style={styles.modalDocumentContainer}>
            <img src={file} alt={`file-${index}`} style={{ maxWidth: '100%', maxHeight: '80vh', marginBottom: '10px' }} />
          </div>
        );
      } else if (mimeType.startsWith('video/')) {
        return (
          <div key={index} style={styles.modalDocumentContainer}>
            <video controls src={file} style={{ maxWidth: '100%', maxHeight: '80vh', marginBottom: '10px' }} />
          </div>
        );
      } else if (mimeType.startsWith('audio/')) {
        return (
          <div key={index} style={styles.modalDocumentContainer}>
            <audio controls style={{ width: '100%', marginBottom: '10px' }}>
              <source src={file} type={mimeType} />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      } else if (mimeType === 'application/pdf') {
        return (
          <div key={index} style={styles.modalDocumentContainer}>
            <iframe src={file} style={{ width: '100%', height: '80vh', marginBottom: '10px' }} title={`file-${index}`} />
          </div>
        );
      }
    });
  };

  const successOptions = {
    loop: false,
    autoplay: true,
    animationData: successAnimation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return '#00B69B';
      case 'Pending':
        return '#FEC53D';
      case 'In_process':
        return '#4763E4';
      case 'Dropped':
        return '#EF3826';
      default:
        return '#ccc';
    }
  };

  const filteredEnquiries = enquiriesData.filter((data) => {
    switch (activeEnquiryTab) {
      case 'outstanding':
        return data.status === 'Pending';
      case 'in_process':
        return data.status === 'In_process';
      case 'completed':
        return data.status === 'Completed';
      case 'dropped':
        return data.status === 'Dropped';
      default:
        return true;
    }
  });

  return (
    <div>
      <div className='hello' style={styles.tabs}>
        {['all', 'outstanding', 'in_process', 'completed', 'dropped'].map((tab) => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeEnquiryTab === tab ? styles.activeTab : {}) }}
            onClick={() => setActiveEnquiryTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tabs[tab]})
          </button>
        ))}
      </div>
      {filteredEnquiries.length === 0 ? (
        <NoDataComponent />
      ) : (
        <>
          <div className="enqTable" style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Enquiry ID</th>
                  <th style={styles.th}>Lead Time</th>
                  <th style={styles.th}>Purpose</th>
                  <th style={styles.th}>Domain</th>
                  <th style={styles.th}>Field of Category</th>
                  <th style={styles.th}>Hardware Used</th>
                  <th style={styles.th}>Software Used</th>
                  <th style={styles.th}>Files</th>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Status</th>
                  {activeEnquiryTab === 'in_process' && <th style={styles.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries
                  .slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)
                  .map((data, index) => (
                    <tr key={index} onClick={() => setSelectedEnquiry(data)}>
                      <td style={styles.td}>{data.enquiryId}</td>
                      <td style={styles.td}>{data.leadTime}</td>
                      <td style={styles.td}>{data.purpose}</td>
                      <td style={styles.td}>{data.domain}</td>
                      <td style={styles.td}>{data.fieldOfCategory}</td>
                      <td style={styles.td}>{data.hardwareUsed}</td>
                      <td style={styles.td}>{data.softwareUsed}</td>
                      <td style={styles.td}>
                        {data.documentsFiles && data.documentsFiles.length > 0 ? (
                          <img
                            src={fileIcon}
                            alt="View Documents"
                            style={{ cursor: 'pointer', width: '30px', height: '30px' }}
                            onClick={() => handleViewClickInternal(data.documentsFiles)}
                          />
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td style={styles.td}>{new Date(data.timestamp?.toDate()).toLocaleString()}</td>
                      <td style={styles.td}>
                        <button style={{ ...styles.statusButton, backgroundColor: getStatusColor(data.status) }}>
                          {data.status}
                        </button>
                      </td>
                      {activeEnquiryTab === 'in_process' && (
                        <td style={styles.td}>
                          <button
                            style={styles.completeButton}
                            onClick={() => handleCompleteClick(data.enquiryId)}
                          >
                            {isLoading ? (
                              <div className="spinner" />
                            ) : (
                              'Complete'
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {renderPagination(filteredEnquiries)}
        </>
      )}

      {isModalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <button style={styles.closeButton} onClick={closeModal}>Close</button>
            <div>
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal for Start Date, End Date, Estimated Cost, and Total Working Hours */}
      <Modal
        isOpen={isCustomModalOpen}
        onRequestClose={closeCustomModal}
        style={customModalStyles}
        contentLabel="Complete Enquiry Details"
      >
        <div style={styles.dialogContainer}>
          <h2>Complete Enquiry Details</h2>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Start Date:</label>
            <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} showTimeSelect dateFormat="Pp" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>End Date:</label>
            <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} showTimeSelect dateFormat="Pp" />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Estimated Cost (₹):</label>
            <input
              type="text"
              value={estimatedCost}
              readOnly
              placeholder="Estimated cost"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Total Working Hours:</label>
            <input
              type="text"
              value={totalWorkingHours}
              readOnly
              placeholder="Total working hours"
            />
          </div>
          <div style={styles.buttonGroup}>
            <button style={styles.confirmButton} onClick={handleConfirm}>
              {isLoading ? (
                <div className="spinner" style={styles.spinner} />
              ) : (
                'Confirm'
              )}
            </button>
            <button style={styles.cancelButton} onClick={closeCustomModal}>Cancel</button>
          </div>
        </div>
      </Modal>

      {showSuccess && (
        <div style={styles.successOverlay}>
          <Confetti width={window.innerWidth} height={window.innerHeight} />
          <Lottie options={successOptions} height={200} width={200} />
          <h2 style={styles.successText}>Enquiry Completed Successfully</h2>
        </div>
      )}

      {/* Displaying Enquiry Details Container for each enquiry only on mobile */}
      {filteredEnquiries.length > 0 && filteredEnquiries.map((enquiry, index) => (
        enquiry.enquiryId && (
          <div key={index} className="mobile-enquiry-details enquiryDetailsContainer" style={styles.detailBox}>
            <p style={styles.iconContainer}><FaRegIdCard style={styles.icon}/> ID: {enquiry.enquiryId}</p>
            <div style={styles.iconContainer}>
              <FaGlobe style={styles.icon} />
              <p><strong>Domain:</strong> {enquiry.domain}</p>
            </div>
            <div style={styles.iconContainer}>
              <FaThLarge style={styles.icon} />
              <p><strong>Field Of Category:</strong> {enquiry.fieldOfCategory}</p>
            </div>
            <div style={styles.iconContainer}>
              <FaClock style={styles.icon} />
              <p><strong>Lead Time:</strong> {enquiry.leadTime}</p>
            </div>
            <div style={styles.iconContainer}>
              <FaBullseye style={styles.icon} />
              <p><strong>Purpose:</strong> {enquiry.purpose}</p>
            </div>
            <div style={styles.iconContainer}>
              <FaInfoCircle style={{ ...styles.icon, color: getStatusColor(enquiry.status) }} />
              <p style={{ color: getStatusColor(enquiry.status) }}><strong>Status:</strong> {enquiry.status}</p>
            </div>
          </div>
        )
      ))}
    </div>
  );
};

const styles = {
  noDataContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  noDataText: {
    fontSize: '24px',
    color: '#888',
  },
  tabs: {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',

    
  },
  tab: {
    padding: '10px 20px',
    cursor: 'pointer',
    color: 'black',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    marginBottom: '10px',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    borderBottom: '2px solid black',
  },
  tableContainer: {
    width: '100%',
    marginTop: '20px',
    overflowX: 'auto',
    minHeight: '400px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#002B7F',
    color: '#fff',
    fontWeight: '500',
    border: '1px solid #ccc',
  },
  td: {
    padding: '12px',
    border: '1px solid #ccc',
  },
  statusButton: {
    padding: '5px 10px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'default',
    display: 'block',
    margin: '0 auto',
    width: 'fit-content',
    marginTop: '5px',
  },
  completeButton: {
    padding: '5px 10px',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: '#28a745',
    color: '#fff',
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  paginationButton: {
    padding: '8px 16px',
    margin: '4px',
    borderRadius: '50%',
    backgroundColor: '#002B7F',
    color: '#fff',
  },
  activePage: {
    backgroundColor: '#4763E4',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '4px',
    width: '80%',
    maxWidth: '600px',
    maxHeight: '80%',
    overflowY: 'auto',
  },
  closeButton: {
    marginBottom: '10px',
    padding: '5px 10px',
    backgroundColor: 'red',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  modalDocumentContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '10px',
  },
  dialogContainer: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    width: '400px',
  },
  inputGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    color: '#333',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
  },
  confirmButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#ccc',
    color: '#000',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  successOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  successText: {
    color: 'white',
    marginTop: '20px',
    fontSize: '24px',
    textAlign: 'center',
  },
  spinner: {
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTop: '4px solid #fff',
    width: '20px',
    height: '20px',
    animation: 'spin 1s linear infinite',
  },
  detailBox: {
    marginTop: '20px',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
    maxWidth: '600px',
    margin: '20px auto',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },
  icon: {
    marginRight: '10px',
    fontSize: '20px',
  },
};

const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
};

const getStatusButtonStyle = (status) => {
  switch (status) {
    case 'Completed':
      return { backgroundColor: '#00B69B', color: '#004D40' };
    case 'accepted':
    case 'Pending':
    case 'In_process':
      return { backgroundColor: '#FEC53D', color: '#856404' };
    case 'rejected':
    case 'Dropped':
      return { backgroundColor: '#EF3826', color: '#8B0000' };
    default: 
      return { backgroundColor: '#fff', color: '#000' };
  }
};

export default TechEnquiries; 