# Expense Tracker Mobile App - Setup Guide

## Complete mobile expense tracking app with offline support and Google Sheets sync

### App Features
- **Native Mobile Experience**: Built with React Native for Android & iOS
- **Works Offline**: All data stored locally using AsyncStorage
- **Google Sheets Sync**: Upload expenses to your spreadsheet
- **Smart Conflict Resolution**: Handles sync conflicts automatically
- **Custom Categories**: Add your own expense types
- **Full CRUD Operations**: Add, view, filter, and delete expenses

## Quick Start

### 1. Run the App

**Android:**
```bash
# Connect device or start emulator, then:
npx react-native run-android
```

**iOS (Mac only):**
```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

### 2. Configure Google Sheets (Optional)

To enable Google Sheets sync:

1. Get Google API credentials from [Google Cloud Console](https://console.cloud.google.com/)
2. Edit `src/services/GoogleSheetsService.ts`
3. Add your credentials

## How to Use

### Add Expenses
- Tap "Add Expense" button
- Select category or add new one
- Enter amount and optional description
- Save

### View & Manage
- See recent expenses on home screen
- "View All" for complete list
- Filter by category/month
- Long press to delete

### Sync to Cloud
- Works offline by default
- When online, tap "Sync with Google Sheets"
- Resolves any conflicts automatically

## Building for Release

### Android APK
```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/
```

### iOS (Xcode required)
- Open `ios/ExpenseTrackerApp.xcworkspace`
- Product → Archive → Upload

## Project Structure
```
src/
├── screens/       # App screens
├── services/      # Storage & sync logic
└── types/         # TypeScript definitions
```

## Troubleshooting

**Metro bundler issues:**
```bash
npx react-native start --reset-cache
```

**Build errors:**
```bash
cd android && ./gradlew clean && cd ..
# or for iOS:
cd ios && rm -rf Pods && pod install && cd ..
```

Ready to track expenses! The app works immediately offline, with optional Google Sheets sync when configured.