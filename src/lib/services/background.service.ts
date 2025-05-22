import { classService } from './class.service';

class BackgroundService {
  private static instance: BackgroundService;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // Check every minute

  private constructor() {}

  static getInstance(): BackgroundService {
    if (!BackgroundService.instance) {
      BackgroundService.instance = new BackgroundService();
    }
    return BackgroundService.instance;
  }

  start(): void {
    if (this.checkInterval) {
      console.warn('Background service is already running');
      return;
    }

    console.log('Starting background service...');
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAndUpdateClasses();
      } catch (error) {
        console.error('Error in background service:', error);
      }
    }, this.CHECK_INTERVAL);

    // Initial check
    this.checkAndUpdateClasses();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Background service stopped');
    }
  }

  private async checkAndUpdateClasses(): Promise<void> {
    try {
      await classService.handleAutoStartEnd();
    } catch (error) {
      console.error('Error checking and updating classes:', error);
    }
  }
}

export const backgroundService = BackgroundService.getInstance(); 