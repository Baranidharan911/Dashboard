import { useEffect, useState, useRef } from 'react';
import './App.css';
import './style.css';
import AOS from 'aos';
import 'aos/dist/aos.css'; // Import the AOS styles
import { IoMenu, IoClose, IoLogoFacebook, IoLogoTwitter, IoLogoLinkedin } from "react-icons/io5"; // Import the IoClose icon
import logo from './assets/images/logo.png';
import video from './assets/videos/backgroundvideo.mp4';

// Images and assets...
import materialsSelection from './assets/images/MaterialSelection.png';
import circuitDebugging from './assets/images/circuit.png';
import hardwareAssembly from './assets/images/hardware.png';
import circuitDesign from './assets/images/circuitdesign.png';
import pcbDesign from './assets/images/pcb.png';
import pcbTroubleshoot from './assets/images/pcbtroubleshoot.png';
import batteryManagement from './assets/images/battery.png';
import alternateMaterial from './assets/images/alternate.png';
import boardsRepair from './assets/images/boardrepair.png';
import casingDesign from './assets/images/casingDesign.png';
import others from './assets/images/others.png';

import electronics from './assets/images/electronics.png';
import embeddedSystems from './assets/images/circuit.png';
import iot from './assets/images/iot.png';
import automations from './assets/images/automation.png';
import robotics from './assets/images/robotics.png';
import printing3d from './assets/images/3dprinting.png';
import ev from './assets/images/EV.png';
import drone from './assets/images/drone.png';
import solar from './assets/images/solar.png';
import othersDomain from './assets/images/others.png';

import aboutUsImage from "./assets/images/aboutus.png";
import ourJourneyImage from "./assets/images/journey.png";
import ourVisionImage from "./assets/images/vision.jpg";
import ourMissionImage from "./assets/images/mission.jpg";
import qrcodeImage from "./assets/images/qr-code.png";

import googlePlayImg from "./assets/images/Google-Play.png";
import downloadNowImg from "./assets/images/download-now.jpg";
import saveTimeGif from "./assets/images/save-time.gif";
import discoverExpertsGif from "./assets/images/discover-experts.gif";
import startProjectsGif from './assets/images/start-projects.gif';

import projectGif from './assets/images/project.gif';
import onlineOfflineGif from './assets/images/online-and-offline.gif';

