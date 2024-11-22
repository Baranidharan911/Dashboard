import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, functions } from '../../firebase/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  arrayRemove
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import AdminChat from "./AdminToTechnicianChat";
import AdminCustomer from "./AdminCustomer";
import fileIcon from "../assets/file.png";

const AdminEnquiryDetails = () => {

  const { id: enquiryId } = useParams();
  const [enquiryData, setEnquiryData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [documentUrls, setDocumentUrls] = useState([]);
  const [error, setError] = useState(null);
  const [techniciansData, setTechniciansData] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [technicianResponse, setTechnicianResponse] = useState([]);
  const [currentTechnicianName, setCurrentTechnicianName] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignedTechnicianId, setAssignedTechnicianId] = useState("");
  const [selectedTechnicianIdForChat, setSelectedTechnicianIdForChat] = useState("");
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [chatHistory, setChatHistory] = useState([]);
  const [adminProblemDescription, setAdminProblemDescription] = useState("");
  const [paidStatus, setPaidStatus] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [paymentDetails,setPaymentDetails] = useState(false)
  const [totalEstimation,setTotalEstiation] = useState(0)
  const [workHours,setWorkHours] = useState("")
  const [totalPaid,setTotalPaid] = useState(0)
  const [enquiryStatus,setEnquiryStatus] = useState("")


  const navigate = useNavigate();


  const round = (num, decimalPlaces = 0) => {
    if (num < 0)
        return -round(-num, decimalPlaces);
    var p = Math.pow(10, decimalPlaces);
    var n = num * p;
    var f = n - Math.floor(n);
    var e = Number.EPSILON * n;
  
    // Determine whether this fraction is a midpoint value.
    return (f >= .5 - e) ? Math.ceil(n) / p : Math.floor(n) / p;
  }

  const fetchPaymentDetails = async (lastModifiedData,userId) => {
    let completedFlag = (lastModifiedData.status==="Completed")?true:false

    setEnquiryStatus(lastModifiedData.status)
    
    let totalEstimated = 0
    let totalWorkingHours = 0

    if(completedFlag){
      totalEstimated = lastModifiedData?.estimatedCost
      totalWorkingHours = lastModifiedData?.totalWorkingHours
    }else{
      let technicianResponse = query(collection(db, "technician_response"), where("enquiryId", "==", enquiryId),where("status","==","accepted"));
      let modifiedDocSnap = await getDocs(technicianResponse);
      if (!modifiedDocSnap.empty) {
        let techEstimation = modifiedDocSnap.docs[0].data();
        totalEstimated = techEstimation?.totalBillingCost
        totalWorkingHours = techEstimation?.approxTime
      }
    }

    const q = query(collection(db, "payments"), where("enquiry_id", "==", enquiryId),where("status","==","success"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {

      // console.log("payment_docs:",querySnapshot)

      let paidAmt = 0

      querySnapshot.forEach((payment)=>{
        let details = payment.data()
        paidAmt += Number(details.amount)
      })

      if(paidAmt>0){

        setTotalEstiation(round(Number(totalEstimated),2) || "N/A")
        setWorkHours(totalWorkingHours || "N/A")
        setTotalPaid(round(paidAmt,2) || "N/A")

        setPaymentDetails(true)
      }

    });

    return () => unsubscribe();
    
  }

  const fetchEnquiryData = async () => {
    if (!enquiryId) {
      setError("Invalid enquiry ID.");
      return;
    }

    try {
      const q = query(collection(db, "responses"), where("enquiryId", "==", enquiryId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const userDocRef = doc(db, "users", data.userId);
        const userDocSnap = await getDoc(userDocRef);

        setEnquiryData({ ...data, docId: docSnap.id });
        setUserData(userDocSnap.data());

        const modifiedDocRef = query(collection(db, "response_modified"), where("enquiryId", "==", enquiryId));
        const modifiedDocSnap = await getDocs(modifiedDocRef);
        if (!modifiedDocSnap.empty) {
          const lastModifiedData = modifiedDocSnap.docs[modifiedDocSnap.docs.length - 1].data();
          setCurrentTechnicianName(lastModifiedData.assignedTechnicianName || "");
          setAdminProblemDescription(lastModifiedData.problemDescription || "");
          const currentAttempt = lastModifiedData.AttemptField ? parseInt(lastModifiedData.AttemptField.match(/\d+/)[0]) : 1;
          setCurrentAttempt(currentAttempt);
          setAssignedTechnicianId(lastModifiedData.assignedTechnicianId || "");
          fetchPaymentDetails(lastModifiedData,data.userId)
        }
      } else {
        setError("No such document!");
      }
    } catch (err) {
      console.error("Error fetching enquiry data:", err);
      setError("Failed to fetch enquiry data.");
    }
  };

  const fetchTechnicians = async () => {
    const techQuery = query(collection(db, "technicians"));
    const techSnapshot = await getDocs(techQuery);
    const techData = techSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setTechniciansData(techData);
  };

  useEffect(() => {
    fetchEnquiryData();
    fetchTechnicians();
  }, [enquiryId]);

  useEffect(() => {
    if (!enquiryId) return;

    const techResponseQuery = query(
      collection(db, "technician_response"),
      where("enquiryId", "==", enquiryId)
    );

    const unsubscribe = onSnapshot(techResponseQuery, (snapshot) => {
      const responses = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const technicianDocRef = doc(db, "technicians", data.technicianId);
        return getDoc(technicianDocRef).then((technicianData) => {
          const technicianID = technicianData.exists() ? technicianData.data().technicianID : "N/A";
          const technicianName = technicianData.exists() ? technicianData.data().name : "N/A";

          return {
            id: docSnap.id,
            ...data,
            technicianID,
            technicianName,
            timeSlot: data.timeSlot || "N/A"
          };
        });
      });

      Promise.all(responses).then((resolvedResponses) => {
        setTechnicianResponse(resolvedResponses);
      });
    }, (error) => {
      console.error("Error fetching technician responses in real-time:", error);
    });

    return () => unsubscribe();
  }, [enquiryId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "chat", enquiryId), (docSnap) => {
      if (docSnap.exists()) {
        setChatHistory(docSnap.data().messages || []);
      }
    });

    return () => unsubscribe();
  }, [enquiryId]);

  useEffect(() => {
    technicianResponse.forEach((response) => {
      if (response.timeSlot && response.timeSlot !== "N/A") {
        const timeSlotDate = new Date(response.timeSlot);
        const reminderTime = new Date(timeSlotDate.getTime() - 5 * 60 * 1000);

        const now = new Date();
        const timeUntilReminder = reminderTime - now;

        if (timeUntilReminder > 0) {
          setTimeout(() => {
            alert(`Reminder: The time slot for enquiry ${enquiryId} is in 5 minutes!`);
          }, timeUntilReminder);
        }
      }
    });
  }, [technicianResponse]);

  const matchTechnicians = (fieldOfCategory) => {
    if (!fieldOfCategory) {
      return [];
    }
    return techniciansData.filter((tech) => tech.fieldOfCategory === fieldOfCategory);
  };

  const formatData = (sentToTechnician) => {
    const responses = enquiryData.responses || [];
    const contextMap = responses.reduce((map, response) => {
      map[response.context] = response.response;
      return map;
    }, {});

    return {
      enquiryId: enquiryData.enquiryId || "N/A",
      businessType: enquiryData.businessType || "N/A",
      requirement: contextMap["start"] || "N/A",
      leadTime: contextMap["new_project"] || contextMap["troubleshoot"] || "N/A",
      purpose: contextMap["purpose_new_project"] || contextMap["purpose_troubleshoot"] || "N/A",
      domain: contextMap["hardware_software_new_project"] || contextMap["hardware_software_troubleshoot"] || "N/A",
      fieldOfCategory:
        contextMap["field_of_category_new_project"] || contextMap["field_of_category_troubleshoot"] || "N/A",
      hardwareUsed:
        contextMap["hardwares_preference_new_project"] || contextMap["hardwares_used_troubleshoot"] || "N/A",
      softwareUsed:
        contextMap["software_used_new_project"] || contextMap["software_used_troubleshoot"] || "N/A",
      problemStatement:
        contextMap["problem_statement_new_project"] || contextMap["problem_statement_troubleshoot"] || "N/A",
      problemDescription: adminProblemDescription || "N/A",
      documentsFiles: documentUrls,
      status: "Pending",
      timestamp: enquiryData.timestamp || serverTimestamp(),
      sentToTechnician: sentToTechnician,
      assignedTechnicianId: selectedTechnician,
      assignedTechnicianName: sentToTechnician
        ? techniciansData.find((tech) => tech.id === selectedTechnician)?.name || ""
        : currentTechnicianName,
    };
  };

  const handleEnableChat = async () => {
    const chatDocRef = doc(db, "chat", enquiryId);
    try {
      const chatDocSnap = await getDoc(chatDocRef);
      if (chatDocSnap.exists()) {
        await updateDoc(chatDocRef, { chat_active: true });
      } else {
        await setDoc(chatDocRef, { chat_active: true, enquiryId: enquiryId, messages: [] });
      }
  
      const sendTechnicianEmail = httpsCallable(functions, 'sendTechnicianEmail');
      const technicianEmail = techniciansData.find((tech) => tech.id === assignedTechnicianId)?.email || "";
      if (technicianEmail) {
        await sendTechnicianEmail({
          to: technicianEmail,
          subject: "Customer Connected",
          text: "You are now connected with the customer. Please assist them with their enquiry."
        });
      }
  
      const sendUserEmail = httpsCallable(functions, 'sendTechnicianEmail');
      if (userData.email) {
        await sendUserEmail({
          to: userData.email,
          subject: "Technician Connected",
          text: "You are now connected with the technician. They will assist you with your enquiry."
        });
      }
  
      alert("Chat enabled and notification emails sent.");
    } catch (error) {
      console.error("Error enabling chat:", error);
      alert("Failed to enable chat.");
    }
  };
  
  const handleDisableChat = async () => {
    const chatDocRef = doc(db, "chat", enquiryId);
    try {
      const chatDocSnap = await getDoc(chatDocRef);
      if (chatDocSnap.exists()) {
        await updateDoc(chatDocRef, { chat_active: false });
      } else {
        await setDoc(chatDocRef, { chat_active: false, enquiryId: enquiryId, messages: [] });
      }
      alert("Chat disabled.");
    } catch (error) {
      console.error("Error disabling chat:", error);
      alert("Failed to disable chat.");
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    if (!enquiryData?.docId || !selectedTechnician) {
        alert("Please select a technical Engineer.");
        setIsSending(false);
        return;
    }

    try {
        const selectedTechName = techniciansData.find((tech) => tech.id === selectedTechnician)?.name || "";
        const selectedTechToken = techniciansData.find((tech) => tech.id === selectedTechnician)?.fcmToken || "";
        const selectedTechEmail = techniciansData.find((tech) => tech.id === selectedTechnician)?.email || "";

        const docId = enquiryId;
        const responseModifiedDocRef = doc(db, "response_modified", docId);
        const responseModifiedDocSnap = await getDoc(responseModifiedDocRef);

        let attemptNumber = 1;
        if (responseModifiedDocSnap.exists() && responseModifiedDocSnap.data().AttemptField) {
            const currentAttempt = responseModifiedDocSnap.data().AttemptField.match(/\d+/);
            attemptNumber = currentAttempt ? parseInt(currentAttempt[0], 10) + 1 : 1;
        }

        const formattedData = {
            ...formatData(true),
            status: "Pending",
            AttemptField: `Attempt ${attemptNumber}`
        };

        // Update or set the modified response document
        await setDoc(responseModifiedDocRef, formattedData, { merge: true });

        // Update technician's enquiries list
        const technicianDocRef = doc(db, "technicians", selectedTechnician);
        const technicianDocSnap = await getDoc(technicianDocRef);
        if (technicianDocSnap.exists()) {
            const technicianData = technicianDocSnap.data();
            const updatedEnquiries = [...(technicianData.enquiries || []), enquiryData.enquiryId];
            await setDoc(technicianDocRef, { ...technicianData, enquiries: updatedEnquiries }, { merge: true });
        } else {
            await setDoc(technicianDocRef, { enquiries: [enquiryData.enquiryId] }, { merge: true });
        }

        // Send notification only once
        if (selectedTechToken) {
            await sendNotification(selectedTechToken, enquiryData.enquiryId);
        }

        // Send email notification only once
        if (selectedTechEmail) {
            const sendTechnicianEmail = httpsCallable(functions, 'sendTechnicianEmail');
            await sendTechnicianEmail({
                to: selectedTechEmail,
                subject: "New Enquiry Assigned",
                text: `You have received a new enquiry: ${enquiryData.enquiryId}. Check it out.`
            });
        }

        // Log successful assignment
        setCurrentTechnicianName(selectedTechName);
        setCurrentAttempt(attemptNumber);
        setAssignedTechnicianId(selectedTechnician);
        alert("Enquiry sent to technical Engineer, notification sent, and email notification sent.");

    } catch (err) {
        console.error("Error sending data:", err);
        alert("Failed to send data.");
    } finally {
        setIsSending(false);
    }
};

  
  const handleAssign = async () => {
    setIsAssigning(true);
    if (!enquiryData?.docId || !selectedTechnician) {
      alert("Please select a technical Engineer.");
      setIsAssigning(false);
      return;
    }
  
    try {
      const selectedTechName = techniciansData.find((tech) => tech.id === selectedTechnician)?.name || "";
  
      const docId = enquiryId;
      const responseModifiedDocRef = doc(db, "response_modified", docId);
  
      const formattedData = {
        ...formatData(true),
        status: "In_process",
      };
  
      await setDoc(responseModifiedDocRef, formattedData, { merge: true });
  
      const responseDocRef = doc(db, "responses", enquiryId);
      await updateDoc(responseDocRef, { status: "inProcess" });
  
      setCurrentTechnicianName(selectedTechName);
      setAssignedTechnicianId(selectedTechnician);
  
      const sendAssignmentEmail = httpsCallable(functions, 'sendAssignmentEmail');
      await sendAssignmentEmail({ technicianId: selectedTechnician, enquiryId });
  
      alert("Enquiry assigned to technical Engineer, status updated to inprocess, and email notification sent.");
    } catch (err) {
      console.error("Error assigning enquiry:", err);
      alert("Failed to assign enquiry.");
    } finally {
      setIsAssigning(false);
    }
  };
  
  const handleCompleted = async () => {
    setIsCompleting(true);
    if (!enquiryData?.docId) {
      alert("Invalid enquiry ID.");
      setIsCompleting(false);
      return;
    }

    try {
      const docId = enquiryId;
      const responseModifiedDocRef = doc(db, "response_modified", docId);

      const formattedData = {
        ...formatData(false),
        status: "Completed",
      };

      await setDoc(responseModifiedDocRef, formattedData, { merge: true });

      const responseDocRef = doc(db, "responses", enquiryId);
      await updateDoc(responseDocRef, { status: "Completed" });

      alert("Enquiry status updated to completed.");
    } catch (err) {
      console.error("Error updating enquiry status:", err);
      alert("Failed to update enquiry status.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePay = async (technicianId, enquiryId, cost) => {
    try {
        const response = await fetch('http://localhost:3000/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: parseFloat(cost.replace("₹", "")),
                currency: 'INR',
                receipt: `receipt_${enquiryId}`
            }),
        });

        const orderData = await response.json();

        const options = {
            key: "rzp_live_O5AirT0bLUgu0B",  // Ensure this matches your server key_id
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Dial2tech",
            description: "Payment for service",
            order_id: orderData.id,
            handler: async function (response) {
                alert("Payment successful!");
                await updateTechnicianPayment(technicianId, enquiryId, cost);
            },
            prefill: {
                name: techniciansData.find((tech) => tech.id === technicianId)?.name || "",
                email: techniciansData.find((tech) => tech.id === technicianId)?.email || "",
                contact: techniciansData.find((tech) => tech.id === technicianId)?.phone || "",
            },
            notes: {
                enquiryId: enquiryId,
            },
            theme: {
                color: "#3399cc",
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();

        rzp.on("payment.failed", function (response) {
            alert(`Payment failed: ${response.error.description}`);
        });
    } catch (error) {
        console.error("Error processing payment:", error);
        alert("Failed to process payment.");
    }
};


  const sendNotification = async (token, enquiryId) => {
    if (!token) {
      alert("FCM token not found for the technician.");
      return;
    }

    const sendTechnicianNotification = httpsCallable(functions, 'sendTechnicianNotification');
    try {
      await sendTechnicianNotification({
        technicianId: selectedTechnician,
        enquiryId: enquiryId,
        message: `You have been assigned a new enquiry: ${enquiryId}`
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const renderChatMessages = () => {
    if (!chatHistory || !techniciansData) {
      return null;
    }

    return chatHistory.map((msg, index) => {
      const isTechnician = msg.senderId && techniciansData.some((tech) => tech.id === msg.senderId);
      const isCustomer = msg.senderId && msg.senderId.includes("@");

      return (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: isTechnician ? "flex-end" : "flex-start",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              background: isTechnician ? "#d1e7dd" : "#f8d7da",
              padding: "10px",
              borderRadius: "8px",
              maxWidth: "60%",
              position: "relative",
            }}
          >
            <strong>{isTechnician ? "Technical Engineer" : "Customer"}:</strong>
            <p>{msg.text}</p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  marginRight: "5px",
                }}
                onClick={() => {
                  const newText = prompt("Edit message:", msg.text);
                  if (newText) handleEditMessage(msg.timestamp.toMillis(), newText);
                }}
              >
                ✏️
              </button>
              <button
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onClick={() => handleDeleteMessage(msg.timestamp.toMillis())}
              >
                🗑️
              </button>
            </div>
            <p style={{ fontSize: "10px", textAlign: "right", margin: 0 }}>
              {new Date(msg.timestamp.toDate()).toLocaleString()}
            </p>
          </div>
        </div>
      );
    });
  };

  const renderTechnicianResponses = () => {
    return technicianResponse.length > 0 ? (
      <div style={styles.attemptsContainer}>
        {technicianResponse.map((response, index) => (
          <div key={response.id} style={styles.attempt}>
            <button
              style={styles.historyButton}
              onClick={() => {
                setSelectedTechnicianIdForChat(response.technicianId);
                setCurrentAttempt(index + 1);
              }}
            >
              Attempt {index + 1}: {response.technicianID}
            </button>
            {index === technicianResponse.length - 1 && (
              <button
                style={styles.paidButton}
                onClick={() => handlePay(response.technicianId, enquiryId, response.estimatedCost)}
              >
                {paidStatus[enquiryId] ? 'Paid' : 'Pay'}
              </button>
            )}
            <p><strong>Approximate Solve Time:</strong> {response.approxTime}</p>
            <p><strong>Budget per Hour:</strong> ₹{response.budgetPerHour}</p>
            <p><strong>Estimated Cost:</strong> {response.estimatedCost}</p>
            <p><strong>Total Billing Cost:</strong> ₹{response.estimatedCost ? (parseFloat(response.estimatedCost.replace("₹", "")) * 1.3).toFixed(2) : "N/A"}</p>
            <p><strong>Time Slot:</strong> {response.timeSlot}</p>
            {response.technicianName && (
              <p><strong>Assigned Technical Engineer:</strong> {response.technicianName}</p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p>{currentTechnicianName ? `Assigned to ${currentTechnicianName}` : "No technical Engineer response available."}</p>
    );
  };

  if (error) {
    return (
      <div style={styles.container}>
        <p style={styles.error}>{error}</p>
        <button style={styles.button} onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  if (!enquiryData || !userData) return <div>Loading...</div>;

  const domain =
    enquiryData.responses?.find((response) =>
      response.context.includes("hardware_software_new_project") ||
      response.context.includes("hardware_software_troubleshoot")
    )?.response || "N/A";

  const handleViewClick = () => {
    setModalContent(documentUrls);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent([]);
  };

  const renderModalContent = () => {
    if (!modalContent) return null;

    const getMimeType = (fileExtension) => {
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        bmp: 'image/bmp',
        tiff: 'image/tiff',
        mp4: 'video/mp4',
        webm: 'video/webm',
        ogg: 'audio/ogg',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        wmv: 'video/x-ms-wmv',
        flv: 'video/x-flv',
        mkv: 'video/x-matroska',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        flac: 'audio/flac',
        pdf: 'application/pdf',
      };
      return mimeTypes[fileExtension] || '';
    };

    return modalContent.map((file, index) => {
      const fileExtension = file.split('.').pop().split('?')[0].toLowerCase();
      const mimeType = getMimeType(fileExtension);

      if (mimeType.startsWith('image/')) {
        return (
          <div key={index} style={styles.modalDocumentContainer}>
            <img src={file} alt={`file-${index}`} style={{ maxWidth: '100%', maxHeight: '80vh', marginBottom: '10px' }} />
            <button onClick={() => handleDeleteDocument(index)} style={styles.deleteButton}>Delete</button>
          </div>
        );
      } else if (mimeType.startsWith('video/')) {
        return (
          <div key={index} style={styles.modalDocumentContainer}>
            <video controls src={file} style={{ maxWidth: '100%', maxHeight: '80vh', marginBottom: '10px' }} />
            <button onClick={() => handleDeleteDocument(index)} style={styles.deleteButton}>Delete</button>
          </div>
        );
      } else if (mimeType.startsWith('audio/')) {
        return (
          <div key={index} style={styles.modalDocumentContainer}>
            <audio controls style={{ width: '100%', marginBottom: '10px' }}>
              <source src={file} type={mimeType} />
              Your browser does not support the audio element.
            </audio>
            <button onClick={() => handleDeleteDocument(index)} style={styles.deleteButton}>Delete</button>
          </div>
        );
      } else if (mimeType === 'application/pdf') {
        return (
          <div key={index} style={styles.modalDocumentContainer}>
            <iframe src={file} style={{ width: '100%', height: '80vh', marginBottom: '10px' }} title={`file-${index}`} />
            <button onClick={() => handleDeleteDocument(index)} style={styles.deleteButton}>Delete</button>
          </div>
        );
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <div style={styles.column}>
          <h2 style={styles.heading}>USER DETAILS</h2>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td>Username</td>
                <td>{userData.username}</td>
              </tr>
              <tr>
                <td>Email</td>
                <td>{userData.email}</td>
              </tr>
              <tr>
                <td>Phone</td>
                <td>{userData.phone}</td>
              </tr>
              <tr>
                <td>City</td>
                <td>{userData.city}</td>
              </tr>
              <tr>
                <td>Business Type</td>
                <td>{userData.type}</td>
              </tr>
              <tr>
                <td>Profession</td>
                <td>{userData.profession}</td>
              </tr>
              {
                paymentDetails?(
                  <>
                    <tr>
                      <td>Work Hours</td>
                      <td>{workHours}</td>
                    </tr>
                    <tr>
                      <td>Total Bill</td>
                      <td>{totalEstimation}</td>
                    </tr>
                    <tr>
                      <td>Amount Paid</td>
                      <td>{totalPaid}</td>
                    </tr>
                    <tr>
                      <td>Amount Pending</td>
                      <td>{round((totalEstimation - totalPaid),2) || "N/A"}</td>
                    </tr>
                  </>
                ):<></>
              }
            </tbody>
          </table>
        </div>
        <div style={styles.column}>
          <h2 style={styles.heading}>USER RESPONSE</h2>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td>Enquiry ID</td>
                <td>{enquiryData.enquiryId}</td>
              </tr>
              <tr>
                <td>Business Type</td>
                <td>{enquiryData.businessType || "N/A"}</td>
              </tr>
              <tr>
                <td>Requirement</td>
                <td>{enquiryData.responses?.find((response) => response.context === "start")?.response || "N/A"}</td>
              </tr>
              <tr>
                <td>Lead Time</td>
                <td>
                  {enquiryData.responses?.find((response) =>
                    response.context.includes("new_project") || response.context.includes("troubleshoot")
                  )?.response || "N/A"}
                </td>
              </tr>
              <tr>
                <td>Purpose</td>
                <td>
                  {enquiryData.responses?.find((response) =>
                    response.context.includes("purpose_new_project") || response.context.includes("purpose_troubleshoot")
                  )?.response || "N/A"}
                </td>
              </tr>
              <tr>
                <td>Domain</td>
                <td>{domain}</td>
              </tr>
              {domain.toLowerCase() !== "software" && (
                <>
                  <tr>
                    <td>Field of Category</td>
                    <td>
                      {enquiryData.responses?.find((response) =>
                        response.context.includes("field_of_category_new_project") ||
                        response.context.includes("field_of_category_troubleshoot")
                      )?.response || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td>Hardware Used</td>
                    <td>
                      {enquiryData.responses?.find((response) =>
                        response.context.includes("hardwares_preference_new_project") ||
                        response.context.includes("hardwares_used_troubleshoot")
                      )?.response || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td>Software Used</td>
                    <td>
                      {enquiryData.responses?.find((response) =>
                        response.context.includes("software_used_new_project") ||
                        response.context.includes("software_used_troubleshoot")
                      )?. response || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td>Problem Statement</td>
                    <td>
                      {enquiryData.responses?.find((response) =>
                        response.context.includes("problem_statement_new_project") ||
                        response.context.includes("problem_statement_troubleshoot")
                      )?.response || "N/A"}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td>Problem Description</td>
                <td>{problemDescription || "N/A"}</td>
              </tr>
              <tr>
                <td>Files</td>
                <td>
                  {documentUrls.length > 0 ? (
                    <img 
                      src={fileIcon} 
                      alt="View Documents"
                      style={{ cursor: 'pointer', width: '30px', height: '30px' }}
                      onClick={handleViewClick}
                    />
                  ) : (
                    "N/A"
                  )}
                </td>
              </tr>
              <tr>
                <td>Enquiry Status</td>
                <td>{enquiryStatus}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={styles.column}>
          <h2 style={styles.heading}>ADMIN MODIFIED RESPONSE</h2>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td>Enquiry ID</td>
                <td>{enquiryData.enquiryId}</td>
              </tr>
              <tr>
                <td>Business Type</td>
                <td>{enquiryData.businessType || "N/A"}</td>
              </tr>
              <tr>
                <td>Requirement</td>
                <td>{enquiryData.responses?.find((response) => response.context === "start")?.response || "N/A"}</td>
              </tr>
              <tr>
                <td>Lead Time</td>
                <td>
                  {enquiryData.responses?.find((response) =>
                    response.context.includes("new_project") || response.context.includes("troubleshoot")
                  )?.response || "N/A"}
                </td>
              </tr>
              <tr>
                <td>Purpose</td>
                <td>
                  {enquiryData.responses?.find((response) =>
                    response.context.includes("purpose_new_project") || response.context.includes("purpose_troubleshoot")
                  )?.response || "N/A"}
                </td>
              </tr>
              <tr>
                <td>Domain</td>
                <td>{domain}</td>
              </tr>
              {domain.toLowerCase() !== "software" && (
                <>
                  <tr>
                    <td>Field of Category</td>
                    <td>
                      {enquiryData.responses?.find((response) =>
                        response.context.includes("field_of_category_new_project") ||
                        response.context.includes("field_of_category_troubleshoot")
                      )?.response || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td>Hardware Used</td>
                    <td>
                      {enquiryData.responses?.find((response) =>
                        response.context.includes("hardwares_preference_new_project") ||
                        response.context.includes("hardwares_used_troubleshoot")
                      )?.response || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td>Software Used</td>
                    <td>
                      {enquiryData.responses?.find((response) =>
                        response.context.includes("software_used_new_project") ||
                        response.context.includes("software_used_troubleshoot")
                      )?. response || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td>Problem Statement</td>
                    <td>
                      {enquiryData.responses?.find((response) =>
                        response.context.includes("problem_statement_new_project") ||
                        response.context.includes("problem_statement_troubleshoot")
                      )?.response || "N/A"}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td>Problem Description</td>
                <td>
                  <textarea
                    value={adminProblemDescription}
                    onChange={(e) => setAdminProblemDescription(e.target.value)}
                    style={styles.textarea}
                  />
                </td>
              </tr>
              <tr>
                <td>Files</td>
                <td>
                  {documentUrls.length > 0 ? (
                    <img 
                      src={fileIcon} 
                      alt="View Documents"
                      style={{ cursor: 'pointer', width: '30px', height: '30px' }}
                      onClick={handleViewClick}
                    />
                  ) : (
                    "N/A"
                  )}
                </td>
              </tr>
              <tr>
                <td>Assign to Technical Engineer</td>
                <td>
                  {selectedTechnician ? (
                    <button
                      className="techButton"
                      onClick={() => setSelectedTechnician("")}
                      style={styles.selectedTechButton}
                    >
                      {techniciansData.find((tech) => tech.id === selectedTechnician)?.name}
                    </button>
                  ) : (
                    <select
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                      style={styles.select}
                    >
                      <option value="">Select Technical Engineer</option>
                      {matchTechnicians(
                        enquiryData.responses?.find((response) =>
                          response.context.includes("field_of_category_new_project") ||
                          response.context.includes("field_of_category_troubleshoot")
                        )?.response || "N/A"
                      ).map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={styles.buttonGroup}>
            <button
              onClick={handleSend}
              style={{
                ...styles.sendButton,
                backgroundColor: isSending ? "#ccc" : "#007bff",
                cursor: isSending ? "not-allowed" : "pointer",
              }}
              disabled={isSending}
            >
              {isSending ? "Sending..." : "Quote"}
            </button>
            <button
              onClick={handleAssign}
              style={{
                ...styles.assignButton,
                backgroundColor: isAssigning ? "#ccc" : "#28a745",
                cursor: isAssigning ? "not-allowed" : "pointer",
              }}
              disabled={isAssigning}
            >
              {isAssigning ? "Assigning..." : "Assign"}
            </button>
            <button
              onClick={handleCompleted}
              style={{
                ...styles.completedButton,
                backgroundColor: isCompleting ? "#ccc" : "#ffc107",
                cursor: isCompleting ? "not-allowed" : "pointer",
              }}
              disabled={isCompleting}
            >
              {isCompleting ? "Completing..." : "Completed"}
            </button>
            <button
              onClick={()=>{navigate("/dashboard/enquiry")}}
              style={{
                ...styles.cancelButton,
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.column}>
          <h2 style={styles.heading}>TECHNICAL</h2>
          <div style={styles.chatContainer}>
            <AdminChat
              attempt={`Attempt ${currentAttempt}`}
              enquiryId={enquiryId}
              chatType="admin_to_technician"
              userRole="admin"
              technicianId={assignedTechnicianId}
            />
          </div>
        </div>
        <div style={styles.column}>
          <h2 style={styles.heading}>CUSTOMER</h2>
          <div style={styles.chatContainer}>
            <AdminCustomer
              enquiryId={enquiryId}
              chatType="admin_to_customer"
              userRole="admin"
              queryStatus={enquiryStatus}
              userId={enquiryData.userId}
            />
          </div>
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.column}>
          <h2 style={styles.heading}>TECHNICAL RESPONSE</h2>
          <div style={styles.content}>
            {renderTechnicianResponses()}
          </div>
        </div>
        <div style={styles.column}>
          <div style={styles.historyHeader}>
            <h2 style={styles.heading}>TECHNICAL HISTORY</h2>
            <button onClick={handleEnableChat} style={styles.enableButton}>Enable Chat</button>
            <button onClick={handleDisableChat} style={styles.disableButton}>Disable Chat</button>
          </div>
          <div style={styles.chatContainer}>
            {renderChatMessages()}
          </div>
        </div>
      </div>
      {assignmentMessage && <p style={styles.assignmentMessage}>{assignmentMessage}</p>}
      {isModalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <button style={styles.closeButton} onClick={closeModal}>Close</button>
            <div>
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "white",
    overflowY: "auto",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "5px",
  },
  column: {
    flex: 1,
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  heading: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  textarea: {
    width: "100%",
    height: "100px",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  select: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    marginTop: "5px",
  },
  assignmentMessage: {
    marginTop: "10px",
    color: "green",
    fontWeight: "bold",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "row",
    marginTop: "10px",
  },
  sendButton: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "10px",
  },
  assignButton: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "10px",
    marginLeft: "10px",
  },
  cancelButton: {
    padding: "10px 20px",
    backgroundColor: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "10px",
    marginLeft: "10px",
  },
  completedButton: {
    padding: "10px 20px",
    backgroundColor: "#ffc107",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "10px",
    marginLeft: "10px",
  },
  historyButton: {
    padding: "10px",
    backgroundColor: "green",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginBottom: "10px",
  },
  paidButton: {
    padding: "10px",
    backgroundColor: "green",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginBottom: "10px",
    marginLeft: "10px",
  },
  attemptsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "10px",
  },
  attempt: {
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#fff",
  },
  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  enableButton: {
    padding: "5px 10px",
    backgroundColor: "blue",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  disableButton: {
    padding: "5px 10px",
    backgroundColor: "red",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginLeft: "5px",
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '4px',
    width: '80%',
    maxWidth: '600px',
    maxHeight: '80%',
    overflowY: 'auto',
  },
  closeButton: {
    marginBottom: '10px',
    padding: '5px 10px',
    backgroundColor: 'red',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    marginLeft: '10px',
    padding: '5px 10px',
    backgroundColor: 'red',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  modalDocumentContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '10px',
  },
  selectedTechButton: {
    backgroundColor: "#f0f0f0",
    color: "#333",
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "10px",
    cursor: "pointer",
  },
};

export default AdminEnquiryDetails;
