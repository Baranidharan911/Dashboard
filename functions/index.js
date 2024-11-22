const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp(); // No need to pass serviceAccount or other credentials

// Configure Nodemailer with your email service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'techwizapp@gmail.com', // Replace with your email
    pass: 'tiwu oewi xnzp cftz', // Replace with your app-specific password
  },
});

// Function to send notifications to a user
exports.sendNotification = functions.https.onCall(async (data) => {
  const { userId, message, url, route, action, templateType } = data;

  try {
    // Fetch the user's FCM token(s) from Firestore
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const fcmTokens = userDoc.data()?.fcmToken;

    if (!fcmTokens || fcmTokens.length === 0) {
      throw new Error("User has no FCM tokens");
    }

    // Create the notification payload
    const payload = {
      notification: {
        title: "New Message",
        body: message,
        sound: "default",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        message,
        url: url || '',
        route: route || '',
      },
    };

    if (action) {
      payload.data.action = action;
    }

    // Send the notification to the user's device(s)
    await admin.messaging().sendToDevice(fcmTokens, payload);

    // Store the notification in Firestore
    await admin.firestore().collection('notifications').add({
      userId,
      message,
      url,
      route,
      action: action || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'unread'
    });

    // Check the templateType to determine email sending logic
    const userEmail = userDoc.data().email;
    if (templateType === 'template1' && userEmail) {
      const template4Message = `We have validated your enquiry with Technical Experts. Best offer of estimated time and cost as mentioned below,
Estimated time to solve your problem sent in app 
Estimated cost to solve your Problem sent in app

If you're okay with the time and budget.
Please pay 50% of total amount to schedule the meeting with our technical expert in the Dial2Tech app.`;

      const mailOptions = {
        from: 'techwizapp@gmail.com',
        to: userEmail,
        subject: 'Best Offer for Your Enquiry',
        text: template4Message,
      };

      await transporter.sendMail(mailOptions);
    } else if ((templateType === 'template2' || templateType === 'template3') && userEmail) {
      const mailOptions = {
        from: 'techwizapp@gmail.com',
        to: userEmail,
        subject: 'You have a new message from Admin',
        text: message,
      };

      await transporter.sendMail(mailOptions);
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending notification or email:", error);
    return { success: false, error: error.message };
  }
});

// Function to send a welcome email when a technician is created
exports.sendWelcomeEmail = functions.firestore.document('technicians/{userId}')
  .onCreate((snap) => {
    const user = snap.data();

    const mailOptions = {
      from: 'techwizapp@gmail.com',
      to: user.email,
      subject: 'Welcome to Our Service',
      html: `<h1>Welcome, ${user.name}!</h1>
            <p>Thank you for registering in Dial2Tech. We are excited to have you on board.</p>
            <p>Best regards,<br />The Team</p>`
    };

    return transporter.sendMail(mailOptions)
      .then(info => console.log('Email sent:', info.response))
      .catch(error => console.error('Error sending email:', error.toString()));
  });

// Function to store file URLs in Firestore
exports.storeFileUrl = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;

  if (!filePath.startsWith("adPosters/")) {
    console.log("File is not in the 'adPosters' folder.");
    return null;
  }

  const bucket = admin.storage().bucket(object.bucket);
  const file = bucket.file(filePath);

  try {
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });

    const adCollectionRef = admin.firestore().collection("ad");

    await adCollectionRef.add({ url });
  } catch (error) {
    console.error("Error generating URL or storing in Firestore:", error);
  }

  return null;
});

// Function to send notifications from technician to admin
exports.sendTechnicianToAdminNotification = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { technicianId, enquiryId, message } = req.body;

    try {
      // Fetch the technician's name from Firestore
      const technicianDoc = await admin.firestore().collection("technicians").doc(technicianId).get();
      if (!technicianDoc.exists()) {
        throw new Error("Technician document does not exist!");
      }
      const technicianName = technicianDoc.data().name;

      // Fetch the admin's FCM tokens from Firestore
      const adminDoc = await admin.firestore().collection("users").doc("admin").get();
      if (!adminDoc.exists()) {
        throw new Error("Admin document does not exist!");
      }
      const fcmTokens = adminDoc.data()?.fcmTokens;

      if (!fcmTokens || fcmTokens.length === 0) {
        throw new Error("Admin has no FCM tokens");
      }

      const payload = {
        notification: {
          title: "New Message from Technician",
          body: `Technician ${technicianName} sent a message for Enquiry ID: ${enquiryId}`,
          sound: "default",
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          enquiryId,
          message,
        },
      };

      await admin.messaging().sendToDevice(fcmTokens, payload);

      await admin.firestore().collection("notifications").add({
        userType: "admin",
        message: `Technician ${technicianName} sent a message for Enquiry ID: ${enquiryId}`,
        enquiryId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "unread"
      });

      return res.status(200).send({ success: true });
    } catch (error) {
      console.error("Error sending notification:", error);
      return res.status(500).send({ success: false, error: error.message });
    }
  });
});