function App() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false); // State to toggle menu
  const sidebarRef = useRef(null); // Reference for the sidebar

  useEffect(() => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
    });
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen); // Toggle menu open/close state
  };

  // Close menu if clicked outside the sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the sidebar
      if (isMobileMenuOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setMobileMenuOpen(false); // Close the mobile menu
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const problems = [
    { title: 'Materials Selection', image: materialsSelection },
    { title: 'Circuit Debugging', image: circuitDebugging },
    { title: 'Hardware Assembly', image: hardwareAssembly },
    { title: 'Circuit Design', image: circuitDesign },
    { title: 'PCB Design', image: pcbDesign },
    { title: 'PCB Troubleshoot', image: pcbTroubleshoot },
    { title: 'Battery Management', image: batteryManagement },
    { title: 'Alternate Material', image: alternateMaterial },
    { title: 'Boards Repair', image: boardsRepair },
    { title: 'Casing Customized', image: casingDesign },
    { title: 'Others', image: others },
  ];

  const domains = [
    { title: 'Electronics', image: electronics },
    { title: 'Embedded Systems', image: embeddedSystems },
    { title: 'IoT', image: iot },
    { title: 'Automations', image: automations },
    { title: 'Robotics', image: robotics },
    { title: '3D Printing', image: printing3d },
    { title: 'EV', image: ev },
    { title: 'Drone', image: drone },
    { title: 'Solar', image: solar },
    { title: 'Others', image: othersDomain },
  ];

  return (
    <div className="landing-page">
      <header>
        <nav className="navbar">
          <div className="logo">
            <img className="logo-img" src={logo} alt="Dial2Tech Logo" />
          </div>

          {/* Conditionally render nav-links */}
          <ul className={`nav-links ${isMobileMenuOpen ? "open" : ""}`} ref={sidebarRef}>
            <li>
              <a href="/" onClick={() => setMobileMenuOpen(false)}>Home</a>
            </li>
            <li>
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>About Us</a>
            </li>
            <li className="dropdown">
              <a href="#find-engineer" className="dropbtn">
                Find Engineer Pro
              </a>
              <div className="dropdown-content">
                <a href="#download-app" onClick={() => setMobileMenuOpen(false)}>Submit Enquiry Form</a>
                <a href="#download-app" onClick={() => setMobileMenuOpen(false)}>Search by Problems</a>
                <a href="#download-app" onClick={() => setMobileMenuOpen(false)}>Get Advice from Industry Experts</a>
              </div>
            </li>
            <li className="dropdown">
              <a href="#find-project" className="dropbtn">
                Find Project
              </a>
              <div className="dropdown-content">
                <a href="./login-technician" onClick={() => setMobileMenuOpen(false)}>Login as a Technical</a>
                <a href="./signup" onClick={() => setMobileMenuOpen(false)}>Sign up as a Technical</a>
                <a href="#find-solution" onClick={() => setMobileMenuOpen(false)}>Find Solution Based on Domain</a>
                <a href="#way-to-learn" onClick={() => setMobileMenuOpen(false)}>Way to Learn</a>
              </div>
            </li>
          </ul>

          {/* Toggle Hamburger/Close Icon */}
          <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <IoClose /> : <IoMenu />}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="hero">
        <video autoPlay muted loop playsInline className="background-video">
          <source src={video} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="hero-content">
          <h1>Welcome to Dial2Tech</h1>
          <p>Your ultimate platform for technical support and engineer appointments</p>
          <a style={{ marginTop: '20px' }} href="#download-app" className="btn">
            Build Your Project
          </a>
        </div>
      </div>

      {/* About Us Section */}
      <div id="about" className="about-us">
        <div className="about-us-container">
          <div className="about-us-text">
            <h2>About Us</h2>
            <p>
              Dial2Tech automates scheduling engineer appointments for hardware and coding issues,
              streamlining the process for expos and competitions. We connect students and engineers with
              skilled professionals for better troubleshooting.
            </p>
            <p>
              Our goal is global reach, delivering high-quality, reliable service by partnering with top engineers
              and providing them with the tools and support they need.
            </p>
          </div>
          <div className="about-us-img">
            <img src={aboutUsImage} alt="About Us" />
          </div>
        </div>
      </div>

      {/* Our Journey Section */}
      <div id="journey" className="journey">
        <h2>Our Journey</h2>
        <div className="journey-container">
          <img src={ourJourneyImage} alt="Our Journey" className="journey-img" />
        </div>
      </div>

      {/* Vision and Mission Section */}
      <div className="vision-mission">
        <div data-aos="slide-right" className="vision" id="vis">
          <img src={ourVisionImage} alt="Vision" />
          <h2>Vision</h2>
          <p>Empower millions globally to deliver top-notch online support.</p>
          <p>Become the foremost platform for engineering expertise.</p>
          <p>Ensure high-quality support is accessible to all.</p>
        </div>
        <div data-aos="slide-left" className="mission" id='mis'>
          <img src={ourMissionImage} alt="Mission" />
          <h2>Mission</h2>
          <p>Provide affordable, high-quality engineering support.</p>
          <p>Offer accurate, curated information for innovative creation.</p>
          <p>Supply tools and training for engineers to excel.</p>
        </div>
      </div>

      {/* Problems Section */}
      <div className="dropdown-sections">
        <div className="dropdown-section" id="search-by-problems">
          <h2>Search by Problems</h2>
          <div className="scroll-container">
            <div className="scroll-content">
              {problems.map((problem, index) => (
                <div className="card-container" key={index}>
                  <div className="card">
                    <img src={problem.image} alt={problem.title} />
                    <p>{problem.title}</p>
                  </div>
                </div>
              ))}
              {/* Duplicate the content for seamless scrolling */}
              {problems.map((problem, index) => (
                <div className="card-container" key={index + problems.length}>
                  <div className="card">
                    <img src={problem.image} alt={problem.title} />
                    <p>{problem.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Domains Section */}
      <div className="dropdown-sections">
        <div className="dropdown-section" id="find-solutions-domain">
          <h2>Find Solutions Based on Domain</h2>
          <div className="scroll-container">
            <div className="scroll-content">
              {domains.map((domain, index) => (
                <div className="card-container" key={index}>
                  <div className="card">
                    <img src={domain.image} alt={domain.title} />
                    <p>{domain.title}</p>
                  </div>
                </div>
              ))}
              {/* Duplicate the content for seamless scrolling */}
              {domains.map((domain, index) => (
                <div className="card-container" key={index + domains.length}>
                  <div className="card">
                    <img src={domain.image} alt={domain.title} />
                    <p>{domain.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* What We Offer Section */}
      <div className="what-we-offer">
        <h2>What We Offer</h2>
        <div className="offer-cards">
          <div className="offer-card">
            <img src={saveTimeGif} alt="Save Time" className="offer-card-img" />
            <h3>Save Time</h3>
            <p>Find engineers tailored to your needs. We match you with the right talent.</p>
          </div>
          <div className="offer-card">
            <img src={discoverExpertsGif} alt="Discover Experts" className="offer-card-img" />
            <h3>Discover Experts</h3>
            <p>Easily access skilled experts. Save time and money.</p>
          </div>
          <div className="offer-card">
            <img src={startProjectsGif} alt="Start Projects Quickly" className="offer-card-img" />
            <h3>Start Projects Quickly</h3>
            <p>Complete projects in 24 hours with our expert platform.</p>
          </div>
        </div>
      </div>

      {/* How We Help Section */}
      <div className="how-we-help">
        <h2>How Can We Help You</h2>
        <div className="help-options">
          <div className="help-option" id="help">
            <img src={projectGif} alt="Build Your Projects" className="help-option-img" />
            <h3>Build Your Projects</h3>
            <p>Access to skilled engineers</p>
            <p>Start in 24 hrs</p>
            <p>Pay hourly</p>
          </div>
          <div className="help-option" id="help">
            <img src={onlineOfflineGif} alt="Monetize Your Skill" className="help-option-img" />
            <h3>Online and Offline Troubleshooting</h3>
            <p>Flexible access</p>
            <p>Convenient technical support</p>
          </div>
        </div>
      </div>

      {/* Download App Section */}
      <div id="download-app" className="download-app">
        <h2>Download This App</h2>
        <div className="app-download-content">
          <div className="text-content" id='cont'>
            <p>
              Get immediate access to top-notch engineering support with the Dial2Tech app. Scan the QR code
              or click the download button below to begin your journey.
            </p>
            <div className="qr-code">
              <img src={qrcodeImage} alt="QR Code" />
              <a href="#" className="app-download-btn">
                <img src={googlePlayImg} alt="Download on Google Play" />
              </a>
            </div>
          </div>
          <div className="app-image">
            <img src={downloadNowImg} alt="App Image" />
          </div>
        </div>
      </div>

      <footer>
  <div className="footer-content">
    <div className="footer-links">
      <a href="mailto:contact@dial2tech.com" className="footer-link">
        <span className="footer-text">contact@dial2tech.com</span>
      </a>
      <a href="https://www.facebook.com/Technologyhardwares/" target="_blank" rel="noopener noreferrer" className="footer-link">
        <IoLogoFacebook className="social-icon" /> {/* Facebook icon */}
        <span className="footer-text">Facebook</span>
      </a>
      <a href="https://twitter.com/IniBots" target="_blank" rel="noopener noreferrer" className="footer-link">
        <IoLogoTwitter className="social-icon" /> {/* Twitter icon */}
        <span className="footer-text">Twitter</span>
      </a>
      <a href="https://linkedin.com/company/dial2tech" target="_blank" rel="noopener noreferrer" className="footer-link">
        <IoLogoLinkedin className="social-icon" /> {/* LinkedIn icon */}
        <span className="footer-text">LinkedIn</span>
      </a>
      {/* New Privacy and Policy link added here */}
      <a href="/privacy-policy" className="footer-link">
        <span className="footer-text">Privacy and Policy</span>
      </a>
    </div>
  </div>
  <div className="footer-bottom">
    <p>&copy; 2024 Dial2Tech. All rights reserved.</p>
  </div>
</footer>

    </div>
  );
}

export default App;
