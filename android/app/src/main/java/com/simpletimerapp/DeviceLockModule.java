package com.simpletimerapp;

import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.PowerManager;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class DeviceLockModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private final BroadcastReceiver screenStateReceiver;
    private PowerManager powerManager;
    private KeyguardManager keyguardManager;

    public DeviceLockModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        
        // Get system services
        powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
        keyguardManager = (KeyguardManager) reactContext.getSystemService(Context.KEYGUARD_SERVICE);

        // Create broadcast receiver for screen state changes
        screenStateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                
                if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                    // Screen turned off - device is locked
                    sendEvent("deviceLocked", createEventData(true, false));
                } else if (Intent.ACTION_SCREEN_ON.equals(action)) {
                    // Screen turned on - but might still be locked
                    boolean isLocked = isDeviceLocked();
                    sendEvent("deviceUnlocked", createEventData(false, !isLocked));
                } else if (Intent.ACTION_USER_PRESENT.equals(action)) {
                    // User unlocked the device (dismissed keyguard)
                    sendEvent("deviceUnlocked", createEventData(false, true));
                }
            }
        };

        // Register the receiver for all relevant events
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        
        try {
            reactContext.registerReceiver(screenStateReceiver, filter);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public String getName() {
        return "DeviceLockModule";
    }

    private WritableMap createEventData(boolean isLocked, boolean isUnlocked) {
        WritableMap eventData = Arguments.createMap();
        eventData.putBoolean("isLocked", isLocked);
        eventData.putBoolean("isUnlocked", isUnlocked);
        eventData.putBoolean("isScreenOn", isScreenOn());
        eventData.putLong("timestamp", System.currentTimeMillis());
        return eventData;
    }

    private boolean isScreenOn() {
        if (powerManager != null) {
            return powerManager.isInteractive(); // API 20+
        }
        return false;
    }

    private boolean isDeviceLocked() {
        if (keyguardManager != null) {
            return keyguardManager.isKeyguardLocked();
        }
        return false;
    }

    @ReactMethod
    public void getCurrentLockState() {
        boolean isLocked = isDeviceLocked();
        boolean isScreenOn = isScreenOn();
        
        WritableMap state = Arguments.createMap();
        state.putBoolean("isLocked", isLocked);
        state.putBoolean("isScreenOn", isScreenOn);
        state.putBoolean("isUnlocked", isScreenOn && !isLocked);
        
        sendEvent("currentLockState", state);
    }

    private void sendEvent(String eventName, WritableMap params) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        try {
            if (screenStateReceiver != null) {
                reactContext.unregisterReceiver(screenStateReceiver);
            }
        } catch (Exception e) {
            // Ignore if receiver is not registered
        }
    }
}