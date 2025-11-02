import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import {StorageService} from '../services/StorageService';
import {CurrencyService, CURRENCIES} from '../services/CurrencyService';
import {IncomeCategory, Income, Currency} from '../types';
import {useTheme} from '../contexts/ThemeContext';

const EditIncomeScreen = ({navigation, route}: any) => {
  const {income} = route.params;
  const {colors} = useTheme();

  const [amount, setAmount] = useState(income.amount.toString());
  const [selectedCategory, setSelectedCategory] = useState(income.category);
  const [description, setDescription] = useState(income.description || '');
  const [date, setDate] = useState(new Date(income.date));
  const [currency, setCurrency] = useState<Currency>(income.currency || 'DZD');
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6B5FFF');

  useEffect(() => {
    loadIncomeCategories();
    loadCurrency();
  }, []);

  const loadIncomeCategories = async () => {
    const cats = await StorageService.getIncomeCategories();
    setIncomeCategories(cats);
  };

  const loadCurrency = async () => {
    const savedCurrency = await CurrencyService.getSelectedCurrency();
    setCurrency(savedCurrency);
  };

  const handleUpdate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setLoading(true);

    try {
      const updates = {
        amount: parseFloat(amount),
        category: selectedCategory,
        description: description.trim(),
        date: date.toISOString().split('T')[0],
        currency,
      };

      await StorageService.updateIncome(income.id, updates);

      Alert.alert('Success', 'Income updated successfully', [
        {text: 'OK', onPress: () => navigation.goBack()}
      ]);
    } catch (error) {
      console.error('Failed to update income:', error);
      Alert.alert('Error', 'Failed to update income');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Income',
      'Are you sure you want to delete this income entry?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await StorageService.deleteIncome(income.id);
              Alert.alert('Success', 'Income deleted successfully', [
                {text: 'OK', onPress: () => navigation.goBack()}
              ]);
            } catch (error) {
              console.error('Failed to delete income:', error);
              Alert.alert('Error', 'Failed to delete income');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      const newCategory: IncomeCategory = {
        id: `income_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newCategoryName.trim(),
        color: newCategoryColor,
      };

      await StorageService.saveIncomeCategory(newCategory);
      await loadIncomeCategories();
      setSelectedCategory(newCategory.id);
      setNewCategoryName('');
      setShowAddCategory(false);
      setShowCategoryModal(false);

      Alert.alert('Success', 'Income category added successfully');
    } catch (error) {
      console.error('Error adding income category:', error);
      Alert.alert('Error', 'Failed to add income category');
    }
  };

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || '$';
  };

  const getCategoryLetter = (categoryName: string | undefined) => {
    if (!categoryName || categoryName.length === 0) return '?';
    return categoryName.charAt(0).toUpperCase();
  };

  const selectedCategoryObj = incomeCategories.find(c => c.id === selectedCategory);
  const categoryColors = [
    '#6B5FFF', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FF6B6B', '#FFD93D', '#95E1D3', '#FF8B94',
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: colors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView}>
        <LinearGradient
          colors={['#6B5FFF', '#5147CC']}
          style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Income</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}>
            <Icon name="delete" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.form}>
          {/* Category Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: colors.text}]}>Income Category *</Text>
            <TouchableOpacity
              style={[styles.categorySelector, {backgroundColor: colors.card}]}
              onPress={() => setShowCategoryModal(true)}>
              <View style={styles.categorySelectorLeft}>
                <View style={[
                  styles.categoryIconBox,
                  {backgroundColor: selectedCategoryObj?.color ? selectedCategoryObj.color + '15' : '#F5F5FA'},
                ]}>
                  <Text style={[
                    styles.categoryLetter,
                    {color: selectedCategoryObj?.color || '#6B5FFF'},
                  ]}>
                    {getCategoryLetter(selectedCategoryObj?.name)}
                  </Text>
                </View>
                <Text style={[styles.categorySelectorText, {color: colors.text}]}>
                  {selectedCategoryObj?.name || 'Select category'}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: colors.text}]}>Amount *</Text>
            <View style={[styles.amountContainer, {backgroundColor: colors.card}]}>
              <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
              <TextInput
                style={[styles.amountInput, {color: colors.text}]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Currency */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: colors.text}]}>Currency</Text>
            <View style={styles.currencyGrid}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyButton,
                    {backgroundColor: colors.card},
                    currency === curr.code && styles.currencyButtonActive,
                  ]}
                  onPress={() => setCurrency(curr.code)}>
                  <Text style={[
                    styles.currencyButtonText,
                    {color: colors.text},
                    currency === curr.code && styles.currencyButtonTextActive,
                  ]}>
                    {curr.symbol} {curr.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: colors.text}]}>Date</Text>
            <TouchableOpacity
              style={[styles.dateSelector, {backgroundColor: colors.card}]}
              onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-today" size={20} color="#6B5FFF" />
              <Text style={[styles.dateText, {color: colors.text}]}>
                {date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: colors.text}]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, {backgroundColor: colors.card, color: colors.text}]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            disabled={loading}
            activeOpacity={0.8}>
            <LinearGradient
              colors={['#6B5FFF', '#8A7FFF']}
              style={styles.updateButtonGradient}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.updateButtonText}>Update Income</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Income Category</Text>
              <TouchableOpacity
                style={styles.closeButtonContainer}
                onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}>
              <View style={styles.categoryList}>
                {incomeCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      selectedCategory === cat.id && styles.selectedCategoryOption,
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setShowCategoryModal(false);
                    }}
                    activeOpacity={0.7}>
                    <View style={[
                      styles.categoryIconBox,
                      {
                        backgroundColor: selectedCategory === cat.id
                          ? cat.color
                          : cat.color + '15',
                      },
                    ]}>
                      <Text style={[
                        styles.categoryLetter,
                        {color: selectedCategory === cat.id ? 'white' : cat.color},
                      ]}>
                        {getCategoryLetter(cat.name)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.categoryName,
                      selectedCategory === cat.id && styles.selectedCategoryName,
                    ]}>
                      {cat.name}
                    </Text>
                    {selectedCategory === cat.id && (
                      <Icon name="check-circle" size={24} color={cat.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Add New Category Button */}
              <TouchableOpacity
                style={styles.addCategoryButton}
                onPress={() => {
                  setShowCategoryModal(false);
                  setShowAddCategory(true);
                }}>
                <Icon name="add-circle-outline" size={24} color="#6B5FFF" />
                <Text style={styles.addCategoryButtonText}>Add New Category</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={showAddCategory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCategory(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: colors.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: colors.text}]}>Add Income Category</Text>
              <TouchableOpacity onPress={() => setShowAddCategory(false)}>
                <Text style={[styles.closeButton, {color: colors.text}]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, {color: colors.text}]}>Category Name *</Text>
                <TextInput
                  style={[styles.input, {backgroundColor: colors.background, color: colors.text}]}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g., Freelance, Salary"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, {color: colors.text}]}>Color</Text>
                <View style={styles.colorGrid}>
                  {categoryColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        {backgroundColor: color},
                        newCategoryColor === color && styles.colorOptionActive,
                      ]}
                      onPress={() => setNewCategoryColor(color)}>
                      {newCategoryColor === color && (
                        <Icon name="check" size={20} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddCategory}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#6B5FFF', '#8A7FFF']}
                  style={styles.submitGradient}>
                  <Text style={styles.submitButtonText}>Add Category</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      <DatePicker
        modal
        open={showDatePicker}
        date={date}
        mode="date"
        onConfirm={(selectedDate) => {
          setDate(selectedDate);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  categorySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryLetter: {
    fontSize: 18,
    fontWeight: '700',
  },
  categorySelectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B5FFF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    minWidth: 100,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  currencyButtonActive: {
    borderColor: '#6B5FFF',
    backgroundColor: '#E8E5FF',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currencyButtonTextActive: {
    color: '#6B5FFF',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  updateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
  },
  updateButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
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
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  categoryScrollContent: {
    padding: 20,
  },
  categoryList: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  selectedCategoryOption: {
    backgroundColor: '#E8E5FF',
    borderWidth: 2,
    borderColor: '#6B5FFF',
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  selectedCategoryName: {
    fontWeight: '700',
    color: '#6B5FFF',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#6B5FFF',
    borderStyle: 'dashed',
  },
  addCategoryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5FFF',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#1C1C1E',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default EditIncomeScreen;

