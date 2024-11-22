import React from 'react';
import PropTypes from 'prop-types';

const AdminStatCard = ({ title, number, icon }) => (
  <div style={styles.statCard}>
    <div style={styles.statCardContent}>
      <div style={styles.statCardText}>
        <div style={styles.statCardTitle}>{title}</div>
        <div style={styles.statCardNumber}>{number}</div>
      </div>
      <img src={icon} alt={title} style={styles.statCardIcon} />
    </div>
  </div>
);

AdminStatCard.propTypes = {
  title: PropTypes.string.isRequired,
  number: PropTypes.number.isRequired,
  icon: PropTypes.string.isRequired,
};

const styles = {
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    padding: '16px',
    textAlign: 'left',
    fontFamily: 'Nunito Sans, sans-serif',
    fontWeight: '600',
  },
  statCardContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCardText: {
    display: 'flex',
    flexDirection: 'column',
  },
  statCardIcon: {
    width: '40px',
    height: '40px',
  },
  statCardTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
  },
  statCardNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'black',
  },
};

export default AdminStatCard;
