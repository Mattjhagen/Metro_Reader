# Metro Reader — Minimalist Audiobook Studio 🎧

**Metro Reader** is a Progressive Web App (PWA) designed with a clean, typography-first Metro UI aesthetic. It lets you upload books in any format (**EPUB, PDF, DOCX, TXT, Markdown**, or import directly from **Google Drive**) and converts them into audiobooks using **ElevenLabs Neural Text-to-Speech**.

---

## ✨ Features

- **Universal Book Parser**:
  - **EPUB**: Extracts chapters, table of contents, and embedded cover art.
  - **PDF**: Automatic page grouping and text extraction via PDF.js.
  - **DOCX**: Document text conversion via Mammoth.
  - **TXT / Markdown**: Automatic heading and chapter detection.
  - **Google Drive**: Browse, search, and import books directly from cloud storage.

- **ElevenLabs AI Speech Synthesis**:
  - Preloaded neural voices (*Rachel, Adam, Antoni, Bella, George, Arnold, Nicole*) + your custom cloned voices.
  - Model options: *Multilingual v2* (highest quality), *Turbo v2.5* (fast & cheap), *Flash v2.5*, and *Monolingual v1*.
  - Smart natural sentence and paragraph chunking under character limits.
  - Custom voice parameters (Stability, Clarity / Similarity Boost).
  - Offline demo synthesizer fallback for testing without credits.

- **Audiobook Player & Reading System**:
  - Full transport controls: Play/Pause, -15s jump back, +30s skip forward, 0.75x–2.0x playback speed.
  - Sleep timer (15m, 30m, 45m, 60m).
  - Read-along synchronized text transcript.
  - MediaSession API integration for native iOS & Android lock-screen controls and background audio.

- **Progress Tracking & Bookmarks (IndexedDB)**:
  - Automatically saves listening timestamps and calculates percentage read.
  - **+ Bookmark** feature: Save specific audio timestamps with custom notes.
  - Stored offline in your device's local database.

- **Export & Download Options**:
  - **Single Complete MP3**: Downloads all converted chapters concatenated into one seamless file.
  - **Chapters ZIP Archive**: Downloads a `.zip` archive containing numbered chapter MP3s and a `README.txt` tracklist.

- **Cross-Platform PWA & Android APK**:
  - Installable on **iOS Safari** and **Android Chrome**.
  - **1-Click WebAPK**: Runs in standalone mode with native launcher icon and splash screen.
  - **Android Studio APK Project**: Downloadable ready-to-compile project with `build.gradle`, `AndroidManifest.xml`, and `MainActivity.kt`.

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **Node.js** (version 18 or higher)
- **npm** or **bun**
- An **ElevenLabs API Key** ([elevenlabs.io](https://elevenlabs.io/))

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone <your-repo-url>
cd metro-reader

# Install all dependencies
npm install
```

### 3. Environment Variables Setup
Copy the example environment file:
```bash
cp .env.example .env
```

Open `.env` and configure your keys:
```env
# Optional: Pre-configured ElevenLabs API Key (users can also enter it in the app UI)
ELEVENLABS_API_KEY="your_elevenlabs_api_key_here"

# Application host URL (used for OAuth redirects)
APP_URL="http://localhost:3000"
```

> **Note**: You can also enter or update your ElevenLabs API key directly within the app by navigating to the **settings** pivot.

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 5. Production Build
```bash
# Compile and bundle the PWA
npm run build

# Preview the production build locally
npm run preview
```

---

## 🔑 ElevenLabs Setup

1. Sign up or log in at [elevenlabs.io](https://elevenlabs.io/).
2. Navigate to your profile settings to obtain your API key (`xi-...`).
3. In Metro Reader:
   - Tap the **settings** pivot at the top (or press `(⚙)` on the bottom bar).
   - Paste your key into the **ELEVENLABS API KEY** field.
   - Tap **SAVE & VERIFY**.
   - Your account tier and remaining character quota will be displayed.

---

## ☁️ Google Drive Import Setup

Metro Reader includes a Google Drive cloud file picker:
1. In the bottom bar, tap the **`...`** (More) button and select **Import books from Google Drive** (or tap **Connect Drive** in Settings).
2. Click **Sign in with Google** to authorize read access for books.
3. Search and select any `.epub`, `.pdf`, `.docx`, `.txt`, or Google Doc from your Drive.
4. Metro Reader will automatically download, parse chapters, and add the book to your library.

---

## 📱 Installing on Mobile Devices (PWA)

### iOS (iPhone & iPad Safari)
1. Open the app URL in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. Metro Reader will launch as a standalone app with full-screen layout and lock screen controls.

### Android (Google Chrome)
1. Open the app URL in **Chrome**.
2. Tap the three dots (menu) in the upper right.
3. Tap **Install app** or **Add to Home Screen**.
4. Android will generate a native WebAPK with full offline caching and background audio support.

---

## 📦 Building an Android APK (.apk)

Metro Reader provides two options for Android:

### Option A: Instant WebAPK (Zero build tools required)
Follow the Android PWA installation steps above. Android compiles a signed WebAPK that behaves like a native app.

### Option B: Native Android Studio Project (.zip)
1. In the app, open the **settings** pivot and click **Open APK Options** (or select **Install Android APK / WebAPK** from the bottom bar).
2. Click **Download Android Studio Project (.zip)**.
3. Unzip the downloaded file.
4. Open **Android Studio** and select **Open an Existing Project**, choosing the unzipped folder.
5. Build the APK:
   ```bash
   ./gradlew assembleDebug
   ```
   Or inside Android Studio: `Build -> Build Bundle(s) / APK(s) -> Build APK(s)`.
6. Your APK file will be located at:
   `app/build/outputs/apk/debug/app-debug.apk`

---

## 🛠️ Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **PWA & Offline**: `vite-plugin-pwa`, Workbox, Service Workers, Web App Manifest
- **Local Database**: IndexedDB (`idb-keyval`) for chapters, audio blobs, progress, and bookmarks
- **Document Parsers**: `JSZip` (EPUB), `pdfjs-dist` (PDF), `mammoth` (DOCX)
- **Audio & Media**: HTML5 Audio, Web Audio API, MediaSession API
- **Cloud & Auth**: Firebase Auth (Google OAuth 2.0 with Drive scopes)
- **Styling**: Tailwind CSS v4, typography-first Metro UI design system
- **Icons**: Lucide React + custom Metro Reader vector branding

---

## 📄 License
Apache-2.0
