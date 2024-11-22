import React from 'react';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';

const TechNotificationBadge = ({ notifications, handleNotificationIconClick }) => {
  return (
    <div style={styles.container}>
      <Badge badgeContent={notifications.length} color="error" onClick={handleNotificationIconClick}>
        <NotificationsIcon style={styles.notificationIcon} />
      </Badge>
      <style>{`
        @media (max-width: 768px) {
          .notificationIcon {
            width: 25px;
            height: 25px;
          }
        }
        @media (max-width: 480px) {
          .notificationIcon {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
  },
  notificationIcon: {
    width: '30px',
    height: '30px',
    cursor: 'pointer',
  },
};

export default TechNotificationBadge;
