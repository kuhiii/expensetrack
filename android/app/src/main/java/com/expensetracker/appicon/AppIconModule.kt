package com.expensetracker.appicon

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Android has no API for changing an app's launcher icon, so the manifest
// declares one <activity-alias> per icon — each with its own android:icon and
// a LAUNCHER filter — and this module enables exactly one of them. Everything
// here works on component names, so the enabled alias *is* the stored
// preference; there is nothing extra to persist.
class AppIconModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "AppIconModule"

  private val aliases = linkedMapOf(
    "maneki" to ".MainActivityManeki",
    "money" to ".MainActivityMoney",
  )

  private fun component(suffix: String) =
    ComponentName(reactApplicationContext.packageName, reactApplicationContext.packageName + suffix)

  @ReactMethod
  fun getIcon(promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      // The default alias is the one marked enabled in the manifest, which
      // reads back as COMPONENT_ENABLED_STATE_DEFAULT until it is set here.
      val current = aliases.entries.firstOrNull { (name, suffix) ->
        val state = pm.getComponentEnabledSetting(component(suffix))
        state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
          (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && name == aliases.keys.first())
      }
      promise.resolve(current?.key ?: aliases.keys.first())
    } catch (e: Exception) {
      promise.reject("app_icon_read_failed", e)
    }
  }

  @ReactMethod
  fun setIcon(name: String, promise: Promise) {
    val target = aliases[name]
    if (target == null) {
      promise.reject("unknown_app_icon", "No launcher alias for \"$name\"")
      return
    }
    try {
      val pm = reactApplicationContext.packageManager
      // Enable first, then disable the others: leaving no alias enabled even
      // momentarily can drop the app off the launcher entirely.
      pm.setComponentEnabledSetting(
        component(target),
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
        PackageManager.DONT_KILL_APP,
      )
      aliases.filterKeys { it != name }.values.forEach { suffix ->
        pm.setComponentEnabledSetting(
          component(suffix),
          PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
          PackageManager.DONT_KILL_APP,
        )
      }
      promise.resolve(name)
    } catch (e: Exception) {
      promise.reject("app_icon_write_failed", e)
    }
  }
}
