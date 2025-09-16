# Resolve SHA-1 Conflict - Complete Solution

## The Problem
You have TWO Android OAuth clients conflicting:
1. One with SHA-1: `F9:22:9D:78:FB:F3:53:DE:2F:29:F1:B6:00:66:F3:4D:A7:7E:2F:65`
2. Another (somewhere) with SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

## Solution: Find and Delete the Conflicting Client

### Step 1: Check Current Project
1. Go to **APIs & Services** > **Credentials**
2. Look for ALL Android OAuth clients
3. Click on each one and check the SHA-1
4. If you find one with `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`, DELETE it

### Step 2: Check ALL Your Google Cloud Projects
1. Click the project dropdown (top of page, next to "Google Cloud")
2. Click "ALL" tab to see all projects
3. Go through EACH project:
   - Select the project
   - Go to **APIs & Services** > **Credentials**
   - Look for Android OAuth clients with your SHA-1
   - DELETE any with `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

### Step 3: Check Firebase Projects (Common Culprit!)
1. Go to https://console.firebase.google.com/
2. Check all your Firebase projects
3. Go to **Project Settings** > **Your apps**
4. Look for Android apps
5. Check if any have SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
6. Remove the SHA-1 or delete the app

### Step 4: After Cleaning Up
Once you've deleted the conflicting client:

1. Go back to your ExpenseTracker project in Google Cloud Console
2. Edit the Android OAuth client
3. Update SHA-1 to: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
4. Save (should work now!)

## Alternative: Create New Project (Nuclear Option)

If you can't find the conflicting client:

1. Create a NEW Google Cloud Project
2. Name it: ExpenseTracker-New
3. Enable APIs:
   - Google Sign-In
   - Google Sheets API
   - Google Drive API
4. Create OAuth Consent Screen
5. Create Android OAuth Client:
   - Package: `com.expensetrackerapp`
   - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
6. Create Web OAuth Client
7. Update your code with the new Web Client ID

## Quick Fix: Use Different SHA-1

If you need a quick solution:

1. Generate a new debug keystore:
```bash
# Backup old one
move android\app\debug.keystore android\app\debug.keystore.old

# Generate new one (run build, it auto-creates)
cd android
gradlew assembleDebug
```

2. Get the new SHA-1:
```bash
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

3. Use this NEW SHA-1 in Google Cloud Console

## Common Places to Check for Conflicting SHA-1

1. **Other Google Cloud Projects** - Check ALL projects
2. **Firebase Projects** - Very common to have Android apps here
3. **Google Play Console** - If you have apps published
4. **Old Test Projects** - Check archived/old projects
5. **Team Member Projects** - If working with others

## Pro Tip: Search All Projects

Use Google Cloud Console search:
1. Go to https://console.cloud.google.com/
2. Use the search bar at the top
3. Search for "OAuth" or "Android"
4. Check across all projects

## After Resolving

1. Clear app data:
```bash
adb shell pm clear com.expensetrackerapp
```

2. Restart app:
```bash
adb shell am start -n com.expensetrackerapp/.MainActivity
```

3. Test Google Sign-In - should work now!