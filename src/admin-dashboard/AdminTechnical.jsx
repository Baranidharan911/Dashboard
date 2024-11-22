import React, { useEffect, useState, useCallback } from "react";
import { db } from '../../firebase/firebase'; // Corrected relative path to firebase.js
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import { motion, AnimatePresence } from 'framer-motion';
import 'react-toastify/dist/ReactToastify.css';
import fileIcon from '../assets/file.png'; // Ensure this path is correct

const Technical = () => {
  const [techniciansData, setTechniciansData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTab, setCurrentTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state
  const entriesPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, 'technicians'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTechnicians = [];
      querySnapshot.forEach((doc) => {
        fetchedTechnicians.push({ id: doc.id, ...doc.data() });
      });
      console.log('Fetched Technicians:', fetchedTechnicians);
      setTechniciansData(fetchedTechnicians);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleStatusChange = useCallback(async (technicianId, status) => {
    try {
      const technicianDoc = doc(db, 'technicians', technicianId);
      await updateDoc(technicianDoc, { status });
      console.log(`Technician ${technicianId} status changed to ${status}`);

      let toastOptions = {
        position: "top-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        toastId: technicianId, // Add a unique ID to ensure only one toast is shown
      };

      if (status === 'approved') {
        toast.success(`Technical Engineer approved successfully!`, toastOptions);
      } else if (status === 'waiting') {
        toast.warn(`Technical Engineer waitlisted!`, {
          ...toastOptions,
          style: { backgroundColor: '#FFDA03', color: '#000' },
        });
      } else if (status === 'rejected') {
        toast.error(`Technical Engineer rejected!`, {
          ...toastOptions,
          style: { backgroundColor: '#f01e2c', color: '#fff' },
        });
      }

      setTechniciansData((prevData) =>
        prevData.map(tech => tech.id === technicianId ? { ...tech, status } : tech)
      );
    } catch (error) {
      console.log(`Failed to update status for technician ${technicianId}: ${error.message}`);
      toast.error(`Failed to update status: ${error.message}`);
    }
  }, []);

  const filterDataByStatus = (status) => {
    if (status === 'all') return techniciansData.filter(technician => !technician.status);
    return techniciansData.filter(technician => technician.status === status);
  };

  const getTechnicianCount = (status) => {
    if (status === 'all') return techniciansData.filter(technician => !technician.status).length;
    return techniciansData.filter(technician => technician.status === status).length;
  };

  const handleViewClick = (url) => {
    setLoading(true); // Set loading to true when opening the modal
    setModalContent(url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent('');
  };

  const handleImageLoaded = () => {
    setLoading(false); // Set loading to false when the image is loaded
  };

  const handleImageError = () => {
    setLoading(false); // Set loading to false if there is an error
    toast.error('Failed to load image.');
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

    const fileExtension = modalContent.split('.').pop().split('?')[0].toLowerCase();
    const mimeType = getMimeType(fileExtension);

    if (mimeType.startsWith('image/')) {
      return (
        <div style={styles.modalDocumentContainer}>
          {loading && <div style={styles.spinner}></div>} {/* Show spinner if loading */}
          <img
            src={modalContent}
            alt="document"
            style={{ maxWidth: '100%', maxHeight: '80vh', marginBottom: '10px', display: loading ? 'none' : 'block' }} // Hide image until loaded
            onLoad={handleImageLoaded} // Handle image loaded event
            onError={handleImageError} // Handle image error event
          />
        </div>
      );
    } else if (mimeType.startsWith('video/')) {
      return (
        <div style={styles.modalDocumentContainer}>
          <video controls src={modalContent} style={{ maxWidth: '100%', maxHeight: '80vh', marginBottom: '10px' }} />
        </div>
      );
    } else if (mimeType.startsWith('audio/')) {
      return (
        <div style={styles.modalDocumentContainer}>
          <audio controls style={{ width: '100%', marginBottom: '10px' }}>
            <source src={modalContent} type={mimeType} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    } else if (mimeType === 'application/pdf') {
      return (
        <div style={styles.modalDocumentContainer}>
          <iframe src={modalContent} style={{ width: '100%', height: '80vh', marginBottom: '10px' }} title="document" />
        </div>
      );
    }
  };

  const renderActionBtn = (technicianId,currentTab) => {

    let compArr = []
    const acceptBtn = (<button style={styles.actionButton} onClick={() => handleStatusChange(technicianId, 'approved')}>Approve</button>)
    const waitBtn = (<button style={styles.actionButton} onClick={() => handleStatusChange(technicianId, 'waiting')}>Waitlist</button>)
    const rejectBtn = (<button style={styles.actionButton} onClick={() => handleStatusChange(technicianId, 'rejected')}>Reject</button>)
    if(currentTab==="all"){
      compArr.push(acceptBtn)
      compArr.push(waitBtn)
      compArr.push(rejectBtn)
    }
  
    if(currentTab==="approved"){
      compArr.push(waitBtn)
      compArr.push(rejectBtn)
    }

    if(currentTab==="waiting"){
      compArr.push(acceptBtn)
      compArr.push(rejectBtn)
    }

    if(currentTab==="rejected"){
      compArr.push(acceptBtn)
      compArr.push(waitBtn)
    }

    return compArr
  }

  const renderTable = (data) => {
  
    return data.length?(
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Technician ID</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Phone</th>
            <th style={styles.th}>Aadhaar</th>
            <th style={styles.th}>Profile Photo</th>
            <th style={styles.th}>Work Mode</th>
            <th style={styles.th}>Availability</th>
            <th style={styles.th}>Field of Category</th>
            <th style={styles.th}>Charges</th>
            <th style={styles.th}>Customer Type</th>
            <th style={styles.th}>Experience</th>
            <th style={styles.th}>Hardware</th>
            <th style={styles.th}>Location</th>
            <th style={styles.th}>Problem Type</th>
            <th style={styles.th}>Profession</th>
            <th style={styles.th}>Qualification</th>
            <th style={styles.th}>Actions</th>
            {/* {currentTab === 'all' && <th style={styles.th}>Actions</th>} */}
          </tr>
        </thead>
        <tbody>
          
          {
          
          data.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage).map((technician, index) => (
            <tr key={index}>
              <td style={styles.td}>{technician.technicianID}</td>
              <td style={styles.td}>{technician.name}</td>
              <td style={styles.td}>{technician.email}</td>
              <td style={styles.td}>{technician.mobileNumber}</td>
              <td style={styles.td}>
                {technician.aadhaarURL ? (
                  <img
                    src={fileIcon}
                    alt="View Aadhaar"
                    style={{ cursor: 'pointer', width: '30px', height: '30px' }}
                    onClick={(e) => { e.preventDefault(); handleViewClick(technician.aadhaarURL); }}
                  />
                ) : (
                  'N/A'
                )}
              </td>
              <td style={styles.td}>
                {technician.photoURL ? (
                  <img
                    src={fileIcon}
                    alt="View Profile Photo"
                    style={{ cursor: 'pointer', width: '30px', height: '30px' }}
                    onClick={(e) => { e.preventDefault(); handleViewClick(technician.photoURL); }}
                  />
                ) : (
                  'N/A'
                )}
              </td>
              <td style={styles.td}>{technician.availability}</td>
              <td style={styles.td}>{technician.AvailabilityStatus}</td>
              <td style={styles.td}>{technician.fieldOfCategory}</td>
              <td style={styles.td}>{technician.charges}</td>
              <td style={styles.td}>{technician.customerType}</td>
              <td style={styles.td}>{technician.experience}</td>
              <td style={styles.td}>{technician.hardware}</td>
              <td style={styles.td}>{technician.location?.city}, {technician.location?.state}</td>
              <td style={styles.td}>{technician.problemType}</td>
              <td style={styles.td}>{technician.profession}</td>
              <td style={styles.td}>{technician.qualification}</td>
              <td style={styles.td}>
                {
                  renderActionBtn(technician.id,currentTab)
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {techniciansData.length > entriesPerPage && renderPagination(filterDataByStatus(currentTab))}
    </div>):
    (<div>No Data</div>)
  
  }

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

    const getPageNumbers = () => {
      const pageNumbers = [];
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    };

    return (
      <div style={styles.pagination}>
        <button style={styles.paginationButton} onClick={handlePrevious} disabled={currentPage === 1}>&larr;</button>
        {getPageNumbers().map(number => (
          <button key={number} style={{ ...styles.paginationButton, ...(currentPage === number ? styles.activePage : {}) }} onClick={() => setCurrentPage(number)}>
            {number}
          </button>
        ))}
        <button style={styles.paginationButton} onClick={handleNext} disabled={currentPage === totalPages}>&rarr;</button>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <ToastContainer />
      <header style={styles.mainHeader}>
        <h1 style={styles.headerTitle}>Technical Engineer</h1>
      </header>
      <section style={styles.statusTabs}>
        <a href="#" style={{ ...styles.tab, ...(currentTab === 'all' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); setCurrentTab('all'); }}>New ( {getTechnicianCount("all")} )</a>
        <a href="#" style={{ ...styles.tab, ...(currentTab === 'approved' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); setCurrentTab('approved'); }}>Approved ( {getTechnicianCount("approved")} )</a>
        <a href="#" style={{ ...styles.tab, ...(currentTab === 'waiting' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); setCurrentTab('waiting'); }}>Waiting List ( {getTechnicianCount("waiting")} )</a>
        <a href="#" style={{ ...styles.tab, ...(currentTab === 'rejected' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); setCurrentTab('rejected'); }}>Rejected ( {getTechnicianCount("rejected")} )</a>
      </section>

      <section style={styles.enquiryList}>
        <AnimatePresence>
          <motion.div key={currentTab} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.5 }} style={styles.tableWrapper}>
            {
              renderTable(filterDataByStatus(currentTab))
            }
          </motion.div>
        </AnimatePresence>
      </section>

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
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: 'Inter, sans-serif',
  },
  mainHeader: {
    flex: '0 0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #ccc',
    paddingBottom: '10px',
    marginBottom: '10px',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#002B7F',
  },
  statusTabs: {
    flex: '0 0 auto',
    display: 'flex',
    marginBottom: '10px',
    flexWrap: 'wrap', // Wrap tabs on smaller screens
  },
  tab: {
    padding: '10px 20px',
    textDecoration: 'none',
    color: '#000',
    marginRight: '10px',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
  },
  activeTab: {
    borderBottom: '2px solid #000',
  },
  enquiryList: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
  },
  tableWrapper: {
    flex: '1 1 auto',
    overflow: 'hidden',
  },
  tableContainer: {
    overflowX: 'auto',
    overflowY: 'auto',
    height: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '5px',
    border: '1px solid #ccc',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backgroundColor: '#fff',
  },
  td: {
    padding: '5px',
    border: '1px solid #ccc',
    textAlign: 'left',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '10px',
    flexWrap: 'wrap', // Wrap pagination on smaller screens
  },
  paginationButton: {
    padding: '5px 10px',
    margin: '0 5px',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '50%',
    cursor: 'pointer',
    color: '#002B7F',
  },
  activePage: {
    backgroundColor: '#002B7F',
    color: '#fff',
  },
  actionButton: {
    padding: '5px 10px',
    margin: '2px',
    backgroundColor: '#002B7F',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '80px',
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
  spinner: {
    border: '16px solid #f3f3f3',
    borderRadius: '50%',
    borderTop: '16px solid #002B7F',
    width: '80px',
    height: '80px',
    animation: 'spin 2s linear infinite',
    margin: 'auto',
  },
  modalDocumentContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  '@media (max-width: 768px)': {
    headerTitle: {
      fontSize: '18px',
    },
    tab: {
      padding: '8px 16px',
      fontSize: '14px',
    },
    th: {
      fontSize: '14px',
    },
    td: {
      fontSize: '14px',
    },
    paginationButton: {
      padding: '4px 8px',
    },
    actionButton: {
      padding: '4px 8px',
      fontSize: '12px',
    },
  },
  '@media (max-width: 576px)': {
    headerTitle: {
      fontSize: '16px',
    },
    tab: {
      padding: '6px 12px',
      fontSize: '12px',
    },
    th: {
      fontSize: '12px',
    },
    td: {
      fontSize: '12px',
    },
    paginationButton: {
      padding: '3px 6px',
    },
    actionButton: {
      padding: '3px 6px',
      fontSize: '10px',
    },
  },
};

export default Technical;
