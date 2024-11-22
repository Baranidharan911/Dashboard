// src/context/EnquiryContext.js
import React, { createContext, useContext, useState } from 'react';

const EnquiryContext = createContext();

export const useEnquiry = () => {
  return useContext(EnquiryContext);
};

export const EnquiryProvider = ({ children }) => {
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    outstandingCount: 0,
    inProcessCount: 0,
    completedCount: 0,
    droppedCount: 0,
  });

  return (
    <EnquiryContext.Provider value={{ stats, setStats }}>
      {children}
    </EnquiryContext.Provider>
  );
};
