import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase/firebase"; // Adjust path as necessary
import { AiFillEdit, AiFillCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import { motion } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import { toast, ToastContainer } from "react-toastify"; // Import toast from react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import toastify CSS
import defaultProfileIcon from '../assets/technician_icon.png'; // Fallback profile icon

const TechSettings = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [technicianData, setTechnicianData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedData, setUpdatedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [newProfileImage, setNewProfileImage] = useState(null); // Store new image file
  const [documentId, setDocumentId] = useState(null);

  // Fetch technician profile data from Firestore using stored technicianId
  useEffect(() => {
    const storedTechnicianId = localStorage.getItem('technicianId');
    setDocumentId(storedTechnicianId);

    if (!storedTechnicianId) {
      toast.error("No technician ID found in local storage."); // Toast error message
      setLoading(false);
      return;
    }

    const fetchTechnicianDetails = async () => {
      try {
        const technicianDocRef = doc(db, 'technicians', storedTechnicianId);
        const docSnapshot = await getDoc(technicianDocRef);

        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setTechnicianData(data);
          setUpdatedData(data); // Initialize the form with existing data
        } else {
          toast.error("No technician data found!"); // Toast error message
        }
      } catch (error) {
        toast.error("Error fetching technician data."); // Toast error message
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicianDetails();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setUpdatedData(technicianData); // Reset changes if cancel is pressed
    setNewProfileImage(null); // Reset new profile image
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const technicianDocRef = doc(db, 'technicians', documentId); // Reference the document by ID

      // Handle profile image update if a new image is selected
      if (newProfileImage) {
        // Delete the old profile image from Firebase Storage if it exists
        if (technicianData.photoURL) {
          const oldImageRef = ref(storage, technicianData.photoURL);
          await deleteObject(oldImageRef);
        }

        // Upload the new image to Firebase Storage
        const imageRef = ref(storage, `userPhotos/${documentId}/${newProfileImage.name}`);
        await uploadBytes(imageRef, newProfileImage);
        const newImageUrl = await getDownloadURL(imageRef);

        // Update the new image URL in Firestore
        updatedData.photoURL = newImageUrl;
      }

      // Update the technician data in Firestore
      await updateDoc(technicianDocRef, updatedData);
      setTechnicianData(updatedData);
      setIsEditing(false);
      toast.success("Profile updated successfully!"); // Toast success message
    } catch (error) {
      toast.error("Error updating profile."); // Toast error message
    } finally {
      setIsSaving(false);
      setNewProfileImage(null); // Reset after saving
    }
  };

  const handleImageChange = (e) => {
    if (isEditing && e.target.files[0]) {
      setNewProfileImage(e.target.files[0]); // Store new image file for upload
    }
  };

  const handleChange = (e) => {
    setUpdatedData({
      ...updatedData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader size={50} color={"#000"} loading={loading} />
      </div>
    );
  }

  if (!technicianData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Unable to load technician data.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-xl">
      <ToastContainer /> {/* Toast container for displaying toast notifications */}
      <div className="flex items-center justify-center mb-8">
        <label htmlFor="profileImageInput">
          <img
            src={newProfileImage ? URL.createObjectURL(newProfileImage) : technicianData.photoURL || defaultProfileIcon}
            alt="Profile Icon"
            className="h-20 w-20 rounded-full cursor-pointer"
          />
          {isEditing && (
            <input
              id="profileImageInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          )}
        </label>
      </div>
      <form className="flex flex-col gap-4">
        {/* Name */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="name" className="font-semibold">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={isEditing ? updatedData.name || technicianData.name : technicianData.name}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          />
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="email" className="font-semibold">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={technicianData.email}
            disabled
            className="border rounded p-2 bg-gray-200 cursor-not-allowed"
          />
        </motion.div>

        {/* Mobile Number */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="mobileNumber" className="font-semibold">Mobile Number</label>
          <input
            id="mobileNumber"
            name="mobileNumber"
            type="text"
            value={isEditing ? updatedData.mobileNumber || technicianData.mobileNumber : technicianData.mobileNumber}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          />
        </motion.div>

        {/* Profession */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="profession" className="font-semibold">Profession</label>
          <select
            id="profession"
            name="profession"
            value={updatedData.profession || technicianData.profession}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Select your Profession</option>
            <option value="Freelancer">Freelancer</option>
            <option value="Private limited company">Private limited company</option>
            <option value="Proprietor">Proprietor</option>
            <option value="R&D scientist/innovator">R&D Scientist/Innovator</option>
            <option value="MNC engineers">MNC Engineers</option>
            <option value="Startup engineers">Startup Engineers</option>
            <option value="Hobbyist">Hobbyist</option>
          </select>
        </motion.div>

        {/* Qualification */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="qualification" className="font-semibold">Qualification</label>
          <select
            id="qualification"
            name="qualification"
            value={updatedData.qualification || technicianData.qualification}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Select your Qualification</option>
            <option value="BE/BTech">BE/BTech</option>
            <option value="ME/MTech">ME/MTech</option>
            <option value="B.sc/M.sc">B.sc/M.sc</option>
            <option value="BCA/MCA">BCA/MCA</option>
            <option value="PhD">PhD</option>
          </select>
        </motion.div>

        {/* Experience */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="experience" className="font-semibold">Experience</label>
          <select
            id="experience"
            name="experience"
            value={updatedData.experience || technicianData.experience}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Choose your experience</option>
            <option value="1-3 years">1-3 years</option>
            <option value="3-5 years">3-5 years</option>
            <option value="5-10 years">5-10 years</option>
            <option value="10+ years">10+ years</option>
          </select>
        </motion.div>

        {/* Availability */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="availability" className="font-semibold">Availability</label>
          <select
            id="availability"
            name="availability"
            value={updatedData.availability || technicianData.availability}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Choose your availability</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </motion.div>

        {/* Customer Type */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="customerType" className="font-semibold">Customer Type</label>
          <select
            id="customerType"
            name="customerType"
            value={updatedData.customerType || technicianData.customerType}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Select your preferred customer type</option>
            <option value="Business to business">Business to Business</option>
            <option value="Business to customer">Business to Customer</option>
          </select>
        </motion.div>

        {/* Problem Type */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="problemType" className="font-semibold">Problem Type</label>
          <select
            id="problemType"
            name="problemType"
            value={updatedData.problemType || technicianData.problemType}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Select your preferred problem type</option>
            <option value="Materials Selection">Materials Selection</option>
            <option value="Circuit Debugging">Circuit Debugging</option>
            <option value="Hardware assembly">Hardware Assembly</option>
            <option value="Circuit design">Circuit Design</option>
            <option value="PCB Design">PCB Design</option>
            <option value="PCB trouble shoot">PCB trouble shoot</option>
            <option value="Coding for robots/Project">Coding for robots/Project</option>
            <option value="Battery management System">Battery Management System</option>
            <option value="Boards repair">Boards Repair</option>
            <option value="Customised design & print">Customised design & print</option>
            <option value="Solution based on problem/idea">Solution based on problem/idea</option>
          </select>
        </motion.div>

        {/* Field of Category */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="fieldOfCategory" className="font-semibold">Field of Category</label>
          <select
            id="fieldOfCategory"
            name="fieldOfCategory"
            value={updatedData.fieldOfCategory || technicianData.fieldOfCategory}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Select the categories of services</option>
            <option value="Electronics">Electronics</option>
            <option value="Embedded systems">Embedded Systems</option>
            <option value="IoT">IoT</option>
            <option value="Automations">Automations</option>
            <option value="Robotics">Robotics</option>
            <option value="3d printing">3D Printing</option>
            <option value="EV">EV</option>
            <option value="Drone">Drone</option>
            <option value="Solar">Solar</option>
            <option value="Others">Others</option>
          </select>
        </motion.div>

        {/* Hardware */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="hardware" className="font-semibold">Hardware</label>
          <select
            id="hardware"
            name="hardware"
            value={updatedData.hardware || technicianData.hardware}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Choose the hardware categories</option>
            <option value="Arduino">Arduino</option>
            <option value="Nodemcu/ESP">NodeMcu/ESP</option>
            <option value="Raspberry pi">Raspberry pi</option>
            <option value="Microchip">Microchip</option>
            <option value="Texas">Texas</option>
            <option value="Renesas">Renesas</option>
            <option value="Nordic">Nordic</option>
            <option value="ST Microcontroller">ST Microcontroller</option>
            <option value="Teensy 4.1.">Teensy 4.1.</option>
          </select>
        </motion.div>

        {/* Charges per Hr */}
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <label htmlFor="charges" className="font-semibold">Charges per Hr</label>
          <select
            id="charges"
            name="charges"
            value={updatedData.charges || technicianData.charges}
            onChange={handleChange}
            disabled={!isEditing}
            className="border rounded p-2"
          >
            <option value="">Please Select your charges per hour</option>
            <option value="150">150</option>
            <option value="250">250</option>
            <option value="350">350</option>
            <option value="Others">Others</option>
          </select>
        </motion.div>

        {/* Edit, Save, and Cancel Buttons */}
        <div className="flex justify-end mt-4">
          {isEditing ? (
            <>
              <button type="button" onClick={handleSave} className="mr-4">
                <AiFillCheckCircle size={24} className="text-green-500" />
              </button>
              <button type="button" onClick={handleCancel}>
                <AiOutlineCloseCircle size={24} className="text-red-500" />
              </button>
            </>
          ) : (
            <button type="button" onClick={handleEdit}>
              <AiFillEdit size={24} className="text-blue-500" />
            </button>
          )}
        </div>

        {/* Show saving loader */}
        {isSaving && <ClipLoader size={30} color={"#000"} loading={isSaving} />}
      </form>
    </div>
  );
};

export default TechSettings;
