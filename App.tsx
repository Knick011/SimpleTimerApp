// App.tsx - Timer App without Vector Icons
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  AppState,
  Platform
} from 'react-native';
import TimerService from './src/services/TimerService';

const App = () => {
  const [availableTime, setAvailableTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [logs, setLogs] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    // Initialize timer service and get initial time
    const initializeTimer = async () => {
      const time = await TimerService.loadSavedTime();
      setAvailableTime(time);
    };

    initializeTimer();

    // Listen to timer events
    const removeTimerListener = TimerService.addEventListener(handleTimerEvent);

    // Listen to app state changes
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
      addLog(`App State: ${nextAppState}`);
    });

    return () => {
      removeTimerListener();
      appStateSubscription?.remove();
      TimerService.cleanup();
    };
  }, []);

  const handleTimerEvent = (event) => {
    console.log('Timer Event:', event);
    setLastEvent(event);
    
    // Update UI based on event
    switch (event.event) {
      case 'timeLoaded':
      case 'timeUpdate':
      case 'creditsAdded':
      case 'creditsRemoved':
        setAvailableTime(event.availableTime || event.newTotal || event.remaining);
        break;
      case 'trackingStarted':
        setIsTracking(true);
        addLog(`🟢 Started tracking (${TimerService.formatTime(event.availableTime)})`);
        break;
      case 'trackingStopped':
        setIsTracking(false);
        addLog(`🔴 Stopped tracking (${TimerService.formatTime(event.availableTime)})`);
        break;
      case 'timeExpired':
        setIsTracking(false);
        addLog('⌛ TIME EXPIRED!');
        Alert.alert('Time Expired!', 'Your screen time has run out.');
        break;
      case 'appStateChanged':
        addLog(`📱 ${event.previousState} → ${event.currentState}`);
        break;
    }
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 9)]);
  };

  const handleAddTime = (seconds) => {
    TimerService.addTimeCredits(seconds);
    addLog(`💰 Added ${seconds}s`);
  };

  const handleRemoveTime = (seconds) => {
    TimerService.removeTimeCredits(seconds);
    addLog(`💸 Removed ${seconds}s`);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Timer',
      'This will reset all time and clear the log. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            TimerService.resetAll();
            setLogs([]);
            addLog('🔄 Timer reset');
          }
        }
      ]
    );
  };

  const handleTestBackground = () => {
    Alert.alert(
      'Background Test',
      'This will add 30 seconds, then you should minimize the app (press home button) and wait 10-20 seconds before returning to see if time was deducted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Test', 
          onPress: () => {
            handleAddTime(30);
            addLog('🧪 Test started - minimize app now!');
          }
        }
      ]
    );
  };

  const getTimeColor = () => {
    if (availableTime <= 0) return '#F44336'; // Red
    if (availableTime < 300) return '#FF9800'; // Orange (less than 5 min)
    return '#4CAF50'; // Green
  };

  const getStatusEmoji = () => {
    if (availableTime <= 0) return '❌';
    if (isTracking) return '⏱️';
    return '✅';
  };

  const formattedTime = TimerService.formatTime(availableTime);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>⏱️</Text>
          <Text style={styles.title}>Simple Timer App</Text>
          <Text style={styles.subtitle}>Test background time tracking</Text>
        </View>

        {/* Main Timer Display */}
        <View style={[styles.timerCard, { borderColor: getTimeColor() }]}>
          <Text style={styles.statusEmoji}>{getStatusEmoji()}</Text>
          <Text style={[styles.timeDisplay, { color: getTimeColor() }]}>
            {formattedTime}
          </Text>
          <Text style={styles.timeLabel}>Available Time</Text>
          
          {/* Status indicators */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: isTracking ? '#4CAF50' : '#9E9E9E' }]}>
              <Text style={styles.statusText}>
                {isTracking ? 'TRACKING' : 'PAUSED'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.statusText}>{appState.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.buttonsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.greenButton]} 
              onPress={() => handleAddTime(30)}
            >
              <Text style={styles.buttonEmoji}>➕</Text>
              <Text style={styles.buttonText}>+30s</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.greenButton]} 
              onPress={() => handleAddTime(300)}
            >
              <Text style={styles.buttonEmoji}>➕</Text>
              <Text style={styles.buttonText}>+5min</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.redButton]} 
              onPress={() => handleRemoveTime(30)}
            >
              <Text style={styles.buttonEmoji}>➖</Text>
              <Text style={styles.buttonText}>-30s</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.blueButton]} 
              onPress={handleTestBackground}
            >
              <Text style={styles.buttonEmoji}>🧪</Text>
              <Text style={styles.buttonText}>Test Background</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.orangeButton]} 
              onPress={handleReset}
            >
              <Text style={styles.buttonEmoji}>🔄</Text>
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug Info */}
        <View style={styles.debugSection}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
          
          {lastEvent && (
            <View style={styles.eventCard}>
              <Text style={styles.eventTitle}>Last Event: {lastEvent.event}</Text>
              <Text style={styles.eventDetails}>
                {JSON.stringify(lastEvent, null, 2)}
              </Text>
            </View>
          )}
        </View>

        {/* Event Log */}
        <View style={styles.logSection}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>Event Log</Text>
            <TouchableOpacity onPress={() => setLogs([])} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.logContainer}>
            {logs.length === 0 ? (
              <Text style={styles.emptyLog}>No events yet...</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logText}>{log}</Text>
              ))
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>🧪 How to Test</Text>
          <Text style={styles.instructionText}>
            1. Tap "Test Background" to add 30 seconds{'\n'}
            2. Minimize the app (press home button){'\n'}
            3. Wait 10-20 seconds{'\n'}
            4. Return to the app{'\n'}
            5. Check if time was deducted in the log{'\n\n'}
            
            The timer should track time spent outside the app and deduct it from your available time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  headerEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  timerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  timeDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonEmoji: {
    fontSize: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  greenButton: {
    backgroundColor: '#4CAF50',
  },
  redButton: {
    backgroundColor: '#F44336',
  },
  blueButton: {
    backgroundColor: '#2196F3',
  },
  orangeButton: {
    backgroundColor: '#FF9800',
  },
  debugSection: {
    marginBottom: 24,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  eventDetails: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#666',
  },
  logSection: {
    marginBottom: 24,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
  },
  logContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    maxHeight: 200,
  },
  logText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
    color: '#333',
  },
  emptyLog: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  instructionsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});

export default App;