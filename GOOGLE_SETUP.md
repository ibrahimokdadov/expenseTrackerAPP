# Google Cloud Console Setup Guide for Expense Tracker

## Prerequisites
- Google account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `ExpenseTracker`
4. Click "Create"

## Step 2: Enable Required APIs

1. In your project, go to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - **Google Sheets API**
   - **Google Drive API**
   - **Google Sign-In API** (if available)

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in:
   - App name: `Expense Tracker`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/spreadsheets`
   - `.../auth/drive.file`
5. Add test users (your email)
6. Save and continue

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Android" application type
4. Name: `ExpenseTracker Android`
5. Package name: `com.expensetrackerapp`
6. SHA-1 certificate fingerprint (see below)

## Step 5: Get SHA-1 Fingerprint

### For Debug (Development):
```bash
cd android
./gradlew signingReport
```
Or on Windows:
```bash
cd android
gradlew signingReport
```

Look for the SHA1 in the debug variant output.

### Alternative method:
```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## Step 6: Create Web Client ID (Required for Android)

1. In Credentials, create another OAuth client ID
2. Choose "Web application" type
3. Name: `ExpenseTracker Web Client`
4. Save the Web Client ID

## Step 7: Download Configuration

1. Download the credentials JSON
2. Note the Web Client ID (you'll need this in the app)

## Step 8: Update App Configuration

Replace the following in your code:

1. In `src/services/GoogleAuthService.ts`:
```typescript
webClientId: 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com'
```

2. Create `.env` file in project root:
```
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com
```

## Step 9: Android Configuration

1. Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
}
```

2. Ensure `android/app/google-services.json` exists (if using Firebase)

## Step 10: Test Your Setup

1. Build and run the app
2. Try signing in with Google
3. Check if sheet is created in your Google Drive
4. Verify data syncs properly

## Troubleshooting

### Common Issues:

1. **"Developer Error" on sign-in:**
   - Wrong SHA-1 fingerprint
   - Package name mismatch
   - Web Client ID not configured

2. **"Unauthorized" errors:**
   - Scopes not properly configured
   - OAuth consent screen not approved

3. **Sheet creation fails:**
   - Google Sheets API not enabled
   - Insufficient permissions

### Debug Tips:

- Use `adb logcat | grep -i google` to see Google Sign-In logs
- Check Google Cloud Console logs for API errors
- Verify all IDs match between console and app

## Production Setup

For production release:
1. Generate release keystore
2. Get release SHA-1
3. Add to Google Cloud Console
4. Update OAuth credentials
5. Test thoroughly before release

## Important Notes

- Keep Web Client ID secret
- Don't commit credentials to git
- Use environment variables for sensitive data
- Test with multiple Google accounts
- Monitor API quotas in Cloud Console