import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  BarChart,
  PieChart,
  LineChart,
} from 'react-native-chart-kit';
import {StorageService} from '../services/StorageService';
import {CurrencyService} from '../services/CurrencyService';
import {Expense, Category, Currency} from '../types';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  decimalPlaces: 0,
  propsForLabels: {
    fontSize: 12,
  },
};

interface ChartData {
  categoryData: Array<{name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number}>;
  monthlyData: {labels: string[]; datasets: Array<{data: number[]}>};
  weeklyData: {labels: string[]; datasets: Array<{data: number[]}>};
  totalExpenses: number;
  averageDaily: number;
  topCategory: string;
  currency: Currency;
}

function ChartsScreen(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadAndProcessData();
  }, []);

  const loadAndProcessData = async () => {
    try {
      const [expenses, cats, currency] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getCategories(),
        CurrencyService.getSelectedCurrency(),
      ]);
      setCategories(cats);
      const processed = processExpenseData(expenses, cats, currency);
      setChartData(processed);
    } catch (error) {
      console.error('Failed to load expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processExpenseData = (expenses: Expense[], categories: Category[], currency: Currency): ChartData => {
    const categoryTotals: Record<string, number> = {};
    const monthlyTotals: Record<string, number> = {};
    const dailyTotals: Record<string, number> = {};

    let totalExpenses = 0;

    expenses.forEach(expense => {
      totalExpenses += expense.amount;

      const category = categories.find(c => c.id === expense.category);
      const categoryName = category?.name || expense.category;
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + expense.amount;

      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount;

      const dayKey = expense.date.split('T')[0];
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + expense.amount;
    });

    const colors = [
      '#667eea', '#f87171', '#34d399', '#fbbf24', '#a78bfa',
      '#60a5fa', '#f472b6', '#fb923c', '#818cf8', '#10b981'
    ];

    const categoryData = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((item, index) => {
        const category = categories.find(c => c.name === item[0]);
        return {
          name: item[0].length > 12 ? item[0].substring(0, 10) + '...' : item[0],
          amount: item[1],
          color: category?.color || colors[index % colors.length],
          legendFontColor: '#7F7F7F',
          legendFontSize: 10,
        };
      });

    const sortedMonths = Object.keys(monthlyTotals).sort().slice(-6);
    const monthlyData = {
      labels: sortedMonths.map(month => {
        const [year, m] = month.split('-');
        return `${m}/${year.slice(2)}`;
      }),
      datasets: [{
        data: sortedMonths.map(month => monthlyTotals[month] || 0),
      }],
    };

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
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [{
        data: last7Days.map(date => dailyTotals[date] || 0),
      }],
    };

    const daysWithExpenses = Object.keys(dailyTotals).length || 1;
    const averageDaily = totalExpenses / daysWithExpenses;

    const topCategory = categoryData.length > 0 ? categoryData[0].name : 'N/A';

    return {
      categoryData,
      monthlyData,
      weeklyData,
      totalExpenses,
      averageDaily,
      topCategory,
      currency,
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading charts...</Text>
      </View>
    );
  }

  if (!chartData || chartData.categoryData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No expense data available</Text>
        <Text style={styles.emptySubtext}>Add some expenses to see charts</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {CurrencyService.formatCompactAmount(chartData.totalExpenses, chartData.currency)}
          </Text>
          <Text style={styles.statLabel}>Total Expenses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {chartData.averageDaily >= 1000
              ? CurrencyService.formatCompactAmount(chartData.averageDaily, chartData.currency)
              : CurrencyService.formatAmount(chartData.averageDaily, chartData.currency)
            }
          </Text>
          <Text style={styles.statLabel}>Daily Average</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{chartData.topCategory}</Text>
          <Text style={styles.statLabel}>Top Category</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Expenses by Category</Text>
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
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Expenses</Text>
        {chartData.monthlyData.labels.length > 0 && (
          <BarChart
            data={chartData.monthlyData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars
            fromZero
          />
        )}
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Last 7 Days</Text>
        <LineChart
          data={chartData.weeklyData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default ChartsScreen;