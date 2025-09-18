import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StorageService} from '../services/StorageService';
import GoogleSheetsService, {SyncResult} from '../services/GoogleSheetsService';
import GoogleAuthService from '../services/GoogleAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SyncScreen = ({navigation}: any) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAuthStatus();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const checkAuthStatus = async () => {
    console.log('[SyncScreen] Checking auth status...');
    const signedIn = await GoogleAuthService.isSignedIn();
    console.log('[SyncScreen] Is signed in:', signedIn);
    setIsSignedIn(signedIn);

    if (signedIn) {
      const user = await GoogleAuthService.getCurrentUser();
      console.log('[SyncScreen] Current user:', user?.email);
      setUserInfo(user);

      const syncTime = await GoogleSheetsService.getLastSyncTime();
      setLastSyncTime(syncTime);

      const url = await GoogleSheetsService.getSheetUrl();
      console.log('[SyncScreen] Sheet URL:', url);
      setSheetUrl(url);

      // Perform automatic sync on login
      console.log('[SyncScreen] Performing automatic sync...');
      await performAutoSync();
    }
  };

  const performAutoSync = async () => {
    try {
      console.log('[SyncScreen] Starting auto sync...');
      setIsSyncing(true);

      // Animate progress
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start();

      console.log('[SyncScreen] Calling performBidirectionalSync...');
      const result = await GoogleSheetsService.performBidirectionalSync();
      console.log('[SyncScreen] Sync result:', result);
      setSyncResult(result);

      const syncTime = await GoogleSheetsService.getLastSyncTime();
      setLastSyncTime(syncTime);

      // Show result message
      if (result.conflicts > 0 || result.downloaded > 0 || result.uploaded > 0) {
        Alert.alert('Sync Complete', result.message);
      }
    } catch (error) {
      console.error('[SyncScreen] Auto sync failed:', error);
      Alert.alert('Sync Failed', error.message || 'Failed to sync with Google Sheets');
    } finally {
      setIsSyncing(false);
      progressAnim.setValue(0);
    }
  };

  const handleSignIn = async () => {
    try {
      const userProfile = await GoogleAuthService.signIn();
      setUserInfo(userProfile);
      setIsSignedIn(true);

      // Initialize Google Sheets
      await GoogleSheetsService.initialize();

      // Perform initial sync after sign in
      await performAutoSync();
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message || 'Failed to sign in with Google');
    }
  };

  const handleSignOut = async () => {
    try {
      await GoogleAuthService.signOut();
      setIsSignedIn(false);
      setUserInfo(null);
      setLastSyncTime(null);
      setSyncResult(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleManualSync = async () => {
    if (!isSignedIn) {
      Alert.alert('Not Signed In', 'Please sign in with Google first');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      // Animate progress
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start();

      const result = await GoogleSheetsService.performBidirectionalSync();
      setSyncResult(result);

      const syncTime = await GoogleSheetsService.getLastSyncTime();
      setLastSyncTime(syncTime);

      Alert.alert('Sync Complete', result.message, [
        {text: 'OK', onPress: () => navigation.goBack()}
      ]);
    } catch (error: any) {
      Alert.alert('Sync Error', error.message || 'Failed to sync data. Please try again.');
    } finally {
      setIsSyncing(false);
      progressAnim.setValue(0);
    }
  };

  const formatSyncTime = (timeString: string | null) => {
    if (!timeString) return 'Never';

    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6B5FFF" barStyle="light-content" />

      <LinearGradient
        colors={['#6B5FFF', '#8A7FFF']}
        style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sync & Backup</Text>
          <View style={{width: 24}} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {!isSignedIn ? (
          <Animated.View style={[
            styles.signInContainer,
            {
              opacity: fadeAnim,
              transform: [{scale: scaleAnim}],
            }
          ]}>
            <View style={styles.iconContainer}>
              <Icon name="cloud-off" size={80} color="#6B5FFF" />
            </View>

            <Text style={styles.title}>Connect to Google Drive</Text>
            <Text style={styles.subtitle}>
              Sign in to automatically backup your expenses and sync across devices
            </Text>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}>
              <LinearGradient
                colors={['#4285F4', '#357AE8']}
                style={styles.signInGradient}>
                <Icon name="account-circle" size={24} color="white" />
                <Text style={styles.signInText}>Sign in with Google</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Icon name="sync" size={20} color="#6B5FFF" />
                <Text style={styles.featureText}>Two-way sync</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="backup" size={20} color="#6B5FFF" />
                <Text style={styles.featureText}>Automatic backup</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="devices" size={20} color="#6B5FFF" />
                <Text style={styles.featureText}>Multi-device access</Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[
            styles.syncContainer,
            {opacity: fadeAnim}
          ]}>
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {userInfo?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{userInfo?.name || 'User'}</Text>
                  <Text style={styles.userEmail}>{userInfo?.email || ''}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleSignOut}>
                <Icon name="logout" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            <View style={styles.syncStatusCard}>
              <View style={styles.statusHeader}>
                <Icon name="cloud-done" size={24} color="#34C759" />
                <Text style={styles.statusTitle}>Sync Status</Text>
              </View>

              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Last synced:</Text>
                <Text style={styles.statusValue}>
                  {formatSyncTime(lastSyncTime)}
                </Text>
              </View>

              {syncResult && (
                <View style={styles.syncResultContainer}>
                  <View style={styles.syncResultRow}>
                    <View style={styles.syncResultItem}>
                      <Icon name="upload" size={16} color="#6B5FFF" />
                      <Text style={styles.syncResultValue}>{syncResult.uploaded}</Text>
                      <Text style={styles.syncResultLabel}>Uploaded</Text>
                    </View>
                    <View style={styles.syncResultItem}>
                      <Icon name="download" size={16} color="#6B5FFF" />
                      <Text style={styles.syncResultValue}>{syncResult.downloaded}</Text>
                      <Text style={styles.syncResultLabel}>Downloaded</Text>
                    </View>
                    {syncResult.conflicts > 0 && (
                      <View style={styles.syncResultItem}>
                        <Icon name="warning" size={16} color="#FFA500" />
                        <Text style={styles.syncResultValue}>{syncResult.conflicts}</Text>
                        <Text style={styles.syncResultLabel}>Resolved</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {isSyncing && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>Syncing data...</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
              onPress={handleManualSync}
              disabled={isSyncing}>
              <LinearGradient
                colors={isSyncing ? ['#CCCCCC', '#AAAAAA'] : ['#6B5FFF', '#8A7FFF']}
                style={styles.syncGradient}>
                {isSyncing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Icon name="sync" size={24} color="white" />
                )}
                <Text style={styles.syncButtonText}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {sheetUrl && (
              <View style={styles.sheetLinkContainer}>
                <Icon name="description" size={20} color="#6B5FFF" />
                <Text style={styles.sheetLinkText}>
                  Your data is backed up to Google Sheets
                </Text>
              </View>
            )}

            {/* Debug Section - Only shown in development */}
            {__DEV__ && (
              <View style={styles.debugSection}>
                <Text style={styles.debugTitle}>Debug Options</Text>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={async () => {
                    try {
                      console.log('[Debug] Clearing sheet info...');
                      await GoogleSheetsService.deleteSheet();
                      Alert.alert('Debug', 'Sheet info cleared. You can now reinitialize.');
                      setSheetUrl(null);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to clear sheet info');
                    }
                  }}>
                  <Text style={styles.debugButtonText}>Clear Sheet Info</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={async () => {
                    try {
                      console.log('[Debug] Reinitializing sheets...');
                      const success = await GoogleSheetsService.initialize();
                      Alert.alert('Debug', success ? 'Sheets reinitialized' : 'Failed to initialize');
                      if (success) {
                        const url = await GoogleSheetsService.getSheetUrl();
                        const info = await GoogleSheetsService.getSheetInfo();
                        setSheetUrl(url);
                        setSheetInfo(info);
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to reinitialize');
                    }
                  }}>
                  <Text style={styles.debugButtonText}>Reinitialize Sheets</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={async () => {
                    try {
                      const token = await GoogleAuthService.getAccessToken();
                      Alert.alert('Debug', token ? `Token: ${token.substring(0, 20)}...` : 'No token available');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to get token');
                    }
                  }}>
                  <Text style={styles.debugButtonText}>Check Access Token</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={async () => {
                    try {
                      console.log('[Debug] Clearing sync state...');
                      await AsyncStorage.removeItem('@last_sync_state');
                      Alert.alert('Debug', 'Sync state cleared. Next sync will treat all differences as manual edits.');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to clear sync state');
                    }
                  }}>
                  <Text style={styles.debugButtonText}>Clear Sync State</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.infoCard}>
              <Icon name="info-outline" size={20} color="#8E8E93" />
              <Text style={styles.infoText}>
                Your expenses are automatically synced when you add, edit, or delete them.
                Use manual sync to ensure all devices have the latest data.
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 8,
    shadowColor: '#6B5FFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 20,
  },
  signInContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  signInButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 40,
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  signInText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  featuresContainer: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#1C1C1E',
    marginLeft: 12,
    fontWeight: '500',
  },
  syncContainer: {
    paddingTop: 20,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6B5FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#8E8E93',
  },
  syncStatusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 10,
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  statusLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  syncResultContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  syncResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  syncResultItem: {
    alignItems: 'center',
  },
  syncResultValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginVertical: 4,
  },
  syncResultLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6B5FFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  syncButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  sheetLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  sheetLinkText: {
    fontSize: 13,
    color: '#6B5FFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
});

export default SyncScreen;