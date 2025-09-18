import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
  Animated,
  Modal,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StorageService} from '../services/StorageService';
import {CurrencyService} from '../services/CurrencyService';
import GoogleAuthService from '../services/GoogleAuthService';
import GoogleSheetsService from '../services/GoogleSheetsService';
import {Expense, Category, Loan, Currency} from '../types';
import {useTheme} from '../contexts/ThemeContext';
import DonutChart from '../components/DonutChart';
import Icon from 'react-native-vector-icons/MaterialIcons';

const {width, height} = Dimensions.get('window');

const HomeScreen = ({navigation}: any) => {
  const {theme, colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingLoans, setPendingLoans] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('DZD');
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [categoryPercentages, setCategoryPercentages] = useState<{[key: string]: number}>({});
  const [timePeriod, setTimePeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const [showTimePeriodModal, setShowTimePeriodModal] = useState(false);
  const [chartData, setChartData] = useState<{name: string; value: number; color: string}[]>([]);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadData = async () => {
    // Check Google sign-in status
    const user = await GoogleAuthService.getCurrentUser();
    setGoogleUser(user);

    // Get last sync time
    const syncTime = await GoogleSheetsService.getLastSyncTime();
    setLastSyncTime(syncTime);

    const [expenses, cats, allLoans, currency] = await Promise.all([
      StorageService.getExpenses(),
      StorageService.getCategories(),
      StorageService.getLoans(),
      CurrencyService.getSelectedCurrency(),
    ]);

    setDefaultCurrency(currency);

    const sorted = expenses.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setRecentExpenses(sorted.slice(0, 3));
    setCategories(cats);
    setLoans(allLoans);

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    setTotalAmount(total);

    const now = new Date();

    // Filter expenses based on selected time period
    let filteredExpenses: Expense[] = [];
    let periodTotal = 0;

    if (timePeriod === 'thisMonth') {
      filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === now.getMonth() &&
               expDate.getFullYear() === now.getFullYear();
      });
    } else if (timePeriod === 'lastMonth') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === lastMonth.getMonth() &&
               expDate.getFullYear() === lastMonth.getFullYear();
      });
    } else if (timePeriod === 'thisYear') {
      filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === now.getFullYear();
      });
    }

    periodTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    setMonthlyTotal(periodTotal);

    // For comparison (keep this month for stats)
    const thisMonth = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === now.getMonth() &&
             expDate.getFullYear() === now.getFullYear();
    });

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === lastMonth.getMonth() &&
             expDate.getFullYear() === lastMonth.getFullYear();
    });
    const lastMonthSum = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    setLastMonthTotal(lastMonthSum);

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = expenses.filter(exp => new Date(exp.date) >= oneWeekAgo);
    const weekTotal = thisWeek.reduce((sum, exp) => sum + exp.amount, 0);
    setWeeklyTotal(weekTotal);

    const pending = allLoans.filter(loan => loan.status === 'pending');
    setPendingLoans(pending.length);

    // Calculate category data for the selected time period
    const categoryTotals: {[key: string]: number} = {};
    let totalForPeriod = 0;

    filteredExpenses.forEach(expense => {
      const category = cats.find(c => c.id === expense.category);
      const categoryName = category?.name || 'Other';

      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = 0;
      }
      categoryTotals[categoryName] += expense.amount;
      totalForPeriod += expense.amount;
    });

    // Calculate percentages and prepare chart data
    const percentages: {[key: string]: number} = {};
    const colors = [
      '#FFB6C1', '#87CEEB', '#98FB98', '#FFD700',
      '#DDA0DD', '#F0E68C', '#FFA07A', '#20B2AA'
    ];

    const newChartData: {name: string; value: number; color: string}[] = [];
    let colorIndex = 0;

    Object.keys(categoryTotals).forEach(categoryName => {
      if (totalForPeriod > 0) {
        percentages[categoryName] = Math.round((categoryTotals[categoryName] / totalForPeriod) * 100);
        newChartData.push({
          name: categoryName,
          value: categoryTotals[categoryName],
          color: colors[colorIndex % colors.length],
        });
        colorIndex++;
      } else {
        percentages[categoryName] = 0;
      }
    });

    // Sort chart data by value (largest first)
    newChartData.sort((a, b) => b.value - a.value);

    setCategoryPercentages(percentages);
    setChartData(newChartData);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [timePeriod])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getCurrencySymbol = () => {
    const currency = CurrencyService.getCurrencyByCode(defaultCurrency);
    return currency?.symbol || '$';
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getMonthlyChange = () => {
    if (lastMonthTotal === 0) return 0;
    return ((monthlyTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(0);
  };

  const getCategoryLetter = (categoryName: string | undefined) => {
    if (!categoryName || categoryName.length === 0) return '?';
    return categoryName.charAt(0).toUpperCase();
  };

  const ExpenseItem = ({expense}: {expense: Expense}) => {
    const category = categories.find(c => c.id === expense.category);
    const expenseDate = new Date(expense.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    let dateDisplay = '';
    let isRecent = false;
    if (expenseDate.toDateString() === today.toDateString()) {
      dateDisplay = 'Today';
      isRecent = true;
    } else if (expenseDate.toDateString() === yesterday.toDateString()) {
      dateDisplay = 'Yesterday';
      isRecent = true;
    } else {
      dateDisplay = expenseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={[
        styles.expenseCard,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        <TouchableOpacity
          style={styles.expenseCardContent}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => navigation.navigate('EditExpense', {expense})}
          activeOpacity={0.9}>

          <View style={styles.expenseLeft}>
            <View style={[
              styles.expenseIconModern,
              { backgroundColor: category?.color ? category.color + '15' : '#F5F5FA' }
            ]}>
              <Text style={[
                styles.expenseIconLetter,
                { color: category?.color || '#6B5FFF' }
              ]}>
                {getCategoryLetter(category?.name)}
              </Text>
              {isRecent && (
                <View style={[styles.recentBadge, { backgroundColor: category?.color || '#6B5FFF' }]} />
              )}
            </View>

            <View style={styles.expenseInfo}>
              <Text style={styles.expenseCategoryModern}>
                {category?.name || 'Other'}
                {expense.subcategory && category?.subcategories && (() => {
                  const subcategory = category.subcategories.find(s => s.id === expense.subcategory);
                  return subcategory ? ` • ${subcategory.name}` : '';
                })()}
              </Text>
              <Text style={styles.expenseDescriptionModern} numberOfLines={1}>
                {expense.description || 'No description'}
              </Text>
              <View style={styles.expenseMetaRow}>
                <Text style={styles.expenseDateModern}>
                  {dateDisplay}
                </Text>
                {expense.syncStatus === 'synced' && (
                  <Text style={styles.syncedIndicator}>•</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.expenseAmountContainer}>
            <Text style={[
              styles.expenseAmountModern,
              { color: category?.color || '#FF3B30' }
            ]}>
              -{getCurrencySymbol()}{formatAmount(expense.amount)}
            </Text>
            <View style={styles.expenseArrow}>
              <Text style={styles.expenseArrowText}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f7f9fc" barStyle="dark-content" />

      <LinearGradient
        colors={['#f7f9fc', '#ffffff']}
        style={styles.headerGradient}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>👋 Morning</Text>
            <Text style={styles.userName}>
              {googleUser ? googleUser.name : 'Welcome back!'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {googleUser && (
              <TouchableOpacity
                style={styles.syncButton}
                onPress={async () => {
                  setIsSyncing(true);
                  const success = await StorageService.manualBackup();
                  setIsSyncing(false);
                  if (success) {
                    const syncTime = await GoogleSheetsService.getLastSyncTime();
                    setLastSyncTime(syncTime);
                  }
                }}>
                {isSyncing ? (
                  <Text style={styles.syncIcon}>🔄</Text>
                ) : (
                  <Icon
                    name="backup"
                    size={20}
                    color={StorageService.isAutoBackupEnabled() ? '#4CAF50' : '#8E8E93'}
                  />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Settings')}>
              {googleUser ? (
                <Icon name="account-circle" size={24} color="#6B5FFF" />
              ) : (
                <Text style={styles.profileEmoji}>👤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View
          style={[
            styles.balanceCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <LinearGradient
            colors={['#6B5FFF', '#8A7FFF']}
            style={styles.balanceGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}>

            <View style={styles.balanceTop}>
              <View style={styles.balanceLeft}>
                <Text style={styles.balanceLabel}>Expense total</Text>
                <TouchableOpacity
                  style={styles.monthSelector}
                  onPress={() => setShowTimePeriodModal(true)}>
                  <Text style={styles.monthText}>
                    {timePeriod === 'thisMonth' ? 'This month' :
                     timePeriod === 'lastMonth' ? 'Last month' :
                     'This year'} ▼
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.balanceDonut}>
                <DonutChart
                  data={chartData}
                  size={80}
                  strokeWidth={12}
                  total={monthlyTotal}
                />
              </View>
            </View>

            <Text style={styles.balanceAmount}>
              {getCurrencySymbol()}{formatAmount(monthlyTotal)}
            </Text>

            <View style={styles.balanceFooter}>
              <View style={styles.changeIndicator}>
                <Text style={styles.changeIcon}>
                  {Number(getMonthlyChange()) >= 0 ? '📈' : '📉'}
                </Text>
                <Text style={styles.changeText}>
                  {getMonthlyChange()}% from last month
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6B5FFF']}
          />
        }>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Charts')}>
            <LinearGradient
              colors={['#ffffff', '#fafbff']}
              style={styles.statGradient}>
              <Text style={styles.statIcon}>📊</Text>
              <Text style={styles.statLabel}>Statistics</Text>
              <Text style={styles.statValue}>View charts</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Loans')}>
            <LinearGradient
              colors={['#ffffff', '#fff5f5']}
              style={styles.statGradient}>
              <Text style={styles.statIcon}>💳</Text>
              <Text style={styles.statLabel}>Loans</Text>
              <Text style={styles.statValue}>Manage</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Sync')}>
            <LinearGradient
              colors={['#ffffff', '#f5fff5']}
              style={styles.statGradient}>
              <Text style={styles.statIcon}>☁️</Text>
              <Text style={styles.statLabel}>Sync</Text>
              <Text style={styles.statValue}>Google Sheets</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('ExpenseList')}>
            <LinearGradient
              colors={['#ffffff', '#fff9f5']}
              style={styles.statGradient}>
              <Text style={styles.statIcon}>📋</Text>
              <Text style={styles.statLabel}>This Week</Text>
              <Text style={styles.statValue}>{getCurrencySymbol()}{formatAmount(weeklyTotal)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {pendingLoans > 0 && (
          <TouchableOpacity
            style={styles.loanCard}
            onPress={() => navigation.navigate('Loans')}>
            <LinearGradient
              colors={['#FFF5F5', '#FFF0F0']}
              style={styles.loanGradient}>
              <View style={styles.loanContent}>
                <Text style={styles.loanIcon}>💳</Text>
                <View style={styles.loanInfo}>
                  <Text style={styles.loanTitle}>Active Loans</Text>
                  <Text style={styles.loanSubtitle}>{pendingLoans} loan{pendingLoans > 1 ? 's' : ''} to track</Text>
                </View>
                <Text style={styles.loanArrow}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Text style={styles.sectionSubtitle}>
                {recentExpenses.length > 0 ? `${recentExpenses.length} recent expenses` : 'No transactions yet'}
              </Text>
            </View>
            {recentExpenses.length > 0 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => navigation.navigate('ExpenseList')}>
                <Text style={styles.seeAll}>View All</Text>
                <Text style={styles.seeAllArrow}>→</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.expensesList}>
            {recentExpenses.length === 0 ? (
              <View style={styles.emptyStateModern}>
                <LinearGradient
                  colors={['#F0EFFF', '#F8F7FF']}
                  style={styles.emptyStateCard}>
                  <View style={styles.emptyIconContainer}>
                    <Text style={styles.emptyIconModern}>💸</Text>
                  </View>
                  <Text style={styles.emptyTextModern}>Start Tracking Expenses</Text>
                  <Text style={styles.emptySubtextModern}>
                    Add your first expense to see insights
                  </Text>
                  <TouchableOpacity
                    style={styles.addFirstExpenseButton}
                    onPress={() => navigation.navigate('AddExpense')}>
                    <LinearGradient
                      colors={['#6B5FFF', '#8A7FFF']}
                      style={styles.addFirstExpenseGradient}>
                      <Text style={styles.addFirstExpenseText}>Add Expense</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : (
              <>
                {recentExpenses.map((expense, index) => (
                  <Animated.View
                    key={expense.id}
                    style={{
                      opacity: fadeAnim,
                      transform: [{
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 30],
                          outputRange: [0, index * 10],
                        }),
                      }],
                    }}>
                    <ExpenseItem expense={expense} />
                  </Animated.View>
                ))}
              </>
            )}
          </View>
        </View>

        <View style={styles.spendingSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Spending Details</Text>
              <Text style={styles.spendingSubtitle}>
                {Object.keys(categoryPercentages).length > 0
                  ? `Your expenses are divided into ${Object.keys(categoryPercentages).length} categories`
                  : 'Start tracking your expenses by category'}
              </Text>
            </View>
            {Object.keys(categoryPercentages).length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Charts')}>
                <Text style={styles.seeAll}>View charts →</Text>
              </TouchableOpacity>
            )}
          </View>

          {Object.keys(categoryPercentages).length === 0 ? (
            <View style={styles.emptyCategories}>
              <Text style={styles.emptyCategoriesText}>No expenses yet this month</Text>
              <TouchableOpacity
                style={styles.addExpenseHint}
                onPress={() => navigation.navigate('AddExpense')}>
                <Text style={styles.addExpenseHintText}>Add your first expense</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.categoryGrid}>
              {categories.map((cat, index) => {
                const percentage = categoryPercentages[cat.name] || 0;
                if (percentage === 0) return null;

                const colors = [
                  ['#6B5FFF', '#8A7FFF'],
                  ['#FF6B9D', '#FF9A9E'],
                  ['#66D9EF', '#A6E3E9'],
                  ['#FFD93D', '#FCE38A'],
                  ['#95E1D3', '#3FC1C9'],
                  ['#C9B6E4', '#E1CCEC'],
                  ['#FFA07A', '#FFB6C1'],
                  ['#87CEEB', '#B0E0E6'],
                ];

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryCard}
                    onPress={() => navigation.navigate('CategoryDetails', {categoryId: cat.id})}
                    activeOpacity={0.7}>
                    <LinearGradient
                      colors={colors[index % colors.length]}
                      style={styles.categoryGradient}>
                      <Text style={styles.categoryPercentage}>{percentage}%</Text>
                    </LinearGradient>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              }).filter(Boolean)}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={[styles.bottomNav, {paddingBottom: insets.bottom > 0 ? insets.bottom : 12}]}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navActive]}>🏠</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Charts')}>
          <Text style={styles.navIcon}>📊</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddExpense')}>
          <LinearGradient
            colors={['#6B5FFF', '#8A7FFF']}
            style={styles.addGradient}>
            <Text style={styles.addIcon}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('ExpenseList')}>
          <Text style={styles.navIcon}>📋</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showTimePeriodModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePeriodModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePeriodModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Period</Text>

            <TouchableOpacity
              style={[
                styles.modalOption,
                timePeriod === 'thisMonth' && styles.modalOptionActive
              ]}
              onPress={() => {
                setTimePeriod('thisMonth');
                setShowTimePeriodModal(false);
              }}>
              <Text style={[
                styles.modalOptionText,
                timePeriod === 'thisMonth' && styles.modalOptionTextActive
              ]}>This Month</Text>
              {timePeriod === 'thisMonth' && (
                <Text style={styles.modalCheckmark}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalOption,
                timePeriod === 'lastMonth' && styles.modalOptionActive
              ]}
              onPress={() => {
                setTimePeriod('lastMonth');
                setShowTimePeriodModal(false);
              }}>
              <Text style={[
                styles.modalOptionText,
                timePeriod === 'lastMonth' && styles.modalOptionTextActive
              ]}>Last Month</Text>
              {timePeriod === 'lastMonth' && (
                <Text style={styles.modalCheckmark}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalOption,
                timePeriod === 'thisYear' && styles.modalOptionActive
              ]}
              onPress={() => {
                setTimePeriod('thisYear');
                setShowTimePeriodModal(false);
              }}>
              <Text style={[
                styles.modalOptionText,
                timePeriod === 'thisYear' && styles.modalOptionTextActive
              ]}>This Year</Text>
              {timePeriod === 'thisYear' && (
                <Text style={styles.modalCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 44,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  syncIcon: {
    fontSize: 16,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmoji: {
    fontSize: 20,
  },
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6B5FFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  balanceGradient: {
    padding: 20,
    borderRadius: 24,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  balanceLeft: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  monthSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  monthText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  changeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  changeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  balanceDonut: {
    width: 80,
    height: 80,
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statGradient: {
    padding: 16,
    borderRadius: 20,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  loanCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loanGradient: {
    padding: 16,
    borderRadius: 20,
  },
  loanContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  loanInfo: {
    flex: 1,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 2,
  },
  loanSubtitle: {
    fontSize: 13,
    color: '#EF4444',
  },
  loanArrow: {
    fontSize: 20,
    color: '#DC2626',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  seeAll: {
    fontSize: 13,
    color: '#6B5FFF',
    fontWeight: '700',
    marginRight: 4,
  },
  seeAllArrow: {
    fontSize: 14,
    color: '#6B5FFF',
    fontWeight: '600',
  },
  expensesList: {
    paddingHorizontal: 4,
  },
  expenseCard: {
    marginBottom: 12,
  },
  expenseCardContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5FA',
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIconModern: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  expenseIconLetter: {
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  recentBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expenseInfo: {
    flex: 1,
    paddingRight: 12,
  },
  expenseCategoryModern: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  expenseDescriptionModern: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
    lineHeight: 16,
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseDateModern: {
    fontSize: 11,
    color: '#AEAEB2',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  syncedIndicator: {
    fontSize: 10,
    color: '#34C759',
    marginLeft: 6,
  },
  expenseAmountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  expenseAmountModern: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  expenseArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseArrowText: {
    fontSize: 18,
    color: '#C7C7CC',
    fontWeight: 'bold',
  },
  emptyStateModern: {
    marginTop: 8,
  },
  emptyStateCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E7FF',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6B5FFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyIconModern: {
    fontSize: 40,
  },
  emptyTextModern: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  emptySubtextModern: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  addFirstExpenseButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  addFirstExpenseGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addFirstExpenseText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  spendingSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  spendingSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 3,
    alignItems: 'center',
  },
  categoryGradient: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  categoryName: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyCategories: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    marginTop: 16,
  },
  emptyCategoriesText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  addExpenseHint: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addExpenseHintText: {
    fontSize: 14,
    color: '#6B5FFF',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  navIcon: {
    fontSize: 24,
    color: '#C7C7CC',
  },
  navActive: {
    color: '#6B5FFF',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6B5FFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 28,
    color: 'white',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#F2F2F7',
  },
  modalOptionActive: {
    backgroundColor: '#6B5FFF',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  modalOptionTextActive: {
    color: 'white',
  },
  modalCheckmark: {
    fontSize: 16,
    color: 'white',
    fontWeight: '700',
  },
});

export default HomeScreen;