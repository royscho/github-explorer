# Step 07 — Native module (`DeviceNetwork`)

## Goal

Implement the `DeviceNetwork` TurboModule end to end — Codegen spec, Kotlin (Android) and Swift (iOS)
implementations, a typed JS wrapper and an event subscription — then wire it into the app as a Zustand
network store, an `OfflineBanner`, and a real **Settings → Device** screen that replaces the current
`SettingsPlaceholder`.

Scope is exactly milestone 7's row in `docs/DESIGN.md` §16: _"Codegen spec, Kotlin + Swift, events,
OfflineBanner, Settings → Device"_. It implements:

- §10 (Native module — `DeviceNetwork`) in full: the Codegen spec (§10.1), both native implementations
  (§10.2), and the JS wrapper + store wiring (§10.3).
- §6.2's "Offline" row (`OfflineBanner` + last successful data) — the banner and the network-state
  plumbing it needs, not the cache-persistence half of offline support (§11, milestone 8).
- §3.2's `src/features/device/` layout (`native/`, store, `useNetworkStatus`/`useDeviceInfo`,
  `OfflineBanner`, `DeviceInfoSection`) and the `Settings` tab becoming real.
- §14 (accessibility) on the new `OfflineBanner` and `SettingsScreen` content.

## Files

**Create:**

- `specs/NativeDeviceNetwork.ts` — Codegen TurboModule spec: `getNetworkState()`, `getDeviceInfo()`,
  `isLowPowerMode()`, `startNetworkMonitoring()`, `stopNetworkMonitoring()`, `onNetworkStatusChanged`
  event.
- Android (package `com.royschonberg.githubexplorer.devicenetwork`):
  `android/app/src/main/java/com/royschonberg/githubexplorer/devicenetwork/DeviceNetworkModule.kt`,
  `DeviceNetworkPackage.kt`.
- iOS: `ios/DeviceNetwork/DeviceNetwork.swift` (+ whatever minimal Obj-C++ registration shim the
  installed RN 0.88 Swift-TurboModule support needs — exact shape confirmed during implementation, see
  Risks).
- `src/features/device/native/DeviceNetwork.ts` — typed wrapper (`getNetworkState`, `getDeviceInfo`,
  `isLowPowerMode`, `startNetworkMonitoring`, `stopNetworkMonitoring`, `subscribeToNetworkStatus`) over
  the raw spec, plus `native/index.ts`.
- `src/features/device/store/networkStore.ts` (+ `index.ts`) — Zustand store: `isOnline`,
  `connectionType`, `isExpensive`. Not persisted (§4: it's live device state, not something to restore
  stale).
- `src/features/device/hooks/useNetworkStatus.ts` — selector hook over `networkStore`.
- `src/features/device/hooks/useDeviceNetworkMonitoring.ts` — the one side-effecting hook: on mount,
  calls `startNetworkMonitoring()`, subscribes to `onNetworkStatusChanged` to update `networkStore` and
  call React Query's `onlineManager.setOnline(...)` (§10.3), seeds the store from one `getNetworkState()`
  call so state is correct before the first event; on unmount, unsubscribes and calls
  `stopNetworkMonitoring()`. Called once, from `AppProviders`.
- `src/features/device/hooks/useDeviceInfo.ts` — one-shot async hook (`getDeviceInfo()` +
  `isLowPowerMode()`) with loading/error/data state. Not React Query: this is local device state, not
  GitHub server data (§4), and is fetched once with no caching/retry/pagination needs.
- `src/features/device/components/OfflineBanner.tsx` (+ test) — reads `useNetworkStatus`, renders
  nothing while online, a banner ("You're offline") while not. The "showing data from HH:MM" copy from
  §11 needs the persisted-cache timestamp that doesn't exist until milestone 8 — see Deviations.
- `src/features/device/components/DeviceInfoSection.tsx` (+ test) — renders `useDeviceInfo` (loading /
  error / data) and live `useNetworkStatus` + low-power flag.
- `src/features/device/hooks/useOfflineBannerStyles.ts`, `useDeviceInfoSectionStyles.ts` —
  `makeStyles`-based, feature-local (matches `favorites/hooks/useFavoritesScreenStyles.ts`'s pattern, not
  `@shared/hooks`, which is reserved for `shared/components`' own styles).
- `src/features/device/components/index.ts`, `src/features/device/index.ts` — barrel: exports
  `OfflineBanner`, `DeviceInfoSection`.
- `src/features/settings/screens/SettingsScreen.tsx` (+ test), `screens/index.ts`,
  `src/features/settings/index.ts` — barrel exporting `SettingsScreen`. Renders a "Device" section via
  `<DeviceInfoSection />`.

**Change:**

- `package.json` — add `codegenConfig` (`name`, `type: "modules"`, `jsSrcsDir: "specs"`, Android java
  package).
- `android/app/src/main/java/.../MainApplication.kt` — register `DeviceNetworkPackage`.
- `src/app/providers/AppProviders.tsx` — call `useDeviceNetworkMonitoring()` once.
- `src/app/navigation/MainTabs.tsx` — swap `SettingsPlaceholder` for `SettingsScreen` (wrapped in
  `ScreenErrorBoundary`, matching Explore/Favorites); wrap all three tab screens' content with
  `<OfflineBanner />`.
- `src/app/navigation/RootStack.tsx` — wrap `RepoDetailsScreenWithBoundary`'s content with
  `<OfflineBanner />` too (§6.2 lists Offline for "each list/detail screen").
- `docs/DESIGN.md` — only if a native-side deviation forces one (see below); flagged in advance, not
  expected to be large.

## Public APIs

- `specs/NativeDeviceNetwork.ts`: `Spec` (`TurboModule`) with
  `getNetworkState(): Promise<NetworkState>`, `getDeviceInfo(): Promise<DeviceInfo>`,
  `isLowPowerMode(): Promise<boolean>`, `startNetworkMonitoring(): Promise<void>`,
  `stopNetworkMonitoring(): Promise<void>`, `onNetworkStatusChanged: EventEmitter<NetworkState>`.
- `@features/device`: `OfflineBanner(): JSX.Element`, `DeviceInfoSection(): JSX.Element`, and
  `useDeviceNetworkMonitoring(): void` (exported because `AppProviders` is the one caller outside the
  feature — see §3.2's import-through-`index.ts` rule).
- `@features/settings`: `SettingsScreen(): JSX.Element`.
- Internal (not exported through the barrel, used only inside `features/device`):
  `useNetworkStatus(): NetworkState`, `useDeviceInfo(): { data, isLoading, error }`.

## Test list

- **Spec/wrapper** — `native/DeviceNetwork.test.ts`: each wrapper function calls the corresponding spec
  method and returns/forwards its result; `subscribeToNetworkStatus` wires and tears down a
  `NativeEventEmitter`/Codegen listener correctly (mocking the native module, no real native code reachable
  from Jest).
- **`networkStore.test.ts`**: default state; an update sets `isOnline`/`connectionType`/`isExpensive`.
- **`useNetworkStatus.test.tsx`**: returns the store's current state; re-renders on a store update.
- **`useDeviceNetworkMonitoring.test.tsx`**: starts monitoring + seeds state on mount; updates the store
  and calls `onlineManager.setOnline` when an event fires; stops monitoring and unsubscribes on unmount.
- **`useDeviceInfo.test.tsx`**: loading → success; loading → error (native call rejects); errors are
  logged via `shared/logger`.
- **`OfflineBanner.test.tsx`**: renders nothing while online; renders the banner with
  `accessibilityRole="alert"` (or similar) while offline.
- **`DeviceInfoSection.test.tsx`**: loading state; error state; success state showing device info +
  live network state + low-power flag.
- **`SettingsScreen.test.tsx`**: renders the Device section.
- **`MainTabs.test.tsx` / `RootStack.test.tsx`** updates: Settings tab renders `SettingsScreen` instead of
  the placeholder; `OfflineBanner` is present on all four screens.
- Native Kotlin/Swift code itself is not unit-tested from Jest (§15: "Native unit tests (JUnit/XCTest) …
  are future work") — covered only by a manual build + simulator/emulator check in step 5.

## Out of scope

- Persisting the React Query cache to MMKV, the "showing data from HH:MM" offline copy, and resuming
  paused queries on reconnect beyond the one `onlineManager.setOnline` call — all milestone 8 (§11).
- Theme mode picker (`system | light | dark`) in Settings — §9 describes it, but it isn't listed as any
  milestone's key output in the §16 table (today `ThemeProvider` only reads `useColorScheme`, with no
  `settingsStore`). Flagging this gap now rather than silently absorbing it into this step; Settings this
  step only gets the Device section milestone 7 actually asks for.
- Attaching device info to every existing `logger.error` call site (§13: "context includes device info
  from the native module"). `shared/logger` can't import a feature (one-way dependency rule), so this
  would mean threading device-info context through every call site in `repos`/`favorites`/`shared/api` by
  hand — much larger than this milestone's listed output. The Settings → Device section is the "visible
  demo … for reviewers" §10.3 actually asks for; logger integration is a follow-up, not silently done
  halfway.
- Native unit tests (JUnit/XCTest), E2E — explicit future work (§18).
- `eslint-plugin-boundaries` — future work (§18), unrelated to this step.

## Risks / open questions

- **Swift TurboModule registration mechanics.** RN 0.88's exact wiring for a pure-Swift TurboModule
  (whether it needs a tiny Obj-C++ registration shim + bridging header, or is fully header-free) isn't
  pinned down from docs alone and there's no sample in `node_modules/react-native` to copy from. I'll
  resolve this empirically against a real Xcode build (Xcode 27 is installed locally) rather than guess;
  if the clean approach doesn't compile I'll fall back to the classic Obj-C++ implementation (still
  satisfies "Swift (+ ObjC++ glue)" from §3.2, which already anticipates this) and note it as a deviation.
- **Codegen typed `EventEmitter` support.** §10.1 already flags this as unverified ("version support is
  verified at scaffold time, with `NativeEventEmitter` as fallback"). I'll try the typed Codegen emitter
  first on both platforms; if either platform's codegen output doesn't support it cleanly I'll fall back
  to a legacy `addListener`/`removeListeners` pair + `NativeEventEmitter` on the JS side, which Codegen
  TurboModules support natively.
- **Android emulator/iOS simulator availability for a manual check.** Both toolchains are present locally
  (Xcode 27, Android SDK at `~/Library/Android/sdk`, Java 17), so step 5 will include a real on-device
  smoke check (network state + device info visible in Settings, toggling airplane mode flips the
  banner) on at least one platform, ideally both.
- **`isLowPowerMode` on Android** has no exact OS equivalent of iOS's Low Power Mode;
  `PowerManager.isPowerSaveMode` (Android's battery saver) is the closest match and what §10.2 already
  specifies — documented as an approximation, not a literal equivalent.

## Follow-ups (resolved during implementation)

All four risks above were real, found only by actually building and running on both platforms
(Xcode 27 + Android SDK/emulator, both available locally) rather than guessing:

- **Swift TurboModule registration**: a pure-Swift class conforming directly to the generated
  `NativeDeviceNetworkSpec` protocol fails at Swift→Clang-module-import time (`import ReactCodegen`
  doesn't resolve from Swift — that header is Objective-C **mixed with C++**, which Swift's
  importer can't parse). The working split: `DeviceNetwork.swift` is plain Swift/Foundation only
  (`DeviceNetworkImpl`, no React types); `DeviceNetwork.h`/`.mm` is the Objective-C++ adapter that
  subclasses `NativeDeviceNetworkSpecBase` and conforms to `NativeDeviceNetworkSpec`, forwarding
  each call to `DeviceNetworkImpl`. The `.mm` forward-declares `DeviceNetworkImpl`'s interface
  instead of `#import`-ing the generated `GithubExplorer-Swift.h` umbrella header, which pulls in
  every Swift file in the target (including `SceneDelegate`, whose `React_RCTAppDelegate` import
  doesn't resolve from a plain `.mm` compile in this project).
  - Caught one real runtime crash this way that compiled clean: `DeviceNetworkImpl` needs
    `@objc(DeviceNetworkImpl)` (not bare `@objc`) or Swift exposes it to the ObjC runtime under a
    mangled name, breaking the `.mm`'s forward declaration at link time.
  - Caught a second one only by actually launching on a simulator (compiled fine, crashed at
    runtime): Swift's auto-generated selector for `startNetworkMonitoring(onUpdate:)` is
    `startNetworkMonitoringOnUpdate:`, not `startNetworkMonitoringWithOnUpdate:` as assumed — fixed
    after reproducing the exact `NSInvalidArgumentException` on-device.
- **Codegen `EventEmitter` typed support**: works on both platforms as specced (§10.1's documented
  fallback to `NativeEventEmitter` wasn't needed).
- **Android emulator/iOS simulator manual check**: done on both — real builds, real installs, real
  launches. iOS: screenshot of a clean launch after the selector fix. Android: screenshot of
  Settings → Device showing live data from the real Kotlin module (`sdk_gphone16k_arm64`, OS 17,
  low power mode Off, Network Online, Metered No).
- `codegenConfig.android.javaPackageName` in `package.json` has no effect on an **app's own**
  codegen output in this RN version (confirmed by reading `generate-artifacts-executor`'s
  source — it's hardcoded to `com.facebook.fbreact.specs` for the app, unlike third-party
  libraries). Removed the dead config key; `DeviceNetworkModule.kt`/`DeviceNetworkPackage.kt` live
  in the app's own `com.royschonberg.githubexplorer.devicenetwork` package as usual and just import
  the generated `com.facebook.fbreact.specs.NativeDeviceNetworkSpec`.
- On Android 16 (API 36, this project's `targetSdkVersion`), the first network-related activity in
  a debug build triggers an OS permission prompt for `ACCESS_LOCAL_NETWORK` ("find, connect to, and
  determine the relative position of nearby devices") — this is React Native's own dev-tooling
  (Metro's local-network connection) on this SDK level, not something `DeviceNetwork` requests or
  needs; confirmed by checking the merged manifest, where only RN's own debug tooling adds it.
- `specs/` gets a `@specs/*` path alias (tsconfig + babel-plugin-module-resolver + Jest
  `moduleNameMapper`), matching the existing `@app`/`@features`/`@shared` pattern, so
  `features/device/native` doesn't need a deep `../../../../specs` relative import.

## Deviations from DESIGN.md

None anticipated in the design itself. Two things worth calling out as refinements rather than
deviations, both already covered above: `OfflineBanner`'s copy is simplified to "You're offline" (no
timestamp) until milestone 8 adds the persisted-cache data it needs; and the theme-mode picker gap in §9
is left for whichever future step actually claims it, rather than bundled in here uninvited.
