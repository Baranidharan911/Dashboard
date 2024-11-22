import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Switch, Badge } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { auth, db } from '../../firebase/firebase';

const TechHeader = ({ notifications, handleNotificationIconClick, setOnlineStatus, activeTab }) => {
  const [onlineStatus, setLocalOnlineStatus] = useState(JSON.parse(localStorage.getItem('onlineStatus')) || false);
  const [technicianId, setTechnicianId] = useState(localStorage.getItem('technicianId') || null);

  // Update header title based on active tab
  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'enquiries':
        return 'Enquiries';
      case 'bankDetails':
        return 'Bank Details';
      case 'settings':
        return 'Settings'; // Added Settings title
      default:
        return 'Dashboard';
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const technicianData = await fetchTechnicianDataByEmail(user.email);
        if (technicianData) {
          setTechnicianId(technicianData.documentId);
          const isActive = technicianData.AvailabilityStatus === 'active';
          setLocalOnlineStatus(isActive);
          setOnlineStatus(isActive);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchTechnicianDataByEmail = async (email) => {
    const techniciansCollectionRef = collection(db, 'technicians');
    const q = query(techniciansCollectionRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { documentId: doc.id, ...doc.data() };
    } else {
      return null;
    }
  };

  const handleStatusChange = async () => {
    const newStatus = !onlineStatus;
    setLocalOnlineStatus(newStatus);
    setOnlineStatus(newStatus);
    localStorage.setItem('onlineStatus', JSON.stringify(newStatus));

    if (technicianId) {
      try {
        const technicianDocRef = doc(db, 'technicians', technicianId);
        await updateDoc(technicianDocRef, {
          AvailabilityStatus: newStatus ? 'active' : 'inactive',
        });
        console.log(`AvailabilityStatus updated to ${newStatus ? 'active' : 'inactive'}`);
      } catch (error) {
        console.error('Error updating AvailabilityStatus:', error);
      }
    } else {
      console.log('No technicianId provided');
    }
  };

  return (
    <header className="mainHeader" style={styles.mainHeader}>
      <h1 className="headerTitle" style={styles.headerTitle}>
        {getTitle()}
      </h1>
      <div className="headerRight" style={styles.headerRight}>
        {activeTab !== 'settings' && ( // Hide online status toggle in Settings tab
          <div style={styles.toggleContainer}>
            <Switch
              checked={onlineStatus}
              onChange={handleStatusChange}
              color="success"
            />
            <span style={styles.statusText}>{onlineStatus ? 'Active' : 'Inactive'}</span>
          </div>
        )}
        <Badge badgeContent={notifications.length} color="error" onClick={handleNotificationIconClick}>
          <NotificationsIcon className="notificationIcon" style={styles.notificationIcon} />
        </Badge>
      </div>
      <style>
        {`
        @media (max-width: 768px) {
          .mainHeader {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 1px solid #ccc;
          }
          .headerRight {
            display: flex;
            align-items: center;
          }
          .headerTitle {
            font-size: 18px;
          }
          .statusText {
            margin-left: 8px;
            font-size: 14px;
          }
        }
        @media (max-width: 480px) {
          .headerTitle {
            font-size: 16px;
          }
          .notificationIcon {
            width: 25px;
            height: 25px;
          }
        }
        `}
      </style>
    </header>
  );
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
  headerTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#002B7F',
    margin: '0 10px',
    marginLeft: '35px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    marginRight: '10px',
  },
  statusText: {
    marginLeft: '8px',
    fontSize: '14px',
    color: '#000',
  },
  notificationIcon: {
    width: '30px',
    height: '30px',
    cursor: 'pointer',
  },
};

export default TechHeader;
