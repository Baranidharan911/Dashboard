import React from 'react';
import styled from 'styled-components';

const StatCard = styled.div`
  flex: 1;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
  text-align: left;
  font-family: 'Nunito Sans', sans-serif;
  font-weight: 600;

  @media (max-width: 768px) {
    padding: 12px;
  }

  @media (max-width: 480px) {
    padding: 10px;
  }
`;

const StatCardContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatCardText = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatCardIcon = styled.img`
  width: 40px;
  height: 40px;

  @media (max-width: 768px) {
    width: 35px;
    height: 35px;
  }

  @media (max-width: 480px) {
    width: 30px;
    height: 30px;
  }
`;

const StatCardTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #333;

  @media (max-width: 768px) {
    font-size: 14px;
  }

  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const StatCardNumber = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: black;

  @media (max-width: 768px) {
    font-size: 20px;
  }

  @media (max-width: 480px) {
    font-size: 18px;
  }
`;

const TechStatCard = ({ title, number, icon }) => (
  <StatCard>
    <StatCardContent>
      <StatCardText>
        <StatCardTitle>{title}</StatCardTitle>
        <StatCardNumber>{number}</StatCardNumber>
      </StatCardText>
      <StatCardIcon src={icon} alt={title} />
    </StatCardContent>
  </StatCard>
);

export default TechStatCard;
