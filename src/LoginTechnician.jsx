import React, { useEffect, useState } from "react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import styled, { createGlobalStyle } from 'styled-components';
import { motion } from 'framer-motion';
import logo from "./assets/D2T_logo.png"; // Ensure this path is correct
import login from "./assets/login.png"; // Ensure this path is correct
import { auth, firestore as db, functions } from "../firebase/firebaseSetup"; // Make sure to import functions from your firebase setup
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { ClipLoader } from "react-spinners";
import { httpsCallable } from "firebase/functions"; // Import the httpsCallable function from Firebase SDK

const GlobalStyle = createGlobalStyle`
  body, html {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    font-family: 'Montserrat', sans-serif;
    background: linear-gradient(to bottom, #FFFFFF 82%, rgba(3, 179, 255, 0.8) 120%);
    background-size: cover;
    background-repeat: no-repeat;
    background-attachment: fixed;
  }
`;

const LoginTechnician = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // State for loader
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Check Notification Permission
  const checkNotificationPermission = () => {
    if (Notification.permission === "denied" || Notification.permission === "default") {
      // Navigate to instruction page if permission is not granted
      navigate("/notification-instructions");
      return;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Reset error state before attempting login
    setSuccess(null); // Reset success state

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, "technicians", user.uid));
      const userData = userDoc.data();

      if (!userData || userData.role !== "technician") {
        setError("No account found, Please Sign up.");
        setLoading(false);
        await auth.signOut(); // Sign out the user
        return;
      }

      // Save user information in local storage
      localStorage.setItem("technicianUser", JSON.stringify({ uid: user.uid, email }));

      setSuccess("Successfully signed in");

      // Introduce a slight delay before navigating to the dashboard
      setTimeout(() => {
        setLoading(false);
        navigate("/technician");
      }, 2000);
    } catch (error) {
      console.error('Error during sign-in:', error.message);
      setError('Login failed. Please check your credentials and try again.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null); // Reset error state before attempting password reset
    setSuccess(null); // Reset success state
    setIsSubmitting(true); // Start loader

    if (!email) {
        setError("Please enter your email to reset password");
        console.log("Error: No email provided");
        setIsSubmitting(false); // Stop loader
        return;
    }

    try {
        console.log("Attempting to send password reset email to:", email);
        
        // Check if the email exists in Firebase Authentication
        const usersCollectionRef = collection(db, 'technicians');
        const emailQuery = query(usersCollectionRef, where('email', '==', email));
        const emailQuerySnapshot = await getDocs(emailQuery);

        if (emailQuerySnapshot.empty) {
            console.log("Error: Email does not exist in Firestore for this user");
            setError("This email is not registered as a technician.");
            setIsSubmitting(false); // Stop loader
            return;
        } else {
            console.log("Email exists in Firestore, proceeding to send reset email");
        }

        // Call the Firebase Function to send the password reset email
        const sendPasswordResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');
        const result = await sendPasswordResetEmail({ email });
        
        if (result.data.success) {
          setSuccess("Password reset email sent successfully");
          console.log("Password reset email sent successfully to:", email);
        } else {
          throw new Error(result.data.error || "Failed to send password reset email");
        }

    } catch (error) {
        setError("Failed to send password reset email. Please check your email address and try again.");
        console.error("Error sending password reset email:", error);

        // Additional logging based on error code
        if (error.code === 'auth/user-not-found') {
            console.error("No user found with the provided email.");
        } else if (error.code === 'auth/invalid-email') {
            console.error("Invalid email format.");
        } else if (error.code === 'auth/too-many-requests') {
            console.error("Too many requests sent. Please try again later.");
        } else {
            console.error("Unexpected error:", error);
        }
    } finally {
        setIsSubmitting(false); // Stop loader
    }
  };


  useEffect(() => {
    // Check notifications permission when the component loads
    checkNotificationPermission();
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        position: "top-right",
        autoClose: 1000,
      });
      setError(null); // Reset error after showing toast
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      toast.success(success, {
        position: "top-right",
        autoClose: 1000,
      });
      setSuccess(null); // Reset success after showing toast
    }
  }, [success]);

  return (
    <>
      <GlobalStyle />
      <Container
        as={motion.div}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <ContentContainer>
          <SignInContainer
            as={motion.div}
            initial={{ x: '-100vw' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 50 }}
          >
            <SignInLogoContainer style={{paddingTop:"20px"}}>
              <Logo src={logo} alt="Logo" />
            </SignInLogoContainer>
            <SignInContentContainer>
              <SignInTitle>Technical Engineer</SignInTitle>
              <SignInSubtitle>Please login to enter dashboard.</SignInSubtitle>
              
              <InputGroup
                as={motion.div}
                initial={{ x: '-100vw' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 50, delay: 0.2 }}
              >
                <Input
                  id="email"
                  type="text"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Label htmlFor="email">Email</Label>
              </InputGroup>
              
              <InputGroup
                as={motion.div}
                initial={{ x: '-100vw' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 50, delay: 0.4 }}
              >
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Label htmlFor="password">Password</Label>
                <PasswordToggle onClick={togglePasswordVisibility}>
                  {showPassword ? (
                    <AiFillEyeInvisible />
                  ) : (
                    <AiFillEye />
                  )}
                </PasswordToggle>
              </InputGroup>
              
              <ForgotPassword
                as={motion.p}
                initial={{ x: '-100vw' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 50, delay: 0.6 }}
                onClick={handleForgotPassword}
              >
                {isSubmitting ? <ClipLoader size={20} color={"#002B87"} /> : "Forgot Password?"}
              </ForgotPassword>
              
              <SignInButton
                as={motion.button}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? <ClipLoader size={20} color={"#ffffff"} /> : "Sign in"}
              </SignInButton>
              
              <SignUpPrompt
                as={motion.p}
                initial={{ x: '-100vw' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 50, delay: 1 }}
              >
                Don't have an account? <SignUpLink onClick={() => navigate("/signup")}>Sign up</SignUpLink>
              </SignUpPrompt>
              <SignUpPrompt
                as={motion.p}
                initial={{ x: '-100vw' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 50, delay: 1 }}
              >
                Want to know more about us? <SignUpLink onClick={() => navigate("/")}>Click here</SignUpLink>
              </SignUpPrompt>
            </SignInContentContainer>
          </SignInContainer>
          
          <ImageContainer
            as={motion.div}
            initial={{ x: '100vw' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 50 }}
          >
            <LoginImage src={login} alt="Login" />
          </ImageContainer>
        </ContentContainer>
      </Container>
      
      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
};

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ContentContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 10px 30px;

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 10px 20px;
  }
