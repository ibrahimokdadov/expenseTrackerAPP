import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StorageService} from '../services/StorageService';
import {Category, Subcategory, Expense} from '../types';

const CategoryDetailsScreen = ({route, navigation}: any) => {
  const {categoryId} = route.params;
  const [category, setCategory] = useState<Category | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subcategoryModalVisible, setSubcategoryModalVisible] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    const categories = await StorageService.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    setCategory(cat || null);

    const allExpenses = await StorageService.getExpenses();
    const categoryExpenses = allExpenses.filter(e => e.category === categoryId);
    setExpenses(categoryExpenses);
  };

  const getFilteredExpenses = () => {
    const now = new Date();
    let filtered = expenses;

    switch (selectedPeriod) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = expenses.filter(e => new Date(e.timestamp) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filtered = expenses.filter(e => new Date(e.timestamp) >= monthAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filtered = expenses.filter(e => new Date(e.timestamp) >= yearAgo);
        break;
    }

    return filtered;
  };

  const calculateSubcategoryBreakdown = () => {
    const filteredExpenses = getFilteredExpenses();
    const breakdown: {[key: string]: {name: string; total: number; color: string}} = {};

    // Calculate totals for each subcategory
    filteredExpenses.forEach(expense => {
      const key = expense.subcategory || 'uncategorized';
      if (!breakdown[key]) {
        const subcategory = category?.subcategories?.find(s => s.id === expense.subcategory);
        breakdown[key] = {
          name: subcategory?.name || 'Uncategorized',
          total: 0,
          color: getRandomColor(key),
        };
      }
      breakdown[key].total += expense.amount;
    });

    return Object.values(breakdown);
  };

  const getRandomColor = (seed: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1'];
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim()) {
      Alert.alert('Error', 'Please enter a subcategory name');
      return;
    }

    if (!category) return;

    await StorageService.addSubcategory(category.id, {name: newSubcategoryName});
    setNewSubcategoryName('');
    setSubcategoryModalVisible(false);
    loadData();
  };

  const handleDeleteSubcategory = (subcategoryId: string) => {
    if (!category) return;

    Alert.alert(
      'Delete Subcategory',
      'Are you sure you want to delete this subcategory?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteSubcategory(category.id, subcategoryId);
            loadData();
          },
        },
      ]
    );
  };

  if (!category) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const filteredExpenses = getFilteredExpenses();
  const subcategoryBreakdown = calculateSubcategoryBreakdown();
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: category.color || '#667eea'}]}>
        <Text style={styles.headerTitle}>{category.name}</Text>
        <Text style={styles.headerAmount}>${totalAmount.toFixed(2)}</Text>
        <Text style={styles.headerSubtitle}>Total Spent ({selectedPeriod})</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'year', 'all'] as const).map(period => (
          <TouchableOpacity
            key={period}
            style={[styles.periodButton, selectedPeriod === period && styles.activePeriod]}
            onPress={() => setSelectedPeriod(period)}>
            <Text style={[styles.periodText, selectedPeriod === period && styles.activePeriodText]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subcategory Breakdown */}
      {subcategoryBreakdown.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Subcategory Breakdown</Text>

          <View style={styles.statsGrid}>
            {subcategoryBreakdown.map((item, index) => {
              const percentage = totalAmount > 0 ? (item.total / totalAmount * 100).toFixed(1) : '0';
              return (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statColorBar, {backgroundColor: item.color}]} />
                  <Text style={styles.statName}>{item.name}</Text>
                  <Text style={styles.statAmount}>${item.total.toFixed(2)}</Text>
                  <Text style={styles.statPercentage}>{percentage}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Subcategories Management */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Subcategories</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setSubcategoryModalVisible(true)}>
            <Icon name="add" size={24} color="#667eea" />
          </TouchableOpacity>
        </View>

        {category.subcategories && category.subcategories.length > 0 ? (
          category.subcategories.map(subcategory => (
            <View key={subcategory.id} style={styles.subcategoryItem}>
              <Text style={styles.subcategoryName}>{subcategory.name}</Text>
              <TouchableOpacity
                onPress={() => handleDeleteSubcategory(subcategory.id)}>
                <Icon name="delete" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No subcategories added yet</Text>
        )}
      </View>

      {/* Recent Expenses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        {filteredExpenses.slice(0, 10).map(expense => (
          <View key={expense.id} style={styles.expenseItem}>
            <View>
              <Text style={styles.expenseDescription}>{expense.description}</Text>
              <Text style={styles.expenseDate}>
                {new Date(expense.timestamp).toLocaleDateString()}
              </Text>
              {expense.subcategory && (
                <Text style={styles.expenseSubcategory}>
                  {category.subcategories?.find(s => s.id === expense.subcategory)?.name}
                </Text>
              )}
            </View>
            <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Add Subcategory Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={subcategoryModalVisible}
        onRequestClose={() => setSubcategoryModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Subcategory</Text>

            <TextInput
              style={styles.input}
              placeholder="Subcategory name"
              value={newSubcategoryName}
              onChangeText={setNewSubcategoryName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setSubcategoryModalVisible(false);
                  setNewSubcategoryName('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddSubcategory}>
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'white',
  },
  activePeriod: {
    backgroundColor: '#667eea',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
  },
  activePeriodText: {
    color: 'white',
    fontWeight: 'bold',
  },
  chartSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  statColorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  statName: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    marginBottom: 5,
  },
  statAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statPercentage: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  section: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 5,
  },
  subcategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subcategoryName: {
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#333',
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  expenseSubcategory: {
    fontSize: 12,
    color: '#667eea',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CategoryDetailsScreen;