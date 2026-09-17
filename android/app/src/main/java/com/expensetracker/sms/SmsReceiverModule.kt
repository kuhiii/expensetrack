package com.expensetracker.sms

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// The live-listener event emission happens in SmsBroadcastReceiver — this
// module's job is to exist so NativeModules.SmsReceiverModule is a valid
// target for NativeEventEmitter (addListener/removeListeners are required
// no-ops for that API), and to provide a one-time inbox read for the
// startup backfill. Implemented directly against the SMS content provider
// rather than via react-native-get-sms-android, which is unmaintained and
// throws "malformed calls from JS" on RN 0.74's bridge.
class SmsReceiverModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "SmsReceiverModule"

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}

  @ReactMethod
  fun readInbox(maxCount: Int, promise: Promise) {
    try {
      val resolver = reactApplicationContext.contentResolver
      val cursor = resolver.query(
        Uri.parse("content://sms/inbox"),
        arrayOf("address", "body", "date"),
        null,
        null,
        "date DESC"
      )
      val result = Arguments.createArray()
      cursor?.use {
        val addressIdx = it.getColumnIndex("address")
        val bodyIdx = it.getColumnIndex("body")
        val dateIdx = it.getColumnIndex("date")
        var count = 0
        while (it.moveToNext() && (maxCount <= 0 || count < maxCount)) {
          val map = Arguments.createMap()
          map.putString("address", if (addressIdx >= 0) it.getString(addressIdx) ?: "" else "")
          map.putString("body", if (bodyIdx >= 0) it.getString(bodyIdx) ?: "" else "")
          map.putDouble("date", if (dateIdx >= 0) it.getLong(dateIdx).toDouble() else 0.0)
          result.pushMap(map)
          count++
        }
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("READ_INBOX_ERROR", e.message, e)
    }
  }
}
