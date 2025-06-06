import { Class } from '@/lib/types';
import { attendanceService } from './attendance.service';

interface CustomNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  actions?: {
    action: string;
    title: string;
  }[];
}

class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private registration: ServiceWorkerRegistration | null = null;
  private reminderTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private constructor() {
    this.init();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async init() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully', this.registration);
        
        // Check if push subscription exists
        const subscription = await this.registration.pushManager.getSubscription();
        console.log('Push subscription status:', subscription ? 'Active' : 'Not subscribed');
        
        // Check notification permission
        console.log('Current notification permission:', this.permission);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      console.log('Service Worker or Push API not supported');
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('Notification permission requested:', this.permission);
      return this.permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  private async showNotification(title: string, options: CustomNotificationOptions) {
    if (!this.registration || this.permission !== 'granted') {
      console.log('Notifications not available or not permitted', {
        hasRegistration: !!this.registration,
        permission: this.permission
      });
      return;
    }

    try {
      await this.registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        ...options
      });
      console.log('Notification shown successfully:', title);
    } catch (error) {
      console.error('Error showing notification:', error);
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

  public cancelReminder(classId: string) {
    const timeoutId = this.reminderTimeouts.get(classId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.reminderTimeouts.delete(classId);
    }
  }

  public async scheduleClassNotification(classItem: Class, minutesBefore: number = 15) {
    if (!this.registration || this.permission !== 'granted') {
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

export const notificationService = NotificationService.getInstance(); 