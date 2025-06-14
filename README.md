# ProductivityApp

A mobile-first personal productivity application built with React Native and Expo, featuring task management and markdown-compatible notes with search capabilities.

## 🚀 Features

- **Task Management**: Create, update, and track tasks with persistent storage
- **Markdown Notes**: Write and preview notes with full markdown support
- **Voice Recordings**: Record audio memos and attach them to notes
- **Offline Transcription**: Convert speech to text using local Whisper models (100% offline)
- **Search**: Find notes and tasks quickly with real-time search
- **Cross-Platform**: Works on iOS, Android, and Web
- **Offline First**: All data stored locally using SQLite
- **Modern UI**: Clean, intuitive interface with bottom tab navigation

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)
- **Git**: For cloning the repository

### Platform-Specific Requirements

#### Android Development
- **Java**: JDK 17 (required for Android builds)
- **Android Studio**: For Android SDK and emulator
- **Android SDK**: API Level 34

#### iOS Development (macOS only)
- **Xcode**: Version 14 or higher
- **CocoaPods**: For iOS dependencies
- **iOS Simulator**: Included with Xcode

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ProductivityApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install iOS dependencies** (macOS only)
   ```bash
   cd ios && pod install && cd ..
   ```

## 🏃‍♂️ Running the App

### Development Server

Start the Expo development server:
```bash
npm start
```

This will open the Expo Dev Tools in your browser with options to run on different platforms.

### Platform-Specific Commands

#### Android
```bash
npm run android
```

Requirements:
- Android emulator running OR physical device connected via USB with debugging enabled
- ANDROID_HOME environment variable set

#### iOS (macOS only)
```bash
npm run ios
```

Requirements:
- iOS Simulator installed via Xcode
- Or physical device with Expo Go app installed

#### Web
```bash
npm run web
```

Opens the app in your default web browser at http://localhost:19006


## 🔨 Building

### Android APK/AAB

#### Debug Build

**Prerequisites:**
- Ensure Java 17 is installed and configured:
  ```bash
  brew install openjdk@17
  export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.15/libexec/openjdk.jdk/Contents/Home
  export PATH=$JAVA_HOME/bin:$PATH
  ```

- Set up Android SDK environment:
  ```bash
  export ANDROID_SDK_ROOT=/Users/$USER/Library/Android/sdk
  export PATH=$ANDROID_SDK_ROOT/platform-tools:$PATH
  ```

**Build Process:**
1. **Create JavaScript bundle:**
   ```bash
   npx react-native bundle --platform android --dev false --entry-file index.ts --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
   ```

2. **Build APK:**
   ```bash
   cd android
   export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.15/libexec/openjdk.jdk/Contents/Home
   export PATH=$JAVA_HOME/bin:$PATH
   ./gradlew assembleDebug
   ```

3. **Install on emulator/device:**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Release Build

1. **Generate a keystore** (first time only):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing** in `android/gradle.properties`:
   ```properties
   RELEASE_STORE_FILE=release.keystore
   RELEASE_KEY_ALIAS=release
   RELEASE_STORE_PASSWORD=your_password
   RELEASE_KEY_PASSWORD=your_password
   ```

3. **Build release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### iOS Build (macOS only)

```bash
npx expo prebuild --platform ios
cd ios
xcodebuild -workspace ProductivityApp.xcworkspace -scheme ProductivityApp -configuration Release
```

Or use Xcode GUI for easier configuration and signing.

## 📁 Project Structure

```
ProductivityApp/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components (Tasks, Notes, etc.)
│   ├── navigation/      # Navigation configuration
│   ├── services/        # Business logic and data services
│   ├── database/        # Database layer and migrations
│   ├── types/           # TypeScript type definitions
│   └── constants/       # Theme and app constants
├── tasks/              # Project planning and documentation
├── App.tsx             # Root component
├── app.json           # Expo configuration
└── package.json       # Dependencies and scripts
```

## 🗄️ Database

The app uses SQLite for local data storage with a migration system:

