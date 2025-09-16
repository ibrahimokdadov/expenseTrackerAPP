import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import {StorageService} from '../services/StorageService';
import {CurrencyService} from '../services/CurrencyService';
import {Expense, Category} from '../types';

const ExpenseListScreen = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const loadData = async () => {
    const [expensesData, categoriesData] = await Promise.all([
      StorageService.getExpenses(),
      StorageService.getCategories(),
    ]);

    const sorted = expensesData.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setExpenses(sorted);
    setFilteredExpenses(sorted);
    setCategories(categoriesData);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const applyFilters = () => {
    let filtered = [...expenses];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getFullYear().toString() === year &&
               (expenseDate.getMonth() + 1).toString().padStart(2, '0') === month;
      });
    }

    setFilteredExpenses(filtered);
  };

  React.useEffect(() => {
    applyFilters();
  }, [selectedCategory, selectedMonth, expenses]);

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteExpense(expense.id);
            await loadData();
          },
        },
      ]
    );
  };

  const renderExpenseItem = ({item}: {item: Expense}) => {
    const category = categories.find(c => c.id === item.category);
    return (
      <TouchableOpacity
        style={styles.expenseItem}
        onLongPress={() => handleDelete(item)}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseType} numberOfLines={1} ellipsizeMode="tail">
            {category?.name || item.category}
          </Text>
        <Text style={styles.expenseAmount}>
          {CurrencyService.formatAmount(item.amount, item.currency)}
        </Text>
      </View>
      {item.description && (
        <Text style={styles.expensePurpose} numberOfLines={2} ellipsizeMode="tail">
          {item.description}
        </Text>
      )}
      <View style={styles.expenseFooter}>
        <Text style={styles.expenseDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
        <View style={[
          styles.syncBadge,
          item.syncStatus === 'synced' && styles.syncedBadge,
          item.syncStatus === 'conflict' && styles.conflictBadge,
        ]}>
          <Text style={styles.syncText}>
            {item.syncStatus === 'synced' ? '✓ Synced' :
             item.syncStatus === 'conflict' ? '⚠ Conflict' :
             '• Pending'}
          </Text>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = date.toLocaleDateString('default', {month: 'long', year: 'numeric'});
      months.push({value, label});
    }
    return months;
  };

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={setSelectedCategory}
            style={styles.picker}>
            <Picker.Item label="All Categories" value="all" />
            {categories.map((cat) => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={setSelectedMonth}
            style={styles.picker}>
            <Picker.Item label="All Months" value="all" />
            {getMonthOptions().map((month) => (
              <Picker.Item key={month.value} label={month.label} value={month.value} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          Total: {CurrencyService.formatAmount(totalAmount, 'DZD')} ({filteredExpenses.length} expenses)
        </Text>
      </View>

      {filteredExpenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No expenses found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: 15,
    gap: 10,
  },
  pickerWrapper: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 5,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  summaryContainer: {
    backgroundColor: '#667eea',
    padding: 15,
  },
  summaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
  },
  expenseItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  expensePurpose: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  syncBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncedBadge: {
    backgroundColor: '#22c55e',
  },
  conflictBadge: {
    backgroundColor: '#ef4444',
  },
  syncText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default ExpenseListScreen;