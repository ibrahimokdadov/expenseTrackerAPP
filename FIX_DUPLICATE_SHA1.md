# Fix "Requested entity already exists" Error

## The Problem
Google Cloud Console is saying an OAuth client with your SHA-1 already exists. This happens when:
1. You already created an Android OAuth client in this project
2. You have an Android OAuth client in a DIFFERENT Google Cloud project
3. Someone else is using the same debug.keystore (unlikely)

## Solution Steps

### Option 1: Find Existing Android Client in Current Project
1. Go to **APIs & Services** > **Credentials**
2. Look for any OAuth 2.0 Client IDs of type "Android"
3. Click on each one and check if it has:
   - Package name: `com.expensetrackerapp`
   - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
4. If you find it, you're done! Just make sure you're using the Web Client ID in your code.

### Option 2: Check Other Google Cloud Projects
1. Click the project dropdown at the top of Google Cloud Console
2. Check if you have other projects
3. Switch to each project and check **APIs & Services** > **Credentials**
4. Look for Android OAuth clients with your SHA-1

### Option 3: Delete and Recreate
If you find the conflicting Android client:
1. Delete the old Android OAuth client
2. Wait 5 minutes
3. Create a new one with:
   - Package name: `com.expensetrackerapp`
   - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

### Option 4: Use a New Debug Keystore
If you can't find where the SHA-1 is registered:

1. **Backup current keystore**:
```bash
copy android\app\debug.keystore android\app\debug.keystore.backup
```

2. **Delete current keystore**:
```bash
del android\app\debug.keystore
```

3. **Generate new keystore** (Android will create it automatically):
```bash
cd android && gradlew assembleDebug
```

4. **Get new SHA-1**:
```bash
cd android\app
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

5. **Use the new SHA-1 in Google Cloud Console**

## Quick Check - What You Need

### In Google Cloud Console, you should have:

1. **Android OAuth 2.0 Client**:
   - Type: Android
   - Package name: `com.expensetrackerapp`
   - SHA-1: Your debug keystore SHA-1

2. **Web Application OAuth 2.0 Client**:
   - Type: Web application
   - Copy this Client ID

### In Your Code:
`src/services/GoogleAuthService.ts` line 43:
```typescript
const WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID_HERE';
```

## Verify Everything is Correct

1. The Web Client ID in your code should be from the **Web Application** OAuth client, NOT the Android one
2. The Android OAuth client should have your exact package name and SHA-1
3. Both clients should be in the same Google Cloud project

## Still Getting DEVELOPER_ERROR?

This means the configuration is still wrong. Double-check:
1. ✅ You have an Android OAuth client with correct package name and SHA-1
2. ✅ You're using the Web Client ID (not Android Client ID) in your code
3. ✅ The Web Client ID is from the same project as the Android client
4. ✅ You've enabled Google Sign-In API in the project

## Test After Fixing

1. Clear app data:
```bash
adb shell pm clear com.expensetrackerapp
```

2. Restart the app:
```bash
adb shell am start -n com.expensetrackerapp/.MainActivity
```

3. Try signing in again