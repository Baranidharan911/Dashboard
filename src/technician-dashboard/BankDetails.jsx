import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CircularProgress from '@mui/material/CircularProgress';

const BankDetails = () => {
  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
  });
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentId, setDocumentId] = useState(null);
  const [showConfirmAccountNumber, setShowConfirmAccountNumber] = useState(false);

  useEffect(() => {
    const storedTechnicianId = localStorage.getItem('technicianId');
    setDocumentId(storedTechnicianId);

    if (!storedTechnicianId) {
      console.error("No technician ID found in local storage.");
      setLoading(false);
      return;
    }

    const fetchBankDetails = async () => {
      try {
        console.log("Fetching bank details for document ID:", storedTechnicianId);
        const technicianDocRef = doc(db, 'technicians', storedTechnicianId);
        const docSnapshot = await getDoc(technicianDocRef);

        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          if (data.bankDetails) {
            setFormData({
              accountHolderName: data.bankDetails.accountHolderName || '',
              bankName: data.bankDetails.bankName || '',
              accountNumber: data.bankDetails.accountNumber || '',
              confirmAccountNumber: data.bankDetails.accountNumber || '', // Initialize confirm account number
              ifscCode: data.bankDetails.ifscCode || '',
            });
            setIsEditing(false); // Show the details view initially
          }
        } else {
          console.error("No such document!");
        }
      } catch (error) {
        console.error("Error fetching bank details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBankDetails();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'accountNumber' || name === 'confirmAccountNumber') {
      if (/^\d{0,16}$/.test(value)) {
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateForm = () => {
    let formErrors = {};

    if (!formData.accountHolderName) {
      formErrors.accountHolderName = 'Account Holder Name is required';
    }

    if (!formData.bankName) {
      formErrors.bankName = 'Bank Name is required';
    }

    if (!formData.accountNumber || formData.accountNumber.length < 9 || formData.accountNumber.length > 16) {
      formErrors.accountNumber = 'Enter a valid account number';
    } else if (formData.accountNumber !== formData.confirmAccountNumber) {
      formErrors.confirmAccountNumber = 'Account numbers do not match';
    }

    if (!formData.ifscCode) {
      formErrors.ifscCode = 'IFSC Code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      formErrors.ifscCode = 'Invalid IFSC Code format';
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true); // Start spinner
      try {
        console.log("Updating bank details for document ID:", documentId);
        const technicianDocRef = doc(db, 'technicians', documentId);

        await updateDoc(technicianDocRef, {
          bankDetails: {
            accountHolderName: formData.accountHolderName,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
          },
        });
        setIsEditing(false);
        console.log('Bank details updated:', formData);
      } catch (error) {
        console.error('Error updating bank details:', error);
      } finally {
        setIsSubmitting(false); // Stop spinner
      }
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Bank Details</h1>
      {isEditing ? (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Account Holder Name</label>
            <input
              type="text"
              name="accountHolderName"
              value={formData.accountHolderName}
              onChange={handleInputChange}
              style={{ ...styles.input, borderColor: errors.accountHolderName ? '#e74c3c' : '#ccc' }}
            />
            {errors.accountHolderName && <span style={styles.errorText}>{errors.accountHolderName}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Bank Name</label>
            <input
              type="text"
              name="bankName"
              value={formData.bankName}
              onChange={handleInputChange}
              style={{ ...styles.input, borderColor: errors.bankName ? '#e74c3c' : '#ccc' }}
            />
            {errors.bankName && <span style={styles.errorText}>{errors.bankName}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Account Number</label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              style={{ ...styles.input, borderColor: errors.accountNumber ? '#e74c3c' : '#ccc' }}
            />
            {errors.accountNumber && <span style={styles.errorText}>{errors.accountNumber}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Account Number</label>
            <div style={styles.inputWithIcon}>
              <input
                type={showConfirmAccountNumber ? 'text' : 'password'}
                name="confirmAccountNumber"
                value={formData.confirmAccountNumber}
                onChange={handleInputChange}
                style={{ ...styles.input, borderColor: errors.confirmAccountNumber ? '#e74c3c' : '#ccc' }}
              />
              <IconButton 
                onClick={() => setShowConfirmAccountNumber(!showConfirmAccountNumber)} 
                style={styles.iconButton}
                tabIndex={-1} // Prevents the button from receiving focus when tabbing through the form
              >
                {showConfirmAccountNumber ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </div>
            {errors.confirmAccountNumber && <span style={styles.errorText}>{errors.confirmAccountNumber}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>IFSC Code</label>
            <input
              type="text"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleInputChange}
              style={{ ...styles.input, borderColor: errors.ifscCode ? '#e74c3c' : '#ccc' }}
            />
            {errors.ifscCode && <span style={styles.errorText}>{errors.ifscCode}</span>}
          </div>

          <button 
            type="submit" 
            style={isSubmitting ? { ...styles.submitButton, ...styles.submitButtonHover } : styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
          </button>
        </form>
      ) : (
        <div style={styles.detailsContainer}>
          <div style={styles.detailsRow}>
            <strong>Account Holder Name:</strong> {formData.accountHolderName}
          </div>
          <div style={styles.detailsRow}>
            <strong>Bank Name:</strong> {formData.bankName}
          </div>
          <div style={styles.detailsRow}>
            <strong>Account Number:</strong> {formData.accountNumber.replace(/\d(?=\d{4})/g, '*')}
          </div>
          <div style={styles.detailsRow}>
            <strong>IFSC Code:</strong> {formData.ifscCode}
          </div>
          {/* <IconButton onClick={handleEditClick} style={styles.editButton}>
             <EditIcon style={styles.editIcon} /> Edit  
          </IconButton> */}
        </div>
      )}
      <style>
        {`
          @media (max-width: 768px) {
            .${styles.container} {
              width: 90%;
              margin: 10px auto;
              padding: 15px;
            }

            .${styles.header} {
              font-size: 24px;
            }

            .${styles.formGroup} {
              margin-bottom: 10px;
            }

            .${styles.input} {
              font-size: 14px;
              padding: 8px;
            }

            .${styles.label} {
              font-size: 14px;
            }

            .${styles.submitButton} {
              font-size: 16px;
              padding: 8px;
            }

            .${styles.detailsRow} {
              font-size: 14px;
              padding: 8px;
            }

            .${styles.editButton} {
              font-size: 16px;
              padding: 8px;
            }

            .${styles.editIcon} {
              font-size: 16px;
            }
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '500px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '10px',
    boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '20px',
    fontWeight: 'bold',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
    marginBottom: '5px',
  },
  input: {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    fontSize: '16px',
    color: '#333',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputWithIcon: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  },
  iconButton: {
    padding: '5px',
    position: 'absolute',
    right: '10px',
    zIndex: '1',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: '14px',
    marginTop: '5px',
  },
  submitButton: {
    padding: '10px',
    backgroundColor: '#002B7F',
    color: 'white',
    fontSize: '18px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '20px',
  },
  submitButtonHover: {
    transform: 'scale(0.98)',
  },
  detailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailsRow: {
    fontSize: '16px',
    color: '#333',
    padding: '8px',
    backgroundColor: '#f1f1f1',
    borderRadius: '5px',
  },
  editButton: {
    padding: '10px',
    backgroundColor: '#f1c40f',
    color: 'white',
    fontSize: '18px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '20px',
  },
  editIcon: {
    marginLeft: '7px',
    fontSize: '20px',
     // Space between the text and the icon
  },
};

export default BankDetails;
