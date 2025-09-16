@echo off
echo ====================================
echo Android Google Sign-In Setup Checker
echo ====================================
echo.

echo [1] Checking package name...
findstr "com.expensetrackerapp" android\app\build.gradle >nul
if %errorlevel%==0 (
    echo    ✓ Package name: com.expensetrackerapp
) else (
    echo    ✗ Package name not found
)

echo.
echo [2] Checking Google Play Services dependency...
findstr "play-services-auth" android\app\build.gradle >nul
if %errorlevel%==0 (
    echo    ✓ Google Play Services Auth is included
) else (
    echo    ✗ Google Play Services Auth NOT found
)

echo.
echo [3] Checking AndroidX support...
findstr "android.useAndroidX=true" android\gradle.properties >nul
if %errorlevel%==0 (
    echo    ✓ AndroidX is enabled
) else (
    echo    ✗ AndroidX is NOT enabled
)

echo.
echo [4] Getting SHA-1 fingerprint...
echo    Running: keytool -list -v -keystore android\app\debug.keystore
echo.
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android 2>nul | findstr "SHA1"

echo.
echo [5] Checking Web Client ID configuration...
findstr "866774020961" src\config\env.ts >nul
if %errorlevel%==0 (
    echo    ✓ Web Client ID is configured
) else (
    echo    ✗ Web Client ID not configured
)

echo.
echo ====================================
echo Setup Checklist:
echo ====================================
echo.
echo 1. Copy the SHA1 above and add it to Google Cloud Console
echo 2. Package name should be: com.expensetrackerapp
echo 3. Web Client ID is: 866774020961-aiddoqbqr0qs9mjpr25p0p093upv644l.apps.googleusercontent.com
echo 4. Enable these APIs in Google Cloud Console:
echo    - Google Sheets API
echo    - Google Drive API
echo.
echo If all checks pass, your Android setup is complete!
echo.
pause