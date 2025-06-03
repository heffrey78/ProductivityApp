# ProductivityApp

A mobile-first personal productivity application built with React Native and Expo, featuring task management and markdown-compatible notes with search capabilities.

## 🚀 Features

- **Task Management**: Create, update, and track tasks with persistent storage
- **Markdown Notes**: Write and preview notes with full markdown support
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

### Using Expo Go App

1. Install the Expo Go app on your physical device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

## 🔨 Building for Production

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
- **Notes**: Markdown content, search indexing, categories
- **Tags**: For organizing notes (coming soon)
- **Cross-platform**: Falls back to localStorage on web

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
Install Java 17:
```bash
brew install openjdk@17
```

#### "Android SDK not found"
Set environment variables in `~/.zshrc` or `~/.bashrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

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

## 🤖 Agent-Friendly Development Guide

This section provides prescriptive advice for AI agents (like Claude, ChatGPT, or Cursor) working on this codebase, based on lessons learned from development sessions.

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

### Step-by-Step Android Build Instructions

When building for Android, follow these exact steps:

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
   // Good
   const db = await SQLite.openDatabaseAsync('productivity.db');
   await db.execAsync('CREATE TABLE...');
   
   // Bad
   const db = SQLite.openDatabase('productivity.db');
   db.transaction(tx => {...});
   ```

2. **Service Layer:**
   ```typescript
   // Always initialize before use
   async initialize(): Promise<void> {
     if (this.initialized) return;
     // ... initialization code
   }
   
   // Always handle errors
   try {
     await this.db.runAsync(query, ...params);
   } catch (error) {
     console.error('Database error:', error);
     throw error;
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

---

For more detailed documentation, see the `/tasks` directory.