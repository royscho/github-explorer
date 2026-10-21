import Foundation
import Network
import UIKit

// Pure Swift, no React/Codegen types: the generated `NativeDeviceNetworkSpec` header mixes
// Objective-C with C++ (namespaces, jsi types), which Swift's Clang importer cannot resolve —
// `import ReactCodegen` from this file fails with "Unable to resolve module dependency:
// 'ReactCodegen'" (confirmed against a real Xcode build, not a guess). `DeviceNetwork.mm` is the
// Objective-C++ adapter that conforms to the codegen protocol and forwards to this class, which is
// the actual "Swift (+ ObjC++ glue)" split from DESIGN.md §3.2.
// `@objc(DeviceNetworkImpl)` is required, not decorative: plain `@objc` exposes the class to the
// ObjC runtime under a mangled name (confirmed via `nm` against a real build — it was
// `_TtC14GithubExplorer17DeviceNetworkImpl`), which the forward declaration in DeviceNetwork.mm
// doesn't match, so the linker can't find `DeviceNetworkImpl`.
@objc(DeviceNetworkImpl)
final class DeviceNetworkImpl: NSObject {
  private let monitorQueue = DispatchQueue(label: "com.royschonberg.githubexplorer.devicenetwork")
  // A cancelled `NWPathMonitor` can't be restarted — `start(queue:)` after `cancel()` delivers no
  // further updates — so a fresh instance is created on every `startNetworkMonitoring()` call
  // rather than reusing one for the object's lifetime.
  private var monitor: NWPathMonitor?

  deinit {
    monitor?.cancel()
  }

  @objc func getNetworkState() -> [String: Any] {
    // While not actively monitoring, there's no live `NWPathMonitor` to read `currentPath` from —
    // an unstarted one reports its (unsatisfied) default, which is the best available answer here.
    Self.networkState(from: monitor?.currentPath ?? NWPathMonitor().currentPath)
  }

  @objc func getDeviceInfo() -> [String: Any] {
    let info = Bundle.main.infoDictionary
    return [
      "model": Self.deviceModelIdentifier,
      "osVersion": UIDevice.current.systemVersion,
      "appVersion": info?["CFBundleShortVersionString"] as? String ?? "",
      "buildNumber": info?["CFBundleVersion"] as? String ?? "",
    ]
  }

  @objc func isLowPowerMode() -> Bool {
    ProcessInfo.processInfo.isLowPowerModeEnabled
  }

  @objc func startNetworkMonitoring(onUpdate: @escaping ([String: Any]) -> Void) {
    if monitor == nil {
      let newMonitor = NWPathMonitor()
      newMonitor.pathUpdateHandler = { path in
        onUpdate(Self.networkState(from: path))
      }
      newMonitor.start(queue: monitorQueue)
      monitor = newMonitor
    }
  }

  @objc func stopNetworkMonitoring() {
    monitor?.cancel()
    monitor = nil
  }

  private static func networkState(from path: NWPath) -> [String: Any] {
    let connectionType: String
    if path.status != .satisfied {
      connectionType = "none"
    } else if path.usesInterfaceType(.wifi) {
      connectionType = "wifi"
    } else if path.usesInterfaceType(.cellular) {
      connectionType = "cellular"
    } else if path.usesInterfaceType(.wiredEthernet) {
      connectionType = "ethernet"
    } else {
      connectionType = "unknown"
    }

    return [
      "isConnected": path.status == .satisfied,
      "connectionType": connectionType,
      "isExpensive": path.isExpensive,
    ]
  }

  // `UIDevice.current.model` only ever returns the generic "iPhone"/"iPad" — not comparable to
  // Android's `Build.MODEL` (a real model string) in the Settings → Device screen. The hardware
  // identifier (e.g. "iPhone17,1") from `uname` is the closest iOS equivalent.
  private static var deviceModelIdentifier: String {
    var systemInfo = utsname()
    uname(&systemInfo)
    return withUnsafePointer(to: &systemInfo.machine) { pointer in
      pointer.withMemoryRebound(to: CChar.self, capacity: 1) { String(cString: $0) }
    }
  }
}