`;

const SignInContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  margin-left: 10px;
  max-width: 350px;
  margin-bottom: 250px;
  margin-top: 50px;

  @media (max-width: 768px) {
    align-items: center;
    margin-bottom: 50px;
  }
`;

const SignInLogoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10px;
  margin-top: 50px;
  height: 150px;

  @media (max-width: 768px) {
    margin-top: 20px;
  }
`;

const SignInContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  width: 100%;
  gap: 10px;

  @media (max-width: 768px) {
    align-items: center;
  }
`;

const SignInTitle = styled.p`
  font-size: 2rem;
  font-weight: bold;
  font-family: 'Montserrat';
  margin-left: 20px;

  @media (max-width: 768px) {
    margin-left: 0;
    text-align: center;
  }
`;

const SignInSubtitle = styled.p`
  font-size: 1rem;
  color: #888;
  font-family: 'Inter';
  margin-left: 20px;

  @media (max-width: 768px) {
    margin-left: 0;
    text-align: center;
  }
`;

const InputGroup = styled.div`
  position: relative;
  width: 100%;
  margin-left: 20px;

  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const Input = styled.input`
  width: 120%;
  padding: 10px 40px 10px 10px; /* Added padding-right for the icon */
  border: 1px solid #ccc;
  border-radius: 5px;
  font-family: 'Inter';
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s;
  margin-top: 15px;
  font-size: 1rem;

  &:focus {
    border-color: #002B87;
    outline: none;
  }

  &:focus ~ label,
  &:not(:placeholder-shown) ~ label {
    transform: translateY(-125%);
    font-size: 0.75rem;
    color: #002B87;
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const Label = styled.label`
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  background-color: white;
  padding: 0 5px;
  font-size: 1rem;
  color: #888;
  transition: all 0.2s ease-in-out;
  pointer-events: none;
`;

const PasswordToggle = styled.div`
  position: absolute;
  top: 60%;
  right: -50px;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 1.2rem;
  color: #888;

  @media (max-width: 768px) {
    right: 10px;
  }
`;

const ForgotPassword = styled.p`
  font-size: 1rem;
  color: #002B87;
  cursor: pointer;
  font-family: 'Inter';
  margin-top: -5px;
  margin-left: 20px;

  @media (max-width: 768px) {
    margin-left: 0;
    text-align: center;
  }
`;

const SignInButton = styled.button`
  width: 120%;
  padding: 10px;
  background-color: #002B87;
  color: white;
  border: none;
  border-radius: 5px;
  font-family: 'Inter';
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-left: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #001a5e;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    width: 100%;
    margin-left: 0;
  }
`;

const SignUpPrompt = styled.p`
  font-size: 1rem;
  font-family: 'Inter';
  margin-left: 20px;

  @media (max-width: 768px) {
    margin-left: 0;
    text-align: center;
  }
`;

const SignUpLink = styled.span`
  color: #002B87;
  cursor: pointer;
`;

const ImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  margin-left: 20px;

  @media (max-width: 768px) {
    margin-left: 0;
    margin-top: 20px;
  }
`;

const LoginImage = styled.img`
  height: 350px;
  mix-blend-mode: multiply;
  margin-right: 60px;
  margin-bottom: 60px;

  @media (max-width: 768px) {
    height: 200px;
    margin-right: 0;
    margin-bottom: 20px;
  }
`;

const Logo = styled.img`
  height: 150px;
  margin-right: 140px;

  @media (max-width: 768px) {
    height: 100px;
    margin-right: 0;
  }
`;

export default LoginTechnician;
