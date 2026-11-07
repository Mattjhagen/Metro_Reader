#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
SDK_DIR="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
BUILD_TOOLS="$SDK_DIR/build-tools/36.0.0"
ANDROID_JAR="$SDK_DIR/platforms/android-36/android.jar"
BUILD_DIR="$ANDROID_DIR/build"
ASSETS_DIR="$ANDROID_DIR/src/main/assets"
KEYSTORE="$ROOT_DIR/.metroreader-debug.keystore"

if [[ ! -x "$BUILD_TOOLS/aapt2" || ! -f "$ANDROID_JAR" ]]; then
  echo "Android SDK 36.0.0 was not found at $SDK_DIR" >&2
  exit 1
fi

cd "$ROOT_DIR"
npm run build
rm -rf "$BUILD_DIR" "$ASSETS_DIR"
mkdir -p "$BUILD_DIR/classes" "$BUILD_DIR/gen" "$BUILD_DIR/dex" "$BUILD_DIR/res" "$ASSETS_DIR"
cp -R dist/. "$ASSETS_DIR/"

"$BUILD_TOOLS/aapt2" compile --dir "$ANDROID_DIR/src/main/res" -o "$BUILD_DIR/res/resources.zip"
"$BUILD_TOOLS/aapt2" link \
  -o "$BUILD_DIR/unsigned.apk" \
  --manifest "$ANDROID_DIR/src/main/AndroidManifest.xml" \
  -I "$ANDROID_JAR" \
  --java "$BUILD_DIR/gen" \
  --min-sdk-version 24 \
  --target-sdk-version 36 \
  --version-code 1 \
  --version-name 1.0.0 \
  "$BUILD_DIR/res/resources.zip"

javac -source 8 -target 8 -classpath "$ANDROID_JAR" -d "$BUILD_DIR/classes" \
  "$BUILD_DIR/gen/com/metroreader/audiobook/R.java" \
  "$ANDROID_DIR/src/main/java/com/metroreader/audiobook/MainActivity.java"
mapfile -t CLASS_FILES < <(find "$BUILD_DIR/classes" -name '*.class' -print)
"$BUILD_TOOLS/d8" --lib "$ANDROID_JAR" --output "$BUILD_DIR/dex" "${CLASS_FILES[@]}"

cd "$BUILD_DIR"
cp unsigned.apk unsigned-with-assets.apk
jar uf unsigned-with-assets.apk -C dex classes.dex
cd "$ANDROID_DIR/src/main"
jar uf "$BUILD_DIR/unsigned-with-assets.apk" assets
cd "$BUILD_DIR"
"$BUILD_TOOLS/zipalign" -f 4 unsigned-with-assets.apk aligned.apk

if [[ ! -f "$KEYSTORE" ]]; then
  keytool -genkeypair -v -keystore "$KEYSTORE" -storepass android \
    -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
fi
"$BUILD_TOOLS/apksigner" sign --ks "$KEYSTORE" --ks-pass pass:android \
  --key-pass pass:android --out "$ROOT_DIR/MetroReader-debug.apk" aligned.apk
"$BUILD_TOOLS/apksigner" verify --verbose "$ROOT_DIR/MetroReader-debug.apk"
echo "Built $ROOT_DIR/MetroReader-debug.apk"
