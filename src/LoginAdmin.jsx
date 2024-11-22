import React, { useEffect, useState } from "react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import styled, { createGlobalStyle } from 'styled-components';
import { motion } from 'framer-motion';
import logo from "./assets/D2T_logo.png"; // Ensure this path is correct
import login from "./assets/login.png"; // Ensure this path is correct
import { auth, signInWithEmailAndPassword } from "../firebase/firebaseSetup"; // Corrected relative path to firebaseSetup.js
import { saveAdminToken } from '../saveAdminToken'; // Adjust the path if necessary
import { ClipLoader } from "react-spinners"; // Import ClipLoader

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

const LoginAdmin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check notification permission and redirect if not granted
  useEffect(() => {
    if (Notification.permission !== "granted") {
      navigate("/notification-instructions");
    }
  }, [navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        position: "top-right",
        autoClose: 1000,
      });
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      toast.success(success, {
        position: "top-right",
        autoClose: 1000,
      });
    }
  }, [success]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Reset the error state before starting the login process
    setSuccess(null); // Reset the success state as well

    // Check if the email matches the admin email in the environment variables
    if (email !== import.meta.env.VITE_APP_ADMIN_EMAIL) {
      setError("Only the admin can login.");
      setLoading(false);
      return;
    }

    try {
      // Attempt to sign in with the provided email and password
      await signInWithEmailAndPassword(auth, email, password);

      // Save admin information in local storage
      localStorage.setItem("adminUser", JSON.stringify({ email }));

      // Save FCM token for admin after successful login
      await saveAdminToken(); 

      setSuccess("Successfully signed in");

      // Introduce a slight delay before navigating to the dashboard
      setTimeout(() => {
        setLoading(false);
        navigate("/dashboard");
      }, 2000);

    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

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
            <SignInLogoContainer>
              <Logo src={logo} alt="Logo" />
            </SignInLogoContainer>
            <SignInContentContainer>
              <SignInTitle>Admin Login</SignInTitle>
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
              
              <SignInButton
                as={motion.button}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? <ClipLoader size={20} color={"#ffffff"} /> : "Sign in"}
              </SignInButton>
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

export default LoginAdmin;
