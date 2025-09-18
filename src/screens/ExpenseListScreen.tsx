import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StorageService} from '../services/StorageService';
import {CurrencyService} from '../services/CurrencyService';
import {Expense, Category} from '../types';

const {width} = Dimensions.get('window');

const ExpenseListScreen = ({navigation}: any) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const filterHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

    // Search filter
    if (searchText) {
      filtered = filtered.filter(e => {
        const category = categories.find(c => c.id === e.category);
        return (
          e.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          category?.name.toLowerCase().includes(searchText.toLowerCase())
        );
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    // Period filter
    const now = new Date();
    if (selectedPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => new Date(e.date) >= weekAgo);
    } else if (selectedPeriod === 'month') {
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getMonth() === now.getMonth() &&
               expenseDate.getFullYear() === now.getFullYear();
      });
    } else if (selectedPeriod === 'year') {
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getFullYear() === now.getFullYear();
      });
    }

    setFilteredExpenses(filtered);
  };

  React.useEffect(() => {
    applyFilters();
  }, [selectedCategory, selectedPeriod, searchText, expenses]);

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Remove "${expense.description || 'this expense'}"?`,
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

  const getCategoryLetter = (categoryName: string | undefined) => {
    if (!categoryName || categoryName.length === 0) return '?';
    return categoryName.charAt(0).toUpperCase();
  };

  const groupExpensesByDate = () => {
    const grouped: {[key: string]: Expense[]} = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      let dateKey = '';

      if (expenseDate.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (expenseDate.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = expenseDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: expenseDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(expense);
    });

    return Object.entries(grouped).map(([date, items]) => ({
      title: date,
      data: items,
    }));
  };

  const ExpenseCard = ({expense, onDelete}: {expense: Expense; onDelete: (expense: Expense) => void}) => {
    const category = categories.find(c => c.id === expense.category);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
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
      <Animated.View
        style={[
          styles.expenseCard,
          {
            transform: [{scale: scaleAnim}],
            opacity: fadeAnim,
          },
        ]}>
        <TouchableOpacity
          style={styles.expenseContent}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => navigation.navigate('EditExpense', {expense})}
          onLongPress={() => onDelete(expense)}
          activeOpacity={0.9}>

          <View style={styles.expenseLeft}>
            <View style={[
              styles.categoryIcon,
              {backgroundColor: category?.color ? category.color + '15' : '#F5F5FA'}
            ]}>
              <Text style={[
                styles.categoryLetter,
                {color: category?.color || '#6B5FFF'}
              ]}>
                {getCategoryLetter(category?.name)}
              </Text>
            </View>

            <View style={styles.expenseInfo}>
              <Text style={styles.categoryName}>
                {category?.name || 'Other'}
              </Text>
              {expense.description && (
                <Text style={styles.expenseDescription} numberOfLines={1}>
                  {expense.description}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.expenseRight}>
            <Text style={[
              styles.expenseAmount,
              {color: category?.color || '#FF3B30'}
            ]}>
              -{CurrencyService.formatAmount(expense.amount, expense.currency)}
            </Text>
            {expense.syncStatus === 'synced' && (
              <View style={styles.syncedBadge}>
                <Icon name="cloud-done" size={12} color="#34C759" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSectionHeader = (title: string, total: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionTotal}>
        {CurrencyService.formatAmount(total, 'DZD')}
      </Text>
    </View>
  );

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const averageAmount = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 120;
    Animated.timing(filterHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setShowFilters(!showFilters);
  };

  const periodButtons = [
    {label: 'Week', value: 'week'},
    {label: 'Month', value: 'month'},
    {label: 'Year', value: 'year'},
    {label: 'All', value: 'all'},
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6B5FFF" barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#6B5FFF', '#8A7FFF']}
        style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Expenses</Text>
          <TouchableOpacity onPress={toggleFilters}>
            <Icon name="tune" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#8A7FFF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search expenses..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {CurrencyService.formatAmount(totalAmount, 'DZD')}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredExpenses.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {CurrencyService.formatAmount(averageAmount, 'DZD')}
            </Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filters */}
      <Animated.View style={[styles.filtersContainer, {height: filterHeight}]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {/* Period Filter */}
            {periodButtons.map(period => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.filterChip,
                  selectedPeriod === period.value && styles.filterChipActive
                ]}
                onPress={() => setSelectedPeriod(period.value as any)}>
                <Text style={[
                  styles.filterChipText,
                  selectedPeriod === period.value && styles.filterChipTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {/* Category Filter */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategory === 'all' && styles.filterChipActive
              ]}
              onPress={() => setSelectedCategory('all')}>
              <Text style={[
                styles.filterChipText,
                selectedCategory === 'all' && styles.filterChipTextActive
              ]}>
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.id && styles.filterChipActive,
                  {borderColor: cat.color}
                ]}
                onPress={() => setSelectedCategory(cat.id)}>
                <View style={styles.filterChipContent}>
                  <View style={[styles.filterDot, {backgroundColor: cat.color}]} />
                  <Text style={[
                    styles.filterChipText,
                    selectedCategory === cat.id && styles.filterChipTextActive
                  ]}>
                    {cat.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
          </View>
          <Text style={styles.emptyTitle}>No expenses found</Text>
          <Text style={styles.emptySubtitle}>
            {searchText ? 'Try a different search' : 'Add your first expense to see it here'}
          </Text>
          {!searchText && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddExpense')}>
              <LinearGradient
                colors={['#6B5FFF', '#8A7FFF']}
                style={styles.addButtonGradient}>
                <Icon name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Expense</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={groupExpensesByDate()}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({item}) => (
            <>
              {renderSectionHeader(
                item.title,
                item.data.reduce((sum, exp) => sum + exp.amount, 0)
              )}
              {item.data.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onDelete={handleDelete}
                />
              ))}
            </>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#6B5FFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1C1C1E',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 4,
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    overflow: 'hidden',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5FA',
    borderWidth: 1.5,
    borderColor: '#F5F5FA',
  },
  filterChipActive: {
    backgroundColor: '#F0EFFF',
    borderColor: '#6B5FFF',
  },
  filterChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#6B5FFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FD',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5FFF',
  },
  expenseCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  expenseContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryLetter: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  expenseInfo: {
    flex: 1,
    paddingRight: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  expenseDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  syncedBadge: {
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default ExpenseListScreen;