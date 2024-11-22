import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import { Badge, TextField, Button, Pagination, Popover, Typography, List, ListItem, ListItemText, Avatar } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import AdminStatCard from './AdminStatCard';
import { firestore } from '../../firebase/firebaseSetup';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

import allIcon from '../assets/all.png';
import outstandingIcon from '../assets/outstanding.png';
import processingIcon from '../assets/processing.png';
import completedIcon from '../assets/completed.png';
import rejectedIcon from '../assets/rejected.png';

ChartJS.register(ArcElement, Tooltip, Legend);

const fetchEarnings = async () => {
  const techniciansRef = collection(firestore, 'payments');
  const snapshot = await getDocs(techniciansRef);
  if (snapshot.empty) {
    console.log('No matching documents.');
    return [];
  }

  let earnings = [];
  console.log("snapshot:",snapshot)
  snapshot.forEach(doc => {
    const data = doc.data();
    
    let j = {
      "enquiryId":data.enquiry_id,
      "cost":data.amount,
      "timestamp":data.timestamp,
    }

    if(data.status==="success"){
      earnings.push(j)
    }
    
  });

  console.log("Earnings:",earnings)

  return earnings;
};

const round = (num, decimalPlaces = 0) => {
  if (num < 0)
      return -round(-num, decimalPlaces);
  var p = Math.pow(10, decimalPlaces);
  var n = num * p;
  var f = n - Math.floor(n);
  var e = Number.EPSILON * n;

  // Determine whether this fraction is a midpoint value.
  return (f >= .5 - e) ? Math.ceil(n) / p : Math.floor(n) / p;
}

const isToday = (timestamp) => {
  if (!timestamp) return false;
  const today = new Date();
  const date = new Date(timestamp.seconds * 1000);
  return today.toDateString() === date.toDateString();
};

const isYesterday = (timestamp) => {
  if (!timestamp) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp.seconds * 1000);
  return yesterday.toDateString() === date.toDateString();
};

const isThisWeek = (timestamp) => {
  if (!timestamp) return false;
  const today = new Date();
  const date = new Date(timestamp.seconds * 1000);
  const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  return date >= firstDayOfWeek && date <= today;
};

