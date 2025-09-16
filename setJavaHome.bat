@echo off
echo Setting JAVA_HOME for Android Studio JBR...
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%

echo JAVA_HOME has been set to: %JAVA_HOME%
echo.
echo Testing Java installation...
"%JAVA_HOME%\bin\java" -version
echo.
echo Environment variable has been set permanently.
echo Please restart your terminal/command prompt for permanent changes to take effect.
pause