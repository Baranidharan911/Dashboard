importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

// Initialize Firebase with the config for your project
firebase.initializeApp({
  apiKey: 'AIzaSyAaRwhaUo3ncJZy4MthavVJMJeBRWPLIVQ',
  authDomain: 'techwiz-app-ec16f.firebaseapp.com',
  projectId: 'techwiz-app-ec16f',
  storageBucket: 'techwiz-app-ec16f.appspot.com',
  messagingSenderId: '988578521519',
  appId: '1:988578521519:web:408b54f709d9fc88890f5a',
  measurementId: 'G-7DCC8ZNHVW',
});

// Get the messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    actions: [
      { action: 'PAY_ACTION', title: 'Pay' },
      { action: 'SCHEDULE_ACTION', title: 'Schedule Meeting' },
      { action: 'CHAT_ACTION', title: 'Chat with Admin' }
    ],
    data: {
      url: payload.data.url,
      route: payload.data.route
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  const action = event.action;
  const data = event.notification.data;

  if (action === 'PAY_ACTION') {
    console.log('User clicked Pay');
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/payment' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/payment');
        }
      })
    );
  } else if (action === 'SCHEDULE_ACTION') {
    console.log('User clicked Schedule Meeting');
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/schedule-meeting' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/schedule-meeting');
        }
      })
    );
  } else if (action === 'CHAT_ACTION') {
    console.log('User clicked Chat with Admin');
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/chat' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/chat');
        }
      })
    );
  } else {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
