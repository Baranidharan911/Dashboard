import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import step1Image from "./assets/step1.png"; // Replace with your actual image path
import step2Image from "./assets/step2.png"; // Replace with your actual image path
import step3Image from "./assets/step3.png"; // Replace with your actual image path
import logo from "./assets/logo.png"; // Replace with your logo image path

const NotificationInstructions = () => {
  const navigate = useNavigate();

  // Check if Notification permission is already granted
  useEffect(() => {
    if (Notification.permission === "granted") {
      navigate("/login-technician");
    }
  }, [navigate]);

  return (
    <Container>
      {/* Logo at the top, centered */}
      <LogoContainer>
        <Logo src={logo} alt="Logo" />
      </LogoContainer>

      <Heading>Stay Updated with Important Notifications!</Heading>
      <SubHeading>
        Enable notifications to log in and stay informed with our latest updates and alerts.
      </SubHeading>

      <StepContainer>
        <Step>
          <StepHeading>Step 1: Click on the "site information" button on top of the browser.</StepHeading>
          <Image src={step1Image} alt="Step 1" />
        </Step>

        <Step>
          <StepHeading>Step 2: Go into "Site Settings".</StepHeading>
          <Image src={step2Image} alt="Step 2" />
        </Step>

        <Step>
          <StepHeading>
            Step 3: In the site settings page that opens, find "Notifications". From the dropdown next to
            "Notifications," select "Allow".
          </StepHeading>
          <Image src={step3Image} alt="Step 3" />
        </Step>
      </StepContainer>
    </Container>
  );
};

export default NotificationInstructions;

// CSS in JS using styled-components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
`;

const LogoContainer = styled.div`
  margin-bottom: 20px;  /* Space between logo and the heading */
`;

const Logo = styled.img`
  width: 150px;
  height: auto;

  @media (max-width: 768px) {
    width: 100px;
  }
`;

const Heading = styled.h1`
  color: red;
  font-size: 2rem;
  margin-bottom: 10px;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const SubHeading = styled.h2`
  color: black;
  font-size: 1.2rem;
  margin-bottom: 30px;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 20px;
  }
`;

const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;

  @media (max-width: 768px) {
    gap: 20px;
  }
`;

const Step = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StepHeading = styled.p`
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 10px;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const Image = styled.img`
  width: 400px;
  height: auto;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
  }
`;
