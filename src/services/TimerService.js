// src/services/TimerService.js - Core timer with background tracking
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const TIMER_STORAGE_KEY = '@timer_remaining';
const TIMER_START_KEY = '@timer_start_time';

class TimerService {
  constructor() {
    // Core timer state
    this.remainingTime = 0;
    this.timer = null;
    this.listeners = new Set();
    this.appState = AppState.currentState || 'active';
    this.isDeviceLocked = false;
    this.isTimerActive = false;
    
    // Background tracking state
    this.backgroundStartTime = null;
    this.lastUpdateTime = null;
    
    // Initialize
    this.loadSavedTime();
    
    // Listen for device lock state changes (Android only)
    if (Platform.OS === 'android') {
      DeviceInfo.isScreenLocked().then((locked) => {
        this.isDeviceLocked = locked;
      });
      // Poll for lock state every second (since no event is available)
      setInterval(async () => {
        const locked = await DeviceInfo.isScreenLocked();
        if (locked !== this.isDeviceLocked) {
          this.isDeviceLocked = locked;
          this.updateTimerState();
        }
      }, 1000);
    }
    
    console.log('Timer Service initialized');
  }
  
  // Only run timer if app is backgrounded/closed and device is unlocked
  updateTimerState() {
    const shouldRun =
      (this.appState === 'background' || this.appState === 'inactive') &&
      !this.isDeviceLocked;
    if (shouldRun && !this.isTimerActive) {
      this.startTimer();
      this.isTimerActive = true;
    } else if (!shouldRun && this.isTimerActive) {
      this.stopTimer();
      this.isTimerActive = false;
    }
  }
  
