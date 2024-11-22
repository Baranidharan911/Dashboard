import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import login from "./assets/login.png";
import logo from "./assets/D2T_logo.png";
import adminIcon from "./assets/admin_icon.png";
import technicianIcon from "./assets/technician_icon.png";

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

const Login = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role) => {
    if (role === 'admin') {
      navigate('/login-admin');
    } else if (role === 'technician') {
      navigate('/login-technician');
    }
  };

  return (
    <>
      <GlobalStyle />
      <Container>
        <ContentContainer>
          <RoleSelectionContainer
            as={motion.div}
            initial={{ x: '-100vw' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 50 }}
          >
            <LogoContainer>
              <Logo src={logo} alt="Logo" />
              <WelcomeText>Welcome to DIAL 2 TECH!</WelcomeText>
            </LogoContainer>
            <SubTitle>Please select your role</SubTitle>
            <ButtonContainer>
              <RoleButton
                as={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRoleSelection('admin')}
              >
                <RoleIcon src={adminIcon} alt="Admin Icon" />
                <RoleText>Admin</RoleText>
              </RoleButton>
              <RoleButton
                as={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRoleSelection('technician')}
              >
                <RoleIcon src={technicianIcon} alt="Technician Icon" />
                <RoleText>Technical Engineer</RoleText>
              </RoleButton>
            </ButtonContainer>
          </RoleSelectionContainer>
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
    </>
  );
};

// Styled Components

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 10px;
  }
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
    padding: 10px;
  }
`;

const RoleSelectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (max-width: 768px) {
    margin-bottom: 20px;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
`;

const Logo = styled.img`
  height: 150px;
  margin-right: 280px;

  @media (max-width: 768px) {
    height: 80px;
    margin-right: 0;
  }
`;

const WelcomeText = styled.p`
  font-size: 2rem;
  font-weight: bold;
  color: #002B87;
  margin-top: -20px;
  margin-left: 50px;
  font-family: 'Montserrat';

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin: 10px 0;
    margin-left: 0;
  }
`;

const SubTitle = styled.p`
  font-size: 1.5rem;
  color: black;
  font-weight: bold;
  margin-top: 50px;
  font-family: 'Montserrat';
  margin-left: -80px;

  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-top: 20px;
    margin-left: 0;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 10px;
  margin-left: -80px;
  margin-bottom: 200px;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-left: 0;
    margin-bottom: 50px;
    gap: 10px;
  }
`;

const RoleButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  width: 135px;
  height: 120px;
  border: 2px solid #002B87;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
  background-color: white;

  &:hover {
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    padding: 15px;
  }
`;

const RoleIcon = styled.img`
  width: 50px;
  height: 50px;
  margin-bottom: 10px;

  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
  }
`;

const RoleText = styled.p`
  font-family: 'Montserrat';
  font-size: 12px;
  font-weight: bold;
  color: #002B87;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const ImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
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

export default Login;
