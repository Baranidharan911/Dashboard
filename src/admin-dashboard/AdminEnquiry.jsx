import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, orderBy, getDoc, doc, updateDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEnquiry } from '../context/EnquiryContext';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import fileIcon from '../assets/file.png';
import LazyLoad from 'react-lazyload';

const Enquiry = () => {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentTab, setCurrentTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDomain, setCurrentDomain] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true); // State for loading spinner
  const navigate = useNavigate();
  const entriesPerPage = 10;
  const { stats, setStats } = useEnquiry();

  useEffect(() => {
    const fetchAllData = async () => {
      const q = query(collection(db, 'responses'), orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        try {
          const allFetchedData = [];

          const fetchRelatedData = async (enquiryId) => {
            const b2bDoc = await getDoc(doc(db, 'b2b_messages', enquiryId));
            const messageDoc = await getDoc(doc(db, 'messages', enquiryId));
            const b2bData = b2bDoc.exists() ? b2bDoc.data() : {};
            const messageData = messageDoc.exists() ? messageDoc.data() : {};
            return { ...b2bData, ...messageData };
          };

          const fetchEnquiriesData = querySnapshot.docs.map(async (docSnapshot) => {
            const docData = docSnapshot.data();
            const enquiryId = docData.enquiryId || "N/A";
            const userId = docData.userId;
            const relatedData = await fetchRelatedData(enquiryId);

            const userDoc = await getDoc(doc(db, 'users', userId));
            const userType = userDoc.exists() ? userDoc.data().type : "N/A";

            const domainContext = docData.responses?.find(response => response.context.includes("hardware_software_troubleshoot") || response.context.includes("hardware_software_new_project"));
            const domain = domainContext ? domainContext.response : "N/A";

            const lastResponse = docData.responses?.slice(-1)[0]?.response || "N/A";
            const isUrl = lastResponse.includes("https://");

            const mediaContextResponse = docData.responses?.find(response => response.context === "media");
            const endContextResponse = docData.responses?.find(response => response.context === "end");

            const problemDescription = endContextResponse && !isUrl ? endContextResponse.response : "N/A";
            const documentUrls = mediaContextResponse ? mediaContextResponse.urls : [];

            const enquiryData = {
              enquiryId: enquiryId,
              businessType: userType,
              requirement: docData.responses?.[0]?.response || "N/A",
              leadTime: docData.responses?.find(response => response.context.includes("troubleshoot") || response.context.includes("new_project"))?.response || "N/A",
              purpose: docData.responses?.find(response => response.context.includes("purpose_troubleshoot") || response.context.includes("purpose_new_project"))?.response || "N/A",
              domain: domain,
              fieldOfCategory: docData.responses?.find(response => response.context.includes("field_of_category_troubleshoot") || response.context.includes("field_of_category_new_project"))?.response || "N/A",
              hardwareUsed: docData.responses?.find(response => response.context.includes("hardwares_used_troubleshoot") || response.context.includes("hardwares_preference_new_project"))?.response || "N/A",
              softwareUsed: docData.responses?.find(response => response.context.includes("software_used_troubleshoot") || response.context.includes("software_used_new_project"))?.response || "N/A",
              problemStatement: docData.responses?.find(response => response.context.includes("problem_statement_troubleshoot") || response.context.includes("problem_statement_new_project"))?.response || "N/A",
              problemDescription: problemDescription || "N/A",
              documentsFiles: documentUrls,
              status: docData.status || "Pending",
              timestamp: docData.timestamp ? docData.timestamp.toDate() : null,
              ...relatedData
            };

            allFetchedData.push(enquiryData);
            return enquiryData;
          });

          await Promise.all(fetchEnquiriesData);

          const sortedData = allFetchedData.sort((a, b) => b.enquiryId.localeCompare(a.enquiryId));

          setAllData(sortedData);
          filterAndSetData(sortedData, currentTab, currentDomain, startDate, endDate);
          updateStats(sortedData, startDate, endDate);
          setIsLoading(false); // Stop loading spinner once data is fetched
        } catch (error) {
          console.error('Error fetching enquiries:', error);
          toast.error('Failed to fetch enquiries. Please check your Firestore rules and document paths.');
          setIsLoading(false); // Stop loading spinner in case of error
        }
      });

      return () => unsubscribe();
    };

    fetchAllData();
  }, [currentDomain, currentTab, startDate, endDate]);

  const updateStats = (data, startDate, endDate) => {
    const filteredData = filterDataByTime(data, startDate, endDate);
    setStats({
      totalEnquiries: filteredData.length,
      outstandingCount: filteredData.filter(enquiry => enquiry.status === 'pending').length,
      inProcessCount: filteredData.filter(enquiry => enquiry.status === 'inProcess').length,
      completedCount: filteredData.filter(enquiry => enquiry.status === 'Completed').length,
      droppedCount: filteredData.filter(enquiry => enquiry.status === 'dropped').length,
    });
  };

  const handleStatusChange = async (enquiryId, status) => {
    try {
      const enquiryDoc = doc(db, 'responses', enquiryId);
      await updateDoc(enquiryDoc, { status });
      toast.success(`Enquiry ${status} successfully!`);
      setAllData((prevData) => prevData.map(enquiry => enquiry.enquiryId === enquiryId ? { ...enquiry, status } : enquiry));
      filterAndSetData(allData.map(enquiry => enquiry.enquiryId === enquiryId ? { ...enquiry, status } : enquiry), currentTab, currentDomain, startDate, endDate);
      updateStats(allData.map(enquiry => enquiry.enquiryId === enquiryId ? { ...enquiry, status } : enquiry), startDate, endDate);
    } catch (error) {
      toast.error(`Failed to update status: ${error.message}`);
    }
  };

  const filterAndSetData = (data, status, domain, startDate, endDate) => {
    let filteredData = filterDataByStatus(data, status);
    filteredData = filterDataByDomain(filteredData, domain);
    filteredData = filterDataByTime(filteredData, startDate, endDate);
    setFilteredData(filteredData);
  };

  const filterDataByStatus = (data, status) => {
    if (status === 'all') return data;
    return data.filter(enquiry => enquiry.status === status);
  };

  const filterDataByDomain = (data, domain) => {
    if (domain === 'all') return data;
    return data.filter(enquiry => enquiry.domain.toLowerCase() === domain.toLowerCase());
  };

  const filterDataByTime = (data, startDate, endDate) => {
    if (!startDate && !endDate) return data;

    const start = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).endOf('day');

    return data.filter(enquiry => {
      const timestamp = dayjs(enquiry.timestamp);
      return timestamp.isAfter(start) && timestamp.isBefore(end);
    });
  };

  const handleSearch = () => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = allData.filter((enquiry) =>
      enquiry.enquiryId.toLowerCase().includes(lowercasedQuery) ||
      enquiry.fieldOfCategory?.toLowerCase().includes(lowercasedQuery)
    );
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleDomainChange = (domain) => {
    setCurrentDomain(domain);
    filterAndSetData(allData, currentTab, domain, startDate, endDate);
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    filterAndSetData(allData, tab, currentDomain, startDate, endDate);
  };

  const handleDateRangeChange = () => {
    filterAndSetData(allData, currentTab, currentDomain, startDate, endDate);
    updateStats(allData, startDate, endDate);
  };

  useEffect(() => {
    handleDateRangeChange();
  }, [startDate, endDate]);

  const handleViewClick = (urls) => {
    setModalContent(urls);
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

  const renderTable = (data) => {
    const columns = [
      'Enquiry ID', 'Business Type', 'Requirement', 'Lead Time', 'Purpose', 'Domain',
      'Field of Category', 'Hardware Used', 'Software Used', 'Problem Statement',
      'Problem Description', 'Files', 'Timestamp'
    ];

    return (
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index} style={styles.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage).map((enquiry, index) => (
              <tr key={index}>
                <td style={styles.td}>
                  <a
                    href={`/enquiries/${enquiry.enquiryId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/enquiries/${enquiry.enquiryId}?tab=${currentTab}`);
                    }}
                    style={styles.enquiryIdLink}
                  >
                    {enquiry.enquiryId}
                  </a>
                </td>
                <td style={styles.td}>{enquiry.businessType}</td>
                <td style={styles.td}>{enquiry.requirement}</td>
                <td style={styles.td}>{enquiry.leadTime}</td>
                <td style={styles.td}>{enquiry.purpose}</td>
                <td style={styles.td}>{enquiry.domain}</td>
                <td style={styles.td}>{enquiry.fieldOfCategory}</td>
                <td style={styles.td}>{enquiry.hardwareUsed}</td>
                <td style={styles.td}>{enquiry.softwareUsed}</td>
                <td style={styles.td}>{enquiry.problemStatement}</td>
                <td style={styles.td}>{enquiry.problemDescription}</td>
                <td style={styles.td}>
                  {enquiry.documentsFiles.length > 0 ? (
                    <img
                      src={fileIcon}
                      alt="View Documents"
                      style={{ cursor: 'pointer', width: '30px', height: '30px' }}
                      onClick={(e) => { e.preventDefault(); handleViewClick(enquiry.documentsFiles); }}
                    />
                  ) : (
                    'N/A'
                  )}
                </td>
                <td style={styles.td}>{enquiry.timestamp ? enquiry.timestamp.toLocaleString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination(data)}
      </div>
    );
  };

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
      <div style={styles.pagination}>
        <button
          style={{ ...styles.paginationButton, ...(currentPage === 1 ? styles.disabledButton : {}) }}
          onClick={handlePrevious}
          disabled={currentPage === 1}
        >
          &lt;
        </button>
        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index}
            style={{
              ...styles.paginationButton,
              ...(currentPage === index + 1 ? styles.activePage : {})
            }}
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </button>
        ))}
        <button
          style={{ ...styles.paginationButton, ...(currentPage === totalPages ? styles.disabledButton : {}) }}
          onClick={handleNext}
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {isLoading ? (
        <div style={styles.spinnerContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : (
        <>
          <header style={styles.mainHeader}>
            <h1 style={styles.headerTitle}>Enquiries</h1>
            <div style={styles.domainButtons}>
              <motion.button
                style={{ ...styles.domainButton, ...(currentDomain.toLowerCase() === 'software' ? styles.activeDomainButton : {}) }}
                onClick={() => handleDomainChange('software')}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
              >
                Software
              </motion.button>
              <motion.button
                style={{ ...styles.domainButton, ...(currentDomain.toLowerCase() === 'hardware' ? styles.activeDomainButton : {}) }}
                onClick={() => handleDomainChange('hardware')}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
              >
                Hardware
              </motion.button>
              <motion.button
                style={{ ...styles.domainButton, ...(currentDomain.toLowerCase() === 'all' ? styles.activeDomainButton : {}) }}
                onClick={() => handleDomainChange('all')}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
              >
                All
              </motion.button>
            </div>
          </header>
          <section style={styles.statusTabs}>
            <a href="#" style={{ ...styles.tab, ...(currentTab === 'all' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); handleTabChange('all'); }}>All ({stats.totalEnquiries})</a>
            <a href="#" style={{ ...styles.tab, ...(currentTab === 'pending' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); handleTabChange('pending'); }}>Outstanding ({stats.outstandingCount})</a>
            <a href="#" style={{ ...styles.tab, ...(currentTab === 'inProcess' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); handleTabChange('inProcess'); }}>In Process ({stats.inProcessCount})</a>
            <a href="#" style={{ ...styles.tab, ...(currentTab === 'Completed' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); handleTabChange('Completed'); }}>Completed ({stats.completedCount})</a>
            <a href="#" style={{ ...styles.tab, ...(currentTab === 'dropped' ? styles.activeTab : {}) }} onClick={(e) => { e.preventDefault(); handleTabChange('dropped'); }}>Dropped ({stats.droppedCount})</a>
            <div style={styles.dateRangeContainer}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.dateInput}
              />
              <span style={styles.dateRangeSeparator}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </section>
          <section style={styles.enquiryList}>
            <div style={styles.searchContainer}>
              <div style={styles.searchInputWrapper}>
                <input 
                  type="text" 
                  placeholder="Search your Enquiries" 
                  style={styles.searchInput} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button style={styles.filterButton} onClick={handleSearch}>
                  Filter
                </button>
              </div>
            </div>
            <AnimatePresence>
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                style={styles.tableWrapper}
              >
                {filteredData.length?renderTable(filteredData):<>No Data</>}
              </motion.div>
            </AnimatePresence>
          </section>
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
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
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
  domainButtons: {
    display: 'flex',
  },
  domainButton: {
    padding: '10px 20px',
    marginRight: '10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  activeDomainButton: {
    backgroundColor: '#002B7F',
    color: '#fff',
  },
  statusTabs: {
    flex: '0 0 auto',
    display: 'flex',
    marginBottom: '10px',
    alignItems: 'center',
  },
  tab: {
    padding: '10px 20px',
    textDecoration: 'none',
    color: '#000',
    marginRight: '10px',
    borderBottom: '2px solid transparent',
    cursor: 'pointer'
  },
  activeTab: {
    borderBottom: '2px solid #000',
  },
  dateRangeContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  dateInput: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    cursor: 'pointer',
    marginLeft: '10px',
  },
  dateRangeSeparator: {
    margin: '0 10px',
  },
  enquiryList: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
  },
  searchContainer: {
    display: 'flex',
    marginBottom: '10px',
  },
  searchInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '30px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: '0 10px',
    flex: 1,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    borderRadius: '30px',
    padding: '10px 20px',
    outline: 'none',
  },
  filterButton: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    padding: '10px',
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
    zIndex: 1,
  },
  td: {
    padding: '5px',
    border: '1px solid #ccc',
    textAlign: 'left',
  },
  enquiryIdLink: {
    color: '#002B7F',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '10px',
  },
  paginationButton: {
    padding: '10px',
    margin: '0 5px',
    backgroundColor: '#002B7F',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    color: '#fff',
    fontWeight: 'bold',
    width: '40px',
    height: '40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'background-color 0.3s ease',
  },
  activePage: {
    backgroundColor: '#4763E4',
  },
  disabledButton: {
    backgroundColor: '#002B7F',
    cursor: 'not-allowed',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
  spinner: {
    border: '6px solid rgba(0, 0, 0, 0.1)',
    borderTop: '6px solid #002B7F',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    animation: 'spin 1s linear infinite',
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
  '@media (max-width: 768px)': {
    mainHeader: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    domainButtons: {
      flexWrap: 'wrap',
    },
    domainButton: {
      marginBottom: '10px',
    },
    tab: {
      padding: '5px 10px',
      marginBottom: '5px',
    },
    searchInput: {
      padding: '5px 10px',
    },
    table: {
      fontSize: '14px',
    },
    paginationButton: {
      padding: '5px',
      margin: '0 2px',
    },
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
};

export default Enquiry;
