import React, { useState, useEffect } from 'react';
import { storage, db } from '../../firebase/firebase'; // Assume you've initialized Firebase
import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from "firebase/storage";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { FaEdit, FaTrash } from 'react-icons/fa'; // Importing React Icons
import Modal from 'react-modal'; // Modal package for modal form
import './AdvertisementManagement.css';

// Initialize Modal styling
Modal.setAppElement('#root'); // Ensure accessibility for screen readers

const AdvertisementManagement = () => {
  const [webAdImage, setWebAdImage] = useState(null);
  const [appAdImage, setAppAdImage] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('/chat');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [webAds, setWebAds] = useState([]); // To store web ads
  const [appAds, setAppAds] = useState([]); // To store app ads
  const [isWebModalOpen, setIsWebModalOpen] = useState(false);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentAd, setCurrentAd] = useState(null); // Store ad for editing or deleting
  const [webAdPreview, setWebAdPreview] = useState(null); // Store web ad image preview
  const [appAdPreview, setAppAdPreview] = useState(null); // Store app ad image preview

  // Fetch Web Ads
  useEffect(() => {
    const fetchWebAds = async () => {
      const webAdSnapshot = await getDocs(collection(db, "ad"));
      const webAdData = webAdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWebAds(webAdData);
    };

    // Fetch App Ads
    const fetchAppAds = async () => {
      const appAdSnapshot = await getDocs(collection(db, "images"));
      const appAdData = appAdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppAds(appAdData);
    };

    fetchWebAds();
    fetchAppAds();
  }, []);

  // Handle web ad image preview
  const handleWebAdImageChange = (e) => {
    const file = e.target.files[0];
    setWebAdImage(file);
    setWebAdPreview(URL.createObjectURL(file)); // Generate image preview URL
  };

  // Handle app ad image preview
  const handleAppAdImageChange = (e) => {
    const file = e.target.files[0];
    setAppAdImage(file);
    setAppAdPreview(URL.createObjectURL(file)); // Generate image preview URL
  };

  // Reset form for web ad
  const resetWebAdForm = () => {
    setWebAdImage(null);
    setWebAdPreview(null);
    setCurrentAd(null); // Reset current ad
  };

  // Reset form for app ad
  const resetAppAdForm = () => {
    setAppAdImage(null);
    setAppAdPreview(null);
    setSelectedRoute('/chat');
    setCurrentAd(null); // Reset current ad
  };

  // Populate web ad form for editing
  const handleEditWebAd = (ad) => {
    setCurrentAd(ad); // Set current ad for editing
    setWebAdPreview(ad.url); // Set image preview
    setIsWebModalOpen(true); // Open the modal
  };

  // Populate app ad form for editing
  const handleEditAppAd = (ad) => {
    setCurrentAd(ad); // Set current ad for editing
    setAppAdPreview(ad.url); // Set image preview
    setSelectedRoute(ad.route); // Set the selected route
    setIsAppModalOpen(true); // Open the modal
  };

  // Upload Web Ad
  const handleWebAdUpload = () => {
    if (webAdImage || currentAd) { // Either a new image or editing an existing ad
      const storageRef = ref(storage, `web_ad/${webAdImage ? webAdImage.name : currentAd.url}`);
      const uploadTask = uploadBytesResumable(storageRef, webAdImage);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => console.error(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            if (currentAd) {
              // Update existing ad
              updateDoc(doc(db, "ad", currentAd.id), { url: downloadURL }).then(() => {
                alert("Web Ad Updated!");
                setIsWebModalOpen(false); // Close modal
                resetWebAdForm(); // Reset form
              });
            } else {
              // Add new ad
              addDoc(collection(db, "ad"), { url: downloadURL }).then(() => {
                alert("Web Ad Uploaded!");
                setIsWebModalOpen(false); // Close modal
                resetWebAdForm(); // Reset form
              });
            }
          });
        }
      );
    }
  };

  // Upload App Ad
  const handleAppAdUpload = () => {
    if (appAdImage || currentAd) { // Either a new image or editing an existing ad
      const storageRef = ref(storage, `app_ad/${appAdImage ? appAdImage.name : currentAd.url}`);
      const uploadTask = uploadBytesResumable(storageRef, appAdImage);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => console.error(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            if (currentAd) {
              // Update existing ad
              updateDoc(doc(db, "images", currentAd.id), { url: downloadURL, route: selectedRoute }).then(() => {
                alert("App Ad Updated!");
                setIsAppModalOpen(false); // Close modal
                resetAppAdForm(); // Reset form
              });
            } else {
              // Add new ad
              addDoc(collection(db, "images"), { url: downloadURL, route: selectedRoute }).then(() => {
                alert("App Ad Uploaded!");
                setIsAppModalOpen(false); // Close modal
                resetAppAdForm(); // Reset form
              });
            }
          });
        }
      );
    }
  };

  // Delete Ad
  const handleDeleteAd = async () => {
    const { id, url, collectionName } = currentAd;
    const storageRef = ref(storage, url);
    await deleteObject(storageRef); // Delete from Storage
    await deleteDoc(doc(db, collectionName, id)); // Delete from Firestore
    if (collectionName === 'ad') {
      setWebAds(webAds.filter(ad => ad.id !== id));
    } else {
      setAppAds(appAds.filter(ad => ad.id !== id));
    }
    setIsDeleteModalOpen(false);
    setCurrentAd(null); // Reset current ad
  };

  return (
    <div className="adv-management-container">
      <h2>Web Advertisement</h2>
      <button className="adv-main-button" onClick={() => setIsWebModalOpen(true)}>+ Web Advertisement</button>
      <div className="adv-section web-ad-section">
        <div className="ad-grid">
          {webAds.map(ad => (
            <div key={ad.id} className="ad-card">
              <img src={ad.url} alt="Web Ad" className="ad-preview" />
              <div className="ad-actions">
                <button className="adv-edit-btn" onClick={() => handleEditWebAd(ad)}>
                  <FaEdit />
                </button>
                <button className="adv-delete-btn" onClick={() => {
                  setCurrentAd({ ...ad, collectionName: 'ad' });
                  setIsDeleteModalOpen(true); // Open delete confirmation modal
                }}>
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2>App Advertisement</h2>
      <button className="adv-main-button" onClick={() => setIsAppModalOpen(true)}>+ App Advertisement</button>
      <div className="adv-section app-ad-section">
        <div className="ad-grid">
          {appAds.map(ad => (
            <div key={ad.id} className="ad-card">
              <img src={ad.url} alt="App Ad" className="ad-preview" />
              <div className="ad-actions">
                <button className="adv-edit-btn" onClick={() => handleEditAppAd(ad)}>
                  <FaEdit />
                </button>
                <button className="adv-delete-btn" onClick={() => {
                  setCurrentAd({ ...ad, collectionName: 'images' });
                  setIsDeleteModalOpen(true); // Open delete confirmation modal
                }}>
                  <FaTrash />
                </button>
              </div>
              <p>Route: {ad.route}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Web Advertisement Modal */}
      <Modal isOpen={isWebModalOpen} onRequestClose={() => {
        resetWebAdForm(); // Reset form when closing modal
        setIsWebModalOpen(false);
      }} className="adv-react-modal" contentLabel="Web Ad Modal">
        <h2>{currentAd ? "Edit Web Advertisement" : "Add Web Advertisement"}</h2>
        {!webAdPreview && <input type="file" onChange={handleWebAdImageChange} />} {/* Hide file input if there's a preview */}
        {webAdPreview && <img src={webAdPreview} alt="Web Ad Preview" className="adv-image-preview" />}
        <button className="adv-modal-btn" onClick={handleWebAdUpload}>{currentAd ? "Update Web Ad" : "Upload Web Ad"}</button>
        <button className="close-modal" onClick={() => {
          resetWebAdForm(); // Reset form when closing modal
          setIsWebModalOpen(false);
        }}>×</button>
      </Modal>

      {/* App Advertisement Modal */}
      <Modal isOpen={isAppModalOpen} onRequestClose={() => {
        resetAppAdForm(); // Reset form when closing modal
        setIsAppModalOpen(false);
      }} className="adv-react-modal" contentLabel="App Ad Modal">
        <h2>{currentAd ? "Edit App Advertisement" : "Add App Advertisement"}</h2>
        {!appAdPreview && <input type="file" onChange={handleAppAdImageChange} />} {/* Hide file input if there's a preview */}
        {appAdPreview && <img src={appAdPreview} alt="App Ad Preview" className="adv-image-preview" />}
        <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
          <option value="/chat">Chat</option>
          <option value="/webview_ibots">Ibots Website</option>
          <option value="/webview_protowiz">Protowiz Website</option>
        </select>
        <button className="adv-modal-btn" onClick={handleAppAdUpload}>{currentAd ? "Update App Ad" : "Upload App Ad"}</button>
        <button className="close-modal" onClick={() => {
          resetAppAdForm(); // Reset form when closing modal
          setIsAppModalOpen(false);
        }}>×</button>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onRequestClose={() => setIsDeleteModalOpen(false)} className="adv-react-modal" contentLabel="Delete Confirmation Modal">
        <h2>Are you sure you want to delete this ad?</h2>
        <button className="adv-modal-btn" onClick={handleDeleteAd}>Yes</button>
        <button className="adv-modal-btn" onClick={() => setIsDeleteModalOpen(false)}>No</button>
      </Modal>
    </div>
  );
};

export default AdvertisementManagement;
