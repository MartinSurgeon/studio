import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import type { Class, GeoLocation } from '@/lib/types';
import { attendanceService } from '@/lib/services/attendance.service';
import { classService } from '@/lib/services/class.service';

interface CustomNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  actions?: {
    action: string;
    title: string;
  }[];
}

export class NotificationService {
  private messaging: any = null;
  private auth: any = null;
  private notificationPermission = new BehaviorSubject<NotificationPermission>('default');
  private fcmToken = new BehaviorSubject<string | null>(null);
  private registration: ServiceWorkerRegistration | null = null;
  private reminderTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isInitialized = false;

  private firebaseConfig = {
    apiKey: "AIzaSyDQIAcBO7eRfmKotteCCBbBufMdXu465S4",
    authDomain: "geoattend-xihty.firebaseapp.com",
    projectId: "geoattend-xihty",
    storageBucket: "geoattend-xihty.firebasestorage.app",
    messagingSenderId: "341437035359",
    appId: "1:341437035359:web:12b4880f2cd03a86163cea"
  };

  // Replace this with your VAPID key from Firebase Console
  private readonly VAPID_KEY = 'BOnwxYZ7BmD5oAp6VjStYqo9IisIE-H97Gpkka8htIGaYFE_Zv5XmtPyCmSNWj5DaYJoKYznUSRp6RCEw8Htsvo';

  constructor() {
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    if ('serviceWorker' in navigator && 'Notification' in window) {
      try {
        // Initialize Firebase
        const app = initializeApp(this.firebaseConfig);
        this.messaging = getMessaging(app);
        this.auth = getAuth(app);

        // Register service worker
        this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered successfully', this.registration);

        // Request notification permission
        const permission = await Notification.requestPermission();
        this.notificationPermission.next(permission);
        console.log('Current notification permission:', permission);

        // Listen for auth state changes
        onAuthStateChanged(this.auth, async (user) => {
          if (user && permission === 'granted') {
            // User is signed in and notifications are permitted
            await this.getFCMToken();
          } else {
            // User is signed out or notifications are not permitted
            this.fcmToken.next(null);
          }
        });

        // Handle foreground messages
        onMessage(this.messaging, (payload) => {
          console.log('Message received in foreground:', payload);
          if (payload.notification) {
            this.showNotification(payload.notification.title ?? '', {
              body: payload.notification.body ?? '',
              icon: payload.notification.icon || '/icons/icon-192x192.png',
            });
          }
        });

        this.isInitialized = true;
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    } else {
      console.log('Service Worker or Push API not supported');
    }
  }

  private async getFCMToken() {
    try {
      if (!this.auth.currentUser) {
        console.log('User not authenticated, skipping FCM token retrieval');
        return null;
      }

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
      if (!this.auth.currentUser) {
        console.log('User not authenticated, skipping FCM token storage');
        return;
      }

      // TODO: Replace with your actual API endpoint
      const response = await fetch('/api/users/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.auth.currentUser.getIdToken()}`
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

  // Show a local notification (can be triggered by foreground messages or internal logic)
  // Or a notification via service worker for persistent notifications
  async showNotification(title: string, options: CustomNotificationOptions) {
    if (this.notificationPermission.value !== 'granted') {
      console.log('Notifications not available or not permitted');
      return;
    }

    try {
      if (this.registration) {
        await this.registration.showNotification(title, {
          icon: options.icon || '/icons/icon-192x192.png',
          badge: options.badge || '/icons/badge-72x72.png',
          vibrate: options.vibrate || [100, 50, 100],
          ...options
        });
        console.log('Service Worker Notification shown successfully:', title);
      } else {
        // Fallback for browsers that support Notification API but not Service Worker registration,
        // or if service worker hasn't registered yet. This notification will not persist after browser close.
        const notification = new Notification(title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          ...options // Spread remaining options for native Notification
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          if (options.data && options.data.url) {
             window.open(options.data.url, '_blank');
          }
        };
        console.log('Native Notification shown successfully:', title);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
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

  public async notifyClassStarted(classItem: Class) {
    await this.showNotification('Class Started', {
      body: `${classItem.name} has started. Don't forget to mark your attendance!`,
      data: {
        url: `/student/class/${classItem.id}`
      },
      actions: [
        {
          action: 'mark_attendance',
          title: 'Mark Attendance'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    });

    // Schedule reminder notification if attendance not marked
    this.scheduleAttendanceReminder(classItem);
  }

  private async scheduleAttendanceReminder(classItem: Class) {
    const reminderDelay = 5 * 60 * 1000; // 5 minutes

    const timeoutId = setTimeout(async () => {
      // Check if attendance is already marked
      const records = await attendanceService.getAttendanceRecords({
        classId: classItem.id
      });

      if (records.length === 0) {
        await this.showNotification('Attendance Reminder', {
          body: `You haven't marked your attendance for ${classItem.name}. Class ends in ${classItem.durationMinutes} minutes.`,
          data: {
            url: `/student/class/${classItem.id}`
          },
          actions: [
            {
              action: 'mark_attendance',
              title: 'Mark Now'
            },
            {
              action: 'close',
              title: 'Close'
            }
          ]
        });
      }
    }, reminderDelay);

    this.reminderTimeouts.set(classItem.id, timeoutId);
  }

  public async scheduleClassNotification(classItem: Class, minutesBefore: number = 15) {
    if (this.notificationPermission.value !== 'granted') {
      console.log('Notifications not available or not permitted');
      return;
    }

    const classStartTime = new Date(classItem.startTime);
    const notificationTime = new Date(classStartTime.getTime() - (minutesBefore * 60 * 1000));
    const now = new Date();

    if (notificationTime <= now) {
      console.log('Class notification time has already passed');
      return;
    }

    const delay = notificationTime.getTime() - now.getTime();

    setTimeout(() => {
      this.showNotification('Class Starting Soon', {
        body: `${classItem.name} starts in ${minutesBefore} minutes`,
        data: {
          url: `/student/class/${classItem.id}`
        },
        actions: [
          {
            action: 'open',
            title: 'Open Class'
          },
          {
            action: 'close',
            title: 'Close'
          }
        ]
      });
    }, delay);
  }

  public async scheduleMultipleClassNotifications(classes: Class[]) {
    for (const classItem of classes) {
      if (classItem.active) {
        await this.scheduleClassNotification(classItem);
      }
    }
  }
} 