- **Tasks**: Title, description, completion status
- **Notes**: Markdown content, search indexing, categories, tags
- **Recordings**: Audio files with metadata and transcriptions
- **Tags**: For organizing notes and content
- **Cross-platform**: Falls back to localStorage on web

## 🎙️ Voice Recording & Transcription

The app includes advanced voice recording capabilities with offline transcription:

### Features
- **High-quality audio recording** using Expo AV
- **Offline speech-to-text** using local Whisper models (no internet required)
- **Automatic transcription** (optional setting)
- **Manual transcription** for existing recordings
- **Recording management** (play, pause, delete, favorite)
- **Note attachment** - recordings can be linked to specific notes

### Privacy & Security
- **100% offline processing** - audio never leaves your device
- **Local model storage** - Whisper models downloaded once and cached
- **No cloud services** - complete privacy for sensitive recordings

### Usage
1. Open any note in the editor
2. Tap the recording button to start voice memo
3. Save the recording to automatically link it to your note
4. Enable auto-transcription in settings for automatic speech-to-text
5. Or manually transcribe by expanding the transcription section

### Technical Details
- Uses OpenAI's Whisper model for high-accuracy transcription
- Model size: ~38MB (Tiny English model)
- Supports chunking for long recordings
- Background processing with progress indicators

## 🧪 Development Tips

### Hot Reload
The app supports Fast Refresh. Save your changes and they'll appear instantly.

### Debugging
- **React Native Debugger**: Shake device or press Cmd+D (iOS) / Cmd+M (Android)
- **Console logs**: View in terminal running the dev server
- **Redux DevTools**: If using Redux (not currently implemented)

### TypeScript
The project uses TypeScript with strict mode. Run type checking:
```bash
npx tsc --noEmit
```

### Clearing Cache
If you encounter strange errors:
```bash
npx expo start --clear
```

## 🚧 Troubleshooting

### Common Issues

#### "Unable to locate a Java Runtime"
**macOS:**
```bash
brew install openjdk@17
```

**Linux:**
```bash
# Install via SDKMAN (recommended)
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh
sdk install java 17.0.11-tem
```

#### "Android SDK not found"
Set environment variables in `~/.zshrc` or `~/.bashrc`:

