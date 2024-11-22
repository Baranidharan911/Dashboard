import React, { useState, useEffect, useRef } from 'react';
import dashIcon from '../assets/dash.png';
import enquiryIcon from '../assets/enquiries.png';
import bankIcon from '../assets/bank.png'; // Import an icon for Bank Details
import logoutIcon from '../assets/logout.png';
import dashboardLogo from '../assets/dashboardlogo.png';
import './TechSidebar.css'; // Import the new CSS
import { FaCog } from 'react-icons/fa'; // Import FaCog icon for settings
import { AiOutlineClose } from 'react-icons/ai'; // Import cross icon for close button

const TechSidebar = ({ activeTab, setActiveTab, handleLogout, technicianProfile }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false); // State for popup visibility
  const sidebarRef = useRef(null); // Ref for sidebar

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const confirmLogout = () => {
    setShowLogoutPopup(true);
  };

  const closePopup = () => {
    setShowLogoutPopup(false);
  };

  const logoutAndClosePopup = () => {
    handleLogout();
    closePopup();
  };

  // Close menu if clicked outside the sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* Hamburger Menu, add 'hidden' class if sidebar is open */}
      <div className={`hamburgerMenu ${sidebarOpen ? 'hidden' : ''}`} onClick={toggleSidebar}>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <aside ref={sidebarRef} className={`mobileSidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="header">
          <div className="headerLogo">
            <img src={dashboardLogo} alt="Logo" className="logoImg" />
          </div>
          {/* Close button (Cross mark) */}
          <button className="closeSidebarBtn" onClick={toggleSidebar}>
            <AiOutlineClose size={24} />
          </button>
        </div>
        <hr className="whiteLine" />
        <nav className="nav">
          <div className="navSection">
            <div className="navTitle">MENU</div>
            <div
              className={`navItem ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <img src={dashIcon} alt="Dashboard" className="icon" />
              Dashboard
            </div>
            <div
              className={`navItem ${activeTab === 'enquiries' ? 'active' : ''}`}
              onClick={() => setActiveTab('enquiries')}
            >
              <img src={enquiryIcon} alt="Enquiries" className="icon" />
              Enquiries
            </div>
            <div
              className={`navItem ${activeTab === 'bankDetails' ? 'active' : ''}`}
              onClick={() => setActiveTab('bankDetails')}
            >
              <img src={bankIcon} alt="Bank Details" className="icon" />
              Bank Details
            </div>

            {/* New Settings Option */}
            <div
              className={`navItem ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <FaCog className="icon" /> {/* Settings Icon */}
              Settings
            </div>
          </div>
          <div className="navSection">
            <div className="navItem" onClick={confirmLogout} style={{ cursor: 'pointer' }}>
              <img src={logoutIcon} alt="Logout" className="icon" />
              Logout
            </div>
          </div>
        </nav>
        <div className="adminInfo">
          <img src={technicianProfile.photoURL || ''} alt="Admin" className="avatar" />
          <div className="adminDetails">
            <div className="adminName">{technicianProfile.name}</div>
            <div className="adminEmail">{technicianProfile.email}</div>
          </div>
        </div>
      </aside>

      {/* Popup for Logout Confirmation */}
      {showLogoutPopup && (
        <div className="popup">
          <div className="popup-content">
            <p>Are you sure you want to log out?</p>
            <div className="popup-actions">
              <button className="confirm-btn" onClick={logoutAndClosePopup}>Yes</button>
              <button className="cancel-btn" onClick={closePopup}>No</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TechSidebar;
