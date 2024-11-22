import React, { useEffect, useState } from "react";
import { db } from '../../firebase/firebase'; // Ensure the correct path to firebase.js
import { collection, getDocs } from "firebase/firestore";
import { FaArrowLeft, FaArrowRight, FaSearch } from 'react-icons/fa'; // Importing arrow and search icons from react-icons
import './TechnicianBankDetails.css'; // Import CSS for the page

const TechnicianBankDetails = () => {
  const [techniciansData, setTechniciansData] = useState([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState([]); // To hold the filtered data based on search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const rowsPerPage = 10;

  // Fetch technician bank details from Firestore and sort by technicianID
  useEffect(() => {
    const fetchTechnicianData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "technicians"));
        const fetchedTechnicians = [];
        querySnapshot.forEach((doc) => {
          fetchedTechnicians.push({ id: doc.id, ...doc.data() });
        });
        // Sort by technicianID in ascending order
        fetchedTechnicians.sort((a, b) => a.technicianID.localeCompare(b.technicianID));
        setTechniciansData(fetchedTechnicians);
        setFilteredTechnicians(fetchedTechnicians); // Initially, all data is shown
      } catch (error) {
        console.error("Error fetching technicians: ", error);
      }
    };

    fetchTechnicianData();
  }, []);

  // Handle search input change and filter data based on search query
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchQuery(value);

    const filteredData = techniciansData.filter(technician => 
      technician.technicianID.toLowerCase().includes(value) || 
      technician.name.toLowerCase().includes(value) || 
      (technician.bankDetails?.accountHolderName?.toLowerCase() || '').includes(value)
    );
    setFilteredTechnicians(filteredData);
    setCurrentPage(1); // Reset to the first page after a new search
  };

  // Calculate the total number of pages
  const totalPages = Math.ceil(filteredTechnicians.length / rowsPerPage);

  // Get the current page data
  const currentData = filteredTechnicians.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Handle pagination navigation
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="tech-bank-details-container">
      <h2>Technician Bank Details</h2>
      
      {/* Search Bar */}
      <div className="search-bar">
        <FaSearch className="search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by Technician ID, Name, or Account Holder Name"
          className="search-input"
        />
      </div>

      <table className="tech-bank-table">
        <thead>
          <tr>
            <th>Technician ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Account Holder Name</th>
            <th>Account Number</th>
            <th>Bank Name</th>
            <th>IFSC Code</th>
          </tr>
        </thead>
        <tbody>
          {currentData.length > 0 ? (
            currentData.map((technician) => (
              <tr key={technician.id}>
                <td>{technician.technicianID}</td>
                <td>{technician.name}</td>
                <td>{technician.email}</td>
                <td>{technician.mobileNumber}</td>
                <td>{technician.bankDetails?.accountHolderName || 'N/A'}</td>
                <td>{technician.bankDetails?.accountNumber || 'N/A'}</td>
                <td>{technician.bankDetails?.bankName || 'N/A'}</td>
                <td>{technician.bankDetails?.ifscCode || 'N/A'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8">No matching technicians found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="tech-pagination">
        <button
          className="tech-pagination-button"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
        >
          <FaArrowLeft />
        </button>
        <span className="tech-page-info">{currentPage}/{totalPages}</span>
        <button
          className="tech-pagination-button"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          <FaArrowRight />
        </button>
      </div>
    </div>
  );
};

export default TechnicianBankDetails;
