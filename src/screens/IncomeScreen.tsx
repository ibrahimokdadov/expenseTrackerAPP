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
  Modal,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StorageService} from '../services/StorageService';
import {CurrencyService} from '../services/CurrencyService';
import {Income, IncomeCategory, Category, Currency} from '../types';
import {useTheme} from '../contexts/ThemeContext';

const {width} = Dimensions.get('window');

const IncomeScreen = ({navigation}: any) => {
  const {colors} = useTheme();
  const [income, setIncome] = useState<Income[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState<Currency>('DZD');
  
  // Comparison state
  const [showComparison, setShowComparison] = useState(false);
  const [selectedIncomeCategories, setSelectedIncomeCategories] = useState<Set<string>>(new Set());
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<Set<string>>(new Set());
  const [comparisonPeriod, setComparisonPeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    const [incomeData, incomeCats, expenseCats, savedCurrency] = await Promise.all([
      StorageService.getIncome(),
      StorageService.getIncomeCategories(),
      StorageService.getCategories(),
      CurrencyService.getSelectedCurrency(),
    ]);

    setCurrency(savedCurrency);
    
    const sorted = incomeData.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setIncome(sorted);
    setIncomeCategories(incomeCats);
    setExpenseCategories(expenseCats);
  };

  const loadComparisonPreferences = async () => {
    try {
      const savedIncomeCats = await StorageService.getComparisonIncomeCategories();
      const savedExpenseCats = await StorageService.getComparisonExpenseCategories();
      if (savedIncomeCats.length > 0) {
        setSelectedIncomeCategories(new Set(savedIncomeCats));
      } else if (incomeCategories.length > 0) {
        // Default: select all income categories
        const allIncomeCatIds = incomeCategories.map(c => c.id);
        setSelectedIncomeCategories(new Set(allIncomeCatIds));
      }
      if (savedExpenseCats.length > 0) {
        setSelectedExpenseCategories(new Set(savedExpenseCats));
      } else if (expenseCategories.length > 0) {
        // Default: select all expense categories
        const allExpenseCatIds = expenseCategories.map(c => c.id);
        setSelectedExpenseCategories(new Set(allExpenseCatIds));
      }
    } catch (error) {
      console.error('Error loading comparison preferences:', error);
    }
  };

  const saveComparisonPreferences = async () => {
    try {
      await StorageService.saveComparisonIncomeCategories(Array.from(selectedIncomeCategories));
      await StorageService.saveComparisonExpenseCategories(Array.from(selectedExpenseCategories));
    } catch (error) {
      console.error('Error saving comparison preferences:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (incomeCategories.length > 0 && expenseCategories.length > 0) {
      loadComparisonPreferences();
    }
  }, [incomeCategories.length, expenseCategories.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getFilteredIncome = () => {
    const now = new Date();
    let filtered = [...income];

    switch (selectedPeriod) {
      case 'thisMonth':
        filtered = filtered.filter(i => {
          const incomeDate = new Date(i.date);
          return incomeDate.getMonth() === now.getMonth() &&
                 incomeDate.getFullYear() === now.getFullYear();
        });
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        filtered = filtered.filter(i => {
          const incomeDate = new Date(i.date);
          return incomeDate.getMonth() === lastMonth.getMonth() &&
                 incomeDate.getFullYear() === lastMonth.getFullYear();
        });
        break;
      case 'thisYear':
        filtered = filtered.filter(i => {
          const incomeDate = new Date(i.date);
          return incomeDate.getFullYear() === now.getFullYear();
        });
        break;
    }

    return filtered;
  };

  const groupIncomeByCategory = (filteredIncome: Income[]) => {
    const grouped: {[key: string]: Income[]} = {};
    
    filteredIncome.forEach(inc => {
      const categoryId = inc.category;
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(inc);
    });

    return Object.entries(grouped).map(([categoryId, items]) => {
      const category = incomeCategories.find(c => c.id === categoryId);
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      return {
        categoryId,
        category,
        items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        total,
      };
    }).sort((a, b) => b.total - a.total);
  };

  const getPeriodTotals = () => {
    const now = new Date();
    const filtered = getFilteredIncome();
    
    const currentMonthTotal = filtered
      .filter(i => {
        const incomeDate = new Date(i.date);
        return incomeDate.getMonth() === now.getMonth() &&
               incomeDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, i) => sum + i.amount, 0);

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTotal = income
      .filter(i => {
        const incomeDate = new Date(i.date);
        return incomeDate.getMonth() === lastMonth.getMonth() &&
               incomeDate.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((sum, i) => sum + i.amount, 0);

    const thisYearTotal = income
      .filter(i => {
        const incomeDate = new Date(i.date);
        return incomeDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      currentMonth: currentMonthTotal,
      lastMonth: lastMonthTotal,
      thisYear: thisYearTotal,
    };
  };

  const calculateComparison = async () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();

    if (comparisonPeriod === 'lastMonth') {
      month = month - 1;
      if (month < 0) {
        month = 11;
        year = year - 1;
      }
    }

    const selectedIncomeCatIds = Array.from(selectedIncomeCategories);
    const selectedExpenseCatIds = Array.from(selectedExpenseCategories);

    const totalIncome = await StorageService.getMonthlyIncomeTotal(year, month, selectedIncomeCatIds.length > 0 ? selectedIncomeCatIds : undefined);
    
    const expenses = await StorageService.getExpenses();
    let filteredExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
    });

    if (selectedExpenseCatIds.length > 0) {
      filteredExpenses = filteredExpenses.filter(e => selectedExpenseCatIds.includes(e.category));
    }

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const net = totalIncome - totalExpenses;
    const ratio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    return { totalIncome, totalExpenses, net, ratio };
  };

  const [comparisonData, setComparisonData] = useState<{
    totalIncome: number;
    totalExpenses: number;
    net: number;
    ratio: number;
  } | null>(null);

  useEffect(() => {
    if (showComparison && incomeCategories.length > 0 && expenseCategories.length > 0) {
      calculateComparison().then(setComparisonData);
      saveComparisonPreferences();
    }
  }, [showComparison, selectedIncomeCategories, selectedExpenseCategories, comparisonPeriod, income, incomeCategories, expenseCategories]);

  const handleDelete = (incomeEntry: Income) => {
    Alert.alert(
      'Delete Income',
      `Remove this income entry?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteIncome(incomeEntry.id);
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

  const filteredIncome = getFilteredIncome();
  const groupedIncome = groupIncomeByCategory(filteredIncome);
  const totals = getPeriodTotals();

  const IncomeCard = ({incomeEntry}: {incomeEntry: Income}) => {
    const category = incomeCategories.find(c => c.id === incomeEntry.category);
    return (
      <TouchableOpacity
        style={styles.incomeCard}
        onPress={() => navigation.navigate('EditIncome', {income: incomeEntry})}
        onLongPress={() => handleDelete(incomeEntry)}>
        <View style={styles.incomeLeft}>
          <View style={styles.incomeIcon}>
            <Text style={styles.incomeIconText}>
              {getCategoryLetter(category?.name)}
            </Text>
          </View>
          <View style={styles.incomeInfo}>
            <Text style={styles.incomeDescription} numberOfLines={1}>
              {incomeEntry.description || 'Income entry'}
            </Text>
            <Text style={styles.incomeDate}>
              {new Date(incomeEntry.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <View style={styles.incomeRight}>
          <Text style={styles.incomeAmount}>
            +{CurrencyService.formatAmount(incomeEntry.amount, incomeEntry.currency || currency)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const CategoryGroup = ({group}: {
    group: {
      categoryId: string;
      category?: IncomeCategory;
      items: Income[];
      total: number;
    };
  }) => {
    const isExpanded = expandedCategories.has(group.categoryId);
    const category = group.category || {id: group.categoryId, name: 'Unknown'};

    return (
      <View style={styles.categoryGroup}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(group.categoryId)}>
          <View style={styles.categoryHeaderLeft}>
            <View style={[styles.categoryIcon, {backgroundColor: category.color ? category.color + '15' : '#F5F5FA'}]}>
              <Text style={[styles.categoryIconText, {color: category.color || '#6B5FFF'}]}>
                {getCategoryLetter(category.name)}
              </Text>
            </View>
            <View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{group.items.length} entries</Text>
            </View>
          </View>
          <View style={styles.categoryHeaderRight}>
            <Text style={styles.categoryTotal}>
              {CurrencyService.formatAmount(group.total, currency)}
            </Text>
            <Icon
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color="#666"
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.categoryItems}>
            {group.items.map(item => (
              <IncomeCard key={item.id} incomeEntry={item} />
            ))}
          </View>
        )}
      </View>
    );
  };

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
          <Text style={styles.headerTitle}>Income</Text>
          <TouchableOpacity onPress={() => setShowComparison(true)}>
            <Icon name="compare-arrows" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryAmount}>
              {CurrencyService.formatAmount(totals.currentMonth, currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Last Month</Text>
            <Text style={styles.summaryAmount}>
              {CurrencyService.formatAmount(totals.lastMonth, currency)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Year</Text>
            <Text style={styles.summaryAmount}>
              {CurrencyService.formatAmount(totals.thisYear, currency)}
            </Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'thisMonth' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('thisMonth')}>
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === 'thisMonth' && styles.periodButtonTextActive,
            ]}>
              This Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'lastMonth' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('lastMonth')}>
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === 'lastMonth' && styles.periodButtonTextActive,
            ]}>
              Last Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'thisYear' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('thisYear')}>
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === 'thisYear' && styles.periodButtonTextActive,
            ]}>
              This Year
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Income List */}
      {groupedIncome.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyTitle}>No income yet</Text>
          <Text style={styles.emptySubtitle}>Add your first income entry</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddIncome')}>
            <LinearGradient
              colors={['#6B5FFF', '#8A7FFF']}
              style={styles.addButtonGradient}>
              <Icon name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Income</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groupedIncome}
          keyExtractor={item => item.categoryId}
          renderItem={({item}) => <CategoryGroup group={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddIncome')}
        activeOpacity={0.8}>
        <LinearGradient
          colors={['#6B5FFF', '#8A7FFF']}
          style={styles.fabGradient}>
          <Icon name="add" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Comparison Modal */}
      <Modal
        visible={showComparison}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComparison(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Income vs Expenses</Text>
              <TouchableOpacity onPress={() => setShowComparison(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Period Selector */}
              <View style={styles.comparisonPeriodSelector}>
                <Text style={styles.comparisonLabel}>Period</Text>
                <View style={styles.periodSelectorRow}>
                  {['thisMonth', 'lastMonth', 'thisYear'].map(period => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.comparisonPeriodButton,
                        comparisonPeriod === period && styles.comparisonPeriodButtonActive,
                      ]}
                      onPress={() => setComparisonPeriod(period as any)}>
                      <Text style={[
                        styles.comparisonPeriodButtonText,
                        comparisonPeriod === period && styles.comparisonPeriodButtonTextActive,
                      ]}>
                        {period === 'thisMonth' ? 'This Month' : period === 'lastMonth' ? 'Last Month' : 'This Year'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Income Category Selection */}
              <View style={styles.comparisonSection}>
                <Text style={styles.comparisonLabel}>Income Categories</Text>
                <View style={styles.categorySelection}>
                  <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={() => {
                      if (selectedIncomeCategories.size === incomeCategories.length) {
                        setSelectedIncomeCategories(new Set());
                      } else {
                        setSelectedIncomeCategories(new Set(incomeCategories.map(c => c.id)));
                      }
                    }}>
                    <Text style={styles.selectAllButtonText}>
                      {selectedIncomeCategories.size === incomeCategories.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                  {incomeCategories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryCheckbox,
                        selectedIncomeCategories.has(cat.id) && styles.categoryCheckboxActive,
                      ]}
                      onPress={() => {
                        const newSet = new Set(selectedIncomeCategories);
                        if (newSet.has(cat.id)) {
                          newSet.delete(cat.id);
                        } else {
                          newSet.add(cat.id);
                        }
                        setSelectedIncomeCategories(newSet);
                      }}>
                      <View style={[
                        styles.checkbox,
                        selectedIncomeCategories.has(cat.id) && styles.checkboxChecked,
                      ]}>
                        {selectedIncomeCategories.has(cat.id) && (
                          <Icon name="check" size={16} color="white" />
                        )}
                      </View>
                      <Text style={styles.categoryCheckboxText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Expense Category Selection */}
              <View style={styles.comparisonSection}>
                <Text style={styles.comparisonLabel}>Expense Categories</Text>
                <View style={styles.categorySelection}>
                  <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={() => {
                      if (selectedExpenseCategories.size === expenseCategories.length) {
                        setSelectedExpenseCategories(new Set());
                      } else {
                        setSelectedExpenseCategories(new Set(expenseCategories.map(c => c.id)));
                      }
                    }}>
                    <Text style={styles.selectAllButtonText}>
                      {selectedExpenseCategories.size === expenseCategories.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                  {expenseCategories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryCheckbox,
                        selectedExpenseCategories.has(cat.id) && styles.categoryCheckboxActive,
                      ]}
                      onPress={() => {
                        const newSet = new Set(selectedExpenseCategories);
                        if (newSet.has(cat.id)) {
                          newSet.delete(cat.id);
                        } else {
                          newSet.add(cat.id);
                        }
                        setSelectedExpenseCategories(newSet);
                      }}>
                      <View style={[
                        styles.checkbox,
                        selectedExpenseCategories.has(cat.id) && styles.checkboxChecked,
                      ]}>
                        {selectedExpenseCategories.has(cat.id) && (
                          <Icon name="check" size={16} color="white" />
                        )}
                      </View>
                      <Text style={styles.categoryCheckboxText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Comparison Results */}
              {comparisonData && (
                <View style={styles.comparisonResults}>
                  <Text style={styles.comparisonResultsTitle}>Comparison Results</Text>
                  
                  <View style={styles.comparisonCard}>
                    <Text style={styles.comparisonCardLabel}>Total Income</Text>
                    <Text style={[styles.comparisonCardValue, {color: '#16A34A'}]}>
                      +{CurrencyService.formatAmount(comparisonData.totalIncome, currency)}
                    </Text>
                  </View>

                  <View style={styles.comparisonCard}>
                    <Text style={styles.comparisonCardLabel}>Total Expenses</Text>
                    <Text style={[styles.comparisonCardValue, {color: '#DC2626'}]}>
                      -{CurrencyService.formatAmount(comparisonData.totalExpenses, currency)}
                    </Text>
                  </View>

                  <View style={[
                    styles.comparisonCard,
                    {backgroundColor: comparisonData.net >= 0 ? '#DCFCE7' : '#FEE2E2'},
                  ]}>
                    <Text style={styles.comparisonCardLabel}>Net Amount</Text>
                    <Text style={[
                      styles.comparisonCardValue,
                      {color: comparisonData.net >= 0 ? '#16A34A' : '#DC2626'},
                    ]}>
                      {comparisonData.net >= 0 ? '+' : ''}{CurrencyService.formatAmount(comparisonData.net, currency)}
                    </Text>
                  </View>

                  <View style={styles.comparisonCard}>
                    <Text style={styles.comparisonCardLabel}>Expense Ratio</Text>
                    <Text style={styles.comparisonCardValue}>
                      {comparisonData.ratio.toFixed(1)}%
                    </Text>
                    <Text style={styles.comparisonCardSubtext}>
                      {comparisonData.totalIncome > 0 
                        ? `Spending ${comparisonData.ratio.toFixed(1)}% of income`
                        : 'No income to compare'}
                    </Text>
                  </View>
                </View>
              )}
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
    backgroundColor: '#F8F9FD',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: 'white',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  periodButtonTextActive: {
    color: '#6B5FFF',
  },
  listContent: {
    padding: 16,
  },
  categoryGroup: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  categoryCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  categoryItems: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  incomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  incomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incomeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  incomeIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B5FFF',
  },
  incomeInfo: {
    flex: 1,
  },
  incomeDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  incomeDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  incomeRight: {
    alignItems: 'flex-end',
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
  },
  addButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#6B5FFF',
    shadowOffset: {width: 0, height: 4},
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
  modalBody: {
    padding: 20,
  },
  comparisonPeriodSelector: {
    marginBottom: 24,
  },
  comparisonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  periodSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  comparisonPeriodButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  comparisonPeriodButtonActive: {
    backgroundColor: '#6B5FFF',
  },
  comparisonPeriodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  comparisonPeriodButtonTextActive: {
    color: 'white',
  },
  comparisonSection: {
    marginBottom: 24,
  },
  categorySelection: {
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 12,
  },
  selectAllButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  selectAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5FFF',
  },
  categoryCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  categoryCheckboxActive: {
    // Additional styling if needed
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#6B5FFF',
    borderColor: '#6B5FFF',
  },
  categoryCheckboxText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  comparisonResults: {
    marginTop: 8,
  },
  comparisonResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  comparisonCard: {
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  comparisonCardLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  comparisonCardValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  comparisonCardSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
});

export default IncomeScreen;

