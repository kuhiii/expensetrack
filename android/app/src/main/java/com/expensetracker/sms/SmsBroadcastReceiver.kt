package com.expensetracker.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactApplication

class SmsBroadcastReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    val reactApplication = context.applicationContext as? ReactApplication ?: return
    val reactContext = reactApplication.reactNativeHost.reactInstanceManager.currentReactContext ?: return

    for (message in messages) {
      val params = Arguments.createMap().apply {
        putString("sender", message.originatingAddress ?: "")
        putString("body", message.messageBody ?: "")
        putDouble("timestamp", message.timestampMillis.toDouble())
      }
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onSmsReceived", params)
    }
  }
}
