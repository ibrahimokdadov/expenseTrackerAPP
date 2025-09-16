import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StorageService} from '../services/StorageService';
import {CurrencyService} from '../services/CurrencyService';
import {Expense, Category, Loan, Currency} from '../types';

const HomeScreen = ({navigation}: any) => {
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingLoans, setPendingLoans] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('EUR');

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
    setRecentExpenses(sorted.slice(0, 5));
    setCategories(cats);
    setLoans(allLoans);

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    setTotalAmount(total);

    const pending = allLoans.filter(l => l.status === 'pending').length;
    setPendingLoans(pending);
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

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  const getTopCategories = () => {
    const categoryTotals: {[key: string]: number} = {};

    recentExpenses.forEach(expense => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += expense.amount;
    });

    return Object.entries(categoryTotals)
      .map(([categoryId, total]) => ({
        categoryId,
        name: getCategoryName(categoryId),
        total,
        color: categories.find(c => c.id === categoryId)?.color || '#667eea',
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  };

  const topCategories = getTopCategories();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header with Total */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}>
          <Icon name="settings" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.totalLabel}>Total Expenses</Text>
        <Text style={styles.totalAmount}>
          {CurrencyService.formatCompactAmount(totalAmount, defaultCurrency)}
        </Text>
        <Text style={styles.totalAmountFull}>
          {CurrencyService.formatAmount(totalAmount, defaultCurrency)}
        </Text>
        {pendingLoans > 0 && (
          <Text style={styles.pendingLoansText}>
            {pendingLoans} pending loan{pendingLoans > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('AddExpense')}>
          <View style={[styles.quickActionIcon, {backgroundColor: '#667eea'}]}>
            <Icon name="add" size={24} color="white" />
          </View>
          <Text style={styles.quickActionText}>Add Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Loans')}>
          <View style={[styles.quickActionIcon, {backgroundColor: '#4ECDC4'}]}>
            <Icon name="account-balance" size={24} color="white" />
          </View>
          <Text style={styles.quickActionText}>Loans</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Charts')}>
          <View style={[styles.quickActionIcon, {backgroundColor: '#FF6B6B'}]}>
            <Icon name="pie-chart" size={24} color="white" />
          </View>
          <Text style={styles.quickActionText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('ExpenseList')}>
          <View style={[styles.quickActionIcon, {backgroundColor: '#96CEB4'}]}>
            <Icon name="list" size={24} color="white" />
          </View>
          <Text style={styles.quickActionText}>All Expenses</Text>
        </TouchableOpacity>
      </View>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          {topCategories.map((cat, index) => (
            <TouchableOpacity
              key={cat.categoryId}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('CategoryDetails', {categoryId: cat.categoryId})}>
              <View style={styles.categoryInfo}>
                <View style={[styles.categoryDot, {backgroundColor: cat.color}]} />
                <Text style={styles.categoryName}>{cat.name}</Text>
              </View>
              <Text style={styles.categoryAmount}>
                {CurrencyService.formatCompactAmount(cat.total, defaultCurrency)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Expenses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ExpenseList')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentExpenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses yet</Text>
        ) : (
          recentExpenses.map((expense) => {
            const category = categories.find(c => c.id === expense.category);
            return (
              <View key={expense.id} style={styles.expenseItem}>
                <View style={styles.expenseInfo}>
                  <View style={styles.expenseHeader}>
                    <View style={[styles.expenseCategoryDot, {backgroundColor: category?.color || '#667eea'}]} />
                    <Text style={styles.expenseCategory}>{category?.name || expense.category}</Text>
                  </View>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseDate}>
                    {new Date(expense.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>
                  {expense.amount >= 1000
                    ? CurrencyService.formatCompactAmount(expense.amount, expense.currency || defaultCurrency)
                    : CurrencyService.formatAmount(expense.amount, expense.currency || defaultCurrency)
                  }
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Sync Button */}
      <TouchableOpacity
        style={[styles.button, styles.syncButton]}
        onPress={() => navigation.navigate('Sync')}>
        <Icon name="cloud-sync" size={20} color="white" />
        <Text style={styles.buttonText}>Sync with Google Sheets</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    backgroundColor: '#667eea',
    borderRadius: 20,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  totalAmountFull: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  pendingLoansText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  syncButton: {
    backgroundColor: '#667eea',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;