**macOS:**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Linux:**
```bash
export ANDROID_HOME=/home/$USER/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

#### "Cannot run program cmake" or "ninja: command not found"
**Linux Only:** Install required build tools:
```bash
sudo apt-get update
sudo apt-get install -y ninja-build cmake
```

If you have pyenv, ensure system binaries are prioritized:
```bash
export PATH=/usr/bin:$PATH
```

#### "[CXX1101] NDK did not have a source.properties file"
This error occurs when the NDK installation is incomplete. Solutions:

1. **Let Gradle auto-install NDK (recommended):**
   ```bash
   # Remove incomplete NDK
   rm -rf $ANDROID_HOME/ndk/27.1.12297006
   # Gradle will download the correct version automatically
   ```

2. **Or install via Android Studio:**
   - Open Android Studio
   - Go to SDK Manager
   - Install NDK (Side by side) version 27.0.12077973 or newer

#### "Hard link failed" warnings during build
These warnings are normal and don't affect the build. They occur when building across different filesystems.

#### Build failures
1. Clear all caches:
   ```bash
   npx expo prebuild --clear
   npm start -- --reset-cache
   ```

2. Clean and rebuild:
   ```bash
   cd android && ./gradlew clean && cd ..
   cd ios && xcodebuild clean && cd ..
   ```

3. **Linux specific:** If build fails with PATH issues:
   ```bash
   export PATH=/usr/bin:$PATH
   source ~/.sdkman/bin/sdkman-init.sh
   export ANDROID_HOME=/home/$USER/Android/Sdk
   export PATH=$ANDROID_HOME/platform-tools:$PATH
   cd android && ./gradlew assembleDebug
   ```

## 🤖 Agent-Friendly Development Guide

This section provides prescriptive advice for AI agents (like Claude, ChatGPT, or Cursor) working on this codebase, based on lessons learned from development sessions.

### Current System State (June 2024) ✅
- **OS**: Pop!_OS 22.04 LTS (Ubuntu-based)
- **Node.js**: v18.20.5 
- **Java**: Temurin-17.0.11+9 via SDKMAN ✅
- **Android SDK**: Installed at `/home/$USER/Android/Sdk` ✅
- **Available AVD**: `Medium_Phone_API_35` ✅
- **Whisper.rn**: v0.4.0-rc.12 (amx.cpp files fixed) ✅
- **Status**: ✅ Voice recording and Whisper transcription features DEPLOYED SUCCESSFULLY
- **APK**: 190MB debug build working on emulator ✅

### Recently Resolved Issues (June 2024)

1. **Whisper.rn Build Failure**: Fixed by upgrading from v0.4.0-rc.11 to v0.4.0-rc.12
   - Issue: Missing `cpp/amx/amx.cpp` files causing CMake errors
   - Solution: Use latest RC version which includes required files

2. **expo-speech-recognition Plugin Error**: Fixed by complete removal
   - Issue: Plugin reference remained in app.json after npm uninstall
   - Solution: Remove from both package.json AND app.json plugins array

3. **Java Version Mismatch**: Environment setup was incomplete
   - Issue: Gradle couldn't find Java 17 despite SDKMAN installation
   - Solution: Must run `source ~/.sdkman/bin/sdkman-init.sh` before build

4. **pyenv cmake Conflict**: System path priority issue
   - Issue: Gradle used pyenv cmake instead of system cmake
   - Solution: Set `export PATH=/usr/bin:$PATH` before Android SDK paths

### Critical Lessons Learned

1. **SQLite API Compatibility**
   - ❌ NEVER use `openDatabase` or WebSQL-style APIs in React Native
   - ✅ ALWAYS use Expo SQLite's async API: `openDatabaseAsync`, `execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`
   - The app will crash with "r.openDatabase is not a function" if you use the old API

2. **Android Build Process**
   - The JavaScript bundle MUST be created before building the APK
   - Use `index.ts` not `index.js` as the entry file
   - Java 17 is required (not Java 11 or 18+)

3. **Database Persistence**
   - Always initialize the database before use
   - Use proper error handling - the app should gracefully handle database failures
   - In-memory storage is fine for web, but mobile MUST use SQLite

4. **Database Connection Management (CRITICAL)**
   - ❌ NEVER create multiple database connections - causes race conditions and "failed to save/load" errors
   - ✅ ALWAYS use centralized DatabaseConnection singleton (`src/database/DatabaseConnection.ts`)
   - ❌ Don't use `SQLite.openDatabaseAsync()` in multiple service classes
   - ✅ Import and use `dbConnection` from the centralized manager
   - Intermittent failures are usually caused by database lock conflicts between services

5. **Transaction Management**
   - ✅ ALWAYS wrap multi-step operations in transactions (create note + search index + tags)
   - ✅ Use `dbConnection.runInTransaction()` for complex operations
   - ❌ Don't run separate database operations without transaction coordination
   - This prevents data inconsistency and reduces lock conflicts

6. **Connection Lifecycle Management (CRITICAL)**
   - ✅ App automatically closes database connections when backgrounded to prevent locks
   - ✅ Connections are re-initialized when app becomes active again
   - ✅ Database includes health checks and automatic reconnection on failures
   - ❌ NEVER manually create SQLite connections - use only the centralized manager
   - The app handles connection cleanup in `App.tsx` using AppState listeners

### Step-by-Step Android Build Instructions

#### Prerequisites for APK Building

**System Requirements:**
- Ubuntu/Pop!_OS 22.04 or similar Debian-based Linux
- At least 8GB RAM (16GB recommended for building)
- 20GB+ free disk space for Android SDK/NDK

**Step 1: Install Required System Packages**
```bash
sudo apt-get update
sudo apt-get install -y ninja-build cmake
```

**Step 2: Install Java 17 via SDKMAN**
```bash
# Install SDKMAN (if not already installed)
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh

# Install Java 17
sdk install java 17.0.11-tem
```

**Step 3: Set Up Android SDK**
1. Download Android Studio from https://developer.android.com/studio
2. Install and run Android Studio
3. Go to Settings > Appearance & Behavior > System Settings > Android SDK
4. Install:
   - Android SDK Platform 35 (API Level 35)
   - Android SDK Build-Tools 35.0.0
   - Android Emulator
   - Intel x86 Emulator Accelerator (HAXM installer) - if using Intel CPU

**Step 4: Create Android Virtual Device (AVD)**
1. Open AVD Manager in Android Studio
2. Create a new virtual device:
   - Device: Medium Phone or similar
   - System Image: API 35 (Google Play)
   - Name: `Medium_Phone_API_35`

**Step 5: Set Environment Variables**
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=/home/$USER/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

**Step 6: Fix pyenv PATH Issues (if using pyenv)**
If you have pyenv installed, ensure system binaries are prioritized:
```bash
# Add to ~/.bashrc or run before building
export PATH=/usr/bin:$PATH
```

**Step 7: Install Node.js Dependencies**
```bash
npm install
```

**Note:** NDK will be automatically downloaded and installed during the first build.

#### Verified Working Build Process (Pop!_OS 22.04) ✅

**Prerequisites Confirmed:**
- ✅ Java 17 via SDKMAN (Temurin-17.0.11+9) 
- ✅ Android SDK installed at `/home/$USER/Android/Sdk`
- ✅ Android emulator `Medium_Phone_API_35` available
- ✅ Whisper.rn v0.4.0-rc.12 (fixed missing amx.cpp files)

**Successful Build Commands:**

```bash
# 1. Set up environment (CRITICAL - include SDKMAN and PATH priority)
source ~/.sdkman/bin/sdkman-init.sh
export PATH=/usr/bin:$PATH  # Prioritize system cmake over pyenv
export ANDROID_HOME=/home/$USER/Android/Sdk
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH

# 2. Start Android emulator
$ANDROID_HOME/emulator/emulator -avd Medium_Phone_API_35 -no-snapshot &

# 3. Wait for emulator and verify connection
sleep 30 && adb devices

# 4. Create JavaScript bundle (REQUIRED)
npx react-native bundle --platform android --dev false --entry-file index.ts --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# 5. Clean prebuild (if needed after dependency changes)
npx expo prebuild --platform android --clean

# 6. Build APK
cd android
./gradlew assembleDebug
cd ..

# 7. Install and launch
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.anonymous.ProductivityApp/.MainActivity
```

**Verified Results (June 2024):**
- ✅ **APK Size:** 190MB (includes Whisper.rn native libraries)
- ✅ **Build Time:** ~8 minutes (with NDK already cached)
- ✅ **APK Location:** `android/app/build/outputs/apk/debug/app-debug.apk`
- ✅ **App Status:** Successfully deployed and running

**Critical Success Factors:**
1. **SDKMAN Java 17**: Must run `source ~/.sdkman/bin/sdkman-init.sh` first
2. **System PATH Priority**: `export PATH=/usr/bin:$PATH` prevents pyenv cmake conflicts
3. **Whisper.rn v0.4.0-rc.12**: Newer version has required amx.cpp files
4. **Remove expo-speech-recognition**: From both package.json AND app.json plugins
5. **Prebuild after changes**: Run `npx expo prebuild --platform android --clean` after dependency changes

#### Building the APK

**Linux/Ubuntu:**
```bash
# 1. Set up Java 17 environment
source ~/.sdkman/bin/sdkman-init.sh
export ANDROID_HOME=/home/$USER/Android/Sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH

# 2. Bundle JavaScript (CRITICAL - don't skip!)
npx react-native bundle --platform android --dev false --entry-file index.ts --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# 3. Build the APK
cd android
./gradlew assembleDebug

