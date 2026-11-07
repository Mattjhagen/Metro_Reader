import JSZip from 'jszip';

/**
 * Creates a ready-to-build Android Studio project (.zip) with AndroidManifest.xml,
 * build.gradle, and MainActivity.kt configured for Metro Reader
 */
export async function generateAndroidProjectZip(): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('MetroReader_Android_Project') || zip;

  // 1. root build.gradle
  root.file(
    'build.gradle',
    `// Top-level build file for Metro Reader Android Project
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
`
  );

  // 2. settings.gradle
  root.file(
    'settings.gradle',
    `include ':app'
rootProject.name = "MetroReader"
`
  );

  // 3. app/build.gradle
  const appFolder = root.folder('app') || root;
  appFolder.file(
    'build.gradle',
    `plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    namespace 'com.metroreader.audiobook'
    compileSdk 34

    defaultConfig {
        applicationId "com.metroreader.audiobook"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.webkit:webkit:1.10.0'
}
`
  );

  // 4. AndroidManifest.xml
  const mainFolder = appFolder.folder('src')?.folder('main') || appFolder;
  mainFolder.file(
    'AndroidManifest.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Metro Reader"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.MetroReader"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:theme="@style/Theme.MetroReader.Fullscreen">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`
  );

  // 5. MainActivity.kt
  const javaFolder =
    mainFolder.folder('java')?.folder('com')?.folder('metroreader')?.folder('audiobook') ||
    mainFolder;
  javaFolder.file(
    'MainActivity.kt',
    `package com.metroreader.audiobook

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        // Loads the PWA cloud or local offline assets
        val appUrl = "${typeof window !== 'undefined' ? window.location.origin : 'https://metroreader.app'}"
        webView.loadUrl(appUrl)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
`
  );

  // 6. README instructions for APK compilation
  root.file(
    'HOW_TO_BUILD_APK.txt',
    `====================================================================
METRO READER - ANDROID APK BUILD INSTRUCTIONS
====================================================================

You have two simple ways to get the APK on Android:

--------------------------------------------------------------------
METHOD 1: NATIVE WEBAK (ZERO COMPILATION NEEDED - INSTANT)
--------------------------------------------------------------------
1. Open Metro Reader in Google Chrome on your Android phone.
2. Tap the three dots (menu) in Chrome -> tap "Install app" or "Add to Home screen".
3. Android's WebAPK service automatically compiles and installs a signed APK
   with full background audio playback, lock screen controls, and standalone window!

--------------------------------------------------------------------
METHOD 2: BUILD SIGNED / DEBUG APK WITH ANDROID STUDIO / GRADLE
--------------------------------------------------------------------
1. Unzip this package.
2. Open Android Studio -> Select "Open an Existing Project" -> choose this folder.
3. Wait for Gradle sync to complete.
4. Click: Build -> Build Bundle(s) / APK(s) -> Build APK(s).
5. Your compiled 'app-debug.apk' will be generated in:
   app/build/outputs/apk/debug/app-debug.apk
6. Transfer this APK to any Android phone and tap to install!

Or run in terminal:
   ./gradlew assembleDebug
`
  );

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `MetroReader_Android_APK_Project.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
}