const isThisMonth = (timestamp) => {
  if (!timestamp) return false;
  const today = new Date();
  const date = new Date(timestamp.seconds * 1000);
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const isInRange = (timestamp, startDate, endDate) => {
  if (!timestamp || !startDate || !endDate) return false;
  const date = new Date(timestamp.seconds * 1000);
  return date >= new Date(startDate) && date <= new Date(endDate);
};

const AdminDashboardContent = ({
  stats,
  enquiriesData,
  techniciansData,
  currentPage,
  setCurrentPage,
  totalPages,
  unreadNotificationCount,
  renderTable,
  doughnutData1,
  optionsWithoutLegend,
  doughnutTotal,
}) => {
  const [earnings, setEarnings] = useState([]);
  const [filteredEarnings, setFilteredEarnings] = useState([]);
  const [filter, setFilter] = useState('total');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paginationPage, setPaginationPage] = useState(1);
  const [sentTech, setSentTech] = useState({});
  const [loading, setLoading] = useState(true); 
  const [anchorEl, setAnchorEl] = useState(null); 
  const [notifications, setNotifications] = useState([]);
  const itemsPerPage = 10;
  const chart1Ref = useRef(null);
  const chart2Ref = useRef(null);

  useEffect(() => {
    const getEarnings = async () => {
      setLoading(true); 
      const fetchedEarnings = await fetchEarnings();
      setEarnings(fetchedEarnings);
      setFilteredEarnings(fetchedEarnings);
      setLoading(false); 
    };

    getEarnings();
  }, []);

  useEffect(() => {
    const fetchNotifications = () => {
      const q = query(collection(firestore, 'notifications'), where('userId', '==', 'admin'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedNotifications = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedNotifications.push({ id: doc.id, ...data });
        });
        setNotifications(fetchedNotifications);
      });
      return () => unsubscribe();
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    let filtered = [];
    if (filter === 'total') {
      filtered = earnings;
    } else if (filter === 'today') {
      filtered = earnings.filter(({ timestamp }) => isToday(timestamp));
    } else if (filter === 'yesterday') {
      filtered = earnings.filter(({ timestamp }) => isYesterday(timestamp));
    } else if (filter === 'thisWeek') {
      filtered = earnings.filter(({ timestamp }) => isThisWeek(timestamp));
    } else if (filter === 'thisMonth') {
      filtered = earnings.filter(({ timestamp }) => isThisMonth(timestamp));
    } else if (filter === 'dateRange') {
      filtered = earnings.filter(({ timestamp }) => isInRange(timestamp, startDate, endDate));
    }
    setFilteredEarnings(filtered);
  }, [filter, earnings, startDate, endDate]);

  const totalEarnings = filteredEarnings.reduce((acc, { cost }) => acc + Number(cost), 0);
  const paginatedEarnings = filteredEarnings.slice((paginationPage - 1) * itemsPerPage, paginationPage * itemsPerPage);

  const matchedEnquiries = enquiriesData.filter(enquiry => {
    const isMatched = techniciansData.some(tech => tech.fieldOfCategory === enquiry.fieldOfCategory && tech.status === 'approved');
    const isNotCompletedOrDropped = enquiry.status !== 'Completed' && enquiry.status !== 'Dropped';
    return isMatched && isNotCompletedOrDropped;
  });

  const statCards = [
    { title: 'Total Enquiries', number: stats.totalEnquiries, icon: allIcon },
    { title: 'Outstanding', number: stats.outstandingCount, icon: outstandingIcon },
    { title: 'Processing', number: stats.inProcessCount, icon: processingIcon },
    { title: 'Completed', number: stats.completedCount, icon: completedIcon },
    { title: 'Dropped', number: stats.droppedCount, icon: rejectedIcon },
  ];

  const activeCount = techniciansData.filter(tech => tech.AvailabilityStatus === 'active').length;
  const inactiveCount = techniciansData.filter(tech => tech.AvailabilityStatus === 'inactive').length;

  const updatedDoughnutData2 = {
    labels: ['Active', 'Inactive'],
    datasets: [
      {
        data: [activeCount, inactiveCount],
        backgroundColor: ['#4AD991', '#EF3826'],
        hoverBackgroundColor: ['#4AD991', '#EF3826'],
      },
    ],
  };

  const handleSendRedirect = (enquiryId) => {
    const techId = sentTech[enquiryId];
    if (techId) {
      setSentTech(prev => ({ ...prev, [enquiryId]: techId }));
    }
    navigate(`/enquiries/${enquiryId}`);
  };

  const handleTechChange = (enquiryId, techId) => {
    setSentTech(prev => ({ ...prev, [enquiryId]: techId }));
  };

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationItemClick = async (notification) => {
    if (notification.status === 'unread') {
      const notificationRef = doc(firestore, 'notifications', notification.id);
      await updateDoc(notificationRef, { status: 'read' });
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, status: 'read' } : n
      ));
    }
    setAnchorEl(null);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <div>
      {loading ? (
        <div style={styles.spinnerContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : (
        <>
          <header style={styles.mainHeader}>
            <h1 style={styles.headerTitle}>Dashboard</h1>
            <div style={styles.notificationContainer}>
              <Badge badgeContent={notifications.filter(n => n.status === 'unread').length} color="error">
                <NotificationsIcon
                  style={styles.notificationIcon}
                  aria-describedby={id}
                  onClick={handleNotificationClick}
                />
              </Badge>
              <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  style: styles.notificationWindow,
                }}
              >
                <div style={styles.notificationHeader}>
                  <Typography style={styles.notificationTitle}>
                    Notifications ({notifications.length})
                  </Typography>
                </div>
                <div style={styles.notificationContent}>
                  <List>
                    {notifications.length > 0 ? (
                      notifications.map((notification, index) => (
                        <ListItem 
                          key={index} 
                          style={{
                            ...styles.notificationItem,
                            backgroundColor: notification.status === 'unread' ? '#e6f7e6' : '#fff'
                          }}
                          onClick={() => handleNotificationItemClick(notification)}
                        >
                          <Avatar src={notification.avatar} style={styles.notificationAvatar} />
                          <ListItemText
                            primary={
                              <Typography style={styles.notificationTextPrimary}>
                                {notification.message}
                              </Typography>
                            }
                            secondary={
                              <Typography style={styles.notificationTextSecondary}>
                                {new Date(notification.timestamp?.toDate()).toLocaleString()}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))
                    ) : (
                      <Typography style={styles.noNotifications}>
                        No new notifications
                      </Typography>
                    )}
                  </List>
                </div>
              </Popover>
            </div>
          </header>
          <div style={styles.statsContainer}>
            {statCards.map((card) => (
              <AdminStatCard
                key={card.title}
                title={card.title}
                number={card.number}
                icon={card.icon}
              />
            ))}
          </div>
          <div style={styles.tablesContainer}>
            <div style={styles.enquiryList}>
              {renderTable(matchedEnquiries, currentPage, setCurrentPage, totalPages, sentTech, techniciansData, handleTechChange, handleSendRedirect)}
            </div>
          </div>
          <div style={styles.earningsContainer}>
            <div style={styles.earningsWrapper}>
              <h3 style={styles.additionalTitle}>
                Total Earnings: ₹{round(totalEarnings,2)}
              </h3>
              <div style={styles.dateRangeContainer}>
                <TextField
                  type="date"
                  label="From"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.dateField}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <TextField
                  type="date"
                  label="To"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.dateField}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setFilter('dateRange')}
                  style={styles.filterButton}
                >
                  Filter
                </Button>
              </div>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setFilter('total')}
                style={styles.filterButton}
              >
                Total Earnings
              </Button>
              <ul style={filteredEarnings.length > 5 ? styles.scrollableList : {}}>
                {paginatedEarnings.map(({ enquiryId, cost }, index) => (
                  <li key={`${enquiryId}-${index}`}>
                    {enquiryId} - ₹{cost}
                  </li>
                ))}
              </ul>
              <Pagination
                count={Math.ceil(filteredEarnings.length / itemsPerPage)}
                page={paginationPage}
                onChange={(e, page) => setPaginationPage(page)}
                style={styles.pagination}
              />
            </div>
            <div style={styles.doughnutCharts}>
              <div className="chart1" style={styles.chartWrapper}>
                <h3 style={styles.chartTitle}>Engineer Status</h3>
                <Doughnut ref={chart1Ref} data={updatedDoughnutData2} options={optionsWithoutLegend} plugins={[doughnutTotal]} />
                <div style={styles.chartLegend}>
                  <div style={styles.legendItem}>
                    <div style={styles.legendNumber}>
                      {activeCount}
                    </div>
                    <div>
                      <span style={{ ...styles.legendColor, backgroundColor: '#4AD991' }}></span> Active
                    </div>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={styles.legendNumber}>
                      {inactiveCount}
                    </div>
                    <div>
                      <span style={{ ...styles.legendColor, backgroundColor: '#EF3826' }}></span> Inactive
                    </div>
                  </div>
                </div>
              </div>
              <div className="chart2" style={styles.chartWrapper}>
                <h3 style={styles.chartTitle}>Engineer Count</h3>
                <Doughnut ref={chart2Ref} data={doughnutData1} options={optionsWithoutLegend} plugins={[doughnutTotal]} />
                <div style={styles.chartLegendSingleLine}>
                  <div style={styles.legendItem}>
                    <div style={styles.legendNumber}>
                      {techniciansData.filter(tech => tech.status === 'approved').length}
                    </div>
                    <div>
                      <span style={{ ...styles.legendColor, backgroundColor: '#4AD991' }}></span> Approved
                    </div>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={styles.legendNumber}>
                      {techniciansData.filter(tech => tech.status === 'waiting').length}
                    </div>
                    <div style={styles.singleLineText}>
                      <span style={{ ...styles.legendColor, backgroundColor: '#FEC53D' }}></span> Waiting List
                    </div>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={styles.legendNumber}>
                      {techniciansData.filter(tech => tech.status === 'rejected').length}
                    </div>
                    <div>
                      <span style={{ ...styles.legendColor, backgroundColor: '#EF3826' }}></span> Rejected
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <style>
        {`
          @media (max-width: 1024px) {
            .chart1, .chart2 {
              flex: 1 1 48%;
            }
            .chartContainer {
              flex-wrap: wrap;
            }
          }

          @media (max-width: 768px) {
            .statsContainer {
              flex-wrap: wrap;
              justify-content: center;
            }
            .tablesContainer {
              flex-direction: column;
              gap: 20px;
            }
            .earningsContainer {
              flex-direction: column;
              gap: 20px;
            }
            .chartWrapper {
              margin-bottom: 20px;
            }
          }

          @media (max-width: 480px) {
            .mainHeader {
              flex-direction: column;
              align-items: flex-start;
            }
            .headerTitle {
              margin-bottom: 10px;
            }
            .statsContainer {
              flex-direction: column;
              gap: 10px;
            }
            .chartLegend, .chartLegendSingleLine {
              flex-direction: column;
              align-items: flex-start;
            }
            .earningsContainer {
              margin-top: 10px;
            }
          }
        `}
      </style>
    </div>
  );
};

