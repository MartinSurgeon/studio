import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { BehaviorSubject } from 'rxjs';

export class NotificationService {
  private messaging: any = null;
  private notificationPermission = new BehaviorSubject<NotificationPermission>('default');
  private fcmToken = new BehaviorSubject<string | null>(null);

  private firebaseConfig = {
    apiKey: "AIzaSyDQIAcBO7eRfmKotteCCBbBufMdXu465S4",
    authDomain: "geoattend-xihty.firebaseapp.com",
    projectId: "geoattend-xihty",
    storageBucket: "geoattend-xihty.firebasestorage.app",
    messagingSenderId: "341437035359",
    appId: "1:341437035359:web:12b4880f2cd03a86163cea"
  };

  // Replace this with your VAPID key from Firebase Console
  private readonly VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

  constructor() {
    this.init();
  }

  async init() {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      try {
        // Initialize Firebase
        const app = initializeApp(this.firebaseConfig);
        this.messaging = getMessaging(app);

        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered successfully');

        // Request notification permission
        const permission = await Notification.requestPermission();
        this.notificationPermission.next(permission);
        console.log('Current notification permission:', permission);

        if (permission === 'granted') {
          // Get FCM token
          await this.getFCMToken();
        }

        // Handle foreground messages
        onMessage(this.messaging, (payload) => {
          console.log('Message received in foreground:', payload);
          if (payload.notification) {
            this.showNotification(payload.notification.title ?? '', payload.notification.body ?? '');
          }
        });

      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    }
  }

  private async getFCMToken() {
    try {
      const currentToken = await getToken(this.messaging, {
        vapidKey: this.VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        this.fcmToken.next(currentToken);
        // Store the token in your database
        await this.storeFCMToken(currentToken);
        return currentToken;
      } else {
        console.log('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  private async storeFCMToken(token: string) {
    try {
      // TODO: Replace with your actual API endpoint
      const response = await fetch('/api/users/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcmToken: token })
      });
      
      if (!response.ok) {
        throw new Error('Failed to store FCM token');
      }
    } catch (error) {
      console.error('Error storing FCM token:', error);
    }
  }

  // Show a local notification
  showNotification(title: string, body: string) {
    if (this.notificationPermission.value === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  // Get the current FCM token
  getCurrentFCMToken() {
    return this.fcmToken.value;
  }

  // Check if notifications are enabled
  isNotificationsEnabled() {
    return this.notificationPermission.value === 'granted';
  }

  // Request notification permission
  async requestPermission() {
    const permission = await Notification.requestPermission();
    this.notificationPermission.next(permission);
    if (permission === 'granted') {
      await this.getFCMToken();
    }
    return permission;
  }

  // Send a notification to a specific user
  async sendNotification(userId: string, title: string, body: string) {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title,
          body
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send notification');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
} 