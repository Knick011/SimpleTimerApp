package com.simpletimerapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class DeviceLockModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private final BroadcastReceiver screenStateReceiver;

    public DeviceLockModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        // Create broadcast receiver for screen state changes
        screenStateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                    sendEvent("deviceLocked", null);
                } else if (Intent.ACTION_SCREEN_ON.equals(intent.getAction())) {
                    sendEvent("deviceUnlocked", null);
                }
            }
        };

        // Register the receiver
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        reactContext.registerReceiver(screenStateReceiver, filter);
    }

    @Override
    public String getName() {
        return "DeviceLockModule";
    }

    private void sendEvent(String eventName, Object params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        try {
            reactContext.unregisterReceiver(screenStateReceiver);
        } catch (Exception e) {
            // Ignore if receiver is not registered
        }
    }
} 