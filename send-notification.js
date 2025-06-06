import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync } from 'fs';

// Read the service account file
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

// Initialize the app
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'geoattend-xihty'
});

async function sendNotification(fcmToken, title, body) {
  const message = {
    notification: {
      title,
      body
    },
    token: fcmToken
  };

  try {
    const response = await getMessaging().send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.log('Error sending message:', error);
  }
}

// Example usage:
// sendNotification('user_fcm_token', 'Class Started', 'Your class has started!'); 