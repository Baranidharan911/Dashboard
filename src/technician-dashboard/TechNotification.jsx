import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase'; // Corrected relative path to firebase.js


const TechNotification = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), where('userType', '==', 'technician'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'read') {
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
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif.id !== notification.id)
      );
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
            <li key={notification.id} style={styles.item} onClick={() => handleNotificationClick(notification)}>
              <p>New Enquiry {notification.enquiryId}</p>
              <p style={styles.timestamp}>{new Date(notification.timestamp?.toDate()).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
      <style>{`
        @media (max-width: 768px) {
          .container {
            padding: 10px;
          }
          .title {
            font-size: 20px;
            margin-bottom: 15px;
          }
          .item {
            padding: 8px;
          }
          .timestamp {
            font-size: 10px;
          }
        }
        @media (max-width: 480px) {
          .title {
            font-size: 18px;
          }
          .noNotifications {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    minHeight: '100vh',
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
  },
  timestamp: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
  },
};

export default TechNotification;
