# How to Update App Icon

## Steps to add your new app icon:

### 1. Save your icon image
Save the image you provided as `app_icon.png` in the project root directory.

### 2. Required Icon Sizes
You need to create the following sizes from your image:

- **mdpi** (48x48 px) → Save as `ic_launcher.png` in `android\app\src\main\res\mipmap-mdpi\`
- **hdpi** (72x72 px) → Save as `ic_launcher.png` in `android\app\src\main\res\mipmap-hdpi\`
- **xhdpi** (96x96 px) → Save as `ic_launcher.png` in `android\app\src\main\res\mipmap-xhdpi\`
- **xxhdpi** (144x144 px) → Save as `ic_launcher.png` in `android\app\src\main\res\mipmap-xxhdpi\`
- **xxxhdpi** (192x192 px) → Save as `ic_launcher.png` in `android\app\src\main\res\mipmap-xxxhdpi\`

Also create round versions:
- Save the same files as `ic_launcher_round.png` in each folder

### 3. Online Tool Option
Use an online tool like:
- https://appicon.co/
- https://www.appicon.co/
- https://icon.kitchen/

Upload your image and download the Android icon pack.

### 4. Manual Update
After generating the icons, copy them to the respective folders:
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

### 5. Clean and Rebuild
After updating the icons:
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

The app will now use your new logo!