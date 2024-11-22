import React, { useState, useEffect } from "react";
import { AiFillEye, AiFillEyeInvisible, AiOutlineUpload } from "react-icons/ai";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getToken } from "firebase/messaging";
import { messaging } from "../firebase/firebaseSetup"; // Corrected relative path to firebaseSetup.js
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase/firebase"; // Corrected relative path to firebase.js
import { doc, setDoc, getDocs, query, orderBy, collection, limit, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import logo from "./assets/D2T_logo.png"; // Ensure this path is correct
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import { ClipLoader } from "react-spinners";
import { indianStatesWithDistricts } from "./locations"; // Ensure this path is correct

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [location, setLocation] = useState({ state: "", city: "" });
  const [aadhaar, setAadhaar] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [aadhaarName, setAadhaarName] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false); // Loading state
  const [formData, setFormData] = useState({
    profession: "",
    qualification: "",
    experience: "",
    availability: "",
    customerType: "",
    problemType: "",
    fieldOfCategory: "",
    hardware: "",
    charges: "",
  });

  const navigate = useNavigate();

  // Notification permission check and redirection
  useEffect(() => {
    if (Notification.permission !== "granted") {
      navigate("/notification-instructions");
    }
  }, [navigate]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const displayMessage = (setMessageFunction, message) => {
    setMessageFunction(message);
    setTimeout(() => {
      setMessageFunction(null);
    }, 2000);
  };

  const generateTechnicianID = async () => {
    const techniciansRef = collection(db, "technicians");
    const q = query(techniciansRef, orderBy("technicianID", "desc"), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return "TECH001"; // If no technicians exist, start with TECH001
    } else {
      const lastTechnician = snapshot.docs[0].data();
      const lastTechnicianID = lastTechnician.technicianID;
      const newIDNumber = parseInt(lastTechnicianID.replace("TECH", "")) + 1;
      return `TECH${newIDNumber.toString().padStart(3, "0")}`;
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading
    if (!email || !password || !name || !mobileNumber || !location.state || !location.city || !photo || !aadhaar) {
      displayMessage(setError, "All fields are required");
      setLoading(false); // Stop loading
      return;
    }

    const techniciansRef = collection(db, "technicians");
    const q = query(techniciansRef, where("email", "==", email), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      setStep(2); // Move to the next step
      setLoading(false); // Stop loading
    } else {
      displayMessage(setError, "This email is already in use. Please use a different email.");
      setLoading(false); // Stop loading
      return;
    }
  };

  const handleTechnicianDetailsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading

    if (!email || !password || !name || !mobileNumber || !location.state || !location.city || !photo || !aadhaar) {
      displayMessage(setError, "All fields are required");
      setLoading(false); // Stop loading
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Upload photo to Firebase Storage
      const photoRef = ref(storage, `userPhotos/${user.uid}/${photo.name}`);
      await uploadBytes(photoRef, photo);
      const photoURL = await getDownloadURL(photoRef);

      // Upload Aadhaar to Firebase Storage
      const aadhaarRef = ref(storage, `aadhaarFiles/${user.uid}/${aadhaar.name}`);
      await uploadBytes(aadhaarRef, aadhaar);
      const aadhaarURL = await getDownloadURL(aadhaarRef);

      // Generate technician ID
      const technicianID = await generateTechnicianID();

      // Generate FCM token
      const fcmToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_APP_FIREBASE_VAPID_KEY,
      });

      // Save the initial user details to Firestore
      await setDoc(doc(db, "technicians", user.uid), {
        technicianID: technicianID,
        name: name,
        email: email,
        mobileNumber: mobileNumber,
        location: location,
        photoURL: photoURL,
        aadhaarURL: aadhaarURL,
        fcmToken: fcmToken,  // Add FCM token here
        createdAt: new Date(),
        user: "new", // Add the "user: new" field here
        role: "technician", // Set role as technician
        ...formData,
      });

      toast.success("Successfully registered", {
        position: "top-right",
        autoClose: 3000,
      });

      setTimeout(() => {
        setLoading(false); // Stop loading
        navigate("/?technician=true"); // Redirect to the login page with query parameter for technician
      }, 3000); // Show success message for 3 seconds before redirecting
    } catch (error) {
      setLoading(false); // Stop loading
      setStep(1); // Revert to step 1 if there's an error
      if (error.code === 'auth/email-already-in-use') {
        displayMessage(setError, "This email is already in use. Please use a different email.");
      } else if (error.code === 'auth/invalid-email') {
        displayMessage(setError, "The email address is not valid.");
      } else if (error.code === 'auth/weak-password') {
        displayMessage(setError, "The password is too weak. Please use a stronger password.");
      } else {
        displayMessage(setError, "An error occurred during sign-up: " + error.message);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="h-screen w-screen flex justify-center items-center fixed">
      <div className="container px-4 py-2 flex flex-col items-center" style={{ maxWidth: "600px", marginTop: "-50px" }}>
        <ToastContainer />
        {step === 1 ? (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <img className="h-[30px] mt-4" src={logo} alt="Logo" style={stylesFirstForm.logo} />
            <p className="text-xl tracking-wide font-bold" style={{ fontFamily: 'Montserrat', fontSize: '2rem'}}>Create an Account</p><br />
            <p className="text-sm text-gray-400 tracking-wide" style={{ fontFamily: 'Inter' }}>
              I Already Have an Account{" "}
              <span className="text-blue-600 cursor-pointer" onClick={() => navigate("/login-technician")}>
                Sign In
              </span>
            </p>
            <form className="flex flex-col items-start gap-2 mt-4 w-full" onSubmit={handleSignUp}>
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="group w-full"
              >
                <label htmlFor="name" className={stylesFirstForm.label}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={stylesFirstForm.input}
                  style={{ fontFamily: 'Inter' }}
                  required
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="group w-full"
              >
                <label htmlFor="mobileNumber" className={stylesFirstForm.label}>
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="mobileNumber"
                  type="text"
                  placeholder="Enter mobile number"
                  value={mobileNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 10) {
                      setMobileNumber(value);
                    }
                  }}
                  className={stylesFirstForm.input}
                  maxLength={10} // This limits the input length to 10 characters
                  pattern="\d*" // This restricts the input to digits only
                  style={{ fontFamily: 'Inter' }}
                  required
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="group w-full"
              >
                <label htmlFor="email" className={stylesFirstForm.label}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="text"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={stylesFirstForm.input}
                  style={{ fontFamily: 'Inter' }}
                  required
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="group relative w-full"
              >
                <label htmlFor="password" className={stylesFirstForm.label}>
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${stylesFirstForm.input} pr-10`}
                  style={{ paddingRight: "2.5rem", fontFamily: 'Inter' }}
                  required
                />
                <div
                  className="absolute right-0 top-0 h-full flex items-center pr-3 cursor-pointer"
                  style={{ height: "100%", paddingTop: "1.5rem", paddingBottom: "0.375rem" }}
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <AiFillEyeInvisible className="text-gray-500" />
                  ) : (
                    <AiFillEye className="text-gray-500" />
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="group w-full"
              >
                <label htmlFor="state" className={stylesFirstForm.label}>
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <select
                    id="state"
                    value={location.state}
                    onChange={(e) =>
                      setLocation({ ...location, state: e.target.value, city: "" })
                    }
                    className={`${stylesFirstForm.input} w-1/2`}
                    style={{ fontFamily: 'Inter' }}
                    required
                  >
                    <option value="">Choose your State</option>
                    {Object.keys(indianStatesWithDistricts).map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <select
                    id="city"
                    value={location.city}
                    onChange={(e) => setLocation({ ...location, city: e.target.value })}
                    className={`${stylesFirstForm.input} w-1/2`}
                    disabled={!location.state}
                    style={{ fontFamily: 'Inter' }}
                    required
                  >
                    <option value="">Choose your City</option>
                    {location.state &&
                      indianStatesWithDistricts[location.state].map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                  </select>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="group w-full"
              >
                <label htmlFor="photo" className={stylesFirstForm.label}>
                  Upload Photo <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <div className="relative">
                    <input
                      id="photo"
                      type="file"
                      onChange={(e) => {
                        setPhoto(e.target.files[0]);
                        setPhotoName(e.target.files[0]?.name || "");
                      }}
                      className="hidden"
                      required
                    />
                    <label htmlFor="photo" className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 cursor-pointer">
                      <AiOutlineUpload size={24} className="text-gray-600" />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={photoName}
                    readOnly
                    className={`${stylesFirstForm.input} ml-2`}
                    placeholder="No file chosen"
                    style={{ fontFamily: 'Inter', width: 'auto', flex: 1 }}
                    required
                  />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="group w-full"
              >
                <label htmlFor="aadhaar" className={stylesFirstForm.label}>
                  Upload Aadhaar <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <div className="relative">
                    <input
                      id="aadhaar"
                      type="file"
                      onChange={(e) => {
                        setAadhaar(e.target.files[0]);
                        setAadhaarName(e.target.files[0]?.name || "");
                      }}
                      className="hidden"
                      required
                    />
                    <label htmlFor="aadhaar" className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 cursor-pointer">
                      <AiOutlineUpload size={24} className="text-gray-600" />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={aadhaarName}
                    readOnly
                    className={`${stylesFirstForm.input} ml-2`}
                    placeholder="No file chosen"
                    style={{ fontFamily: 'Inter', width: 'auto', flex: 1 }}
                    required
                  />
                </div>
              </motion.div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className={stylesFirstForm.button}
              >
                Next
              </button>
              {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <img className="h-[40px] absolute top-20 left-20" src={logo} alt="Logo" style={stylesSecondForm.logo} />
            <form className="flex flex-col items-start gap-2 mt-4 w-full" onSubmit={handleTechnicianDetailsSubmit}>
              <div className="flex w-full justify-between">
                <div className="flex flex-col w-1/2" style={stylesSecondForm.leftContainer}>
                  <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="profession" className={stylesSecondForm.label}>
                      Profession <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="profession"
                      name="profession"
                      value={formData.profession}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
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
                  <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="qualification" className={stylesSecondForm.label}>
                      Qualification <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="qualification"
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
                    >
                      <option value="">Select your Qualification</option>
                      <option value="BE/BTech">BE/BTech</option>
                      <option value="ME/MTech">ME/MTech</option>
                      <option value="B.sc/M.sc">B.sc/M.sc</option>
                      <option value="BCA/MCA">BCA/MCA</option>
                      <option value="PhD">PhD</option>
                    </select>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="experience" className={stylesSecondForm.label}>
                      Experience <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
                    >
                      <option value="">Choose your experience</option>
                      <option value="1-3 years">1-3 years</option>
                      <option value="3-5 years">3-5 years</option>
                      <option value="5-10 years">5-10 years</option>
                      <option value="10+ years">10+ years</option>
                    </select>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="availability" className={stylesSecondForm.label}>
                      Availability <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="availability"
                      name="availability"
                      value={formData.availability}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
                    >
                      <option value="">Choose your availability</option>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </motion.div>
                </div>
                <div className="flex flex-col w-1/2" style={stylesSecondForm.rightContainer}>
                  <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="customerType" className={stylesSecondForm.label}>
                      Preferred customer type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="customerType"
                      name="customerType"
                      value={formData.customerType}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
                    >
                      <option value="">Select your preferred customer type</option>
                      <option value="Business to business">Business to Business</option>
                      <option value="Business to customer">Business to Customer</option>
                    </select>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="problemType" className={stylesSecondForm.label}>
                      Types of problems preferred to handle <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="problemType"
                      name="problemType"
                      value={formData.problemType}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
                    >
                      <option value="">Select your preferred problem to handle</option>
                      <option value="Materials Selection">Materials Selection</option>
                      <option value="Circuit Debugging">Circuit Debugging</option>
                      <option value="Hardware assembly">Hardware Assembly</option>
                      <option value="Circuit design">Circuit Design</option>
                      <option value="PCB Design">PCB Design</option>
                      <option value="PCB trouble shoot">PCB trouble shoot</option>
                      <option value="Coding for robots/Project">Coding for robots/Project</option>
                      <option value="Battery management System">Battery Management System</option>
                      <option value="Alternate material finding">Alternate material finding</option>
                      <option value="unable to find a problem in build project">Unable to find a problem in build project</option>
                      <option value="Boards repair">Boards Repair</option>
                      <option value="customised design & print">Customised design & print</option>
                      <option value="Circuit design">Circuit Design</option>
                      <option value="solution based on problem/idea">Solution based on problem/idea</option>
                    </select>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="fieldOfCategory" className={stylesSecondForm.label}>
                      Field of Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="fieldOfCategory"
                      name="fieldOfCategory"
                      value={formData.fieldOfCategory}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
                    >
                      <option value="">Select the categories of services you will be handling</option>
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
                  <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="hardware" className={stylesSecondForm.label}>
                      Hardware <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="hardware"
                      name="hardware"
                      value={formData.hardware}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
                    >
                      <option value="">Choose the hardware categories you will be working on</option>
                      <option value="Arduino">Arduino</option>
                      <option value="Nodemcu/ESP">NodeMcu/ESP</option>
                      <option value="Raspberry pi">Raspberry pi</option>
                      <option value="Microchip">Microchip</option>
                      <option value="Texas">Texas</option>
                      <option value="Renesas">Renesas</option>
                      <option value="Nordic">Nordic</option>
                      <option value="ST Microcontroller">ST Microcontroller</option>
                      <option value="Teensy 4.1.">Teensy 4.1.</option>
                      <option value="Seeed Studio XIAO SAMD21.">Seeed Studio XIAO SAMD21.</option>
                      <option value="BBC Micro:bit V2.">BBC Micro:bit V2.</option>
                      <option value="Lilygo T-Display S3.">Lilygo T-Display S3.</option>
                      <option value="SparkFun Thing Plus.">SparkFun Thing Plus.</option>
                      <option value="Others">Others</option>
                    </select>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="group w-full"
                  >
                    <label htmlFor="charges" className={stylesSecondForm.label}>
                      Charges per Hr <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="charges"
                      name="charges"
                      value={formData.charges}
                      onChange={handleChange}
                      className={stylesSecondForm.input}
                      style={{ fontFamily: 'Inter' }}
                      required
                    >
                      <option value="">Please Select your charges per hour</option>
                      <option value="150">150</option>
                      <option value="250">250</option>
                      <option value="350">350</option>
                      <option value="Others">Others</option>
                    </select>
                  </motion.div>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className={stylesSecondForm.button}
                disabled={loading} // Disable button while loading
              >
                {loading ? <ClipLoader size={20} color={"#ffffff"} /> : "Register"}
              </button>
              {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const stylesFirstForm = {
  label: "block text-sm font-medium text-gray-700",
  input: "mt-1 block w-full border border-gray-300 rounded-md py-1 px-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600 bg-white-200",
  button: "bg-blue-800 w-40 py-2 text-white rounded-md mt-4 fixed bottom-3 left-1/2 transform -translate-x-1/2 text-sm",
  logo: {
    position: "absolute",
    top: "0px", // Adjust the top position as needed
    left: "20px", // Adjust the left position as needed
    right: "78%", // Adjust the right position as needed
    bottom: "500px", // Adjust the bottom position as needed
    margin: "auto",
    display: "block",
    height: "200px"
  },
};

const stylesSecondForm = {
  label: "block text-sm font-medium text-gray-700",
  input: "mt-2 block w-3/4 border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600 bg-white-200",
  button: "bg-blue-800 w-40 py-3 text-white rounded-md mt-4 absolute bottom-12 left-1/2 transform -translate-x-1/2 text-sm",
  leftContainer: {
    position: "absolute",
    left: "80px",
    top: "180px", // Adjusted to ensure logo fits above
  },
  rightContainer: {
    position: "absolute",
    right: "-70px",
    top: "180px", // Adjusted to ensure logo fits above
  },
  logo: {
    position: "absolute",
    top: "0px", // Adjust the top position as needed
    left: "20px", // Adjust the left position as needed
    right: "82%", // Adjust the right position as needed
    bottom: "500px", // Adjust the bottom position as needed
    margin: "auto",
    display: "block",
    height: "150px"
  },
};

export default Signup;
