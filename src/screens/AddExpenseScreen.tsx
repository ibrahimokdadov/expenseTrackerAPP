import React, {useState, useEffect, useRef} from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import {StorageService} from '../services/StorageService';
import {CurrencyService, CURRENCIES} from '../services/CurrencyService';
import {Category, Subcategory, Currency} from '../types';

const {width} = Dimensions.get('window');

const AddExpenseScreen = ({navigation}: any) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('DZD');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadCategories();
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

  const loadCurrency = async () => {
    const savedCurrency = await CurrencyService.getSelectedCurrency();
    setCurrency(savedCurrency);
  };

  const loadCategories = async () => {
    const cats = await StorageService.getCategories();
    console.log('[AddExpenseScreen] Loaded categories:', cats.map(c => ({
      name: c.name,
      subcategories: c.subcategories?.length || 0
    })));
    setCategories(cats);
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
      await StorageService.saveExpense({
        category: selectedCategory,
        subcategory: selectedSubcategory || undefined,
        amount: parseFloat(amount),
        currency,
        description,
        date,
      });

      await CurrencyService.setSelectedCurrency(currency);

      Alert.alert('Success! ✨', 'Your expense has been recorded', [
        {text: 'Add Another', onPress: () => resetForm()},
        {text: 'Done', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('Oops!', 'Something went wrong. Please try again.');
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedSubcategory('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const getCurrentCategory = () => {
    const cat = categories.find(c => c.id === selectedCategory);
    if (cat) {
      console.log(`[AddExpenseScreen] Current category: ${cat.name}, subcategories: ${cat.subcategories?.length || 0}`);
    }
    return cat;
  };

  const currentCategory = getCurrentCategory();

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || '$';
  };

  const getCategoryLetter = (categoryName: string) => {
    if (!categoryName || categoryName.length === 0) return '?';
    return categoryName.charAt(0).toUpperCase();
  };

  const predefinedAmounts = ['10', '25', '50', '100', '250', '500'];

  const CategoryModal = () => (
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
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity
              style={styles.closeButtonContainer}
              onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    selectedCategory === cat.id && styles.selectedCategoryOption,
                  ]}
                  onPress={() => {
                    // Only reset subcategory if switching to a different category
                    if (selectedCategory !== cat.id) {
                      setSelectedSubcategory('');
                    }
                    setSelectedCategory(cat.id);
                    setShowCategoryModal(false);
                  }}
                  activeOpacity={0.7}>
                  <Animated.View
                    style={[
                      styles.categoryIconBox,
                      {
                        backgroundColor: selectedCategory === cat.id
                          ? cat.color
                          : cat.color + '15',
                        borderColor: selectedCategory === cat.id
                          ? cat.color
                          : 'transparent',
                        transform: [
                          {
                            scale: selectedCategory === cat.id ? 1.05 : 1,
                          },
                        ],
                      },
                    ]}>
                    <Text style={[
                      styles.categoryLetter,
                      selectedCategory === cat.id && styles.selectedCategoryLetter,
                    ]}>
                      {getCategoryLetter(cat.name)}
                    </Text>
                  </Animated.View>
                  <Text style={[
                    styles.categoryOptionText,
                    selectedCategory === cat.id && styles.selectedCategoryText,
                  ]}>
                    {cat.name}
                  </Text>
                  {selectedCategory === cat.id && (
                    <View style={styles.selectedCheckmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>

          <View style={styles.amountSection}>
            <Text style={styles.sectionLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.quickAmounts}>
              {predefinedAmounts.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.quickAmountButton}
                  onPress={() => setAmount(preset)}>
                  <Text style={styles.quickAmountText}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.categorySection}>
            <Text style={styles.sectionLabel}>Category</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.7}>
              {currentCategory ? (
                <View style={styles.selectedCategory}>
                  <View style={[styles.categoryIconSmall, {backgroundColor: currentCategory.color + '20'}]}>
                    <Text style={[styles.categoryLetterSmall, {color: currentCategory.color}]}>{getCategoryLetter(currentCategory.name)}</Text>
                  </View>
                  <Text style={styles.selectedCategoryName}>{currentCategory.name}</Text>
                </View>
              ) : (
                <View style={styles.selectedCategory}>
                  <View style={styles.categoryIconPlaceholder}>
                    <Text style={styles.categoryLetterSmall}>?</Text>
                  </View>
                  <Text style={styles.categoryPlaceholder}>Select category</Text>
                </View>
              )}
              <View style={styles.chevronContainer}>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {currentCategory?.subcategories && currentCategory.subcategories.length > 0 && (
            <View style={styles.subcategorySection}>
              <Text style={styles.sectionLabel}>Subcategory</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.subcategoryList}>
                  {currentCategory.subcategories.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subcategoryChip,
                        selectedSubcategory === sub.id && styles.selectedSubcategoryChip,
                      ]}
                      onPress={() => setSelectedSubcategory(sub.id)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.subcategoryChipText,
                          selectedSubcategory === sub.id && styles.selectedSubcategoryChipText,
                        ]}>
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="What was this expense for?"
              placeholderTextColor="#C7C7CC"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.dateSection}>
            <Text style={styles.sectionLabel}>Date</Text>
            <View style={styles.dateSelector}>
              <Text style={styles.dateIcon}>📅</Text>
              <TextInput
                style={styles.dateInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#C7C7CC"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.8}>
            <LinearGradient
              colors={['#6B5FFF', '#8A7FFF']}
              style={styles.submitGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <Text style={styles.submitButtonText}>Add Expense</Text>
            </LinearGradient>
          </TouchableOpacity>

        </Animated.View>

      </ScrollView>

      <CategoryModal />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  backButton: {
    fontSize: 28,
    color: '#6B5FFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    padding: 20,
  },
  amountSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#6B5FFF',
    paddingBottom: 8,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 32,
    color: '#6B5FFF',
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    padding: 0,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  quickAmountText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  categorySection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8FA',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8ED',
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#F0F0F5',
    borderWidth: 1.5,
    borderColor: '#E0E0E5',
  },
  categoryLetterSmall: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
  },
  selectedCategoryName: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8E8ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  descriptionSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  descriptionInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
  },
  dateIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  submitButton: {
    borderRadius: 16,
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
  submitGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
    padding: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    width: (width - 64) / 4,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
  },
  selectedCategoryOption: {
    backgroundColor: '#F2F2F7',
  },
  categoryIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryLetter: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
  },
  selectedCategoryLetter: {
    color: 'white',
    fontWeight: '800',
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#6B5FFF',
    fontWeight: '700',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6B5FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subcategorySection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  subcategoryList: {
    flexDirection: 'row',
    gap: 10,
  },
  subcategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSubcategoryChip: {
    backgroundColor: '#6B5FFF20',
    borderColor: '#6B5FFF',
  },
  subcategoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedSubcategoryChipText: {
    color: '#6B5FFF',
  },
});

export default AddExpenseScreen;