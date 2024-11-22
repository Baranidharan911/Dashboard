import React from 'react';

const TechOffline = () => (
  <div style={styles.offlineMessage}>
    <img src="src/assets/offline.png" alt="Offline" style={styles.offlineImage} />
    <p>Go online to start Earning!!</p>
  </div>
);

const styles = {
  offlineMessage: {
    textAlign: 'center',
    color: '#FF0000',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  offlineImage: {
    width: '200px',
    marginBottom: '30px',
    marginLeft: '38%',
    marginTop: '80px'
  },
};

export default TechOffline;
