import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, doc, onSnapshot, query, updateDoc, where, getDocs, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress, Popover, Typography, List, ListItem, ListItemText, Avatar, Badge } from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Modal from 'react-modal';
import { auth, db, functions } from '../../firebase/firebase'; 
import { httpsCallable } from 'firebase/functions'; 
import NotificationsIcon from '@mui/icons-material/Notifications';
import TechDashboard from './TechDashboard';
import TechEnquiries from './TechEnquiries';
import TechHeader from './TechHeader';
import TechSidebar from './TechSidebar';
import TechOffline from './TechOffline';
import BankDetails from './BankDetails'; 
import TechSettings from './TechSettings'; // Import TechSettings page

Modal.setAppElement('#root');

const Technician = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modifiedData, setModifiedData] = useState([]);
  const [technicianId, setTechnicianId] = useState(localStorage.getItem('technicianId') || null);
  const [technicianProfile, setTechnicianProfile] = useState(JSON.parse(localStorage.getItem('technicianProfile')) || {});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(null);
  const [timeSlot, setTimeSlot] = useState(null);
  const [approxTime, setApproxTime] = useState('');
  const [budget, setBudget] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [onlineStatus, setOnlineStatus] = useState(JSON.parse(localStorage.getItem('onlineStatus')) || false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchTechnicianData = useCallback(async () => {
    if (technicianId) {
      setLoading(true);
      try {
        const technicianDoc = await getDoc(doc(db, 'technicians', technicianId));
        if (technicianDoc.exists()) {
          const profileData = technicianDoc.data();
          setTechnicianProfile(profileData);
          setIsAuthenticated(true);
          localStorage.setItem('technicianProfile', JSON.stringify(profileData)); 
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
  }, [technicianId]);

  const fetchData = useCallback(() => {
    if (technicianId) {
      setLoading(true);

      const q = query(collection(db, 'response_modified'), where('assignedTechnicianId', '==', technicianId));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedData = [];
        querySnapshot.forEach((docSnapshot) => {
          const docData = docSnapshot.data();
          fetchedData.push({ ...docData, id: docSnapshot.id });
        });
        setModifiedData(fetchedData);
        setLoading(false);
      });

      const notifQuery = query(collection(db, 'notifications'), where('technicianId', '==', technicianId), where('status', '==', 'unread'));
      const notifUnsubscribe = onSnapshot(notifQuery, (querySnapshot) => {
        const newNotifications = [];
        let unreadCount = 0;
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          newNotifications.push({ ...docSnapshot.data(), id: docSnapshot.id });
          if (data.status === 'unread') {
            unreadCount++;
          }
        });
        setNotifications(newNotifications);
        setUnreadNotificationCount(unreadCount);
      });

      return () => {
        unsubscribe();
        notifUnsubscribe();
      };
    }
  }, [technicianId]);

  useEffect(() => {
    if (technicianId) {
      fetchTechnicianData();
    } else {
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          const fetchTechnicianProfile = async () => {
            const q = query(collection(db, 'technicians'), where('email', '==', user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const technicianDoc = querySnapshot.docs[0];
              const profileData = technicianDoc.data();
              setTechnicianId(technicianDoc.id);
              setTechnicianProfile(profileData);
              localStorage.setItem('technicianId', technicianDoc.id);
              localStorage.setItem('technicianProfile', JSON.stringify(profileData)); 
              setIsAuthenticated(true);
            }
          };
          fetchTechnicianProfile();
        } else {
          setIsAuthenticated(false);
          navigate('/login');
        }
      });

      return () => {
        unsubscribeAuth();
      };
    }
  }, [fetchTechnicianData, navigate, technicianId]);

  useEffect(() => {
    if (technicianId) {
      fetchData();
    }
  }, [fetchData, technicianId]);

  useEffect(() => {
    if (approxTime && budget) {
      const totalHours = parseFloat(approxTime) || 0;
      setEstimatedCost(totalHours * parseFloat(budget || 0));
    }
  }, [approxTime, budget]);

  const handleAccept = (enquiryId) => {
    setSelectedEnquiryId(enquiryId);
    setOpenDialog(true);
  };

  const handleReject = async (enquiryId) => {
    await updateDoc(doc(db, 'response_modified', enquiryId), { status: 'Dropped' });
    await addDoc(collection(db, 'technician_response'), {
      enquiryId,
      status: 'Dropped',
      technicianId,
      technicianName: technicianProfile.name,
      timestamp: new Date(),
    });

    const sendNotification = httpsCallable(functions, 'sendAcceptRejectNotificationToAdmin');
    await sendNotification({
      technicianId: technicianId,
      enquiryId: enquiryId,
      action: 'rejected',
    });

    setModifiedData((prevData) => prevData.filter((data) => data.id !== enquiryId));
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleDialogSubmit = async () => {
    if (timeSlot && approxTime && budget && selectedEnquiryId) {
      setIsSubmitting(true);
      const duration = `${parseFloat(approxTime)} hrs`;
      const timestamp = new Date();
  
      const data = {
        enquiryId: selectedEnquiryId,
        status: 'accepted',
        timeSlot: timeSlot.toString(),
        approxTime: duration,
        estimatedCost: `₹${estimatedCost}`,
        budgetPerHour: budget,
        technicianId,
        timestamp,
      };
  
      try {
        await updateDoc(doc(db, 'response_modified', selectedEnquiryId), { status: 'In_process' });
        await addDoc(collection(db, 'technician_response'), data);
  
        const technicianDoc = await getDoc(doc(db, 'technicians', technicianId));
        if (technicianDoc.exists()) {
          const technicianEmail = technicianDoc.data().email;
          const sendQuotationEmail = httpsCallable(functions, 'sendQuotationEmail');
          await sendQuotationEmail({
            technicianName: technicianProfile.name,
            enquiryId: selectedEnquiryId,
            estimatedCost: estimatedCost,
            estimatedTime: duration,
            technicianEmail: technicianEmail,
          });
        }
  
        const sendNotification = httpsCallable(functions, 'sendAcceptRejectNotificationToAdmin');
        await sendNotification({
          technicianId,
          enquiryId: selectedEnquiryId,
          action: 'accepted',
        });
  
        setOpenDialog(false);
        setTimeSlot(null);
        setApproxTime('');
        setBudget('');
        setEstimatedCost('');
      } catch (error) {
        // handle error
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  const clearCacheData = () => {
    caches.keys().then((names) => {
        names.forEach((name) => {
            caches.delete(name);
        });
    });
    //alert("Complete Cache Cleared");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      localStorage.removeItem('technicianId');
      localStorage.removeItem('technicianProfile');
      localStorage.removeItem('onlineStatus');
      localStorage.clear()
      clearCacheData()
      setTechnicianId(null);
      setTechnicianProfile({});
      setOnlineStatus(false);
      setModifiedData([]);
      navigate('/login-technician');
    } catch (error) {
      // handle error
    }
  };

  const handleViewClick = (files) => {
    setModalContent(files);
    setModalIsOpen(true);
  };

  const handleReplyClick = (enquiryId) => {
    navigate(`/tech-enquiry-details/${enquiryId}`);
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

  const handleStatusChange = async (status) => {
    setOnlineStatus(status);
    localStorage.setItem('onlineStatus', JSON.stringify(status));

    if (technicianId) {
      try {
        const technicianDocRef = doc(db, 'technicians', technicianId);
        await updateDoc(technicianDocRef, {
          AvailabilityStatus: status ? 'active' : 'inactive',
        });
      } catch (error) {
        // handle error
      }
    }
  };

  const toggleNotificationWindow = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationItemClick = async (notification) => {
    if (notification.status === 'unread') {
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, { status: 'read' });
      setUnreadNotificationCount((prevCount) => prevCount - 1);
    }
    setAnchorEl(null);
  };

  const stats = {
    totalEnquiries: modifiedData.length,
    outstandingCount: modifiedData.filter((data) => data.status === 'new' || data.status === 'Pending').length,
    inProcessCount: modifiedData.filter((data) => data.status === 'accepted').length,
    completedCount: modifiedData.filter((data) => data.status === 'completed').length,
    droppedCount: modifiedData.filter((data) => data.status === 'rejected').length,
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <TechSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
        technicianProfile={technicianProfile}
      />
      <div style={styles.mainContent}>
        <TechHeader
          activeTab={activeTab}
          onlineStatus={onlineStatus}
          setOnlineStatus={handleStatusChange}
          notifications={notifications}
          handleNotificationIconClick={toggleNotificationWindow} 
        />
        <section style={styles.enquiryList}>
          {!onlineStatus ? (
            <TechOffline />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <TechDashboard
                  stats={stats}
                  modifiedData={modifiedData}
                  handleAccept={handleAccept}
                  handleReject={handleReject}
                  handleReplyClick={handleReplyClick}
                />
              )}
              {activeTab === 'enquiries' && (
                <TechEnquiries
                  modifiedData={modifiedData}
                  handleViewClick={handleViewClick}
                  handleReplyClick={handleReplyClick}
                />
              )}
              {activeTab === 'bankDetails' && (
                <BankDetails />
              )}
              {activeTab === 'settings' && (
                <TechSettings />
              )}
            </>
          )}
        </section>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
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
                      backgroundColor: notification.status === 'unread' ? '#e6f7e6' : '#fff',
                    }}
                    onClick={() => handleNotificationItemClick(notification)}
                  >
                    <Avatar style={styles.notificationAvatar}>
                      <NotificationsIcon />
                    </Avatar>
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
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        appElement={document.getElementById('root')}
        style={styles.modal}
      >
        <button onClick={() => setModalIsOpen(false)} style={styles.modalCloseButton}>x</button>
        {renderModalContent()}
      </Modal>
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Accept Enquiry</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Time Slot"
              value={timeSlot}
              onChange={(newValue) => setTimeSlot(newValue)}
              style={styles.dateTimePicker}
              slots={{
                textField: (props) => <TextField {...props} fullWidth margin="normal" style={styles.dateTimePickerTextField} />
              }}
            />
          </LocalizationProvider>
          <TextField
            label="Approx Time (Hours)"
            type="text"
            fullWidth
            margin="normal"
            value={approxTime ?? ''}
            onChange={(e) => setApproxTime(e.target.value)}
          />
          <TextField
            label="Budget per Hour"
            type="number"
            fullWidth
            margin="normal"
            value={budget ?? ''}
            onChange={(e) => setBudget(e.target.value)}
          />
          <TextField
            label="Estimated Cost"
            type="text"
            fullWidth
            margin="normal"
            value={estimatedCost ?? ''}
            disabled
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleDialogSubmit} color="primary" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
      <style>{`
        @media (max-width: 768px) {
          .mainContent {
            margin-left: 0;
            padding: 10px;
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .mainContent {
            padding: 5px;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'Inter, sans-serif',
  },
  mainContent: {
    padding: '20px',
    backgroundColor: '#f4f4f4',
    overflowY: 'auto',
    height: '100vh',
    width: '100%',
    fontFamily: 'Inter, sans-serif',
  },
  enquiryList: {
    padding: '20px',
  },
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
    color: '#333',
  },
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
  modal: {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      maxHeight: '90vh',
      overflowY: 'auto',
      position: 'relative',
      paddingRight: '40px',
      width: '50%',
    },
  },
  modalCloseButton: {
    background: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '10px',
    cursor: 'pointer',
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: '1000',
    height: '15px',
    width: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    lineHeight: '15px',
  },
  dateTimePicker: {
    width: '100%',
    marginBottom: '20px',
  },
  dateTimePickerTextField: {
    backgroundColor: '#fff',
    borderRadius: '4px',
  },
};

export default Technician;
