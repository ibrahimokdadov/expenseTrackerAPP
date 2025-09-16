# Google Sign-In Setup Guide for ExpenseTracker App

## Current Status
The Google Sign-In functionality has been implemented but the native module is not linking properly with React Native's new architecture. The app works without crashes but Google Sign-In is disabled to prevent runtime errors.

## SHA-1 Fingerprint
Your debug SHA-1 fingerprint is:
```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

## Google Cloud Console Configuration

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Create/Select Your Project
- Create a new project or select an existing one
- Project name: ExpenseTracker (or your preferred name)

### 3. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required fields:
   - App name: ExpenseTracker
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `../auth/spreadsheets`
   - `../auth/drive.file`
   - `../auth/userinfo.profile`
   - `../auth/userinfo.email`

### 4. Create OAuth 2.0 Credentials

#### Android OAuth Client:
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Android" as application type
4. Enter:
   - Package name: `com.expensetrackerapp`
   - SHA-1 fingerprint: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
5. Click "Create"

#### Web Application OAuth Client (Required for Android):
1. Create another OAuth client ID
2. Choose "Web application" as type
3. Name: ExpenseTracker Web Client
4. No redirect URIs needed for Android
5. Copy the Web Client ID

### 5. Enable Required APIs
Enable these APIs in your project:
1. Google Sheets API
2. Google Drive API
3. Google Sign-In API

## Update Your Code

The Web Client ID is already configured in the code:
```
866774020961-aiddoqbqr0qs9mjpr25p0p093upv644l.apps.googleusercontent.com
```

If you need to update it, modify:
- `src/services/GoogleAuthService.ts` (line 43)
- `src/config/env.ts` (line 11)

## Known Issues & Solutions

### Issue: Native Module Not Linking
**Symptoms:**
- Error: "GoogleSignin.isSignedIn is not a function"
- Warning: "[GoogleAuth] GoogleSignin not available or not linked properly"

**Temporary Solution:**
The code has safety checks to prevent crashes. The app will work without Google Sign-In until the native module is properly linked.

**Permanent Solution Options:**

1. **Disable New Architecture** (Not recommended due to reanimated dependency):
   ```
   # android/gradle.properties
   newArchEnabled=false
   ```

2. **Manual Linking** (Try if autolinking fails):
   ```bash
   cd android
   gradlew clean
   cd ..
   npx react-native unlink @react-native-google-signin/google-signin
   npx react-native link @react-native-google-signin/google-signin
   cd android
   gradlew assembleDebug
   ```

3. **Use Older Version** (May have better compatibility):
   ```bash
   npm uninstall @react-native-google-signin/google-signin
   npm install @react-native-google-signin/google-signin@10.0.1
   cd ios && pod install
   cd android && gradlew clean assembleDebug
   ```

## Testing Google Sign-In

Once the native module is properly linked:

1. **Test Sign-In:**
   - Open the app
   - Go to Settings
   - Tap "Sign in with Google"
   - Complete the OAuth flow

2. **Verify Backup:**
   - After signing in, your data should automatically backup
   - Check Google Drive for "ExpenseTracker_Backup_[your_email]" spreadsheet

3. **Test Manual Sync:**
   - Make changes to expenses
   - Go to Settings
   - Tap "Backup Now"
   - Verify changes appear in Google Sheets

## Verification Commands

Check if module is linked:
```bash
# Windows
cd android && gradlew :react-native-google-signin_google-signin:tasks

# Check logs
adb logcat -s ReactNativeJS | findstr "GoogleAuth"
```

Get SHA-1 fingerprint:
```bash
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## Files Modified

1. **Services:**
   - `src/services/GoogleAuthService.ts` - Authentication logic
   - `src/services/GoogleSheetsService.ts` - Sheets integration
   - `src/services/StorageService.ts` - Auto-backup triggers

2. **Screens:**
   - `src/screens/SettingsScreen.tsx` - Google Sign-In UI
   - `src/screens/HomeScreen.tsx` - Sync status indicator

3. **Configuration:**
   - `src/config/env.ts` - Web Client ID
   - `android/app/build.gradle` - Google Play Services
   - `android/gradle.properties` - New architecture settings

## Next Steps

1. Configure Google Cloud Console with the SHA-1 fingerprint
2. Test the OAuth flow once native module is linked
3. Verify automatic backup functionality
4. Set up production credentials when ready to release

## Support

If you continue to experience issues:
1. Check React Native Google Sign-In GitHub issues
2. Verify all dependencies are compatible with your React Native version
3. Consider using Expo if native module issues persist