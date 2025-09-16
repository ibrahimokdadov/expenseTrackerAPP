# Testing Charts in Expense Tracker App

## Steps to see the charts:

1. **Rebuild the app** (Required after installing native dependencies):
   ```bash
   npx react-native run-android
   ```
   Or if already running, shake the device/emulator and select "Reload"

2. **Navigate to Charts**:
   - Open the app
   - On the Home screen, tap the orange "View Analytics" button
   - This will open the Charts screen

3. **Add sample data** (if no expenses exist):
   - Go back to Home
   - Tap "Add Expense"
   - Add a few expenses with different categories and dates
   - Return to Charts to see the visualizations

## Troubleshooting:

If charts are not showing:

1. **For Android**:
   - Close the app completely
   - Run: `cd android && ./gradlew clean`
   - Run: `npx react-native run-android`

2. **Check Metro bundler**:
   - Stop Metro (Ctrl+C in terminal)
   - Clear cache: `npx react-native start --reset-cache`

3. **For physical device**:
   - Ensure device is connected: `adb devices`
   - Reinstall: `npx react-native run-android`

## What you should see:

- **Statistics cards** at the top showing:
  - Total Expenses
  - Daily Average
  - Top Category

- **Three charts**:
  - Pie chart for category distribution
  - Bar chart for monthly trends
  - Line chart for last 7 days

The charts will automatically update as you add more expenses.