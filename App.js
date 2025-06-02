import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  AppState,
} from 'react-native';
import TimerService from './src/services/TimerService';

const App = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Subscribe to timer updates
    const unsubscribe = TimerService.addListener((remainingTime) => {
      setTime(remainingTime);
    });

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', TimerService.handleAppStateChange.bind(TimerService));

    // Cleanup
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const handleStart = () => {
    TimerService.startTimer();
    setIsRunning(true);
  };

  const handleStop = () => {
    TimerService.stopTimer();
    setIsRunning(false);
  };

  const handleAddTime = (seconds) => {
    TimerService.addTime(seconds);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{TimerService.formatTime(time)}</Text>
        
        <View style={styles.buttonContainer}>
          {!isRunning ? (
            <TouchableOpacity style={styles.button} onPress={handleStart}>
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStop}>
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.addTimeContainer}>
          <TouchableOpacity 
            style={styles.addTimeButton} 
            onPress={() => handleAddTime(30)}
          >
            <Text style={styles.addTimeText}>+30s</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addTimeButton} 
            onPress={() => handleAddTime(60)}
          >
            <Text style={styles.addTimeText}>+1m</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addTimeButton} 
            onPress={() => handleAddTime(300)}
          >
            <Text style={styles.addTimeText}>+5m</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 40,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  addTimeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
  },
  addTimeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App; 