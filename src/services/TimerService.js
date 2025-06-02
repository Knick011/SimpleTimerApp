// Enhanced TimerService.js - Phone lock detection and background timer
import { AppState, Platform, NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMER_STORAGE_KEY = '@timer_remaining';
const TIMER_START_KEY = '@timer_start_time';
const LOCK_STATE_KEY = '@lock_state';

class TimerService {
  constructor() {
    // Core timer state
    this.availableTime = 0;
    this.timer = null;
    this.listeners = new Set();
    this.appState = AppState.currentState || 'active';
    this.isDeviceLocked = false;
    this.isTimerRunning = false;
    
    // Background tracking
    this.backgroundStartTime = null;
    this.lockStartTime = null;
    
    // Initialize
    this.initialize();
  }

  async initialize() {
    console.log('🚀 Initializing TimerService');
    
    // Load saved data
    await this.loadSavedTime();
    
    // Setup device lock listener
    this.setupDeviceLockListener();
    
    // Setup app state listener
    this.setupAppStateListener();
    
    // Get initial lock state
    this.getCurrentLockState();
    
    console.log('✅ TimerService initialized');
  }

  setupDeviceLockListener() {
    if (Platform.OS === 'android' && NativeModules.DeviceLockModule) {
      const eventEmitter = new NativeEventEmitter(NativeModules.DeviceLockModule);
      
      eventEmitter.addListener('deviceLocked', (data) => {
        console.log('📱 Device locked', data);
        this.isDeviceLocked = true;
        this.handleLockStateChange();
        this.notifyListeners({
          event: 'deviceLocked',
          availableTime: this.availableTime,
          isLocked: true,
          timestamp: data.timestamp
        });
      });
      
      eventEmitter.addListener('deviceUnlocked', (data) => {
        console.log('🔓 Device unlocked', data);
        this.isDeviceLocked = false;
        this.handleLockStateChange();
        this.notifyListeners({
          event: 'deviceUnlocked',
          availableTime: this.availableTime,
          isLocked: false,
          timestamp: data.timestamp
        });
      });
      
      eventEmitter.addListener('currentLockState', (data) => {
        console.log('📋 Current lock state', data);
        this.isDeviceLocked = data.isLocked;
        this.handleLockStateChange();
      });
    }
  }

  setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      console.log(`📱 App state: ${this.appState} -> ${nextAppState}`);
      
      const previousState = this.appState;
      this.appState = nextAppState;
      
      this.handleAppStateChange(previousState, nextAppState);
      
      this.notifyListeners({
        event: 'appStateChanged',
        previousState,
        currentState: nextAppState,
        availableTime: this.availableTime
      });
    });
  }

  getCurrentLockState() {
    if (Platform.OS === 'android' && NativeModules.DeviceLockModule) {
      NativeModules.DeviceLockModule.getCurrentLockState();
    }
  }

  handleLockStateChange() {
    this.updateTimerState();
    this.saveState();
  }

  handleAppStateChange(previousState, currentState) {
    if (currentState === 'active') {
      // App came to foreground - stop timer
      this.stopTimer();
      this.processBackgroundTime();
    } else if (previousState === 'active') {
      // App went to background - start timer if device is unlocked
      this.updateTimerState();
    }
  }

  updateTimerState() {
    const shouldRunTimer = this.shouldTimerRun();
    
    if (shouldRunTimer && !this.isTimerRunning) {
      this.startTimer();
    } else if (!shouldRunTimer && this.isTimerRunning) {
      this.stopTimer();
    }
  }

  shouldTimerRun() {
    // Timer should run when:
    // 1. Device is unlocked AND
    // 2. App is in background/inactive AND
    // 3. We have available time
    return !this.isDeviceLocked && 
           (this.appState === 'background' || this.appState === 'inactive') && 
           this.availableTime > 0;
  }

  startTimer() {
    if (this.isTimerRunning) return;
    
    console.log('▶️ Starting timer');
    this.isTimerRunning = true;
    this.backgroundStartTime = Date.now();
    
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
    
    this.notifyListeners({
      event: 'trackingStarted',
      availableTime: this.availableTime,
      timestamp: Date.now()
    });
  }

  stopTimer() {
    if (!this.isTimerRunning) return;
    
    console.log('⏸️ Stopping timer');
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.isTimerRunning = false;
    
    this.notifyListeners({
      event: 'trackingStopped',
      availableTime: this.availableTime,
      timestamp: Date.now()
    });
  }

  tick() {
    if (this.availableTime <= 0) {
      this.handleTimeExpired();
      return;
    }
    
    this.availableTime--;
    this.saveTime();
    
    this.notifyListeners({
      event: 'timeUpdate',
      availableTime: this.availableTime,
      timestamp: Date.now()
    });
    
    if (this.availableTime <= 0) {
      this.handleTimeExpired();
    }
  }

  handleTimeExpired() {
    console.log('⌛ Time expired!');
    this.stopTimer();
    
    this.notifyListeners({
      event: 'timeExpired',
      availableTime: 0,
      timestamp: Date.now()
    });
  }

  processBackgroundTime() {
    // Calculate time spent in background and deduct it
    if (this.backgroundStartTime) {
      const backgroundDuration = Math.floor((Date.now() - this.backgroundStartTime) / 1000);
      console.log(`📊 Background duration: ${backgroundDuration}s`);
      
      if (backgroundDuration > 0) {
        this.availableTime = Math.max(0, this.availableTime - backgroundDuration);
        this.saveTime();
        
        this.notifyListeners({
          event: 'backgroundTimeProcessed',
          backgroundDuration,
          availableTime: this.availableTime,
          timestamp: Date.now()
        });
      }
    }
    
    this.backgroundStartTime = null;
  }

  // Public methods
  async loadSavedTime() {
    try {
      const savedTime = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      if (savedTime) {
        this.availableTime = parseInt(savedTime, 10);
        console.log(`💾 Loaded ${this.availableTime}s from storage`);
        
        this.notifyListeners({
          event: 'timeLoaded',
          availableTime: this.availableTime,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error loading saved time:', error);
    }
  }

  async saveTime() {
    try {
      await AsyncStorage.setItem(TIMER_STORAGE_KEY, this.availableTime.toString());
    } catch (error) {
      console.error('Error saving time:', error);
    }
  }

  async saveState() {
    try {
      const state = {
        isDeviceLocked: this.isDeviceLocked,
        appState: this.appState,
        isTimerRunning: this.isTimerRunning,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(LOCK_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  addTimeCredits(seconds) {
    const previousTime = this.availableTime;
    this.availableTime += seconds;
    
    console.log(`💰 Added ${seconds}s. Total: ${this.availableTime}s`);
    
    this.saveTime();
    this.updateTimerState(); // Check if timer should start
    
    this.notifyListeners({
      event: 'creditsAdded',
      amount: seconds,
      previousTotal: previousTime,
      newTotal: this.availableTime,
      timestamp: Date.now()
    });
    
    return this.availableTime;
  }

  removeTimeCredits(seconds) {
    const previousTime = this.availableTime;
    this.availableTime = Math.max(0, this.availableTime - seconds);
    
    console.log(`💸 Removed ${seconds}s. Total: ${this.availableTime}s`);
    
    this.saveTime();
    this.updateTimerState(); // Check if timer should stop
    
    this.notifyListeners({
      event: 'creditsRemoved',
      amount: seconds,
      previousTotal: previousTime,
      newTotal: this.availableTime,
      timestamp: Date.now()
    });
    
    return this.availableTime;
  }

  async resetAll() {
    console.log('🔄 Resetting all timer data');
    
    this.stopTimer();
    this.availableTime = 0;
    
    try {
      await AsyncStorage.multiRemove([TIMER_STORAGE_KEY, TIMER_START_KEY, LOCK_STATE_KEY]);
    } catch (error) {
      console.error('Error resetting storage:', error);
    }
    
    this.notifyListeners({
      event: 'reset',
      availableTime: 0,
      timestamp: Date.now()
    });
  }

  // Event system
  addEventListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  }

  // Utility methods
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getStatus() {
    return {
      availableTime: this.availableTime,
      formattedTime: this.formatTime(this.availableTime),
      isTimerRunning: this.isTimerRunning,
      isDeviceLocked: this.isDeviceLocked,
      appState: this.appState,
      shouldRun: this.shouldTimerRun()
    };
  }

  cleanup() {
    console.log('🧹 Cleaning up TimerService');
    this.stopTimer();
    this.saveTime();
    this.saveState();
  }
}

// Export singleton instance
export default new TimerService();