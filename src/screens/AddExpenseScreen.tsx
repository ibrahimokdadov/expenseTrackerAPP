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
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

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

  // Reload categories every time screen is focused to ensure migrations run
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  // Ensure Personal category always has subcategories when selected
  useEffect(() => {
    if (selectedCategory === 'personal') {
      const checkAndFixPersonal = async () => {
        const personalCat = categories.find(c => c.id === 'personal');
        if (personalCat && (!personalCat.subcategories || personalCat.subcategories.length === 0)) {
          console.log('[AddExpenseScreen] Personal category missing subcategories, fixing...');
          const defaultSubcategories = [
            { id: 'personal_transport', name: 'Transport', categoryId: 'personal' },
            { id: 'personal_food', name: 'Food', categoryId: 'personal' },
            { id: 'personal_entertainment', name: 'Entertainment', categoryId: 'personal' },
            { id: 'personal_healthcare', name: 'Healthcare', categoryId: 'personal' },
            { id: 'personal_shopping', name: 'Shopping', categoryId: 'personal' },
            { id: 'personal_utilities', name: 'Utilities', categoryId: 'personal' },
            { id: 'personal_education', name: 'Education', categoryId: 'personal' },
            { id: 'personal_other', name: 'Other', categoryId: 'personal' },
          ];
          
          // Update state
          setCategories(prevCats => 
            prevCats.map(c => 
              c.id === 'personal' ? { ...c, subcategories: defaultSubcategories } : c
            )
          );
          
          // Save to storage
          const cats = await StorageService.getCategories();
          const personalIndex = cats.findIndex(c => c.id === 'personal');
          if (personalIndex !== -1) {
            cats[personalIndex].subcategories = defaultSubcategories;
            await StorageService.saveCategories(cats);
            console.log('[AddExpenseScreen] Saved Personal subcategories to storage');
            // Reload to ensure state is updated
            await loadCategories();
          }
        } else if (!personalCat) {
          // Personal category doesn't exist yet, reload categories
          await loadCategories();
        }
      };
      checkAndFixPersonal();
    }
  }, [selectedCategory]);

  const loadCurrency = async () => {
    const savedCurrency = await CurrencyService.getSelectedCurrency();
    setCurrency(savedCurrency);
  };

  const loadCategories = async () => {
    const cats = await StorageService.getCategories();
    console.log('[AddExpenseScreen] Loaded categories:', cats.map(c => ({
      id: c.id,
      name: c.name,
      subcategories: c.subcategories?.length || 0,
      subcategoryNames: c.subcategories?.map(s => s.name) || []
    })));
    
    // Special logging for Personal category
    const personalCat = cats.find(c => c.id === 'personal');
    if (personalCat) {
      console.log('[AddExpenseScreen] Personal category found:', {
        name: personalCat.name,
        subcategoriesCount: personalCat.subcategories?.length || 0,
        subcategories: personalCat.subcategories?.map(s => s.name) || []
      });
    }
    
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
      
      // If Personal category and missing subcategories, fix immediately
      if (cat.id === 'personal' && (!cat.subcategories || cat.subcategories.length === 0)) {
        console.warn('[AddExpenseScreen] Personal category missing subcategories, fixing now...');
        const defaultSubcategories = [
          { id: 'personal_transport', name: 'Transport', categoryId: 'personal' },
          { id: 'personal_food', name: 'Food', categoryId: 'personal' },
          { id: 'personal_entertainment', name: 'Entertainment', categoryId: 'personal' },
          { id: 'personal_healthcare', name: 'Healthcare', categoryId: 'personal' },
          { id: 'personal_shopping', name: 'Shopping', categoryId: 'personal' },
          { id: 'personal_utilities', name: 'Utilities', categoryId: 'personal' },
          { id: 'personal_education', name: 'Education', categoryId: 'personal' },
          { id: 'personal_other', name: 'Other', categoryId: 'personal' },
        ];
        // Update in state immediately
        setCategories(prevCats => 
          prevCats.map(c => 
            c.id === 'personal' ? { ...c, subcategories: defaultSubcategories } : c
          )
        );
        // Also save to storage
        StorageService.getCategories().then(cats => {
          const personalIndex = cats.findIndex(c => c.id === 'personal');
          if (personalIndex !== -1) {
            cats[personalIndex].subcategories = defaultSubcategories;
            StorageService.saveCategories(cats);
            console.log('[AddExpenseScreen] Saved Personal subcategories to storage');
          }
        });
        // Return updated category with subcategories
        return { ...cat, subcategories: defaultSubcategories };
      }
      
      if (cat.subcategories && cat.subcategories.length > 0) {
        console.log(`[AddExpenseScreen] Subcategory names:`, cat.subcategories.map(s => s.name));
      }
    } else {
      console.log(`[AddExpenseScreen] Category not found for id: ${selectedCategory}`);
    }
    return cat;
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim()) {
      Alert.alert('Error', 'Please enter a subcategory name');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category first');
      return;
    }

    try {
      const newSubcategory = await StorageService.addSubcategory(selectedCategory, {
        name: newSubcategoryName.trim()
      });

      // Reload categories to get updated subcategories
      await loadCategories();

      // Select the newly added subcategory
      setSelectedSubcategory(newSubcategory.id);

      // Reset and close modal
      setNewSubcategoryName('');
      setShowAddSubcategory(false);

      Alert.alert('Success', 'Subcategory added successfully');
    } catch (error) {
      console.error('Error adding subcategory:', error);
      Alert.alert('Error', 'Failed to add subcategory');
    }
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
                  onPress={async () => {
                    setSelectedCategory(cat.id);
                    setShowCategoryModal(false);
                    // Force reload categories when Personal is selected to ensure subcategories are loaded
                    if (cat.id === 'personal') {
                      console.log('[AddExpenseScreen] Personal selected, reloading categories...');
                      await loadCategories();
                      // Reload again after a short delay to ensure state is updated
                      setTimeout(() => {
                        loadCategories();
                      }, 100);
                    }
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

          {currentCategory && (
            <View style={styles.subcategorySection}>
              <View style={styles.subcategoryHeader}>
                <Text style={styles.sectionLabel}>Subcategory</Text>
                <TouchableOpacity
                  style={styles.addSubcategoryButton}
                  onPress={() => setShowAddSubcategory(true)}>
                  <Text style={styles.addSubcategoryText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.subcategoryList}>
                  {currentCategory.subcategories && currentCategory.subcategories.length > 0 ? (
                    currentCategory.subcategories.map((sub) => (
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
                  ))
                  ) : (
                    <Text style={styles.noSubcategoriesText}>No subcategories yet. Tap "+ Add" to create one.</Text>
                  )}
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

      {/* Add Subcategory Modal */}
      <Modal
        visible={showAddSubcategory}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddSubcategory(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddSubcategory(false)}>
          <View style={styles.addSubcategoryModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Subcategory</Text>
            <Text style={styles.modalSubtitle}>
              Adding to: {currentCategory?.name || 'Category'}
            </Text>
            <TextInput
              style={styles.subcategoryInput}
              value={newSubcategoryName}
              onChangeText={setNewSubcategoryName}
              placeholder="Subcategory name"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddSubcategory(false);
                  setNewSubcategoryName('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddSubcategory}>
                <LinearGradient
                  colors={['#6B5FFF', '#5147CC']}
                  style={styles.confirmButtonGradient}>
                  <Text style={styles.confirmButtonText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  subcategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addSubcategoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6B5FFF',
    borderRadius: 15,
  },
  addSubcategoryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  noSubcategoriesText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  addSubcategoryModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    marginBottom: 20,
  },
  subcategoryInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    overflow: 'hidden',
  },
  cancelButtonText: {
    textAlign: 'center',
    padding: 12,
    fontSize: 15,
    color: '#666',
  },
  confirmButtonGradient: {
    padding: 12,
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default AddExpenseScreen;