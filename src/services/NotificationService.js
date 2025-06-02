// src/services/NotificationService.js - Simple local notifications
import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.initializeNotifications();
  }
  
  initializeNotifications() {
    // Configure PushNotification for LOCAL notifications only
    PushNotification.configure({
      // Called when a notification is opened
      onNotification: function (notification) {
        console.log('Notification received:', notification);
      },
      
      // iOS permissions
      permissions: {
        alert: true,
        badge: false,
        sound: true,
      },
      
      // Don't pop initial notification
      popInitialNotification: false,
      
      // Request permissions on iOS
      requestPermissions: Platform.OS === 'ios',
    });
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'timer-local',
          channelName: 'Timer Local Notifications',
          channelDescription: 'Local notifications for timer alerts',
          playSound: true,
          soundName: 'default',
          importance: 4, // High importance
          vibrate: true,
        },
        (created) => {
          console.log(`Notification channel created: ${created}`);
          this.isInitialized = true;
        }
      );
    } else {
      // iOS doesn't need channels
      this.isInitialized = true;
    }
    
    console.log('Notification service initialized');
  }
  
  // Schedule a notification for when time will run low
  scheduleLowTimeNotification(minutesRemaining, timeUntilInSeconds) {
    if (!this.isInitialized) {
      console.warn('Notifications not initialized');
      return;
    }
    
    const fireDate = new Date(Date.now() + (timeUntilInSeconds * 1000));
    
    console.log(`Scheduling ${minutesRemaining} minute warning for:`, fireDate.toLocaleTimeString());
    
    PushNotification.localNotificationSchedule({
      // Android specific
      channelId: 'timer-local',
      
      // Notification content
      title: `⏰ ${minutesRemaining} Minute${minutesRemaining !== 1 ? 's' : ''} Remaining`,
      message: `You have ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} of screen time left.`,
      
      // When to fire
      date: fireDate,
      
      // Notification settings
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
      
      // Custom data
      userInfo: {
        type: 'time-warning',
        minutesRemaining: minutesRemaining
      },
      
      // Auto cancel when tapped
      autoCancel: true,
    });
    
    console.log(`✓ Scheduled ${minutesRemaining} minute notification`);
  }
  
  // Show immediate notification when time expires
  showTimeExpiredNotification() {
    if (!this.isInitialized) {
      console.warn('Notifications not initialized');
      return;
    }
    
    console.log('Showing time expired notification');
    
    PushNotification.localNotification({
      // Android specific
      channelId: 'timer-local',
      
      // Notification content
      title: '⌛ Time Expired',
      message: 'Your screen time has run out!',
      
      // Notification settings
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
      
      // Custom data
      userInfo: {
        type: 'time-expired'
      },
      
      // Auto cancel when tapped
      autoCancel: true,
    });
    
    console.log('✓ Time expired notification sent');
  }
  
  // Show notification when time is added
  showTimeAddedNotification(seconds) {
    if (!this.isInitialized) return;
    
    const minutes = Math.floor(seconds / 60);
    const timeText = minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : `${seconds} seconds`;
    
    PushNotification.localNotification({
      channelId: 'timer-local',
      title: '💰 Time Added',
      message: `You earned ${timeText} of screen time!`,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'time-added',
        seconds: seconds
      },
      autoCancel: true,
    });
    
    console.log(`✓ Time added notification sent (${seconds}s)`);
  }
  
  // Test notification (for development)
  testNotification() {
    if (!this.isInitialized) {
      console.warn('Cannot test - notifications not initialized');
      return;
    }
    
    console.log('Sending test notification');
    
    PushNotification.localNotification({
      channelId: 'timer-local',
      title: '🧪 Test Notification',
      message: 'This is a test notification from Simple Timer!',
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'test'
      },
      autoCancel: true,
    });
    
    console.log('✓ Test notification sent');
  }
  
  // Cancel all notifications
  cancelAllNotifications() {
    console.log('Canceling all notifications');
    PushNotification.cancelAllLocalNotifications();
  }
  
  // Schedule notifications based on available time
  scheduleTimeWarnings(availableTimeInSeconds) {
    if (!this.isInitialized || availableTimeInSeconds <= 0) {
      return;
    }
    
    console.log('Scheduling time warnings for', availableTimeInSeconds, 'seconds');
    
    // Cancel existing notifications first
    this.cancelAllNotifications();
    
    // Schedule 5 minute warning
    if (availableTimeInSeconds > 300) {
      const timeUntil5Min = availableTimeInSeconds - 300;
      this.scheduleLowTimeNotification(5, timeUntil5Min);
    }
    
    // Schedule 1 minute warning  
    if (availableTimeInSeconds > 60) {
      const timeUntil1Min = availableTimeInSeconds - 60;
      this.scheduleLowTimeNotification(1, timeUntil1Min);
    }
    
    // Schedule 30 second warning
    if (availableTimeInSeconds > 30) {
      const timeUntil30Sec = availableTimeInSeconds - 30;
      
      const fireDate = new Date(Date.now() + (timeUntil30Sec * 1000));
      
      PushNotification.localNotificationSchedule({
        channelId: 'timer-local',
        title: '⚠️ 30 Seconds Left',
        message: 'Your screen time is almost up!',
        date: fireDate,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        userInfo: {
          type: 'time-warning',
          secondsRemaining: 30
        },
        autoCancel: true,
      });
      
      console.log('✓ Scheduled 30 second warning');
    }
  }
}

// Export singleton instance
export default new NotificationService();