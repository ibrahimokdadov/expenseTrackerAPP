import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {StorageService} from '../services/StorageService';
import {CurrencyService, CURRENCIES} from '../services/CurrencyService';
import {IncomeCategory, Currency} from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';

const {width} = Dimensions.get('window');

const AddIncomeScreen = ({navigation}: any) => {
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('DZD');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6B5FFF');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadCurrency();
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

  useFocusEffect(
    useCallback(() => {
      loadIncomeCategories();
    }, [])
  );

  const loadCurrency = async () => {
    const savedCurrency = await CurrencyService.getSelectedCurrency();
    setCurrency(savedCurrency);
  };

  const loadIncomeCategories = async () => {
    const cats = await StorageService.getIncomeCategories();
    setIncomeCategories(cats);
    if (cats.length > 0 && !selectedCategory) {
      setSelectedCategory(cats[0].id);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !amount) {
      Alert.alert('Missing Information', 'Please enter the amount and select a category', [
        {text: 'OK', style: 'default'},
      ]);
      return;
    }

    try {
      await StorageService.saveIncome({
        category: selectedCategory,
        amount: parseFloat(amount),
        currency,
        description,
        date: date.toISOString().split('T')[0],
      });

      await CurrencyService.setSelectedCurrency(currency);

      Alert.alert('Success! ✨', 'Your income has been recorded', [
        {text: 'Add Another', onPress: () => resetForm()},
        {text: 'Done', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      console.error('Error saving income:', error);
      Alert.alert('Oops!', 'Something went wrong. Please try again.');
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDate(new Date());
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

  const predefinedAmounts = ['100', '500', '1000', '2000', '5000', '10000'];

  const categoryColors = [
    '#6B5FFF', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FF6B6B', '#FFD93D', '#95E1D3', '#FF8B94',
  ];

  const selectedCategoryObj = incomeCategories.find(c => c.id === selectedCategory);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        {/* Header */}
        <LinearGradient
          colors={['#6B5FFF', '#8A7FFF']}
          style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Income</Text>
          <View style={{width: 24}} />
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Income Category *</Text>
            <TouchableOpacity
              style={styles.categorySelector}
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
                <Text style={styles.categorySelectorText}>
                  {selectedCategoryObj?.name || 'Select category'}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount *</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                autoFocus={false}
              />
            </View>
            
            {/* Quick Amount Buttons */}
            <View style={styles.quickAmounts}>
              {predefinedAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmountButton}
                  onPress={() => setAmount(amt)}>
                  <Text style={styles.quickAmountText}>{getCurrencySymbol()}{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Currency Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.currencyGrid}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyButton,
                    currency === curr.code && styles.currencyButtonActive,
                  ]}
                  onPress={() => setCurrency(curr.code)}>
                  <Text style={[
                    styles.currencyButtonText,
                    currency === curr.code && styles.currencyButtonTextActive,
                  ]}>
                    {curr.symbol} {curr.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-today" size={20} color="#6B5FFF" />
              <Text style={styles.dateText}>
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
          <View style={styles.section}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a note about this income..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.8}>
            <LinearGradient
              colors={['#6B5FFF', '#8A7FFF']}
              style={styles.submitGradient}>
              <Text style={styles.submitButtonText}>Add Income</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Income Category</Text>
              <TouchableOpacity onPress={() => setShowAddCategory(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g., Freelance, Salary"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Color</Text>
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
    backgroundColor: '#F8F9FD',
  },
  content: {
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
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
    color: '#1C1C1E',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
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
    color: '#1C1C1E',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  quickAmountButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5FFF',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    minWidth: width / 3 - 16,
    backgroundColor: 'white',
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
    color: '#666',
  },
  currencyButtonTextActive: {
    color: '#6B5FFF',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
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
    color: '#1C1C1E',
  },
  descriptionInput: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
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
  input: {
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 2,
    borderColor: '#E5E7EB',
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
});

export default AddIncomeScreen;

