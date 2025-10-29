import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { StorageService } from '../services/StorageService';
import { CurrencyService, CURRENCIES } from '../services/CurrencyService';
import { Loan, LoanHistoryEntry, User, Currency } from '../types';

const LoansScreen = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'given' | 'received' | 'all'>('all');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('DZD');

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loanType, setLoanType] = useState<'given' | 'received'>('given');
  const [giverName, setGiverName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [isGiverMe, setIsGiverMe] = useState(true);
  const [isReceiverMe, setIsReceiverMe] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('DZD');

  // Edit form states
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const loadData = async () => {
    try {
      const [loadedLoans, loadedUsers, userId, currency] = await Promise.all([
        StorageService.getLoans(),
        StorageService.getUsers(),
        StorageService.getCurrentUser(),
        CurrencyService.getSelectedCurrency(),
      ]);

      console.log(`[LoansScreen] Loaded ${loadedLoans.length} loans:`,
        loadedLoans.map(l => ({ id: l.id, status: l.status, description: l.description }))
      );

      setLoans(loadedLoans);
      setUsers(loadedUsers);
      setCurrentUserId(userId);
      setDefaultCurrency(currency);
      setSelectedCurrency(currency);
    } catch (error) {
      console.error('[LoansScreen] Error loading data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getCurrencySymbol = () => {
    const currency = CurrencyService.getCurrencyByCode(defaultCurrency);
    return currency?.symbol || '$';
  };

  const handleAddLoan = async () => {
    const finalGiver = isGiverMe ? 'Me' : giverName;
    const finalReceiver = isReceiverMe ? 'Me' : receiverName;

    if (!amount || !finalGiver || !finalReceiver) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (finalGiver === finalReceiver) {
      Alert.alert('Invalid Loan', 'Giver and receiver cannot be the same');
      return;
    }

    await StorageService.saveLoan({
      amount: parseFloat(amount),
      description,
      giver: finalGiver,
      receiver: finalReceiver,
      status: 'pending',
      currency: selectedCurrency,
    });

    setModalVisible(false);
    resetForm();
    loadData();
  };

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setEditAmount(loan.amount.toString());
    setEditDescription(loan.description || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedLoan) return;

    if (!editAmount || parseFloat(editAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const updates: Partial<Loan> = {};
      if (parseFloat(editAmount) !== selectedLoan.amount) {
        updates.amount = parseFloat(editAmount);
      }
      if (editDescription !== selectedLoan.description) {
        updates.description = editDescription;
      }

      if (Object.keys(updates).length > 0) {
        await StorageService.updateLoan(selectedLoan.id, updates);

        // Update local state immediately
        setLoans(prevLoans =>
          prevLoans.map(loan =>
            loan.id === selectedLoan.id
              ? { ...loan, ...updates }
              : loan
          )
        );

        await loadData();
      }

      setEditModalVisible(false);
      setSelectedLoan(null);
      setEditAmount('');
      setEditDescription('');
    } catch (error) {
      console.error('Error updating loan:', error);
      Alert.alert('Error', 'Failed to update loan');
    }
  };

  const handleUpdateLoanStatus = async (loanId: string, status: 'pending' | 'fulfilled') => {
    try {
      await StorageService.updateLoan(loanId, { status });

      // Update local state immediately for better UX
      setLoans(prevLoans =>
        prevLoans.map(loan =>
          loan.id === loanId
            ? {
              ...loan,
              status,
              dateFulfilled: status === 'fulfilled' && !loan.dateFulfilled
                ? new Date().toISOString()
                : loan.dateFulfilled
            }
            : loan
        )
      );

      // Also reload data to ensure consistency
      await loadData();
    } catch (error) {
      console.error('Error updating loan status:', error);
      Alert.alert('Error', 'Failed to update loan status');
    }
  };

  const handleDeleteLoan = (loanId: string) => {
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update local state immediately for better UX
              setLoans(prevLoans => prevLoans.filter(loan => loan.id !== loanId));

              // Also delete from storage
              await StorageService.deleteLoan(loanId);

              // Reload data to ensure consistency
              await loadData();
            } catch (error) {
              console.error('Error deleting loan:', error);
              // Restore the loan if deletion failed
              await loadData();
              Alert.alert('Error', 'Failed to delete loan');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setLoanType('given');
    setGiverName('');
    setReceiverName('');
    setIsGiverMe(true);
    setIsReceiverMe(false);
    setSelectedCurrency(defaultCurrency);
  };

  const getFilteredLoans = () => {
    switch (activeTab) {
      case 'given':
        return loans.filter(loan => loan.giver === 'Me');
      case 'received':
        return loans.filter(loan => loan.receiver === 'Me');
      default:
        return loans;
    }
  };

  const filteredLoans = getFilteredLoans();
  const pendingLoans = filteredLoans.filter(l => l.status === 'pending');
  const fulfilledLoans = filteredLoans.filter(l => l.status === 'fulfilled');

  const totalPending = pendingLoans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalFulfilled = fulfilledLoans.reduce((sum, loan) => sum + loan.amount, 0);

  const LoanItem = ({ loan }: { loan: Loan }) => {
    const isGiven = loan.giver === 'Me';
    const otherParty = isGiven ? loan.receiver : loan.giver;
    const loanDate = new Date(loan.dateCreated);
    const loanCurrency = CurrencyService.getCurrencyByCode(loan.currency || defaultCurrency);
    const isHistoryExpanded = expandedHistoryId === loan.id;
    const hasHistory = loan.history && loan.history.length > 0;
    const sortedHistory = loan.history ? [...loan.history].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ) : [];

    const formatHistoryDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <View style={styles.loanItem}>
        <View style={styles.loanMainContent}>
          <View style={styles.loanLeft}>
            <View style={[styles.loanIcon, { backgroundColor: isGiven ? '#FEE2E2' : '#DCFCE7' }]}>
              <Text style={styles.loanIconText}>{isGiven ? '↗' : '↙'}</Text>
            </View>
            <View style={styles.loanDetails}>
              <Text style={styles.loanParty}>{otherParty}</Text>
              <Text style={styles.loanDescription}>
                {loan.description || (isGiven ? 'Money lent' : 'Money borrowed')}
              </Text>
              <Text style={styles.loanDate}>
                {loanDate.toLocaleDateString()}
                {loan.status === 'fulfilled' && loan.dateFulfilled &&
                  ` • Paid ${new Date(loan.dateFulfilled).toLocaleDateString()}`}
              </Text>
            </View>
          </View>
          <View style={styles.loanRight}>
            <Text style={[styles.loanAmount, { color: isGiven ? '#DC2626' : '#16A34A' }]}>
              {isGiven ? '-' : '+'}{loanCurrency.symbol}{loan.amount.toFixed(0)}
            </Text>
            <View style={styles.loanActions}>
              {loan.status === 'pending' && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    console.log('[LoansScreen] Edit button pressed for loan:', loan.id);
                    handleEditLoan(loan);
                  }}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              )}
              {loan.status === 'pending' ? (
                <TouchableOpacity
                  style={styles.markPaidButton}
                  onPress={() => handleUpdateLoanStatus(loan.id, 'fulfilled')}>
                  <Text style={styles.markPaidText}>Mark Paid</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.undoButton}
                  onPress={() => handleUpdateLoanStatus(loan.id, 'pending')}>
                  <Text style={styles.undoText}>Undo</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteLoan(loan.id)}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* History Toggle Button */}
        {hasHistory && (
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setExpandedHistoryId(isHistoryExpanded ? null : loan.id)}>
            <Text style={styles.historyToggleText}>
              {isHistoryExpanded ? '▼' : '▶'} History ({sortedHistory.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* History Timeline */}
        {isHistoryExpanded && hasHistory && (
          <View style={styles.historyContainer}>
            {sortedHistory.map((entry, index) => (
              <View
                key={index}
                style={[
                  styles.historyEntry,
                  index === sortedHistory.length - 1 && styles.historyEntryLast
                ]}>
                <View style={styles.historyTimeline}>
                  <View style={styles.historyDot} />
                  {index < sortedHistory.length - 1 && <View style={styles.historyLine} />}
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyDate}>{formatHistoryDate(entry.date)}</Text>
                  {entry.amount !== undefined && entry.previousAmount !== undefined && (
                    <View style={styles.historyChange}>
                      <Text style={styles.historyLabel}>Amount:</Text>
                      <Text style={styles.historyValue}>
                        {loanCurrency.symbol}{entry.previousAmount.toFixed(0)} → {loanCurrency.symbol}{entry.amount.toFixed(0)}
                      </Text>
                    </View>
                  )}
                  {entry.description !== undefined && entry.previousDescription !== undefined && (
                    <View style={styles.historyChange}>
                      <Text style={styles.historyLabel}>Description:</Text>
                      <Text style={styles.historyValue}>
                        "{entry.previousDescription}" → "{entry.description}"
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#6B5FFF', '#8A7FFF']}
          style={styles.summaryCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={styles.summaryAmount}>
                {getCurrencySymbol()}{totalPending.toFixed(0)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Fulfilled</Text>
              <Text style={styles.summaryAmount}>
                {getCurrencySymbol()}{totalFulfilled.toFixed(0)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}>
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'given' && styles.activeTab]}
            onPress={() => setActiveTab('given')}>
            <Text style={[styles.tabText, activeTab === 'given' && styles.activeTabText]}>
              Given
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && styles.activeTab]}
            onPress={() => setActiveTab('received')}>
            <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
              Received
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredLoans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>No loans yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first loan</Text>
          </View>
        ) : (
          <>
            {pendingLoans.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Loans</Text>
                {pendingLoans.map(loan => (
                  <LoanItem key={loan.id} loan={loan} />
                ))}
              </View>
            )}

            {fulfilledLoans.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Paid Loans</Text>
                {fulfilledLoans.map(loan => (
                  <LoanItem key={loan.id} loan={loan} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}>
        <LinearGradient
          colors={['#6B5FFF', '#8A7FFF']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Loan</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Loan Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeButton, loanType === 'given' && styles.activeTypeButton]}
                    onPress={() => {
                      setLoanType('given');
                      setIsGiverMe(true);
                      setIsReceiverMe(false);
                      setGiverName('');
                      setReceiverName('');
                    }}>
                    <Text style={[styles.typeButtonText, loanType === 'given' && styles.activeTypeButtonText]}>
                      I'm Lending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, loanType === 'received' && styles.activeTypeButton]}
                    onPress={() => {
                      setLoanType('received');
                      setIsGiverMe(false);
                      setIsReceiverMe(true);
                      setGiverName('');
                      setReceiverName('');
                    }}>
                    <Text style={[styles.typeButtonText, loanType === 'received' && styles.activeTypeButtonText]}>
                      I'm Borrowing
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Giver</Text>
                <View style={styles.partySelector}>
                  <TextInput
                    style={styles.input}
                    value={isGiverMe ? 'Me' : giverName}
                    onChangeText={(text) => {
                      if (text === 'Me') {
                        setIsGiverMe(true);
                        setGiverName('');
                        if (isReceiverMe) setIsReceiverMe(false);
                      } else {
                        setIsGiverMe(false);
                        setGiverName(text);
                      }
                    }}
                    placeholder="Enter giver's name or 'Me'"
                    placeholderTextColor="#9CA3AF"
                  />
                  <View style={styles.quickOptions}>
                    <TouchableOpacity
                      style={[styles.quickOption, isGiverMe && styles.quickOptionActive]}
                      onPress={() => {
                        setIsGiverMe(true);
                        setGiverName('');
                        if (isReceiverMe) setIsReceiverMe(false);
                      }}>
                      <Text style={[styles.quickOptionText, isGiverMe && styles.quickOptionActiveText]}>Me</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Receiver</Text>
                <View style={styles.partySelector}>
                  <TextInput
                    style={styles.input}
                    value={isReceiverMe ? 'Me' : receiverName}
                    onChangeText={(text) => {
                      if (text === 'Me') {
                        setIsReceiverMe(true);
                        setReceiverName('');
                        if (isGiverMe) setIsGiverMe(false);
                      } else {
                        setIsReceiverMe(false);
                        setReceiverName(text);
                      }
                    }}
                    placeholder="Enter receiver's name or 'Me'"
                    placeholderTextColor="#9CA3AF"
                  />
                  <View style={styles.quickOptions}>
                    <TouchableOpacity
                      style={[styles.quickOption, isReceiverMe && styles.quickOptionActive]}
                      onPress={() => {
                        setIsReceiverMe(true);
                        setReceiverName('');
                        if (isGiverMe) setIsGiverMe(false);
                      }}>
                      <Text style={[styles.quickOptionText, isReceiverMe && styles.quickOptionActiveText]}>Me</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountInput}>
                  <Text style={styles.currencySymbol}>
                    {CurrencyService.getCurrencyByCode(selectedCurrency).symbol}
                  </Text>
                  <TextInput
                    style={styles.amountField}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Currency</Text>
                <View style={styles.currencySelector}>
                  {CURRENCIES.map((currency) => (
                    <TouchableOpacity
                      key={currency.code}
                      style={[
                        styles.currencyButton,
                        selectedCurrency === currency.code && styles.activeCurrencyButton,
                      ]}
                      onPress={() => setSelectedCurrency(currency.code)}>
                      <Text
                        style={[
                          styles.currencyButtonText,
                          selectedCurrency === currency.code && styles.activeCurrencyButtonText,
                        ]}>
                        {currency.symbol} {currency.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What is this loan for?"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddLoan}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#6B5FFF', '#8A7FFF']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Text style={styles.submitButtonText}>Add Loan</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Loan Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Loan</Text>
              <TouchableOpacity onPress={() => {
                setEditModalVisible(false);
                setSelectedLoan(null);
                setEditAmount('');
                setEditDescription('');
              }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountInput}>
                  <Text style={styles.currencySymbol}>
                    {selectedLoan ? CurrencyService.getCurrencyByCode(selectedLoan.currency || defaultCurrency).symbol : getCurrencySymbol()}
                  </Text>
                  <TextInput
                    style={styles.amountField}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="What is this loan for?"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSaveEdit}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#6B5FFF', '#8A7FFF']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6B5FFF',
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#6B5FFF',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  loanItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'column',
  },
  loanMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loanIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  loanIconText: {
    fontSize: 20,
  },
  loanDetails: {
    flex: 1,
  },
  loanParty: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  loanDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  loanDate: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  loanRight: {
    alignItems: 'flex-end',
    minWidth: 140,
    maxWidth: '50%',
  },
  loanAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  loanActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  markPaidButton: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  markPaidText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  undoButton: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  undoText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  historyToggle: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 12,
    width: '100%',
  },
  historyToggleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  historyContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 0,
    backgroundColor: 'transparent',
  },
  historyEntry: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyEntryLast: {
    borderBottomWidth: 0,
  },
  historyTimeline: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6B5FFF',
    marginTop: 4,
  },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#D1D5DB',
    marginTop: 4,
    minHeight: 20,
  },
  historyContent: {
    flex: 1,
    marginLeft: 12,
  },
  historyDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  historyChange: {
    marginTop: 4,
  },
  historyLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  historyValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#6B5FFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: '#6B5FFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTypeButtonText: {
    color: 'white',
  },
  partySelector: {
    gap: 8,
  },
  quickOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickOption: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickOptionActive: {
    backgroundColor: '#E8E5FF',
    borderColor: '#6B5FFF',
  },
  quickOptionText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  quickOptionActiveText: {
    color: '#6B5FFF',
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeCurrencyButton: {
    backgroundColor: '#6B5FFF',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeCurrencyButtonText: {
    color: 'white',
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#6B5FFF',
    fontWeight: '700',
    marginRight: 8,
  },
  amountField: {
    flex: 1,
    fontSize: 20,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LoansScreen;