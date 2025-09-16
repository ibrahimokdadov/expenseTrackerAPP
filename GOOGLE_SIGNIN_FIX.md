# Fix Google Sign-In DEVELOPER_ERROR

## The Error
`DEVELOPER_ERROR` means your app's SHA-1 fingerprint and package name don't match what's configured in Google Cloud Console.

## Your App Details
- **Package Name**: `com.expensetrackerapp`
- **Debug SHA-1**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- **Web Client ID**: `866774020961-aiddoqbqr0qs9mjpr25p0p093upv644l.apps.googleusercontent.com`

## Steps to Fix

### 1. Go to Google Cloud Console
https://console.cloud.google.com/

### 2. Select or Create Your Project
- If you don't have a project, create one named "ExpenseTracker"

### 3. Enable Required APIs
Go to "APIs & Services" > "Library" and enable:
- Google Sheets API
- Google Drive API

### 4. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in:
   - App name: ExpenseTracker
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `../auth/spreadsheets`
   - `../auth/drive.file`
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. Save

### 5. Create Android OAuth Client (CRITICAL STEP)
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose **Android** as application type
4. Enter EXACTLY:
   - **Name**: Android Debug Client
   - **Package name**: `com.expensetrackerapp`
   - **SHA-1 certificate fingerprint**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
5. Click "Create"

### 6. Verify/Create Web Application OAuth Client
1. In the same Credentials page
2. Check if you have a Web Application OAuth client
3. If not, create one:
   - Click "Create Credentials" > "OAuth client ID"
   - Choose **Web application**
   - Name: Web Client for Android
   - No redirect URIs needed
4. Copy the Web Client ID

### 7. Update Your Code (if needed)
If the Web Client ID is different from what you have:
1. Open `src/services/GoogleAuthService.ts`
2. Update line 43:
```typescript
const WEB_CLIENT_ID = 'YOUR_NEW_WEB_CLIENT_ID_HERE';
```

## Verify Configuration

Run this command to verify your SHA-1:
```bash
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android | findstr SHA1
```

Should output:
```
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

## Common Mistakes to Avoid
1. ❌ Using iOS client ID instead of Web Client ID
2. ❌ Wrong package name (must be exactly `com.expensetrackerapp`)
3. ❌ Spaces or wrong format in SHA-1 (no spaces between hex pairs)
4. ❌ Using release SHA-1 instead of debug SHA-1

## After Configuration
1. Wait 5-10 minutes for Google's servers to propagate changes
2. Clear app data: `adb shell pm clear com.expensetrackerapp`
3. Rebuild and reinstall the app
4. Try signing in again

## If Still Not Working
1. Double-check the Web Client ID in your code matches the one from Google Cloud Console
2. Ensure you created an ANDROID OAuth client (not just Web)
3. Make sure the package name is exactly `com.expensetrackerapp`
4. Verify no typos in the SHA-1 fingerprint