import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StorageService} from '../services/StorageService';
import {ZTBalance, ZTPayment} from '../types';
import {useTheme} from '../contexts/ThemeContext';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const ZTScreen = ({navigation}: any) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [balances, setBalances] = useState<ZTBalance[]>([]);
  const [payments, setPayments] = useState<ZTPayment[]>([]);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'balances' | 'payments'>('dashboard');

  // Balance form states
  const [balanceOwner, setBalanceOwner] = useState('');
  const [balanceValue, setBalanceValue] = useState('');
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear().toString());

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPurpose, setPaymentPurpose] = useState('');

  // Reload data when screen gets focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedBalances, loadedPayments] = await Promise.all([
        StorageService.getZTBalances(),
        StorageService.getZTPayments(),
      ]);
      setBalances(loadedBalances);
      setPayments(loadedPayments);
    } catch (error) {
      console.error('Error loading ZT data:', error);
    }
  };

  // Calculate metrics
  const totalBalances = balances.reduce((sum, b) => sum + b.value, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalBalances - totalPayments;
  const paymentPercentage = totalBalances > 0 ? (totalPayments / totalBalances) * 100 : 0;

  const handleAddBalance = async () => {
    if (!balanceOwner.trim() || !balanceValue || !balanceYear) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await StorageService.addZTBalance({
        owner: balanceOwner.trim(),
        value: parseFloat(balanceValue),
        year: parseInt(balanceYear),
      });

      setBalanceOwner('');
      setBalanceValue('');
      setBalanceYear(new Date().getFullYear().toString());
      setShowBalanceModal(false);
      loadData();

      Alert.alert('Success', 'Balance added successfully');
    } catch (error) {
      console.error('Error adding balance:', error);
      Alert.alert('Error', 'Failed to add balance');
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || !paymentPurpose.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await StorageService.addZTPayment({
        amount: parseFloat(paymentAmount),
        purpose: paymentPurpose.trim(),
      });

      setPaymentAmount('');
      setPaymentPurpose('');
      setShowPaymentModal(false);
      loadData();

      Alert.alert('Success', 'Payment added successfully');
    } catch (error) {
      console.error('Error adding payment:', error);
      Alert.alert('Error', 'Failed to add payment');
    }
  };

  const handleDeleteBalance = (id: string) => {
    Alert.alert(
      'Delete Balance',
      'Are you sure you want to delete this balance?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteZTBalance(id);
            loadData();
          },
        },
      ]
    );
  };

  const handleDeletePayment = (id: string) => {
    Alert.alert(
      'Delete Payment',
      'Are you sure you want to delete this payment?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteZTPayment(id);
            loadData();
          },
        },
      ]
    );
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={{paddingBottom: insets.bottom + 20}}>
      {/* Key Metrics Cards */}
      <View style={styles.metricsContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Balances</Text>
          <Text style={styles.metricValue}>{formatNumber(totalBalances)} DZD</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#f093fb', '#f5576c']}
          style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Payments</Text>
          <Text style={styles.metricValue}>{formatNumber(totalPayments)} DZD</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.metricCard}>
          <Text style={styles.metricLabel}>Remaining</Text>
          <Text style={styles.metricValue}>{formatNumber(remaining)} DZD</Text>
        </LinearGradient>
      </View>

      {/* Analytics Section */}
      <View style={[styles.analyticsSection, {backgroundColor: colors.card}]}>
        <Text style={[styles.sectionTitle, {color: colors.text}]}>Analytics</Text>

        <View style={styles.analyticsItem}>
          <Text style={[styles.analyticsLabel, {color: colors.text}]}>Payment Progress</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, {width: `${Math.min(paymentPercentage, 100)}%`}]} />
          </View>
          <Text style={[styles.analyticsValue, {color: colors.textSecondary}]}>
            {paymentPercentage.toFixed(1)}% of Balance Paid
          </Text>
        </View>

        <View style={styles.analyticsItem}>
          <Text style={[styles.analyticsLabel, {color: colors.text}]}>Balance vs Payments</Text>
          <Text style={[styles.analyticsValue, {color: colors.textSecondary}]}>
            {remaining >= 0 ? `${formatNumber(remaining)} DZD Remaining` : `${formatNumber(Math.abs(remaining))} DZD Overpaid`}
          </Text>
        </View>

        <View style={styles.analyticsItem}>
          <Text style={[styles.analyticsLabel, {color: colors.text}]}>Total Owners</Text>
          <Text style={[styles.analyticsValue, {color: colors.textSecondary}]}>
            {new Set(balances.map(b => b.owner)).size}
          </Text>
        </View>

        <View style={styles.analyticsItem}>
          <Text style={[styles.analyticsLabel, {color: colors.text}]}>Years Tracked</Text>
          <Text style={[styles.analyticsValue, {color: colors.textSecondary}]}>
            {balances.length > 0 ? `${Math.min(...balances.map(b => b.year))} - ${Math.max(...balances.map(b => b.year))}` : 'No data'}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, {backgroundColor: '#667eea'}]}
          onPress={() => setShowBalanceModal(true)}>
          <Icon name="add-circle" size={24} color="#FFF" />
          <Text style={styles.quickActionText}>Add Balance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, {backgroundColor: '#f5576c'}]}
          onPress={() => setShowPaymentModal(true)}>
          <Icon name="payment" size={24} color="#FFF" />
          <Text style={styles.quickActionText}>Add Payment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBalances = () => (
    <FlatList
      data={balances}
      contentContainerStyle={{paddingBottom: insets.bottom + 20}}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowBalanceModal(true)}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.addButtonGradient}>
            <Icon name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Add Balance</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
          No balances added yet
        </Text>
      }
      renderItem={({item}) => (
        <View style={[styles.listItem, {backgroundColor: colors.card}]}>
          <View style={styles.listItemContent}>
            <View>
              <Text style={[styles.listItemTitle, {color: colors.text}]}>{item.owner}</Text>
              <Text style={[styles.listItemSubtitle, {color: colors.textSecondary}]}>
                Year: {item.year} • Added: {formatDate(item.dateAdded)}
              </Text>
            </View>
            <Text style={[styles.listItemAmount, {color: '#667eea'}]}>
              {formatNumber(item.value)} DZD
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteBalance(item.id)}>
            <Icon name="delete" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      )}
    />
  );

  const renderPayments = () => (
    <FlatList
      data={payments}
      contentContainerStyle={{paddingBottom: insets.bottom + 20}}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowPaymentModal(true)}>
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            style={styles.addButtonGradient}>
            <Icon name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Add Payment</Text>
          </LinearGradient>
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
          No payments added yet
        </Text>
      }
      renderItem={({item}) => (
        <View style={[styles.listItem, {backgroundColor: colors.card}]}>
          <View style={styles.listItemContent}>
            <View style={{flex: 1}}>
              <Text style={[styles.listItemTitle, {color: colors.text}]}>{item.purpose}</Text>
              <Text style={[styles.listItemSubtitle, {color: colors.textSecondary}]}>
                {formatDate(item.date)}
              </Text>
            </View>
            <Text style={[styles.listItemAmount, {color: '#f5576c'}]}>
              {formatNumber(item.amount)} DZD
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePayment(item.id)}>
            <Icon name="delete" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      )}
    />
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ZT Tracker</Text>
        <View style={{width: 40}} />
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabContainer, {backgroundColor: colors.card}]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}>
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balances' && styles.activeTab]}
          onPress={() => setActiveTab('balances')}>
          <Text style={[styles.tabText, activeTab === 'balances' && styles.activeTabText]}>
            Balances
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
          onPress={() => setActiveTab('payments')}>
          <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>
            Payments
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'balances' && renderBalances()}
        {activeTab === 'payments' && renderPayments()}
      </View>

      {/* Add Balance Modal */}
      <Modal
        visible={showBalanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBalanceModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBalanceModal(false)}>
          <View style={[styles.modalContent, {backgroundColor: colors.card}]}
                onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>Add Balance</Text>

            <TextInput
              style={[styles.input, {backgroundColor: colors.background, color: colors.text}]}
              placeholder="Owner (e.g., Me, Father)"
              placeholderTextColor={colors.textSecondary}
              value={balanceOwner}
              onChangeText={setBalanceOwner}
            />

            <TextInput
              style={[styles.input, {backgroundColor: colors.background, color: colors.text}]}
              placeholder="Value"
              placeholderTextColor={colors.textSecondary}
              value={balanceValue}
              onChangeText={setBalanceValue}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, {backgroundColor: colors.background, color: colors.text}]}
              placeholder="Year"
              placeholderTextColor={colors.textSecondary}
              value={balanceYear}
              onChangeText={setBalanceYear}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBalanceModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddBalance}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.confirmButtonGradient}>
                  <Text style={styles.confirmButtonText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentModal(false)}>
          <View style={[styles.modalContent, {backgroundColor: colors.card}]}
                onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>Add Payment</Text>

            <TextInput
              style={[styles.input, {backgroundColor: colors.background, color: colors.text}]}
              placeholder="Amount"
              placeholderTextColor={colors.textSecondary}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, {backgroundColor: colors.background, color: colors.text}]}
              placeholder="Purpose (e.g., Charity to local mosque)"
              placeholderTextColor={colors.textSecondary}
              value={paymentPurpose}
              onChangeText={setPaymentPurpose}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddPayment}>
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={styles.confirmButtonGradient}>
                  <Text style={styles.confirmButtonText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#667eea',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  metricsContainer: {
    padding: 15,
    gap: 12,
  },
  metricCard: {
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  analyticsSection: {
    margin: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  analyticsItem: {
    marginBottom: 20,
  },
  analyticsLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  listItem: {
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  listItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 13,
  },
  listItemAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  deleteButton: {
    marginLeft: 10,
    padding: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    overflow: 'hidden',
  },
  cancelButtonText: {
    textAlign: 'center',
    padding: 12,
    fontSize: 15,
    color: '#666',
  },
  confirmButtonGradient: {
    padding: 12,
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ZTScreen;