AdminDashboardContent.propTypes = {
  stats: PropTypes.object.isRequired,
  enquiriesData: PropTypes.array.isRequired,
  techniciansData: PropTypes.array.isRequired,
  currentPage: PropTypes.number.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  totalPages: PropTypes.number.isRequired,
  unreadNotificationCount: PropTypes.number.isRequired,
  renderTable: PropTypes.func.isRequired,
  doughnutData1: PropTypes.object.isRequired,
  optionsWithoutLegend: PropTypes.object.isRequired,
  doughnutTotal: PropTypes.object.isRequired,
};

const styles = {
  mainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #ccc',
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  notificationIcon: {
    width: '24px',
    height: '24px',
    cursor: 'pointer',
  },
  notificationContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#002B7F',
  },
  statsContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  tablesContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  enquiryList: {
    flex: 2,
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
    marginRight: '20px',
  },
  earningsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    marginTop: '20px',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  earningsWrapper: {
    flex: 1,
  },
  chartWrapper: {
    flex: 1,
    textAlign: 'center',
    maxWidth: '200px',
  },
  chartTitle: {
    fontSize: '16px', 
    fontWeight: '600', 
    marginBottom: '10px', 
    color: '#002B7F', 
  }, 
  chartLegend: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(2, 1fr)', 
    gap: '5px', 
    marginTop: '10px', 
    textAlign: 'center', 
  }, 
  chartLegendSingleLine: { 
    display: 'flex', 
    justifyContent: 'center', 
    gap: '10px', 
    marginTop: '10px', 
    textAlign: 'center', 
  }, 
  legendItem: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    gap: '5px', 
    fontSize: '12px', 
    fontWeight: '500', 
    color: '#282D32', 
  }, 
  legendNumber: { 
    fontFamily: 'Nunito Sans, sans-serif', 
    fontWeight: '700', 
    fontSize: '16px', 
  }, 
  legendColor: { 
    width: '12px', 
    height: '12px', 
    borderRadius: '50%', 
    display: 'inline-block', 
  }, additionalTitle: { 
    fontSize: '18px', 
    fontWeight: '600', 
    color: '#002B7F', 
  }, 
  dateRangeContainer: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    marginBottom: '20px', 
    marginTop: '20px', 
  }, 
  dateField: { 
    width: '150px', 
  }, 
  filterButton: { 
    marginTop: '8px', 
    height: '50px', 
    marginBottom: '10px', 
  }, 
  scrollableList: { 
    maxHeight: '150px', 
    overflowY: 'auto', 
  }, 
  pagination: { 
    display: 'flex', 
    justifyContent: 'center', 
    marginTop: '20px', 
  }, 
  doughnutCharts: { 
    display: 'flex', 
    flexDirection: 'row', 
    gap: '20px', 
  }, 
  singleLineText: { 
    whiteSpace: 'nowrap', 
  }, 
  spinnerContainer: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
  }, 
  spinner: { 
    border: '16px solid #f3f3f3', 
    borderRadius: '50%', 
    borderTop: '16px solid #002B7F', 
    width: '120px', 
    height: '120px', 
    animation: 'spin 2s linear infinite', 
  }, 
  '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' }, }, 
  notificationWindow: { 
    width: '320px', 
    padding: '10px 0', 
    borderRadius: '8px', 
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', 
  }, 
  notificationHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '10px 20px', 
    borderBottom: '1px solid #eee', 
  }, 
  notificationTitle: { 
    fontSize: '16px', 
    fontWeight: 'bold', 
    color: '#333', }, 
    notificationContent: { 
      maxHeight: '300px', 
      overflowY: 'auto', 
      padding: '10px 20px', 
    }, 
    notificationItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    borderRadius: '12px', // Make the background curved
    backgroundColor: '#e6f7e6', // Green background color
    marginBottom: '10px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', // Optional: add a slight shadow for better visual effect
    width: '100%', // Full width of the container
  },
    notificationAvatar: { 
      marginRight: '15px', 
    }, 
    notificationTextPrimary: { 
      fontSize: '14px', 
      color: '#333', 
    }, 
    notificationTextSecondary: { 
      fontSize: '12px', 
      color: '#999', 
    }, 
    noNotifications: { 
      padding: '10px 0', 
      color: '#999', 
      textAlign: 'center', 
    }, 
  };

export default AdminDashboardContent;
