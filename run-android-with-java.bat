@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo Running React Native Android app with JAVA_HOME set...
npx react-native run-android %*