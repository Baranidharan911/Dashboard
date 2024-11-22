import React, { useEffect, useState } from "react";
import { db, functions } from '../../firebase/firebase'; 
import { doc, getDoc, onSnapshot, updateDoc, setDoc, arrayUnion, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

const AdminCustomer = ({ enquiryId, userRole, userId, queryStatus }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [inputType, setInputType] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [userData, setUserData] = useState(null);
  const [approximateSolveTime, setApproximateSolveTime] = useState("");
  const [totalBillingCost, setTotalBillingCost] = useState(0);
  const [pendingAmt, setPendingAmt] = useState(0);

  useEffect(() => {
    if (!enquiryId) return;

    const chatDocRef = doc(db, "DASHBOARD_CHAT", enquiryId);

    const unsubscribe = onSnapshot(chatDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const chatData = docSnapshot.data();
        const adminMessages = chatData["admin_to_customer"] || [];
        const customerMessages = chatData["customer_to_admin"] || [];
        const allMessages = [...adminMessages, ...customerMessages];
        const mergedMessages = allMessages.sort((a, b) => new Date(a.timestamp.seconds * 1000) - new Date(b.timestamp.seconds * 1000));
        setMessages(mergedMessages);
      }
    });

    const fetchUserData = async () => {
      try {
        if (userId) {
          const userDocRef = doc(db, "users", userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserData(userData);
            console.log(`Fetched user data: ${userData.username}`);
          } else {
            console.error("No such document in users collection!");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
    return () => unsubscribe();
  }, [enquiryId, userId]);

  const sendPushNotification = async (userId, message, url, route, action, amount=0) => {
    try {
      if (!userId) {
        console.error("Invalid userId");
        return;
      }

      console.log(`Sending push notification to userId: ${userId}`);

      const sendNotificationFunction = httpsCallable(functions, 'sendNotification');
      const response = await sendNotificationFunction({ userId, message, url, route, action });
      console.log("HttpResponse:",response)
      if (response.data && response.data.error) {
        console.error("Error sending push notification:", response.data.error);
      } else {
        console.log("Notification sent successfully:", response.data);
        const notificationData = {
          userId,
          message: `New message from Admin: ${message}`,
          status: 'unread',
          timestamp: new Date(),
          enquiryId,
          userType: 'Admin',
          display: true,
          advanceAmount:amount,
        };

        if (url) {
          notificationData.url = url;
        } else if (route) {
          notificationData.route = route;
        }
        if (action) {
          notificationData.action = action;
        }

        await addDoc(collection(db, 'notifications'), notificationData);

        console.log("Notification stored in Firestore.");
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  };

  const sendEmail = async (email, subject, text) => {
    try {
      const sendEmailFunction = httpsCallable(functions, 'sendTechnicianEmail');
      const response = await sendEmailFunction({ to: email, subject, text });

      if (response.data.success) {
        console.log("Email sent successfully");
      } else {
        console.error("Error sending email:", response.data.error);
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  const sendMessage = async (message, includeButtons = false, templateType = "") => {
    if (message.trim() === "") return;

    if(templateType === "template2" && queryStatus!=="Completed"){
      alert("This template cannot be sent until the enquiry is completed")
      return
    }

    let buttons = [];
    if (includeButtons) {
        buttons = [
            { type: "pay", label: "PAY", action: "PAY_ACTION" }
        ];

        
        if (templateType === "template1") {
            buttons.push(
                { type: "schedule", label: "SCHEDULE MEETING", action: "SCHEDULE_ACTION" },
                { type: "chat", label: "CHAT WITH OUR ADMIN", action: "CHAT_ACTION" }
            );
        } else if (templateType === "template2") {
            buttons.push(
                { type: "close", label: "CONFIRM AND CLOSE", action: "CLOSE_ENQUIRY_ACTION" }
            );
        }
    }

    const messageData = {
        text: message,
        timestamp: new Date(),
        sender: userRole,
        buttons: buttons,
    };

    const chatDocRef = doc(db, "DASHBOARD_CHAT", enquiryId);

    try {
        const chatDocSnap = await getDoc(chatDocRef);

        if (!chatDocSnap.exists()) {
            const initialData = {
                admin_to_technician: [],
                technician_to_admin: [],
                admin_to_customer: [messageData],
                customer_to_admin: [],
            };
            await setDoc(chatDocRef, initialData);
        } else {
            await updateDoc(chatDocRef, {
                admin_to_customer: arrayUnion(messageData)
            });
        }

        setNewMessage("");
        setInputValue("");
        setInputType("");

        if(templateType === "template1" || templateType === "template4"){
          await sendPushNotification(userId, message,null,null,null,Number(totalBillingCost)/2);
        }else if(templateType === "template2"){

          const modifiedDocRef = query(collection(db, "response_modified"), where("enquiryId", "==", enquiryId));
          const modifiedDocSnap = await getDocs(modifiedDocRef);

          let totalEstimated = 0
          let lastModifiedData = null
          
          if (!modifiedDocSnap.empty) {
            lastModifiedData = modifiedDocSnap.docs[modifiedDocSnap.docs.length - 1].data();
            totalEstimated = lastModifiedData?.estimatedCost
          }

          const q = query(collection(db, "payments"), where("enquiry_id", "==", enquiryId),where("status","==","success"));
          const querySnapshot = await getDocs(q);    
          let paidAmt = 0
    
          querySnapshot.docs.forEach((payment)=>{
            let details = payment.data()
            paidAmt += Number(details.amount)
          })
          let balanceAmt = Number(totalEstimated) - paidAmt
          console.log("Total Bill",Number(totalEstimated))
          console.log("totalPaid:",paidAmt)
          console.log("Balance_Amount:",balanceAmt)
          await sendPushNotification(userId, message,null,null,null,Number(balanceAmt));
        }else{
          await sendPushNotification(userId, message)
        }
        

        // Handle email sending based on template
        if (userData && userData.email) {
            let emailSubject = "";
            let emailText = "";

            if (templateType === "template1") {
                emailSubject = "Best Offer for Your Enquiry";
                emailText = `We have validated your enquiry with Technical Experts. Best offer of estimated time and cost as mentioned below,
                Estimated time to solve your problem - ${approximateSolveTime} 
                Estimated cost to solve your Problem - ₹${totalBillingCost} 

                If you're okay with the time and budget.
                Please pay 50% of total amount to schedule the meeting with our technical expert.`;
            } else if (templateType === "template2") {
                emailSubject = "New Message from Admin";
                emailText = `We hope your project got completed successfully. Please confirm to close the enquiry and make the remaining payment.`;
            } else if (templateType === "template3") {
                emailSubject = "Update on Your Enquiry";
                emailText = `We tried our best. We are not able to support this requirement. We will try to support you next time.
                Please subscribe and follow our social media channels to keep you updated with technology.`;
            }

            if (emailSubject && emailText) {
                await sendEmail(userData.email, emailSubject, emailText);
            }
        }

    } catch (error) {
        console.error("Error sending message: ", error);
        alert("Failed to send message.");
    }
};

const handleTemplateSelect = async (template) => {
    if (!enquiryId) return; 

    let approximateSolveTime = "";
    let totalBillingCost = "";

    try {
        const techResponseQuery = query(
            collection(db, "technician_response"),
            where("enquiryId", "==", enquiryId)
        );

        const querySnapshot = await getDocs(techResponseQuery);

        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const techResponseData = doc.data();
                approximateSolveTime = techResponseData["approxTime"] || "N/A";
                totalBillingCost = techResponseData["totalBillingCost"] || "N/A";
            });

            setApproximateSolveTime(approximateSolveTime);
            setTotalBillingCost(totalBillingCost);
        } else {
            console.error("No document matches the provided enquiryId in technician_response collection!");
        }
    } catch (error) {
        console.error("Error fetching technician response:", error);
    }

    let selectedTemplate = "";
    if (template === "template1") {
        selectedTemplate = `We have validated your enquiry with Technical Experts. Best offer of estimated time and cost as mentioned below,
        Estimated time to solve your problem - ${approximateSolveTime} 
        Estimated cost to solve your Problem - ₹${totalBillingCost} 

        If you're okay with the time and budget.
        Please pay 50% of total amount to schedule the meeting with our technical expert 
             <PAY>
             <SCHEDULE MEETING> 
             
        If you are not okay and looking for any other support: 
               <CHAT WITH OUR ADMIN>`;
    } else if (template === "template2") {
        selectedTemplate = `We hope your project got completed successfully. Please confirm to close the enquiry and make the remaining payment.
             <PAY>`;
    } else if (template === "template3") {
        selectedTemplate = `We tried our best. We are not able to support for this requirement. We will try to support you next time.
        Please subscribe and follow our social media channels to keep you updated with technology.`;
    } else if (template === "template4") {
        selectedTemplate = `We have validated your enquiry with Technical Experts. Best offer of estimated time and cost as mentioned below,
        Estimated time to solve your problem - ${approximateSolveTime} 
        Estimated cost to solve your Problem - ₹${totalBillingCost} 

        If you're okay with the time and budget.
        Please pay 50% of total amount to schedule the meeting with our technical expert in the Dial2Tech app`;
    }
    setNewMessage(selectedTemplate);
    setInputType(template);
};


  const handleInputTypeChange = (e) => {
    const selectedValue = e.target.value;
    setInputType(selectedValue);
    setInputValue("");
    if (selectedValue.startsWith('template')) {
      handleTemplateSelect(selectedValue);
    }
  };

  const handleButtonAction = (action) => {
    switch (action) {
      case "PAY_ACTION":
        console.log("Pay action triggered");
        break;
      case "SCHEDULE_ACTION":
        console.log("Schedule Meeting action triggered");
        break;
      case "CHAT_ACTION":
        console.log("Chat with Admin action triggered");
        break;
      default:
        break;
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.messagesContainer}>
        {messages.map((msg, index) => {
          const timestamp = msg.timestamp.seconds ? new Date(msg.timestamp.seconds * 1000) : new Date(msg.timestamp);
          return (
            <div
              key={index}
              style={{
                ...styles.message,
                ...(msg.sender === userRole ? styles.sentMessage : styles.receivedMessage),
              }}
            >
              <p>{msg.text}</p>
              {msg.url && <a href={msg.url} target="_blank" rel="noopener noreferrer">{msg.url}</a>}
              {msg.route && <span>{msg.route}</span>}
              {msg.buttons && msg.buttons.map((button, btnIndex) => (
                <button
                  key={btnIndex}
                  onClick={() => handleButtonAction(button.action)}
                  style={styles.button}
                >
                  {button.label}
                </button>
              ))}
              <small>{timestamp.toLocaleString()}</small>
            </div>
          );
        })}
      </div>
      <div style={styles.inputContainer}>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
          style={styles.input}
          rows="4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(newMessage, inputType === "template", inputType);
            }
          }}
        />
        <select value={inputType} onChange={handleInputTypeChange} style={styles.select}>
          <option value="">Select Type</option>
          <option value="url">URL</option>
          <option value="route">Route</option>
          <option value="template1">Template 1</option>
          <option value="template2">Template 2</option>
          <option value="template3">Template 3</option>
          <option value="template4">Template 4</option>
        </select>
        {inputType && inputType !== "template" && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Type a ${inputType}`}
            style={styles.input}
          />
        )}
        <button onClick={() => sendMessage(newMessage, inputType === "template", inputType)} style={styles.sendButton}>Send</button>
      </div>
    </div>
  );
};

const styles = {
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '300px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    overflowY: 'scroll',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'scroll',
    padding: '10px',
  },
  message: {
    maxWidth: '70%',
    padding: '10px',
    margin: '5px 0',
    borderRadius: '8px',
    wordBreak: 'break-word',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e1f5fe',
    marginLeft: 'auto',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f1f1',
    marginRight: 'auto',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    marginTop: '10px',
  },
  select: {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    marginTop: '10px',
    marginLeft: '10px',
  },
  sendButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
    marginLeft: '10px',
  },
  button: {
    marginTop: '10px',
    marginRight: '5px',
    padding: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default AdminCustomer;
