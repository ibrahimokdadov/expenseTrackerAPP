import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import {
  BarChart,
  PieChart,
  LineChart,
} from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StorageService} from '../services/StorageService';
import {CurrencyService} from '../services/CurrencyService';
import {Expense, Category, Currency} from '../types';

const {width: screenWidth} = Dimensions.get('window');

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(107, 95, 255, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.6,
  decimalPlaces: 0,
  propsForLabels: {
    fontSize: 11,
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: '#E5E5E5',
    strokeWidth: 1,
  },
  fillShadowGradient: '#6B5FFF',
  fillShadowGradientOpacity: 0.2,
};

interface ChartData {
  categoryData: Array<{name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number}>;
  monthlyData: {labels: string[]; datasets: Array<{data: number[]}>};
  weeklyData: {labels: string[]; datasets: Array<{data: number[]}>};
  yearlyData: {labels: string[]; datasets: Array<{data: number[]}>};
  totalExpenses: number;
  averageDaily: number;
  topCategory: string;
  currency: Currency;
  expenseCount: number;
  highestExpense: number;
  lowestExpense: number;
  trend: number; // percentage change from last period
}

type TimeFrame = 'week' | 'month' | 'year' | 'all';
type ChartType = 'pie' | 'bar' | 'line' | 'trend';

