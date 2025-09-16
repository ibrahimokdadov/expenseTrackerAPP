import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {StorageService} from '../services/StorageService';
import {GoogleSheetsService} from '../services/GoogleSheetsService';
import {Expense, ConflictItem} from '../types';

const SyncScreen = ({navigation}: any) => {
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadPendingExpenses();
    checkAuthStatus();
  }, []);

  const loadPendingExpenses = async () => {
    const pending = await StorageService.getPendingExpenses();
    setPendingExpenses(pending);
  };

  const checkAuthStatus = async () => {
    const status = await GoogleSheetsService.isAuthenticated();
    setIsAuthenticated(status);
  };

  const handleSignIn = async () => {
    try {
      await GoogleSheetsService.signIn();
      setIsAuthenticated(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Google');
    }
  };

  const handleSync = async () => {
    if (!isAuthenticated) {
      Alert.alert('Not Authenticated', 'Please sign in with Google first');
      return;
    }

    setIsSyncing(true);

    try {
      const conflicts = await GoogleSheetsService.checkForConflicts(pendingExpenses);

      if (conflicts.length > 0) {
        setConflicts(conflicts);
        Alert.alert(
          'Conflicts Detected',
          'There are conflicts that need to be resolved before syncing'
        );
      } else {
        await GoogleSheetsService.syncExpenses(pendingExpenses);

        for (const expense of pendingExpenses) {
          await StorageService.updateExpense(expense.id, {syncStatus: 'synced'});
        }

        Alert.alert(
          'Success',
          `Successfully synced ${pendingExpenses.length} expenses`,
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sync expenses. Please try again.');
    } finally {
      setIsSyncing(false);
      await loadPendingExpenses();
    }
  };

  const resolveConflict = (index: number, resolution: 'local' | 'remote' | 'both') => {
    const newConflicts = [...conflicts];
    newConflicts[index].resolution = resolution;
    setConflicts(newConflicts);
  };

  const handleResolveConflicts = async () => {
    const unresolvedCount = conflicts.filter(c => !c.resolution).length;
    if (unresolvedCount > 0) {
      Alert.alert('Error', 'Please resolve all conflicts before proceeding');
      return;
    }

    setIsSyncing(true);

    try {
      await GoogleSheetsService.resolveConflicts(conflicts);
      setConflicts([]);
      await handleSync();
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve conflicts');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {!isAuthenticated ? (
        <View style={styles.authSection}>
          <Text style={styles.authText}>
            Sign in with Google to sync your expenses
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <Text style={styles.signInButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>Sync Status</Text>
            <Text style={styles.statusText}>
              {pendingExpenses.length} expenses pending sync
            </Text>
          </View>

          {conflicts.length > 0 && (
            <View style={styles.conflictsSection}>
              <Text style={styles.conflictsTitle}>Resolve Conflicts</Text>
              {conflicts.map((conflict, index) => (
                <View key={index} style={styles.conflictItem}>
                  <Text style={styles.conflictHeader}>
                    Conflict for expense on {conflict.local.date}
                  </Text>

                  <View style={styles.conflictVersions}>
                    <View style={styles.versionCard}>
                      <Text style={styles.versionTitle}>Local Version</Text>
                      <Text>Type: {conflict.local.type}</Text>
                      <Text>Amount: ${conflict.local.amount}</Text>
                      <Text>Purpose: {conflict.local.purpose || 'N/A'}</Text>
                    </View>

                    <View style={styles.versionCard}>
                      <Text style={styles.versionTitle}>Remote Version</Text>
                      <Text>Type: {conflict.remote.type}</Text>
                      <Text>Amount: ${conflict.remote.amount}</Text>
                      <Text>Purpose: {conflict.remote.purpose || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.resolutionOptions}>
                    <TouchableOpacity
                      style={[
                        styles.resolutionButton,
                        conflict.resolution === 'local' && styles.selectedResolution,
                      ]}
                      onPress={() => resolveConflict(index, 'local')}>
                      <Text style={styles.resolutionText}>Keep Local</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.resolutionButton,
                        conflict.resolution === 'remote' && styles.selectedResolution,
                      ]}
                      onPress={() => resolveConflict(index, 'remote')}>
                      <Text style={styles.resolutionText}>Keep Remote</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.resolutionButton,
                        conflict.resolution === 'both' && styles.selectedResolution,
                      ]}
                      onPress={() => resolveConflict(index, 'both')}>
                      <Text style={styles.resolutionText}>Keep Both</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.resolveButton}
                onPress={handleResolveConflicts}
                disabled={isSyncing}>
                {isSyncing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.resolveButtonText}>Resolve & Sync</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {conflicts.length === 0 && (
            <TouchableOpacity
              style={[styles.syncButton, isSyncing && styles.syncingButton]}
              onPress={handleSync}
              disabled={isSyncing || pendingExpenses.length === 0}>
              {isSyncing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.syncButtonText}>
                  {pendingExpenses.length === 0
                    ? 'All expenses are synced'
                    : `Sync ${pendingExpenses.length} Expenses`}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How Sync Works</Text>
        <Text style={styles.infoText}>
          • Your expenses are saved locally first{'\n'}
          • When online, sync uploads to Google Sheets{'\n'}
          • Conflicts are detected automatically{'\n'}
          • You can resolve conflicts before syncing
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  authSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  authText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  conflictsSection: {
    margin: 20,
  },
  conflictsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  conflictItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  conflictHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 10,
  },
  conflictVersions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  versionCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  versionTitle: {
    fontWeight: '600',
    marginBottom: 5,
  },
  resolutionOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  resolutionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedResolution: {
    backgroundColor: '#667eea',
  },
  resolutionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resolveButton: {
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#22c55e',
    margin: 20,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  syncingButton: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

export default SyncScreen;