importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyCjyTbG2An3MW41e6lJ66vowbz9rIi-f84",
  authDomain: "almanar-booking-dev.firebaseapp.com",
  projectId: "almanar-booking-dev",
  storageBucket: "almanar-booking-dev.firebasestorage.app",
  messagingSenderId: "1013111547600",
  appId: "1:1013111547600:web:3fc53db5f5d3b1a89ce0d5",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// This runs in the background and handles the notification if the app isn't active
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