# 4. Install on device/emulator
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**macOS:**
```bash
# 1. Set up Java 17 environment
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.15/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

# 2. Set up Android SDK environment
export ANDROID_SDK_ROOT=/Users/$USER/Library/Android/sdk
export PATH=$ANDROID_SDK_ROOT/platform-tools:$PATH

# 3. Bundle JavaScript (CRITICAL - don't skip!)
npx react-native bundle --platform android --dev false --entry-file index.ts --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# 4. Build the APK
cd android
./gradlew assembleDebug

# 5. Install on device/emulator
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Common Pitfalls to Avoid

1. **Navigation State**
   - Lists don't automatically refresh when navigating back
   - Add focus listeners to reload data: `navigation.addListener('focus', loadData)`

2. **TypeScript Imports**
   - The entry file is `index.ts`, not `index.js`
   - Always verify import paths before running builds

3. **State Management**
   - Don't rely on in-memory state for production features
   - Always implement proper persistence from the start

4. **Database Connection Issues**
   - If you see "failed to save note" or "failed to load note" intermittently:
     * Check for multiple `SQLite.openDatabaseAsync()` calls across services
     * Ensure all services use `dbConnection` from `DatabaseConnection.ts`
     * Verify multi-step operations are wrapped in transactions
   - Race conditions occur when services access the database simultaneously

### Recommended Development Workflow

1. **Before Making Database Changes:**
   - Check existing migration files in `/src/database/migrations/`
   - Verify the current database schema
   - Test migrations on both iOS and Android

2. **When Adding New Features:**
   - Start with the database schema/migrations
   - Implement the service layer with proper error handling
   - Add UI components last
   - Test persistence by force-closing and reopening the app

3. **For Debugging:**
   - Use `adb logcat -s ReactNativeJS:D` for React Native logs
   - Check for SQLite errors specifically
   - Verify the database file exists at the expected location

### Code Patterns to Follow

1. **Database Operations:**
   ```typescript
   // Good - Use centralized connection
   import { dbConnection } from '../database/DatabaseConnection';
   await dbConnection.initialize();
   await dbConnection.runAsync('INSERT INTO...');
   
   // Bad - Multiple connections cause lock conflicts
   const db = await SQLite.openDatabaseAsync('productivity.db');
   await db.runAsync('INSERT INTO...');
   
   // Good - Use transactions for multi-step operations
   await dbConnection.runInTransaction(async (db) => {
     await db.runAsync('INSERT INTO notes...');
     await db.runAsync('INSERT INTO notes_search...');
     return result;
   });
   ```

2. **Service Layer:**
   ```typescript
   // Good - Use centralized connection with error handling
   import { dbConnection } from '../database/DatabaseConnection';
   
   async createNote(data: CreateNoteRequest): Promise<Note> {
     await dbConnection.initialize();
     
     return await dbConnection.runInTransaction(async (db) => {
       // Multi-step operations in single transaction
       const result = await db.runAsync('INSERT INTO notes...');
       await db.runAsync('INSERT INTO notes_search...');
       return noteData;
     });
   }
   
   // Bad - Multiple database connections
   private db: SQLite.SQLiteDatabase | null = null;
   async initialize() {
     this.db = await SQLite.openDatabaseAsync('productivity.db');
   }
   ```

3. **Screen Components:**
   ```typescript
   // Add focus listeners for data refresh
   useEffect(() => {
     const unsubscribe = navigation.addListener('focus', loadData);
     return unsubscribe;
   }, [navigation]);
   ```

### Testing Checklist

Before considering a feature complete:
- [ ] Create data and verify it appears in the UI
- [ ] Force close the app and reopen - data should persist
- [ ] Search/filter functionality works as expected
- [ ] No console errors or warnings
- [ ] Works on both Android and iOS (if applicable)
- [ ] Test rapid operations (save multiple notes quickly) - should not get "failed to save" errors
- [ ] Verify database operations work consistently across app restarts

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests (when implemented)
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with:
- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [SQLite](https://www.sqlite.org/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Markdown Display](https://github.com/iamacup/react-native-markdown-display)
- [Whisper.rn](https://github.com/mybigday/whisper.rn) - Offline speech-to-text transcription
- [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/) - Audio recording and playback

---

For more detailed documentation, see the `/tasks` directory.