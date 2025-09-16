# Update SHA-1 in Google Cloud Console

## Current Situation
- **Existing SHA-1 in Google Cloud**: `F9:22:9D:78:FB:F3:53:DE:2F:29:F1:B6:00:66:F3:4D:A7:7E:2F:65`
- **Your App's SHA-1**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

These don't match, which is causing the DEVELOPER_ERROR.

## Solution

### Option 1: Update Existing Android Client (Recommended)
1. Go to **APIs & Services** > **Credentials**
2. Find the Android OAuth client with SHA-1 `F9:22:9D:78:FB:F3:53:DE:2F:29:F1:B6:00:66:F3:4D:A7:7E:2F:65`
3. Click on it to edit
4. **Delete** the old SHA-1
5. **Add** your correct SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
6. Make sure package name is: `com.expensetrackerapp`
7. Click **Save**

### Option 2: Delete and Create New
1. **Delete** the existing Android OAuth client
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Android**
4. Enter:
   - Name: Android Debug Client
   - Package name: `com.expensetrackerapp`
   - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
5. Click **Create**

### Option 3: Add Multiple SHA-1s (If you need both)
Some Android OAuth clients allow multiple SHA-1 fingerprints:
1. Edit the existing Android client
2. Try to **Add** another SHA-1 fingerprint
3. Add: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
4. Keep both SHA-1s if you need them for different environments

## After Updating

1. **Wait 5-10 minutes** for changes to propagate

2. **Clear app data**:
```bash
adb shell pm clear com.expensetrackerapp
```

3. **Restart the app**:
```bash
adb shell am start -n com.expensetrackerapp/.MainActivity
```

4. **Try signing in again**

## Verify Your Web Client ID

Make sure you have the correct Web Client ID in your code:

`src/services/GoogleAuthService.ts` line 43:
```typescript
const WEB_CLIENT_ID = '866774020961-aiddoqbqr0qs9mjpr25p0p093upv644l.apps.googleusercontent.com';
```

This should be from a **Web Application** OAuth client in the same project.

## Success Checklist
✅ Android OAuth client has SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
✅ Android OAuth client has package name: `com.expensetrackerapp`
✅ Web Application OAuth client exists in same project
✅ Web Client ID from Web Application is used in your code
✅ Google Sign-In API is enabled
✅ Google Sheets API is enabled
✅ Google Drive API is enabled

Once all these are checked, Google Sign-In should work!