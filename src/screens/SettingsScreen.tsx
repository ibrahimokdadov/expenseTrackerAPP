import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Picker} from '@react-native-picker/picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {StorageService} from '../services/StorageService';
import {CurrencyService, CURRENCIES} from '../services/CurrencyService';
import GoogleAuthService from '../services/GoogleAuthService';
import GoogleSheetsService from '../services/GoogleSheetsService';
import {Currency} from '../types';
import {useTheme} from '../contexts/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

const SettingsScreen = ({navigation}: any) => {
  const {theme, toggleTheme, colors} = useTheme();
  const [currency, setCurrency] = useState<Currency>('DZD');
  const [autoBackup, setAutoBackup] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedCurrency = await CurrencyService.getSelectedCurrency();
    setCurrency(savedCurrency);

    // Check Google sign-in status
    const user = await GoogleAuthService.getCurrentUser();
    setGoogleUser(user);

    // Check auto-backup status
    const isAutoBackupEnabled = StorageService.isAutoBackupEnabled();
    setAutoBackup(isAutoBackupEnabled);

    // Get last sync time
    const syncTime = await GoogleSheetsService.getLastSyncTime();
    setLastSyncTime(syncTime);
  };

  const handleCurrencyChange = async (newCurrency: Currency) => {
    setCurrency(newCurrency);
    await CurrencyService.setSelectedCurrency(newCurrency);
  };

  const exportToCSV = async () => {
    try {
      const [expenses, categories, loans] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
        StorageService.getLoans(),
      ]);

      // Create CSV for expenses
      let csvContent = 'Date,Category,Subcategory,Amount,Currency,Description\n';

      expenses.forEach(expense => {
        const category = categories.find(c => c.id === expense.category);
        const subcategory = category?.subcategories?.find(s => s.id === expense.subcategory);

        csvContent += `${expense.date},`;
        csvContent += `${category?.name || expense.category},`;
        csvContent += `${subcategory?.name || ''},`;
        csvContent += `${expense.amount},`;
        csvContent += `${expense.currency || 'DZD'},`;
        csvContent += `"${expense.description || ''}"\n`;
      });

      // Add loans section
      csvContent += '\n\nLoans\n';
      csvContent += 'Date,Giver,Receiver,Amount,Currency,Status,Description\n';

      loans.forEach(loan => {
        csvContent += `${loan.dateCreated},`;
        csvContent += `${loan.giver},`;
        csvContent += `${loan.receiver},`;
        csvContent += `${loan.amount},`;
        csvContent += `${loan.currency || 'DZD'},`;
        csvContent += `${loan.status},`;
        csvContent += `"${loan.description || ''}"\n`;
      });

      const fileName = `expense_tracker_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csvContent, 'utf8');

      await Share.open({
        title: 'Export Expense Data',
        url: `file://${filePath}`,
        type: 'text/csv',
        subject: 'Expense Tracker Data Export',
      });

    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
    }
  };

  const exportToJSON = async () => {
    try {
      const [expenses, categories, loans] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
        StorageService.getLoans(),
      ]);

      const data = {
        exportDate: new Date().toISOString(),
        expenses,
        categories,
        loans,
      };

      const fileName = `expense_tracker_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

      await Share.open({
        title: 'Export Expense Data',
        url: `file://${filePath}`,
        type: 'application/json',
        subject: 'Expense Tracker Data Export',
      });

    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const userInfo = await GoogleAuthService.signIn();
      setGoogleUser(userInfo);

      // Initialize Google Sheets
      await GoogleSheetsService.initialize();

      // Enable auto-backup
      await StorageService.enableAutoBackup();
      setAutoBackup(true);

      Alert.alert(
        'Success',
        `Signed in as ${userInfo.email}. Auto-backup enabled.`,
        [
          {
            text: 'View Sheet',
            onPress: async () => {
              const sheetUrl = await GoogleSheetsService.getSheetUrl();
              if (sheetUrl) {
                // In a real app, you'd open this URL
                Alert.alert('Sheet URL', sheetUrl);
              }
            },
          },
          {text: 'OK'},
        ]
      );
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Auto-backup will be disabled.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await GoogleAuthService.signOut();
            await StorageService.disableAutoBackup();
            setGoogleUser(null);
            setAutoBackup(false);
            Alert.alert('Success', 'Signed out successfully');
          },
        },
      ]
    );
  };

  const handleManualBackup = async () => {
    try {
      Alert.alert('Backing up...', 'Please wait while we sync your data.');
      const success = await StorageService.manualBackup();
      if (success) {
        const syncTime = await GoogleSheetsService.getLastSyncTime();
        setLastSyncTime(syncTime);
        Alert.alert('Success', 'Data backed up successfully!');
      } else {
        Alert.alert('Backup Failed', 'Failed to backup data. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during backup.');
    }
  };

  const handleRestoreFromBackup = async () => {
    Alert.alert(
      'Restore from Backup',
      'This will replace all local data with data from Google Sheets. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await StorageService.restoreFromBackup();
              if (success) {
                Alert.alert('Success', 'Data restored successfully!');
              } else {
                Alert.alert('Restore Failed', 'Failed to restore data.');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred during restore.');
            }
          },
        },
      ]
    );
  };

  const toggleAutoBackup = async (value: boolean) => {
    if (value && !googleUser) {
      Alert.alert('Sign In Required', 'Please sign in with Google to enable auto-backup.');
      return;
    }

    setAutoBackup(value);
    if (value) {
      await StorageService.enableAutoBackup();
    } else {
      await StorageService.disableAutoBackup();
    }
  };

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your expenses, loans, and categories. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearAll();
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4285F4',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    googleButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 10,
    },
    googleProfile: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginVertical: 8,
    },
    googleProfileInfo: {
      flex: 1,
      marginLeft: 12,
    },
    googleEmail: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    googleSyncInfo: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    signOutText: {
      color: colors.error,
      fontSize: 14,
      fontWeight: '500',
    },
    backupButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success || '#4CAF50',
      padding: 10,
      borderRadius: 8,
      marginVertical: 4,
    },
    backupButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 8,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      backgroundColor: colors.card,
      marginVertical: 10,
      marginHorizontal: 15,
      borderRadius: 10,
      padding: 15,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingRowLast: {
      borderBottomWidth: 0,
    },
    settingLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    settingDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    pickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      width: 150,
    },
    picker: {
      height: 40,
      color: colors.text,
    },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    exportButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 10,
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    dangerButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 10,
    },
    versionText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 20,
      marginBottom: 10,
    },
  });

  return (
    <ScrollView style={styles.container}>
      {/* General Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>

        <View style={styles.settingRow}>
          <View style={{flex: 1}}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Reduce eye strain in low light</Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{false: '#767577', true: colors.primary}}
            thumbColor={theme === 'dark' ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Default Currency</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={currency}
              onValueChange={handleCurrencyChange}
              style={styles.picker}>
              {CURRENCIES.map((curr) => (
                <Picker.Item
                  key={curr.code}
                  label={`${curr.symbol} ${curr.code}`}
                  value={curr.code}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={[styles.settingRow, styles.settingRowLast]}>
          <View style={{flex: 1}}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>Get reminders for pending loans</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{false: '#767577', true: colors.primary}}
            thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Google Account & Sync */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Account & Sync</Text>

        {!googleUser ? (
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}>
            <Icon name="account-circle" size={24} color="#ffffff" />
            <Text style={styles.googleButtonText}>
              {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.googleProfile}>
              <Icon name="account-circle" size={40} color={colors.primary} />
              <View style={styles.googleProfileInfo}>
                <Text style={styles.googleEmail}>{googleUser.email}</Text>
                <Text style={styles.googleSyncInfo}>
                  Last sync: {formatSyncTime(lastSyncTime)}
                </Text>
              </View>
              <TouchableOpacity onPress={handleGoogleSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.backupButton, {backgroundColor: colors.primary}]}
              onPress={handleManualBackup}>
              <Icon name="backup" size={20} color="#ffffff" />
              <Text style={styles.backupButtonText}>Backup Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backupButton}
              onPress={handleRestoreFromBackup}>
              <Icon name="restore" size={20} color="#ffffff" />
              <Text style={styles.backupButtonText}>Restore from Backup</Text>
            </TouchableOpacity>

            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={{flex: 1}}>
                <Text style={styles.settingLabel}>Auto Backup</Text>
                <Text style={styles.settingDescription}>
                  Automatically sync changes to Google Sheets
                </Text>
              </View>
              <Switch
                value={autoBackup}
                onValueChange={toggleAutoBackup}
                trackColor={{false: '#767577', true: colors.primary}}
                thumbColor={autoBackup ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </>
        )}
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
          <Icon name="file-download" size={24} color="#ffffff" />
          <Text style={styles.exportButtonText}>Export to CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportButton} onPress={exportToJSON}>
          <Icon name="code" size={24} color="#ffffff" />
          <Text style={styles.exportButtonText}>Export to JSON</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: colors.error}]}>Danger Zone</Text>

        <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
          <Icon name="delete-forever" size={24} color="#ffffff" />
          <Text style={styles.dangerButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
};

export default SettingsScreen;