function ChartsScreen(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadAndProcessData();

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

  useEffect(() => {
    if (allExpenses.length > 0) {
      processFilteredData();
    }
  }, [selectedCategories, timeFrame]);

  const loadAndProcessData = async () => {
    try {
      const [expenses, cats, currency] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
        CurrencyService.getSelectedCurrency(),
      ]);
      setCategories(cats);
      setAllExpenses(expenses);
      setSelectedCategories(cats.map(c => c.id)); // Select all by default
      const processed = processExpenseData(expenses, cats, currency);
      setChartData(processed);
    } catch (error) {
      console.error('Failed to load expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processFilteredData = () => {
    const filteredExpenses = getFilteredExpenses();
    const processed = processExpenseData(filteredExpenses, categories, chartData?.currency || 'DZD');
    setChartData(processed);
  };

  const getFilteredExpenses = () => {
    let filtered = [...allExpenses];

    // Filter by categories
    if (selectedCategories.length > 0 && selectedCategories.length < categories.length) {
      filtered = filtered.filter(e => selectedCategories.includes(e.category));
    }

    // Filter by time frame
    const now = new Date();
    switch (timeFrame) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => new Date(e.date) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filtered = filtered.filter(e => new Date(e.date) >= monthAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filtered = filtered.filter(e => new Date(e.date) >= yearAgo);
        break;
      // 'all' returns all expenses
    }

    return filtered;
  };

  const processExpenseData = (expenses: Expense[], categories: Category[], currency: Currency): ChartData => {
    const categoryTotals: Record<string, number> = {};
    const monthlyTotals: Record<string, number> = {};
    const weeklyTotals: Record<string, number> = {};
    const yearlyTotals: Record<string, number> = {};
    const dailyTotals: Record<string, number> = {};

    let totalExpenses = 0;
    let highestExpense = 0;
    let lowestExpense = Infinity;

    expenses.forEach(expense => {
      totalExpenses += expense.amount;
      highestExpense = Math.max(highestExpense, expense.amount);
      lowestExpense = Math.min(lowestExpense, expense.amount);

      const category = categories.find(c => c.id === expense.category);
      const categoryName = category?.name || 'Other';
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + expense.amount;

      const date = new Date(expense.date);

      // Monthly data
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount;

      // Weekly data (group by week)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + expense.amount;

      // Yearly data
      const yearKey = date.getFullYear().toString();
      yearlyTotals[yearKey] = (yearlyTotals[yearKey] || 0) + expense.amount;

      // Daily data
      const dayKey = expense.date.split('T')[0];
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + expense.amount;
    });

    if (expenses.length === 0) {
      lowestExpense = 0;
    }

    // Enhanced color palette
    const colors = [
      '#6B5FFF', '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3',
      '#FF8B94', '#A8E6CF', '#FFA07A', '#98D8C8', '#F06292',
      '#AED581', '#64B5F6', '#FFB74D', '#BA68C8', '#4DB6AC'
    ];

    const categoryData = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((item, index) => {
        const category = categories.find(c => c.name === item[0]);
        return {
          name: item[0].length > 15 ? item[0].substring(0, 13) + '...' : item[0],
          amount: item[1],
          color: category?.color || colors[index % colors.length],
          legendFontColor: '#4A5568',
          legendFontSize: 11,
        };
      });

    // Monthly data for bar chart
    const sortedMonths = Object.keys(monthlyTotals).sort().slice(-6);
    const monthlyData = {
      labels: sortedMonths.map(month => {
        const [year, m] = month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[parseInt(m) - 1];
      }),
      datasets: [{
        data: sortedMonths.map(month => monthlyTotals[month] || 0),
      }],
    };

    // Weekly data for line chart
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const weeklyData = {
      labels: last7Days.map(date => {
        const d = new Date(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[d.getDay()];
      }),
      datasets: [{
        data: last7Days.map(date => dailyTotals[date] || 0),
      }],
    };

    // Yearly data
    const sortedYears = Object.keys(yearlyTotals).sort().slice(-5);
    const yearlyData = {
      labels: sortedYears,
      datasets: [{
        data: sortedYears.map(year => yearlyTotals[year] || 0),
      }],
    };

    // Calculate statistics
    const daysWithExpenses = Object.keys(dailyTotals).length || 1;
    const averageDaily = totalExpenses / daysWithExpenses;
    const topCategory = categoryData.length > 0 ? categoryData[0].name : 'N/A';

    // Calculate trend (compare with previous period)
    let trend = 0;
    if (sortedMonths.length >= 2) {
      const currentMonth = monthlyTotals[sortedMonths[sortedMonths.length - 1]] || 0;
      const previousMonth = monthlyTotals[sortedMonths[sortedMonths.length - 2]] || 0;
      if (previousMonth > 0) {
        trend = ((currentMonth - previousMonth) / previousMonth) * 100;
      }
    }

    return {
      categoryData,
      monthlyData,
      weeklyData,
      yearlyData,
      totalExpenses,
      averageDaily,
      topCategory,
      currency,
      expenseCount: expenses.length,
      highestExpense,
      lowestExpense,
      trend,
    };
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories.map(c => c.id));
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B5FFF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!chartData || chartData.categoryData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="insert-chart" size={80} color="#E0E0E0" />
        <Text style={styles.emptyText}>No expense data available</Text>
        <Text style={styles.emptySubtext}>Add some expenses to see analytics</Text>
      </View>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <PieChart
              data={chartData.categoryData}
              width={Math.max(screenWidth - 40, 350)}
              height={220}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </ScrollView>
        );
      case 'bar':
        return (
          <BarChart
            data={timeFrame === 'year' ? chartData.yearlyData : chartData.monthlyData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(107, 95, 255, ${opacity})`,
            }}
            verticalLabelRotation={0}
            showValuesOnTopOfBars
            fromZero
            style={styles.chart}
          />
        );
      case 'line':
        return (
          <LineChart
            data={chartData.weeklyData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(107, 95, 255, ${opacity})`,
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#6B5FFF"
              }
            }}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
            withShadow={false}
          />
        );
      case 'trend':
        return (
          <View style={styles.trendContainer}>
            <LineChart
              data={chartData.monthlyData}
              width={screenWidth - 40}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(107, 95, 255, ${opacity})`,
              }}
              bezier
              style={styles.chart}
              withDots={true}
              withInnerLines={false}
              withOuterLines={false}
            />
            <View style={styles.trendIndicator}>
              <Icon
                name={chartData.trend >= 0 ? "trending-up" : "trending-down"}
                size={24}
                color={chartData.trend >= 0 ? "#FF6B6B" : "#4ECDC4"}
              />
              <Text style={[
                styles.trendText,
                {color: chartData.trend >= 0 ? "#FF6B6B" : "#4ECDC4"}
              ]}>
                {Math.abs(chartData.trend).toFixed(1)}%
              </Text>
            </View>
          </View>
        );
    }
  };

  const getCurrencySymbol = () => {
    const currency = CurrencyService.getCurrencyInfo(chartData?.currency || 'DZD');
    return currency?.symbol || '$';
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}
        showsVerticalScrollIndicator={false}>

        {/* Enhanced Header */}
        <LinearGradient
          colors={['#6B5FFF', '#8A7FFF']}
          style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Expense Analytics</Text>
            <Text style={styles.headerSubtitle}>
              {chartData.expenseCount} transactions analyzed
            </Text>
          </View>
        </LinearGradient>

        {/* Filter Controls */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowCategoryModal(true)}>
              <Icon name="filter-list" size={20} color="#6B5FFF" />
              <Text style={styles.filterButtonText}>
                {selectedCategories.length === categories.length
                  ? 'All Categories'
                  : `${selectedCategories.length} Selected`}
              </Text>
            </TouchableOpacity>

            {(['week', 'month', 'year', 'all'] as TimeFrame[]).map(tf => (
              <TouchableOpacity
                key={tf}
                style={[
                  styles.timeButton,
                  timeFrame === tf && styles.timeButtonActive
                ]}
                onPress={() => setTimeFrame(tf)}>
                <Text style={[
                  styles.timeButtonText,
                  timeFrame === tf && styles.timeButtonTextActive
                ]}>
                  {tf === 'all' ? 'All Time' : tf.charAt(0).toUpperCase() + tf.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Enhanced Stats Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}>
          <LinearGradient
            colors={['#6B5FFF', '#8A7FFF']}
            style={styles.statCard}>
            <Icon name="account-balance-wallet" size={24} color="white" />
            <Text style={styles.statValueWhite}>
              {getCurrencySymbol()}{chartData.totalExpenses.toFixed(0)}
            </Text>
            <Text style={styles.statLabelWhite}>Total Spent</Text>
          </LinearGradient>

          <View style={[styles.statCard, styles.statCardWhite]}>
            <Icon name="trending-up" size={24} color="#4ECDC4" />
            <Text style={styles.statValue}>
              {getCurrencySymbol()}{chartData.averageDaily.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Daily Average</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWhite]}>
            <Icon name="category" size={24} color="#FFD93D" />
            <Text style={styles.statValue}>{chartData.topCategory}</Text>
            <Text style={styles.statLabel}>Top Category</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWhite]}>
            <Icon name="arrow-upward" size={24} color="#FF6B6B" />
            <Text style={styles.statValue}>
              {getCurrencySymbol()}{chartData.highestExpense.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Highest</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWhite]}>
            <Icon name="arrow-downward" size={24} color="#95E1D3" />
            <Text style={styles.statValue}>
              {getCurrencySymbol()}{chartData.lowestExpense.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Lowest</Text>
          </View>
        </ScrollView>

        {/* Chart Type Selector */}
        <View style={styles.chartTypeContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              {type: 'pie' as ChartType, icon: 'pie-chart', label: 'Categories'},
              {type: 'bar' as ChartType, icon: 'bar-chart', label: 'Timeline'},
              {type: 'line' as ChartType, icon: 'show-chart', label: 'Daily'},
              {type: 'trend' as ChartType, icon: 'trending-up', label: 'Trends'},
            ].map(item => (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.chartTypeButton,
                  chartType === item.type && styles.chartTypeButtonActive
                ]}
                onPress={() => setChartType(item.type)}>
                <Icon
                  name={item.icon}
                  size={20}
                  color={chartType === item.type ? 'white' : '#6B5FFF'}
                />
                <Text style={[
                  styles.chartTypeText,
                  chartType === item.type && styles.chartTypeTextActive
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            {chartType === 'pie' ? 'Expense Distribution' :
             chartType === 'bar' ? 'Spending Timeline' :
             chartType === 'line' ? 'Daily Expenses' :
             'Spending Trends'}
          </Text>
          {renderChart()}
        </View>

        {/* Category Breakdown */}
        <View style={styles.breakdownContainer}>
          <Text style={styles.breakdownTitle}>Category Details</Text>
          {chartData.categoryData.slice(0, 5).map((category, index) => {
            const percentage = ((category.amount / chartData.totalExpenses) * 100).toFixed(1);
            return (
              <View key={index} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, {backgroundColor: category.color}]} />
                  <Text style={styles.breakdownName}>{category.name}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownAmount}>
                    {getCurrencySymbol()}{category.amount.toFixed(0)}
                  </Text>
                  <Text style={styles.breakdownPercentage}>{percentage}%</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Categories</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={selectAllCategories}>
                <Text style={styles.modalActionText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={clearAllCategories}>
                <Text style={styles.modalActionText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.categoryList}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryItem}
                  onPress={() => toggleCategory(category.id)}>
                  <View style={styles.categoryItemLeft}>
                    <View style={[styles.categoryColor, {backgroundColor: category.color}]} />
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                  <Icon
                    name={selectedCategories.includes(category.id) ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color={selectedCategories.includes(category.id) ? "#6B5FFF" : "#CCC"}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowCategoryModal(false)}>
              <LinearGradient
                colors={['#6B5FFF', '#8A7FFF']}
                style={styles.applyGradient}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F7F9FC',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  filterContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  timeButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeButtonActive: {
    backgroundColor: '#6B5FFF',
    borderColor: '#6B5FFF',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  timeButtonTextActive: {
    color: 'white',
  },
  statsScroll: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    width: 140,
    padding: 16,
    borderRadius: 20,
    marginRight: 12,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  statCardWhite: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  statValueWhite: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginVertical: 4,
  },
  statLabelWhite: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  chartTypeContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  chartTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chartTypeButtonActive: {
    backgroundColor: '#6B5FFF',
    borderColor: '#6B5FFF',
  },
  chartTypeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  chartTypeTextActive: {
    color: 'white',
  },
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  trendContainer: {
    position: 'relative',
  },
  trendIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trendText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  breakdownName: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginRight: 8,
  },
  breakdownPercentage: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: '#F0F0F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bottomSpacing: {
    height: 30,
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
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#6B5FFF',
  },
  modalActionText: {
    color: '#6B5FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#4A5568',
  },
  applyButton: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  applyGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChartsScreen;