# IDGate — Native App (Capacitor) Runbook

IDGate ships as a web app (GitHub Pages) **and** as a native iOS / Android app via
[Capacitor](https://capacitorjs.com). The web build is already native-friendly, so the
native shell wraps the exact same bundle — no separate codebase.

- **App ID:** `io.github.mhisham744.idgate`
- **App name:** `IDGate`
- **Web dir:** `dist/` (Vite build output)
- **Capacitor:** v8 (iOS uses Swift Package Manager — no CocoaPods needed to open the project)

The generated `ios/` and `android/` projects are committed; only build artifacts
(Pods, `build/`, `.gradle/`, the copied `public/` web assets) are git-ignored — see
[.gitignore](.gitignore).

---

## Why the web build "just works" natively

- `vite.config.ts` uses `base: './'` → relative asset URLs load under `capacitor://` / `file://`.
- The app uses `HashRouter` (`src/main.tsx`) → no server-side routing needed.
- `index.html` has `viewport-fit=cover` and the UI reserves the notch with
  `env(safe-area-inset-*)`, so drawing under the status bar looks right.
- `src/native.ts` (`initNative()`, called from `src/main.tsx`) is guarded by
  `Capacitor.isNativePlatform()` — a **no-op on web**, and on device it makes the status
  bar overlay the web view (dark icons for the light UI) and hides the splash screen.

---

## Prerequisites

### iOS
- macOS with **Xcode** (App Store) + Xcode Command Line Tools (`xcode-select --install`).
- An Apple Developer account for device builds / App Store submission.
- (Capacitor 8 uses SwiftPM, so CocoaPods is **not** required. If a plugin still needs it:
  `sudo gem install cocoapods`.)

### Android
- **Android Studio** (includes the Android SDK + platform tools).
- **JDK 21** (bundled with recent Android Studio, or install via `brew install openjdk@21`).
- Set `ANDROID_HOME` (usually `~/Library/Android/sdk`) on your `PATH`.

> This project's web edits require no native tooling. You only need the above to build /
> run the native apps.

---

## Everyday workflow

```bash
# 1. Rebuild the web bundle and copy it into both native projects
npm run cap:sync          # == vite build && cap sync

# 2. Open a native IDE
npm run cap:ios           # opens ios/App in Xcode
npm run cap:android       # opens android/ in Android Studio

# health check
npm run cap:doctor
```

Then press **Run** in Xcode / Android Studio to launch on a simulator/emulator or a
connected device. Re-run `npm run cap:sync` after any web change.

### Live-reload against the dev server (optional)
For fast iteration you can point the native shell at the Vite dev server instead of the
bundled `dist/`. Temporarily add to `capacitor.config.ts`:

```ts
server: { url: 'http://<your-LAN-ip>:5173', cleartext: true }
```

Run `npm run dev`, then `npx cap run ios` / `npx cap run android`. **Remove the `server`
block before shipping** so the app serves the offline bundle.

---

## First-time native setup (if `ios/` or `android/` is missing)

```bash
npm install
npm run build             # produces dist/
npx cap add ios           # generates ios/
npx cap add android       # generates android/
npx cap sync
```

---

## App icons & splash screen

Drop a 1024×1024 `icon.png` (and optional `splash.png`) in a `resources/` folder and run:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate
```

This regenerates all icon/splash densities for both platforms.

### Dark-mode launch screen (optional polish)
The status-bar icon style is already theme-aware at runtime (`src/native.ts` reads the
persisted theme and re-applies on toggle). The **native launch screen** shown before the
web view attaches is static, though — we keep its hold at `launchShowDuration: 0` and hide
the splash from JS so dark-mode users don't get a lingering white flash. For a pixel-perfect
dark launch, customize the platform launch assets directly:
- **iOS:** edit `ios/App/App/Base.lproj/LaunchScreen.storyboard` (supports a dark appearance variant).
- **Android:** provide a `values-night/` splash background under `android/app/src/main/res/`.


---

## Release checklist

### iOS → App Store
1. In Xcode: select the **App** target → **Signing & Capabilities** → set your Team; the
   bundle ID is `io.github.mhisham744.idgate`.
2. Bump the version/build under **General → Identity**.
3. **Product → Archive**, then **Distribute App → App Store Connect**.
4. In [App Store Connect](https://appstoreconnect.apple.com): create the app record, add
   screenshots, privacy details (this demo stores everything in local device storage — no
   backend, no tracking), then submit for review.

### Android → Play Store
1. Create a signing keystore (keep it safe — it's required for every future update):
   ```bash
   keytool -genkey -v -keystore idgate-release.keystore -alias idgate \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Configure signing in `android/app/build.gradle` (or via Android Studio's
   **Build → Generate Signed Bundle/APK**).
3. Build an **Android App Bundle**: **Build → Generate Signed Bundle / APK → AAB**.
4. In the [Play Console](https://play.google.com/console): create the app, complete the
   data-safety form (local-only storage, no data collected), upload the `.aab`, and submit.

---

## Notes
- Web deployment (GitHub Pages) is unaffected by any of the above — `base: './'` serves
  both Pages and the native shell from the same build.
- A native wrapper also sidesteps browser HTTP caching, so testers always get the bundled
  build rather than a stale cached web version.
