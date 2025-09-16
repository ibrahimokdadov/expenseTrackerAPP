@echo off
echo Cleaning Android build files and caches...

echo Removing Android build directories...
rmdir /s /q android\app\build 2>nul
rmdir /s /q android\build 2>nul
rmdir /s /q android\.gradle 2>nul
rmdir /s /q android\.kotlin 2>nul

echo Removing user-level Gradle cache...
rmdir /s /q "%USERPROFILE%\.gradle\caches" 2>nul

echo Removing React Native cache...
rmdir /s /q "%USERPROFILE%\AppData\Local\Temp\metro-cache" 2>nul
rmdir /s /q "%USERPROFILE%\AppData\Local\Temp\haste-map-metro" 2>nul

echo Removing node_modules...
rmdir /s /q node_modules 2>nul

echo Reinstalling dependencies...
npm install

echo Clean completed!
echo Now you can run: npm run android