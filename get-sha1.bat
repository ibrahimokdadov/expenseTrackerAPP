@echo off
echo Getting SHA-1 fingerprint for Google Sign-In configuration...
echo.

cd android

echo Debug SHA-1:
echo ============
call gradlew signingReport | findstr "SHA1"

echo.
echo Alternative method (using keytool):
echo ===================================
keytool -list -v -keystore app\debug.keystore -alias androiddebugkey -storepass android -keypass android | findstr "SHA1"

echo.
echo Copy the SHA1 value and add it to your Google Cloud Console OAuth configuration.
echo Package name: com.expensetrackerapp
echo.
pause