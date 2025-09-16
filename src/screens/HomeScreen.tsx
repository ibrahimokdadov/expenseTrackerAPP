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
import {StorageService} from '../services/StorageService';
import {CurrencyService} from '../services/CurrencyService';
import {Expense, Category, Loan, Currency} from '../types';
import {useTheme} from '../contexts/ThemeContext';
import DonutChart from '../components/DonutChart';

const {width, height} = Dimensions.get('window');

const HomeScreen = ({navigation}: any) => {
  const {theme, colors} = useTheme();
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

  const ExpenseItem = ({expense}: {expense: Expense}) => {
    const category = categories.find(c => c.id === expense.category);
    const expenseDate = new Date(expense.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateDisplay = '';
    if (expenseDate.toDateString() === today.toDateString()) {
      dateDisplay = 'Today';
    } else if (expenseDate.toDateString() === yesterday.toDateString()) {
      dateDisplay = 'Yesterday';
    } else {
      dateDisplay = expenseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return (
      <TouchableOpacity style={styles.expenseItem}>
        <View style={styles.expenseIcon}>
          <Text style={styles.expenseIconText}>
            {category?.name === 'Food' ? '🛒' :
             category?.name === 'Transport' ? '🚗' :
             category?.name === 'Entertainment' ? '🎮' :
             category?.name === 'Health' ? '💊' :
             category?.name === 'Shopping' ? '🛍️' : '💳'}
          </Text>
        </View>
        <View style={styles.expenseDetails}>
          <Text style={styles.expenseCategory}>{category?.name || 'Other'}</Text>
          <Text style={styles.expenseDescription}>
            {expense.description || `${category?.name} expense`}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>-{getCurrencySymbol()}{formatAmount(expense.amount)}</Text>
          <Text style={styles.expenseDate}>{dateDisplay}</Text>
        </View>
      </TouchableOpacity>
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
            <Text style={styles.userName}>Welcome back!</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.profileEmoji}>👤</Text>
          </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>Expense List</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ExpenseList')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.expensesList}>
            {recentExpenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>No expenses yet</Text>
                <Text style={styles.emptySubtext}>Tap + to add your first expense</Text>
              </View>
            ) : (
              <>
                {recentExpenses.map((expense) => (
                  <ExpenseItem key={expense.id} expense={expense} />
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

      <View style={styles.bottomNav}>
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  seeAll: {
    fontSize: 14,
    color: '#6B5FFF',
    fontWeight: '600',
  },
  expensesList: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseIconText: {
    fontSize: 20,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  expenseDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
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