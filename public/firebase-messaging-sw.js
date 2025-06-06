// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDQIAcBO7eRfmKotteCCBbBufMdXu465S4",
  authDomain: "geoattend-xihty.firebaseapp.com",
  projectId: "geoattend-xihty",
  storageBucket: "geoattend-xihty.firebasestorage.app",
  messagingSenderId: "341437035359",
  appId: "1:341437035359:web:12b4880f2cd03a86163cea"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});