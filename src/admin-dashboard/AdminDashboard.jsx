import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../firebase/firebase';
import { collection, onSnapshot, query, where, orderBy, getDoc, doc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AdminSidebar from './AdminSidebar';
import AdminDashboardContent from './AdminDashboardContent';
import AdminNotification from './AdminNotification';
import Technical from './AdminTechnical';
import Enquiry from './AdminEnquiry';
import AdvertisementManagement from './AdvertisementManagement'; // Import AdvertisementManagement
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { useEnquiry } from '../context/EnquiryContext';
import 'react-toastify/dist/ReactToastify.css';
import '../App.css';
import sendIcon from '../assets/send.png';

// Import TechnicianBankDetails component
import TechnicianBankDetails from './TechnicianBankDetails'; // Adjust the path as necessary

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const nodeRef = useRef(null);
  const { stats, setStats } = useEnquiry();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enquiriesData, setEnquiriesData] = useState(JSON.parse(localStorage.getItem('enquiriesData')) || []);
  const [techniciansData, setTechniciansData] = useState(JSON.parse(localStorage.getItem('techniciansData')) || []);
  const [selectedTech, setSelectedTech] = useState({});
  const [sentTech, setSentTech] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 20;
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setIsAuthenticated(false);
        navigate('/login');
      }
    });

    return () => {
      authUnsubscribe();
      unsubscribeRefs.current.forEach((unsub) => {
        if (typeof unsub === 'function') {
          unsub();
        }
      });
      unsubscribeRefs.current = [];
    };
  }, [navigate]);

  const fetchData = async () => {
    unsubscribeRefs.current.push(fetchTechnicians(), fetchNotifications(), fetchEnquiries());
    setLoading(false);  // Stop loading after fetching data
  };

  const fetchTechnicians = () => {
    const techQuery = query(collection(db, 'technicians'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(techQuery, (querySnapshot) => {
      const techData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTechniciansData(techData);
      localStorage.setItem('techniciansData', JSON.stringify(techData));
    });
    return unsubscribe;
  };

  const fetchNotifications = () => {
    const q = query(collection(db, 'notifications'), where('userType', '==', 'admin'), where('status', '==', 'unread'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications = [];
      let unreadCount = 0;
      querySnapshot.forEach((doc) => {
        const notification = { id: doc.id, ...doc.data() };
        if (notification.status === 'unread') {
          unreadCount++;
        }
        fetchedNotifications.push(notification);
      });
      setNotifications(fetchedNotifications);
      setUnreadNotificationCount(unreadCount);
    });
    return unsubscribe;
  };

  const fetchEnquiries = () => {
    const q = query(collection(db, 'responses'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const enquiries = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const b2bDoc = await getDoc(doc(db, 'b2b_messages', docSnapshot.id));
          const messageDoc = await getDoc(doc(db, 'messages', docSnapshot.id));
          const b2bData = b2bDoc.exists() ? b2bDoc.data() : {};
          const messageData = messageDoc.exists() ? messageDoc.data() : {};

          const fieldOfCategory = data.responses?.find(
            (response) =>
              response.context.includes('field_of_category_troubleshoot') ||
              response.context.includes('field_of_category_new_project')
          )?.response || 'N/A';

          return {
            id: docSnapshot.id,
            enquiryId: data.enquiryId,
            fieldOfCategory,
            timestamp: data.timestamp?.toDate().toLocaleString() || 'N/A',
            timeSlot: data.timeSlot || 'N/A',
            ...data,
            ...b2bData,
            ...messageData,
          };
        })
      );

      setEnquiriesData(enquiries);
      localStorage.setItem('enquiriesData', JSON.stringify(enquiries));

      updateStats(enquiries);
    });

    return unsubscribe;
  };

  const matchTechnicians = (fieldOfCategory) => {
    if (!fieldOfCategory || fieldOfCategory === 'N/A') {
      return [];
    }
    return techniciansData.filter((tech) => tech.fieldOfCategory === fieldOfCategory && tech.status === 'approved');
  };

  const updateStats = (data) => {
    const totalEnquiries = data.length;
    const outstandingCount = data.filter((enquiry) => enquiry.status === 'pending').length;
    const inProcessCount = data.filter((enquiry) => enquiry.status === 'inProcess').length;
    const completedCount = data.filter((enquiry) => enquiry.status === 'Completed').length;
    const droppedCount = data.filter((enquiry) => enquiry.status === 'dropped').length;

    const updatedStats = {
      totalEnquiries,
      outstandingCount,
      inProcessCount,
      completedCount,
      droppedCount,
    };

    setStats(updatedStats);
  };

  const clearCacheData = () => {
    caches.keys().then((names) => {
        names.forEach((name) => {
            caches.delete(name);
        });
    });
  };

  const handleLogout = async () => {
    try {
      unsubscribeRefs.current.forEach((unsub) => {
        if (typeof unsub === 'function') {
          unsub();
        }
      });
      unsubscribeRefs.current = [];
      await signOut(auth);
      localStorage.clear();
      clearCacheData();
      navigate('/login-admin');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleTechChange = (enquiryId, techId) => {
    setSelectedTech((prev) => ({ ...prev, [enquiryId]: techId }));
  };

  const handleSendRedirect = (enquiryId) => {
    const techId = selectedTech[enquiryId];
    if (techId) {
      const techName = techniciansData.find((tech) => tech.id === techId)?.name || '';
      setSentTech((prev) => ({ ...prev, [enquiryId]: techName }));
      navigate(`/enquiries/${enquiryId}`);
    }
  };

  const doughnutData1 = {
    labels: ['Approved', 'Waiting List', 'Rejected'],
    datasets: [
      {
        label: 'Status',
        data: [
          techniciansData.filter((tech) => tech.status === 'approved').length,
          techniciansData.filter((tech) => tech.status === 'waiting').length,
          techniciansData.filter((tech) => tech.status === 'rejected').length,
        ],
        backgroundColor: ['#4AD991', '#FEC53D', '#EF3826'],
        hoverBackgroundColor: ['#4AD991', '#FEC53D', '#EF3826'],
      },
    ],
  };

  const doughnutData2 = {
    labels: ['Active', 'Inactive'],
    datasets: [
      {
        label: 'Status',
        data: [
          techniciansData.filter((tech) => tech.AvailabilityStatus === 'active').length,
          techniciansData.filter((tech) => tech.AvailabilityStatus === 'inactive').length,
        ],
        backgroundColor: ['#4AD991', '#EF3826'],
        hoverBackgroundColor: ['#4AD991', '#EF3826'],
      },
    ],
  };

  const optionsWithoutLegend = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.label}: ${context.raw}`;
          },
        },
      },
    },
  };

  const doughnutTotal = {
    id: 'doughnutTotal',
    beforeDraw: (chart) => {
      const { width, height, ctx } = chart;
      const total = chart.config.data.datasets[0].data.reduce((acc, curr) => acc + curr, 0);
      ctx.restore();
      ctx.font = 'bold 16px Arial';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';

      const text = `TOTAL\n${total}`;
      const textX = width / 2;
      const textY = height / 2;

      const lines = text.split('\n');
      lines.forEach((line, index) => {
        ctx.fillText(line, textX, textY + index * 16);
      });

      ctx.save();
    },
  };

  const handleNotificationClick = () => {
    navigate('/admin-notifications');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return '#4AD991';
      case 'inProcess':
      case 'pending':
        return '#FEC53D';
      case 'dropped':
        return '#EF3826';
      default:
        return '#ccc';
    }
  };

  const renderTable = (data, currentPage, setCurrentPage) => {
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

    const paginatedData = data.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

    const firstHalf = paginatedData.slice(0, 10);
    const secondHalf = paginatedData.slice(10);

    return (
      <>
        <div style={styles.tablesContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Enquiry ID</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Matched Technical</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {firstHalf.map((enquiry, index) => (
                <tr key={`${enquiry.enquiryId}-${index}`}>
                  <td style={styles.td}>
                    <span className="enquiryIdLink" onClick={() => handleSendRedirect(enquiry.enquiryId)}>
                      {enquiry.enquiryId}
                    </span>
                  </td>
                  <td style={styles.td}>{enquiry.fieldOfCategory}</td>
                  <td style={styles.td}>
                    <div className="dropdownContainer">
                      {sentTech[enquiry.id] ? (
                        <button className="techButton">
                          {sentTech[enquiry.id]}
                        </button>
                      ) : (
                        <>
                          {selectedTech[enquiry.id] ? (
                            <button className="techButton" onClick={() => handleTechChange(enquiry.id, '')}>
                              {techniciansData.find((tech) => tech.id === selectedTech[enquiry.id])?.name}
                              <img src={sendIcon} alt="Send" style={styles.sendIcon} onClick={() => handleSendRedirect(enquiry.id)} />
                            </button>
                          ) : (
                            <select className="techDropdown" onChange={(e) => handleTechChange(enquiry.id, e.target.value)}>
                              <option value="">Technical Engineer</option>
                              {matchTechnicians(enquiry.fieldOfCategory).map((tech) => (
                                <option key={tech.id} value={tech.id}>
                                  {tech.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <button className="status" style={{ backgroundColor: getStatusColor(enquiry.status) }}>
                      {enquiry.status.charAt(0).toUpperCase() + enquiry.status.slice(1)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Enquiry ID</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Matched Technical</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {secondHalf.map((enquiry, index) => (
                <tr key={`${enquiry.enquiryId}-${index}`}>
                  <td style={styles.td}>
                    <span className="enquiryIdLink" onClick={() => handleSendRedirect(enquiry.enquiryId)}>
                      {enquiry.enquiryId}
                    </span>
                  </td>
                  <td style={styles.td}>{enquiry.fieldOfCategory}</td>
                  <td style={styles.td}>
                    <div className="dropdownContainer">
                      {sentTech[enquiry.id] ? (
                        <button className="techButton">
                          {sentTech[enquiry.id]}
                        </button>
                      ) : (
                        <>
                          {selectedTech[enquiry.id] ? (
                            <button className="techButton" onClick={() => handleTechChange(enquiry.id, '')}>
                              {techniciansData.find((tech) => tech.id === selectedTech[enquiry.id])?.name}
                              <img src={sendIcon} alt="Send" style={styles.sendIcon} onClick={() => handleSendRedirect(enquiry.id)} />
                            </button>
                          ) : (
                            <select className="techDropdown" onChange={(e) => handleTechChange(enquiry.id, e.target.value)}>
                              <option value="">Technical Engineer</option>
                              {matchTechnicians(enquiry.fieldOfCategory).map((tech) => (
                                <option key={tech.id} value={tech.id}>
                                  {tech.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <button className="status" style={{ backgroundColor: getStatusColor(enquiry.status) }}>
                      {enquiry.status.charAt(0).toUpperCase() + enquiry.status.slice(1)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={styles.pagination}>
          <button style={styles.paginationButton} onClick={handlePrevious} disabled={currentPage === 1}>
            <span>&#9664;</span>
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
          <button style={styles.paginationButton} onClick={handleNext} disabled={currentPage === totalPages}>
            <span>&#9654;</span>
          </button>
        </div>
      </>
    );
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          .navItem {
            font-family: 'Inter', sans-serif;
            font-size: 15px;
            font-weight: 400;
            line-height: 12px;
            letter-spacing: 0.5px;
            text-align: left;
            color: #fff;
            text-decoration: none;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            padding: 10px;
            border-radius: 5px;
            transition: all 0.3s ease;
          }

          .navItem img {
            width: 20px;
            height: 20px;
            margin-right: 10px;
            filter: brightness(0) invert(1);
            transition: filter 0.3s ease;
          }

          .navItem:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: #fff;
          }

          .navItem:hover img {
            filter: brightness(0) invert(1);
          }

          .chart1 {
            /* Add custom styles for chart1 here */
          }

          .chart2 {
            /* Add custom styles for chart2 here */
          }

          .techButton {
            background-color: #002B7F;
            color: #fff;
            border: none;
            border-radius: 5px;
            padding: 10px 15px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .techButton img {
            width: 15px;
            height: 15px;
            margin-left: 5px;
          }

          .techDropdown {
            background-color: #002B7F;
            color: #fff;
            border: none;
            border-radius: 5px;
            padding: 10px 15px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
          }

          .status {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            width: 100px;
            text-align: center;
            margin-bottom: 5px;
            background-color: white;
            color: #000;
          }

          .status.outstanding {
            color: #ffc107;
          }

          .status.inProcess {
            color: #FEC53D;
          }

          .status.completed {
            color: #4AD991;
          }

          .status.dropped {
            color: #EF3826;
          }

          .dropdownContainer {
            display: flex;
            align-items: center;
          }

          .fade-enter {
            opacity: 0;
            transform: translateY(20px);
          }

          .fade-enter-active {
            opacity: 1;
            transform: translateY(0);
            transition: opacity 300ms, transform 300ms;
          }

          .fade-exit {
            opacity: 1;
            transform: translateY(0);
          }

          .fade-exit-active {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 300ms, transform 300ms;
          }

          @media (max-width: 768px) {
            .sidebar {
              width: 200px;
            }
            .navItem {
              font-size: 14px;
              padding: 8px;
            }
            .navItem img {
              width: 18px;
              height: 18px;
            }
            .techButton {
              font-size: 12px;
              padding: 8px 10px;
            }
            .techDropdown {
              font-size: 12px;
              padding: 8px 10px;
            }
            .status {
              padding: 8px 15px;
              font-size: 12px;
            }
            .adminInfo {
              flex-direction: column;
              align-items: flex-start;
            }
          }
          @media (max-width: 480px) {
            .sidebar {
              width: 160px;
            }
            .navItem {
              font-size: 12px;
              padding: 6px;
            }
            .navItem img {
              width: 16px;
              height: 16px;
            }
            .techButton {
              font-size: 10px;
              padding: 6px 8px;
            }
            .techDropdown {
              font-size: 10px;
              padding: 6px 8px;
            }
            .status {
              padding: 6px 10px;
              font-size: 10px;
            }
            .adminInfo {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}
      </style>
      <AdminSidebar handleLogout={handleLogout} />
      <main style={styles.mainContent}>
        <TransitionGroup>
          <CSSTransition key={location.key} classNames="fade" timeout={300} nodeRef={nodeRef}>
            <div ref={nodeRef}>
              <Routes location={location}>
                <Route
                  path="/"
                  element={
                    <AdminDashboardContent
                      stats={stats}
                      enquiriesData={enquiriesData}
                      techniciansData={techniciansData}
                      currentPage={currentPage}
                      setCurrentPage={setCurrentPage}
                      totalPages={Math.ceil(enquiriesData.length / entriesPerPage)}
                      unreadNotificationCount={unreadNotificationCount}
                      handleNotificationClick={handleNotificationClick}
                      renderTable={renderTable}
                      doughnutData1={doughnutData1}
                      doughnutData2={doughnutData2}
                      optionsWithoutLegend={optionsWithoutLegend}
                      doughnutTotal={doughnutTotal}
                    />
                  }
                />
                <Route path="technical" element={<Technical />} />
                <Route path="enquiry" element={<Enquiry />} />
                <Route path="notifications" element={<AdminNotification />} />
                <Route path="advertisement-management" element={<AdvertisementManagement />} /> {/* New AdvertisementManagement route */}
                <Route path="technician-bank-details" element={<TechnicianBankDetails />} /> {/* New TechnicianBankDetails route */}
              </Routes>
            </div>
          </CSSTransition>
        </TransitionGroup>
        <ToastContainer />
      </main>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'Inter, sans-serif',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '10px',
    flexWrap: 'nowrap',
  },
  
  mainContent: {
    marginLeft: '250px',
    padding: '20px',
    backgroundColor: '#f4f4f4',
    overflowY: 'auto',
    height: '100vh',
    width: 'calc(100% - 250px)',
    fontFamily: 'Inter, sans-serif',
  },
  table: {
    width: '48%',
    borderCollapse: 'collapse',
    marginBottom: '10px',
  },
  th: {
    padding: '10px',
    border: '1px solid #ccc',
    textAlign: 'left',
    height: '60px', // Set a fixed height for header cells
    verticalAlign: 'middle', // Center the text vertically
  },
  td: {
    padding: '10px',
    border: '1px solid #ccc',
    textAlign: 'left',
    height: '60px', // Set a fixed height for table cells
    verticalAlign: 'middle', // Center the text vertically
  },
  paginationButton: {
    padding: '5px 10px',
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
  tablesContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  sendIcon: {
    width: '15px',
    height: '15px',
    marginLeft: '5px',
  },
};

export default AdminDashboard;
