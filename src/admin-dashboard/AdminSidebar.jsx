import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/firebase'; // Corrected relative path to firebase.js
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { FaAd, FaFileInvoiceDollar } from 'react-icons/fa'; // Importing the advertisement icon and bank details icon from react-icons
import dashIcon from '../assets/dash.png';
import technicalIcon from '../assets/technical.png';
import enquiryIcon from '../assets/enquiries.png';
import settingsIcon from '../assets/Setting.png';
import logoutIcon from '../assets/logout.png';
import adminIcon from '../assets/admin_icon.png';
import dashboardLogo from '../assets/dashboardlogo.png';

const AdminSidebar = ({ handleLogout }) => {
  const [newTechniciansCount, setNewTechniciansCount] = useState(0);
  const [pendingEnquiriesCount, setPendingEnquiriesCount] = useState(0);

  useEffect(() => {
    const techniciansRef = collection(db, 'technicians');
    const q = query(techniciansRef, where('user', '==', 'new'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let count = 0;
      querySnapshot.forEach((doc) => {
        if (!doc.data().hasOwnProperty('status')) {
          count++;
        }
      });
      setNewTechniciansCount(count);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const responsesRef = collection(db, 'responses');
    const q = query(responsesRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setPendingEnquiriesCount(querySnapshot.size);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.headerLogo}>
          <img src={dashboardLogo} alt="Logo" style={styles.logoImg} />
        </div>
      </div>
      <hr style={styles.whiteLine} />
      <nav style={styles.nav}>
        <div style={styles.navSection}>
          <div style={styles.navTitle}>MENU</div>
          <Link to="/dashboard" className="navItem" style={styles.navItem}>
            <img src={dashIcon} alt="Dashboard" />
            Dashboard
          </Link>
          <Link to="/dashboard/technical" className="navItem" style={styles.navItem}>
            <img src={technicalIcon} alt="Technical Engineer" />
            Technical Engineer
            {newTechniciansCount > 0 && (
              <span style={styles.badge}>{newTechniciansCount}</span>
            )}
          </Link>
          <Link to="/dashboard/enquiry" className="navItem" style={styles.navItem}>
            <img src={enquiryIcon} alt="Enquiries" />
            Enquiries
            {pendingEnquiriesCount > 0 && (
              <span style={styles.badge}>{pendingEnquiriesCount}</span>
            )}
          </Link>

          {/* New Advertisement Link */}
          <Link to="/dashboard/advertisement-management" className="navItem" style={styles.navItem}>
            <FaAd style={styles.icon} />
            Advertisement
          </Link>

          {/* New Technician Bank Details Link */}
          <Link to="/dashboard/technician-bank-details" className="navItem" style={styles.navItem}>
            <FaFileInvoiceDollar style={styles.icon} />
            Technician Bank Details
          </Link>
        </div>
        <div style={styles.navSection}>
          <div className="navItem" onClick={handleLogout} style={{ ...styles.navItem, cursor: 'pointer' }}>
            <img src={logoutIcon} alt="Logout" />
            Logout
          </div>
        </div>
      </nav>
      <div style={styles.adminInfo}>
        <img src={adminIcon} alt="Admin Icon" style={styles.adminIcon} />
        <div>
          <div style={styles.adminName}>Sathya</div>
          <div style={styles.adminEmail}>techwizapp@gmail.com</div>
        </div>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '250px',
    height: '100vh',
    backgroundColor: '#002B7F',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '15px',
    position: 'fixed',
    top: '0',
    left: '0',
  },
  header: {
    width: '100%',
    height: '60px',
    padding: '10px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: '100px',
    height: 'auto',
    marginBottom: '30px',
  },
  whiteLine: {
    width: '100%',
    height: '1px',
    backgroundColor: '#fff',
    marginBottom: '20px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '10px',
    flexGrow: 1,
  },
  navSection: {
    marginBottom: '16px',
  },
  navTitle: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '15px',
    fontWeight: '700',
    lineHeight: '11px',
    letterSpacing: '1px',
    textAlign: 'left',
    marginBottom: '20px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: '#fff',
    padding: '10px 0',
    fontSize: '15px',
    fontWeight: '500',
    position: 'relative',
  },
  badge: {
    backgroundColor: 'red',
    color: '#fff',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '700',
    marginLeft: '10px',
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  icon: {
    marginRight: '10px',
    fontSize: '18px', // Adjust the size of the react icon
  },
  adminInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    position: 'absolute',
    bottom: '0',
    left: '0',
    padding: '15px',
    width: '100%',
    boxSizing: 'border-box',
    background: '#002B7F',
  },
  adminName: {
    fontSize: '15px',
    fontWeight: '600',
    marginLeft: '10px',
  },
  adminEmail: {
    fontSize: '12px',
    fontWeight: '400',
    marginLeft: '10px',
  },
  adminIcon: {
    width: '30px',
    height: '30px',
    marginRight: '5px',
  },
};

export default AdminSidebar;