// Function to send notification to technician
exports.sendTechnicianNotification = functions.https.onCall(async (data) => {
  const { technicianId, enquiryId, message } = data;

  try {
    // Fetch the technician's FCM token from Firestore
    const technicianDoc = await admin.firestore().collection("technicians").doc(technicianId).get();
    const fcmToken = technicianDoc.data()?.fcmToken;

    if (!fcmToken) {
      throw new Error("Technician has no FCM token");
    }

    const payload = {
      notification: {
        title: "New Enquiry",
        body: message,
        sound: "default",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        enquiryId,
        message,
      },
    };

    await admin.messaging().sendToDevice(fcmToken, payload);

    await admin.firestore().collection("notifications").add({
      userType: "technician",
      technicianId,
      message: `New Enquiry ${enquiryId}`,
      enquiryId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "unread"
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error: error.message };
  }
});

// Function to send completion notification to admin
exports.sendCompletionNotificationToAdmin = functions.https.onCall(async (data) => {
  const { technicianName, enquiryId } = data;

  try {
    const adminDoc = await admin.firestore().collection("users").doc("admin").get();

    if (!adminDoc.exists()) {
      throw new Error("Admin document does not exist!");
    }

    const fcmTokens = adminDoc.data()?.fcmTokens;

    if (!fcmTokens || fcmTokens.length === 0) {
      throw new Error("Admin has no FCM tokens");
    }

    const payload = {
      notification: {
        title: "Enquiry Completed",
        body: `Message from ${technicianName}: completed enquiry ${enquiryId}`,
        sound: "default",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        enquiryId,
        technicianName,
      },
    };

    // Send notification to admin
    await admin.messaging().sendToDevice(fcmTokens, payload);

    // Store notification in Firestore for admin
    await admin.firestore().collection("notifications").add({
      userType: "admin",
      message: `Message from ${technicianName}: completed enquiry ${enquiryId}`,
      enquiryId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "unread"
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending completion notification:', error);
    return { success: false, error: error.message };
  }
});

// Function to send accept/reject notification to admin
exports.sendAcceptRejectNotificationToAdmin = functions.https.onCall(async (data) => {
  const { technicianId, enquiryId, action } = data;

  try {
    // Fetch the technician's document
    const technicianDoc = await admin.firestore().collection("technicians").doc(technicianId).get();
    if (!technicianDoc.exists()) {
      throw new Error("Technician document does not exist!");
    }
    const technicianName = technicianDoc.data().name;

    // Fetch the admin's document to get FCM tokens
    const adminDoc = await admin.firestore().collection("users").doc("admin").get();
    if (!adminDoc.exists) {
      throw new Error("Admin document does not exist!");
    }
    const fcmTokens = adminDoc.data().fcmTokens;

    if (!fcmTokens || fcmTokens.length === 0) {
      throw new Error("Admin has no FCM tokens");
    }

    // Prepare the payload for FCM
    const payload = {
      notification: {
        title: "Enquiry Update from Technician",
        body: `Technician ${technicianName} ${action} enquiry ${enquiryId}`,
        sound: "default",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        enquiryId,
        action,
      },
    };

    // Send notification to the admin's devices
    await admin.messaging().sendToDevice(fcmTokens, payload);

    // Log the notification in Firestore under "notifications" collection
    await admin.firestore().collection("notifications").add({
      userType: "admin",
      message: `Technician ${technicianName} ${action} enquiry ${enquiryId}`,
      enquiryId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "unread"
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error: error.message };
  }
});

// Function to send technician email
exports.sendTechnicianEmail = functions.https.onCall(async (data) => {
  const { to, subject, text } = data;

  const mailOptions = {
    from: 'techwizapp@gmail.com',
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error.toString());
    return { success: false, error: error.toString() };
  }
});

exports.sendQuotationEmail = functions.https.onCall(async (data) => {
  const { enquiryId, estimatedCost, estimatedTime } = data;

  try {
    const enquiryDoc = await admin.firestore().collection('response_modified').doc(enquiryId).get();

    // The issue is likely here; the Firestore snapshot object might not be correctly accessed
    if (!enquiryDoc.exists) { 
      throw new Error("Enquiry document does not exist!");
    }

    const assignedTechnicianId = enquiryDoc.data().assignedTechnicianId;

    const technicianDoc = await admin.firestore().collection('technicians').doc(assignedTechnicianId).get();
    if (!technicianDoc.exists) {
      throw new Error("Technician document does not exist!");
    }

    const technicianEmail = technicianDoc.data().email;
    const technicianName = technicianDoc.data().name;

    const mailOptions = {
      from: 'techwizapp@gmail.com',
      to: technicianEmail,
      subject: 'Acknowledgment of Quotation Received',
      text: `Dear ${technicianName},

Thank you for providing your quotation for the enquiry ${enquiryId}. We have received your estimated cost and estimated time for the project.

Quotation Details:

Enquiry ID: ${enquiryId}
Estimated Cost: ${estimatedCost}
Estimated Time: ${estimatedTime}

We will now confirm these details with the customer and get back to you as soon as we have their response.

Thank you for your prompt and professional attention to this matter.

If any further information or clarification is required, we will reach out to you. Otherwise, you can expect an update from us shortly.
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error.toString());
    return { success: false, error: error.toString() };
  }
});


exports.sendAssignmentEmail = functions.https.onCall(async (data) => {
  const { technicianId, enquiryId } = data;

  try {
    const technicianDoc = await admin.firestore().collection('technicians').doc(technicianId).get();

    if (!technicianDoc.exists) {
      throw new Error("Technician document does not exist!");
    }

    const technicianData = technicianDoc.data();
    const technicianEmail = technicianData.email;
    const technicianName = technicianData.name;

    const mailOptions = {
      from: 'techwizapp@gmail.com',
      to: technicianEmail,
      subject: `Assignment of Enquiry ${enquiryId}`,
      text: `Dear ${technicianName},

We are pleased to inform you that the customer has confirmed your quotation for the enquiry ${enquiryId}. We are now assigning this enquiry to you for further action.

Please proceed with the necessary steps to fulfill this enquiry. If you encounter any issues or require further information, do not hesitate to contact us.

Thank you for your cooperation and prompt attention to this assignment. We look forward to a successful completion of this project.

Best regards,
The Team
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending assignment email:', error.toString());
    return { success: false, error: error.toString() };
  }
});

// Function to send schedule notification to admin
exports.sendScheduleNotificationToAdmin = functions.firestore
  .document('DASHBOARD_CHAT/{chatId}')
  .onUpdate(async (change, context) => {
    const chatId = context.params.chatId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if there's a new message in customer_to_admin
    const beforeMessages = beforeData.customer_to_admin || [];
    const afterMessages = afterData.customer_to_admin || [];

    if (afterMessages.length > beforeMessages.length) {
      const newMessage = afterMessages[afterMessages.length - 1];

      if (newMessage.text.toLowerCase().includes('schedule')) {
        // Fetch the admin's FCM tokens
        const adminDoc = await admin.firestore().collection("users").doc("admin").get();
        if (!adminDoc.exists) {
          console.error("Admin document does not exist!");
          return null;
        }

        const fcmTokens = adminDoc.data().fcmTokens;
        if (!fcmTokens || fcmTokens.length === 0) {
          console.error("Admin has no FCM tokens");
          return null;
        }

        // Prepare the notification payload
        const payload = {
          notification: {
            title: "Scheduling Request",
            body: `Customer has requested to schedule a meeting with the technician for enquiry ${chatId}.`,
            sound: "default",
          },
          data: {
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            enquiryId: chatId,
          },
        };

        // Send notification to admin
        await admin.messaging().sendToDevice(fcmTokens, payload);

        // Store the notification in the Firestore collection
        await admin.firestore().collection("notifications").add({
          userType: "admin",
          message: `Customer has requested to schedule a meeting with the technician for enquiry ${chatId}.`,
          enquiryId: chatId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "unread"
        });

        console.log("Notification sent to admin successfully");
      }
    }
    return null;
  });


  exports.sendPasswordResetEmail = functions.https.onCall(async (data) => {
    const { email } = data;
  
    try {
      // Generate the password reset link using Firebase Admin SDK
      const resetLink = await admin.auth().generatePasswordResetLink(email);
  
      // Email options for the password reset
      const mailOptions = {
        from: 'techwizapp@gmail.com', // Your email
        to: email,
        subject: 'Password Reset Request',
        html: `
          <p>Dear user,</p>
          <p>You requested a password reset for your account. Click the link below to reset your password:</p>
          <a href="${resetLink}">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>Best regards,<br />The Team</p>
        `,
      };
  
      // Send the email
      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent successfully to ${email}`);
      return { success: true, message: 'Password reset email sent successfully!' };
  
    } catch (error) {
      console.error('Error sending password reset email:', error.toString());
      return { success: false, error: error.toString() };
    }
  });
  
