# Metro Reader Android wrapper

Run `./android/build-apk.sh` from the repository root to build `MetroReader-debug.apk`.

The script builds the Vite app first, copies `dist/` into the APK assets, compiles a small native WebView activity, signs the result with a local debug key, and verifies the APK.
