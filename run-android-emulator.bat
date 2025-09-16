@echo off
echo ==========================================
echo React Native Android Emulator Build Script
echo ==========================================
echo.

REM Set Java environment
echo Setting up Java environment...
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Verify Java is available
"%JAVA_HOME%\bin\java" -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Java not found at %JAVA_HOME%
    echo Please install Android Studio or update the JAVA_HOME path in this script
    pause
    exit /b 1
)

echo Java found at: %JAVA_HOME%
echo.

REM Start the build
echo Starting Android build for emulator...
npm run android

if %errorlevel% neq 0 (
    echo.
    echo Build failed! Check the error messages above.
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
pause