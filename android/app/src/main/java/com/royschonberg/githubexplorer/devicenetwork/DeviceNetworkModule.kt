package com.royschonberg.githubexplorer.devicenetwork

import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.os.PowerManager
import com.facebook.fbreact.specs.NativeDeviceNetworkSpec
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap

private data class NetworkStateValue(
    val isConnected: Boolean,
    val connectionType: String,
    val isExpensive: Boolean,
)

class DeviceNetworkModule(reactContext: ReactApplicationContext) :
    NativeDeviceNetworkSpec(reactContext) {

  private val connectivityManager: ConnectivityManager?
    get() = reactApplicationContext.getSystemService(ConnectivityManager::class.java)

  // `startNetworkMonitoring`/`stopNetworkMonitoring` run on the module's method-invocation thread;
  // `invalidate()` can run on a different one during teardown — `@Volatile` keeps that handoff safe
  // without a full lock, since the only operations here are a read-then-maybe-write guarded by a
  // null check, not a multi-step mutation.
  @Volatile private var networkCallback: ConnectivityManager.NetworkCallback? = null

  override fun getNetworkState(promise: Promise) {
    // `ConnectivityManager` throws rather than returning a degraded answer when
    // `ACCESS_NETWORK_STATE` is missing from the merged manifest. The permission is declared, so
    // this is a guard against a future manifest regression, not an expected path: rejecting the
    // promise lets the JS layer log it through `shared/logger` and carry on, where an uncaught
    // throw out of a TurboModule method would take the app down instead.
    val state =
        try {
          toWritableMap(currentNetworkState())
        } catch (e: SecurityException) {
          promise.reject(ERROR_MISSING_PERMISSION, MISSING_PERMISSION_MESSAGE, e)
          return
        }
    // Resolved outside the `try` so a throw from `resolve` itself can't land in the catch and
    // reject a promise that was already settled.
    promise.resolve(state)
  }

  override fun getDeviceInfo(promise: Promise) {
    promise.resolve(currentDeviceInfo())
  }

  override fun isLowPowerMode(promise: Promise) {
    val powerManager = reactApplicationContext.getSystemService(PowerManager::class.java)
    promise.resolve(powerManager?.isPowerSaveMode ?: false)
  }

  override fun startNetworkMonitoring(promise: Promise) {
    val manager = connectivityManager
    if (networkCallback == null && manager != null) {
      val callback =
          object : ConnectivityManager.NetworkCallback() {
            override fun onCapabilitiesChanged(
                network: Network,
                capabilities: NetworkCapabilities,
            ) {
              emitOnNetworkStatusChanged(toWritableMap(networkState(capabilities)))
            }

            override fun onLost(network: Network) {
              emitOnNetworkStatusChanged(
                  toWritableMap(
                      NetworkStateValue(
                          isConnected = false,
                          connectionType = "none",
                          isExpensive = false,
                      ),
                  ),
              )
            }
          }
      // Same `ACCESS_NETWORK_STATE` guard as `getNetworkState` — and `networkCallback` is only
      // assigned once registration actually succeeded, so a failure here leaves nothing for
      // `stopNetworkMonitoring`/`invalidate` to unregister.
      try {
        manager.registerDefaultNetworkCallback(callback)
      } catch (e: SecurityException) {
        promise.reject(ERROR_MISSING_PERMISSION, MISSING_PERMISSION_MESSAGE, e)
        return
      }
      networkCallback = callback
    }
    promise.resolve(null)
  }

  override fun stopNetworkMonitoring(promise: Promise) {
    unregisterNetworkCallback()
    promise.resolve(null)
  }

  override fun invalidate() {
    unregisterNetworkCallback()
    super.invalidate()
  }

  private fun unregisterNetworkCallback() {
    val callback = networkCallback ?: return
    connectivityManager?.unregisterNetworkCallback(callback)
    networkCallback = null
  }

  private fun currentNetworkState(): NetworkStateValue {
    val manager = connectivityManager ?: return NetworkStateValue(false, "none", false)
    val capabilities = manager.activeNetwork?.let(manager::getNetworkCapabilities)
    return if (capabilities == null) {
      NetworkStateValue(isConnected = false, connectionType = "none", isExpensive = false)
    } else {
      networkState(capabilities)
    }
  }

  private fun networkState(capabilities: NetworkCapabilities): NetworkStateValue {
    val connectionType =
        when {
          capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
          capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
          capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
          else -> "unknown"
        }
    // `NET_CAPABILITY_INTERNET`, not `_VALIDATED`: validation happens asynchronously after a
    // network switch, so gating on it flashes "offline" for a moment on every switch. `INTERNET`
    // (the system believes this network *should* provide internet) matches iOS's `.satisfied`
    // more closely and avoids that flash.
    val isConnected = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    val isExpensive = !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    return NetworkStateValue(isConnected, connectionType, isExpensive)
  }

  private fun currentDeviceInfo(): WritableMap {
    val packageInfo =
        try {
          reactApplicationContext.packageManager.getPackageInfo(
              reactApplicationContext.packageName,
              0,
          )
        } catch (e: PackageManager.NameNotFoundException) {
          null
        }
    val buildNumber =
        when {
          packageInfo == null -> ""
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.P -> packageInfo.longVersionCode.toString()
          else -> @Suppress("DEPRECATION") packageInfo.versionCode.toString()
        }
    return Arguments.createMap().apply {
      putString("model", Build.MODEL)
      putString("osVersion", Build.VERSION.RELEASE)
      putString("appVersion", packageInfo?.versionName ?: "")
      putString("buildNumber", buildNumber)
    }
  }

  private fun toWritableMap(state: NetworkStateValue): WritableMap =
      Arguments.createMap().apply {
        putBoolean("isConnected", state.isConnected)
        putString("connectionType", state.connectionType)
        putBoolean("isExpensive", state.isExpensive)
      }

  companion object {
    const val NAME = NativeDeviceNetworkSpec.NAME

    private const val ERROR_MISSING_PERMISSION = "E_MISSING_PERMISSION"
    private const val MISSING_PERMISSION_MESSAGE =
        "DeviceNetwork needs the ACCESS_NETWORK_STATE permission in AndroidManifest.xml"
  }
}