  // Load saved time when app starts
  async loadSavedTime() {
    try {
      const savedTime = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      const startTime = await AsyncStorage.getItem(TIMER_START_KEY);
      
      if (savedTime && startTime) {
        const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        this.remainingTime = Math.max(0, parseInt(savedTime) - elapsed);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading saved time:', error);
    }
  }
  
  // Add time to the timer
  addTime(seconds) {
    this.remainingTime += seconds;
    this.notifyListeners();
    this.saveTime();
  }
  
  // Start the timer
  startTimer() {
    if (this.timer) return;
    
    this.timer = setInterval(() => {
      if (this.remainingTime > 0) {
        this.remainingTime--;
        this.notifyListeners();
        this.saveTime();
      } else {
        this.stopTimer();
      }
    }, 1000);
  }
  
  // Stop the timer
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  
  // Save current time to storage
  async saveTime() {
    try {
      await AsyncStorage.setItem(TIMER_STORAGE_KEY, this.remainingTime.toString());
      await AsyncStorage.setItem(TIMER_START_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error saving time:', error);
    }
  }
  
  // Add a listener for timer updates
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  // Notify all listeners of timer updates
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.remainingTime));
  }
  
  // Format time as MM:SS
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Handle app state changes
  handleAppStateChange(nextAppState) {
    if (
      typeof this.appState === 'string' &&
      this.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      this.loadSavedTime();
    }
    this.appState = nextAppState;
    this.updateTimerState();
  }
  
  // Start tracking time when app goes to background
  _startBackgroundTracking() {
    if (this.remainingTime > 0 && !this.timer) {
      console.log(`🟢 Starting background tracking with ${this.remainingTime}s available`);
      
      this.backgroundStartTime = Date.now();
      this.lastUpdateTime = Date.now();
      
      // Update every second
      this.timer = setInterval(() => {
        this._updateBackgroundTime();
      }, 1000);
      
      this.notifyListeners();
    } else if (this.remainingTime <= 0) {
      console.log('⚠️  No time available - not starting tracking');
    } else {
      console.log('⚠️  Already tracking');
    }
  }
  
  // Stop tracking when app comes to foreground
  _stopBackgroundTracking() {
    if (this.timer) {
      console.log('🔴 Stopping background tracking');
      
      this.timer = null;
      
      // Final update
      this._updateBackgroundTime();
      
      const totalBackgroundTime = this.backgroundStartTime ? 
        Math.floor((Date.now() - this.backgroundStartTime) / 1000) : 0;
      
      this.remainingTime = Math.max(0, this.remainingTime - totalBackgroundTime);
      
      this.notifyListeners();
      
      // Save updated time
      this.saveTime();
    }
  }
  
  // Update time during background tracking
  _updateBackgroundTime() {
    if (!this.timer || !this.lastUpdateTime) return;
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastUpdateTime) / 1000);
    
    if (elapsedSeconds > 0) {
      const previousTime = this.remainingTime;
      this.remainingTime = Math.max(0, this.remainingTime - elapsedSeconds);
      
      console.log(`⏱️  Time update: -${elapsedSeconds}s, remaining: ${this.remainingTime}s`);
      
      this.lastUpdateTime = now;
      
      this.notifyListeners();
      
      // Check if time expired
      if (this.remainingTime <= 0 && previousTime > 0) {
        console.log('⌛ Time expired!');
        this._handleTimeExpired();
      }
    }
  }
  
  // Handle time expiration
  _handleTimeExpired() {
    this._stopBackgroundTracking();
    this.notifyListeners();
  }
  
  // Save time data to storage
  async saveTimeData() {
    try {
      const data = {
        remainingTime: this.remainingTime,
        lastUpdated: new Date().toISOString(),
        appState: this.appState
      };
      
      await AsyncStorage.setItem(TIMER_STORAGE_KEY, data.remainingTime.toString());
      await AsyncStorage.setItem(TIMER_START_KEY, data.lastUpdated);
      
      console.log(`💾 Saved ${this.remainingTime}s to storage`);
      
    } catch (error) {
      console.error('Error saving time data:', error);
    }
  }
  
  // Add time credits (like earning time through quizzes)
  addTimeCredits(seconds) {
    const previousTime = this.remainingTime;
    this.remainingTime += seconds;
    
    console.log(`💰 Added ${seconds}s credits. Total: ${this.remainingTime}s`);
    
    this.saveTime();
    this.notifyListeners();
    
    return this.remainingTime;
  }
  
  // Remove time credits (for testing or penalties)
  removeTimeCredits(seconds) {
    const previousTime = this.remainingTime;
    this.remainingTime = Math.max(0, this.remainingTime - seconds);
    
    console.log(`💸 Removed ${seconds}s credits. Total: ${this.remainingTime}s`);
    
    this.saveTime();
    this.notifyListeners();
    
    return this.remainingTime;
  }
  
  // Get current available time
  getAvailableTime() {
    return this.remainingTime;
  }
  
  // Get detailed status for debugging
  getStatus() {
    return {
      remainingTime: this.remainingTime,
      formattedTime: this.formatTime(this.remainingTime),
      appState: this.appState,
      backgroundStartTime: this.backgroundStartTime,
      hasTimer: !!this.timer
    };
  }
  
  // Force start tracking (for testing)
  forceStartTracking() {
    console.log('🧪 Force starting tracking');
    this._startBackgroundTracking();
  }
  
  // Force stop tracking (for testing)
  forceStopTracking() {
    console.log('🧪 Force stopping tracking');
    this._stopBackgroundTracking();
  }
  
  // Reset all time and state (for testing)
  async resetAll() {
    console.log('🔄 Resetting all timer data');
    
    this._stopBackgroundTracking();
    this.remainingTime = 0;
    
    await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
    await AsyncStorage.removeItem(TIMER_START_KEY);
    
    this.notifyListeners();
  }
  
  // Cleanup
  cleanup() {
    console.log('🧹 Cleaning up timer service');
    
    if (this.timer) {
      this._stopBackgroundTracking();
    }
  }
}

// Export singleton instance
export default new TimerService();