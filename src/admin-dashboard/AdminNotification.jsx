import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from '../../firebase/firebase'; 
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";

const AdminNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'notifications'), where('userId', '==', 'admin'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 10);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();
        if (timestamp && timestamp > cutoffDate) {
          fetchedNotifications.push({ id: doc.id, ...doc.data() });
        }
      });

      setNotifications(fetchedNotifications);
    });

    return () => unsubscribe();
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.enquiryId) {
      console.error('Notification is missing enquiryId');
      return;
    }

    try {
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, {
        status: 'read'
      });
      navigate(`/admin-enquiry-details/${notification.enquiryId}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Notifications</h2>
      {notifications.length === 0 ? (
        <p style={styles.noNotifications}>No notifications</p>
      ) : (
        <ul style={styles.list}>
          {notifications.map((notification) => (
            <li
              key={notification.id}
              style={{ ...styles.item, backgroundColor: notification.status === 'unread' ? '#f8d7da' : '#fff' }}
              onClick={() => handleNotificationClick(notification)}
            >
              <p>{notification.message}</p>
              {notification.status === 'unread' && <span style={styles.unreadDot}></span>}
              <p style={styles.timestamp}>{new Date(notification.timestamp?.toDate()).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    minHeight: '100vh',
    overflow: 'hidden',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#002B7F',
  },
  noNotifications: {
    fontSize: '18px',
    color: '#999',
  },
  list: {
    listStyleType: 'none',
    padding: 0,
  },
  item: {
    marginBottom: '10px',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.3s ease',
  },
  unreadDot: {
    width: '10px',
    height: '10px',
    backgroundColor: 'red',
    borderRadius: '50%',
    position: 'absolute',
    top: '10px',
    right: '10px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
  },
  '@media (max-width: 768px)': {
    item: {
      padding: '8px',
      fontSize: '14px',
    },
    title: {
      fontSize: '20px',
    },
  },
  '@media (max-width: 576px)': {
    item: {
      padding: '6px',
      fontSize: '12px',
    },
    title: {
      fontSize: '18px',
    },
  },
};

export default AdminNotification;
