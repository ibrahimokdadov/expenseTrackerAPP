import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Category, Subcategory, Loan, LoanHistoryEntry, User, ZTBalance, ZTPayment, Income, IncomeCategory } from '../types';
import GoogleSheetsService from './GoogleSheetsService';
import GoogleAuthService from './GoogleAuthService';

const EXPENSES_KEY = '@expenses';
const CATEGORIES_KEY = '@categories';
const INCOME_KEY = '@income';
const INCOME_CATEGORIES_KEY = '@income_categories';
const COMPARISON_INCOME_CATEGORIES_KEY = '@comparison_income_categories';
const COMPARISON_EXPENSE_CATEGORIES_KEY = '@comparison_expense_categories';
const LOANS_KEY = '@loans';
const USERS_KEY = '@users';
const CURRENT_USER_KEY = '@current_user';
const ZT_BALANCES_KEY = '@zt_balances';
const ZT_PAYMENTS_KEY = '@zt_payments';
const DELETED_ITEMS_KEY = '@deleted_items';

export class StorageService {
  private static autoBackupEnabled = false;
  private static backupQueue: (() => Promise<void>)[] = [];
  private static isProcessingBackup = false;

  static async init() {
    // Initialize categories with predefined ones
    const categories = await this.getCategories();
    if (categories.length === 0) {
      await this.initializeDefaultCategories();
    } else {
      // Check if Personal category needs subcategories added
      const personalCategory = categories.find(c => c.id === 'personal');
      if (personalCategory && (!personalCategory.subcategories || personalCategory.subcategories.length === 0)) {
        personalCategory.subcategories = [
          { id: 'personal_transport', name: 'Transport', categoryId: 'personal' },
          { id: 'personal_food', name: 'Food', categoryId: 'personal' },
          { id: 'personal_entertainment', name: 'Entertainment', categoryId: 'personal' },
          { id: 'personal_healthcare', name: 'Healthcare', categoryId: 'personal' },
          { id: 'personal_shopping', name: 'Shopping', categoryId: 'personal' },
          { id: 'personal_utilities', name: 'Utilities', categoryId: 'personal' },
          { id: 'personal_education', name: 'Education', categoryId: 'personal' },
          { id: 'personal_other', name: 'Other', categoryId: 'personal' },
        ];
        await this.saveCategories(categories);
        console.log('Added subcategories to Personal category');
      }
    }

    // Initialize income categories with predefined ones
    const incomeCategories = await this.getIncomeCategories();
    if (incomeCategories.length === 0) {
      await this.initializeDefaultIncomeCategories();
    }

    // Initialize default user
    const users = await this.getUsers();
    if (users.length === 0) {
      await this.saveUser({
        id: 'default_user',
        name: 'Me',
        isDefault: true,
      });
      await AsyncStorage.setItem(CURRENT_USER_KEY, 'default_user');
    }

    // Check if user is signed in and enable auto backup
    const isSignedIn = await GoogleAuthService.isSignedIn();
    if (isSignedIn) {
      this.autoBackupEnabled = true;
      try {
        await GoogleSheetsService.initialize();
      } catch (error) {
        // Don't block app initialization if Google Sheets fails
        console.warn('[StorageService] Google Sheets initialization failed, continuing without sync:', error);
      }
    }
  }

  static async initializeDefaultCategories() {
    const defaultCategories: Category[] = [
      { id: 'villa', name: 'Villa', color: '#FF6B6B', subcategories: [] },
      { id: 'khodem', name: 'Khodem', color: '#4ECDC4', subcategories: [] },
      { id: 'apartment', name: 'Apartment', color: '#45B7D1', subcategories: [] },
      { id: 'wahiba', name: 'Wahiba', color: '#96CEB4', subcategories: [] },
      { id: 'khadija', name: 'Khadija', color: '#FFEAA7', subcategories: [] },
      { id: 'youcef', name: 'Youcef', color: '#DDA0DD', subcategories: [] },
      { id: 'syakhn', name: 'Syakhn', color: '#98D8C8', subcategories: [] },
      { id: 'ouled_djellal', name: 'Ouled Djellal', color: '#FFB6C1', subcategories: [] },
      { id: 'imane_djebabra', name: 'Imane Djebabra', color: '#87CEEB', subcategories: [] },
      { id: 'a_milka', name: 'A Milka', color: '#DEB887', subcategories: [] },
      {
        id: 'personal',
        name: 'Personal',
        color: '#667EEA',
        subcategories: [
          { id: 'personal_transport', name: 'Transport', categoryId: 'personal' },
          { id: 'personal_food', name: 'Food', categoryId: 'personal' },
          { id: 'personal_entertainment', name: 'Entertainment', categoryId: 'personal' },
          { id: 'personal_healthcare', name: 'Healthcare', categoryId: 'personal' },
          { id: 'personal_shopping', name: 'Shopping', categoryId: 'personal' },
          { id: 'personal_utilities', name: 'Utilities', categoryId: 'personal' },
          { id: 'personal_education', name: 'Education', categoryId: 'personal' },
          { id: 'personal_other', name: 'Other', categoryId: 'personal' },
        ],
      },
    ];

    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
    return defaultCategories;
  }

  static async initializeDefaultIncomeCategories() {
    const defaultIncomeCategories: IncomeCategory[] = [
      { id: 'salary', name: 'Salary', color: '#4ECDC4' },
      { id: 'freelance', name: 'Freelance', color: '#45B7D1' },
      { id: 'business', name: 'Business', color: '#96CEB4' },
      { id: 'investment', name: 'Investment', color: '#FFEAA7' },
      { id: 'other', name: 'Other', color: '#DDA0DD' },
    ];

    await AsyncStorage.setItem(INCOME_CATEGORIES_KEY, JSON.stringify(defaultIncomeCategories));
    return defaultIncomeCategories;
  }

  // Bulk Save Methods
  static async saveAllExpenses(expenses: Expense[]): Promise<void> {
    try {
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Failed to save all expenses:', error);
      throw error;
    }
  }

  static async saveAllLoans(loans: Loan[]): Promise<void> {
    try {
      // Ensure all loans have history arrays initialized before saving
      // IMPORTANT: Only initialize if missing, never overwrite existing history
      const normalizedLoans = loans.map(loan => {
        const normalizedLoan = { ...loan };
        // Only set to empty array if history is truly missing
        if (!normalizedLoan.history) {
          normalizedLoan.history = [];
        } else if (!Array.isArray(normalizedLoan.history)) {
          // If it's not an array, log a warning but preserve what we can
          console.warn(`[StorageService] Loan ${normalizedLoan.id} history is not an array:`, typeof normalizedLoan.history);
          normalizedLoan.history = [];
        }
        // If history exists and is an array, preserve it as-is
        return normalizedLoan;
      });
      
      // Log history counts before saving
      const loansWithHistory = normalizedLoans.filter(l => l.history && l.history.length > 0);
      if (loansWithHistory.length > 0) {
        console.log(`[StorageService] saveAllLoans: Saving ${loans.length} loans, ${loansWithHistory.length} have history`);
        loansWithHistory.forEach(loan => {
          console.log(`[StorageService] Loan ${loan.id} has ${loan.history.length} history entries`);
        });
      }
      
      await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(normalizedLoans));
    } catch (error) {
      console.error('Failed to save all loans:', error);
      throw error;
    }
  }

  static async saveAllCategories(categories: Category[]): Promise<void> {
    try {
      // Ensure Personal category has subcategories before saving
      const normalizedCategories = categories.map(category => {
        if (category.id === 'personal' && (!category.subcategories || category.subcategories.length === 0)) {
          category.subcategories = [
            { id: 'personal_transport', name: 'Transport', categoryId: 'personal' },
            { id: 'personal_food', name: 'Food', categoryId: 'personal' },
            { id: 'personal_entertainment', name: 'Entertainment', categoryId: 'personal' },
            { id: 'personal_healthcare', name: 'Healthcare', categoryId: 'personal' },
            { id: 'personal_shopping', name: 'Shopping', categoryId: 'personal' },
            { id: 'personal_utilities', name: 'Utilities', categoryId: 'personal' },
            { id: 'personal_education', name: 'Education', categoryId: 'personal' },
            { id: 'personal_other', name: 'Other', categoryId: 'personal' },
          ];
          console.log('[saveAllCategories] Added Personal subcategories to category being saved');
        }
        // Ensure all categories have subcategories array initialized
        if (!category.subcategories) {
          category.subcategories = [];
        }
        return category;
      });
      
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(normalizedCategories));
    } catch (error) {
      console.error('Failed to save all categories:', error);
      throw error;
    }
  }

  // Expense Management
  static async saveExpense(expense: Omit<Expense, 'id' | 'timestamp' | 'localId' | 'syncStatus'>) {
    try {
      const expenses = await this.getExpenses();
      const newExpense: Expense = {
        ...expense,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        date: expense.date || new Date().toISOString().split('T')[0],
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        syncStatus: 'pending',
      };
      expenses.push(newExpense);
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));

      // Trigger auto backup
      this.scheduleBackup();

      return newExpense;
    } catch (error) {
      console.error('Error saving expense:', error);
      throw error;
    }
  }

  static async getExpenses(): Promise<Expense[]> {
    try {
      const expenses = await AsyncStorage.getItem(EXPENSES_KEY);
      return expenses ? JSON.parse(expenses) : [];
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }

  static async updateExpense(id: string, updates: Partial<Expense>) {
    try {
      const expenses = await this.getExpenses();
      const index = expenses.findIndex(e => e.id === id);
      if (index !== -1) {
        // Always update timestamp when editing to mark as newer than remote
        expenses[index] = {
          ...expenses[index],
          ...updates,
          timestamp: new Date().toISOString() // Force new timestamp
        };
        await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));

        console.log(`[updateExpense] Updated expense ${id} with new timestamp: ${expenses[index].timestamp}`);

        // Trigger auto backup
        this.scheduleBackup();

        return expenses[index];
      }
      throw new Error('Expense not found');
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  static async deleteExpense(id: string) {
    try {
      const expenses = await this.getExpenses();
      const filtered = expenses.filter(e => e.id !== id);
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(filtered));

      // Track deletion for sync
      await this.trackDeletion('expense', id);

      // Trigger auto backup
      this.scheduleBackup();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // Category Management
  static async getCategories(): Promise<Category[]> {
    try {
      const categoriesJson = await AsyncStorage.getItem(CATEGORIES_KEY);
      if (!categoriesJson) return [];
      
      const categories: Category[] = JSON.parse(categoriesJson);
      
      // Ensure Personal category always has subcategories (migration for existing categories)
      let needsUpdate = false;
      const normalizedCategories = categories.map(category => {
        if (category.id === 'personal' && (!category.subcategories || category.subcategories.length === 0)) {
          category.subcategories = [
            { id: 'personal_transport', name: 'Transport', categoryId: 'personal' },
            { id: 'personal_food', name: 'Food', categoryId: 'personal' },
            { id: 'personal_entertainment', name: 'Entertainment', categoryId: 'personal' },
            { id: 'personal_healthcare', name: 'Healthcare', categoryId: 'personal' },
            { id: 'personal_shopping', name: 'Shopping', categoryId: 'personal' },
            { id: 'personal_utilities', name: 'Utilities', categoryId: 'personal' },
            { id: 'personal_education', name: 'Education', categoryId: 'personal' },
            { id: 'personal_other', name: 'Other', categoryId: 'personal' },
          ];
          needsUpdate = true;
        }
        // Ensure all categories have subcategories array initialized
        if (!category.subcategories) {
          category.subcategories = [];
        }
        return category;
      });
      
      // Save normalized categories if Personal category was missing subcategories
      if (needsUpdate) {
        await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(normalizedCategories));
        console.log('[StorageService] Migrated Personal category to include subcategories');
      }
      
      return normalizedCategories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  static async saveCategories(categories: Category[]) {
    try {
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Error saving categories:', error);
      throw error;
    }
  }

  static async addSubcategory(categoryId: string, subcategory: Omit<Subcategory, 'id' | 'categoryId'>) {
    try {
      const categories = await this.getCategories();
      const categoryIndex = categories.findIndex(c => c.id === categoryId);

      if (categoryIndex !== -1) {
        const newSubcategory: Subcategory = {
          ...subcategory,
          id: `${categoryId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          categoryId,
        };

        if (!categories[categoryIndex].subcategories) {
          categories[categoryIndex].subcategories = [];
        }

        categories[categoryIndex].subcategories!.push(newSubcategory);
        await this.saveCategories(categories);
        return newSubcategory;
      }
      throw new Error('Category not found');
    } catch (error) {
      console.error('Error adding subcategory:', error);
      throw error;
    }
  }

  static async restorePersonalSubcategories() {
    try {
      const categories = await this.getCategories();
      const personalIndex = categories.findIndex(c => c.id === 'personal');

      if (personalIndex !== -1) {
        categories[personalIndex].subcategories = [
          { id: 'personal_transport', name: 'Transport', categoryId: 'personal' },
          { id: 'personal_food', name: 'Food', categoryId: 'personal' },
          { id: 'personal_entertainment', name: 'Entertainment', categoryId: 'personal' },
          { id: 'personal_healthcare', name: 'Healthcare', categoryId: 'personal' },
          { id: 'personal_shopping', name: 'Shopping', categoryId: 'personal' },
          { id: 'personal_utilities', name: 'Utilities', categoryId: 'personal' },
          { id: 'personal_education', name: 'Education', categoryId: 'personal' },
          { id: 'personal_other', name: 'Other', categoryId: 'personal' },
        ];
        await this.saveCategories(categories);
        console.log('Restored Personal category subcategories');
      }
    } catch (error) {
      console.error('Error restoring Personal subcategories:', error);
      throw error;
    }
  }

  static async addCategory(category: Category) {
    try {
      const categories = await this.getCategories();
      categories.push(category);
      await this.saveCategories(categories);

      // Sync with Google Sheets if auto-backup is enabled
      if (this.isAutoBackupEnabled()) {
        this.syncToGoogleSheets();
      }

      return category;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  static async updateCategory(category: Category) {
    try {
      const categories = await this.getCategories();
      const index = categories.findIndex(c => c.id === category.id);

      if (index !== -1) {
        categories[index] = category;
        await this.saveCategories(categories);
        return category;
      }
      throw new Error('Category not found');
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  static async deleteSubcategory(categoryId: string, subcategoryId: string) {
    try {
      const categories = await this.getCategories();
      const categoryIndex = categories.findIndex(c => c.id === categoryId);

      if (categoryIndex !== -1 && categories[categoryIndex].subcategories) {
        categories[categoryIndex].subcategories = categories[categoryIndex].subcategories!.filter(
          s => s.id !== subcategoryId
        );
        await this.saveCategories(categories);
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      throw error;
    }
  }

  // Income Category Management
  static async getIncomeCategories(): Promise<IncomeCategory[]> {
    try {
      const categoriesJson = await AsyncStorage.getItem(INCOME_CATEGORIES_KEY);
      if (!categoriesJson) return [];
      return JSON.parse(categoriesJson);
    } catch (error) {
      console.error('Error getting income categories:', error);
      return [];
    }
  }

  static async saveIncomeCategories(categories: IncomeCategory[]) {
    try {
      await AsyncStorage.setItem(INCOME_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Error saving income categories:', error);
      throw error;
    }
  }

  static async saveIncomeCategory(category: IncomeCategory) {
    try {
      const categories = await this.getIncomeCategories();
      const existingIndex = categories.findIndex(c => c.id === category.id);
      if (existingIndex !== -1) {
        categories[existingIndex] = category;
      } else {
        categories.push(category);
      }
      await this.saveIncomeCategories(categories);

      // Sync with Google Sheets if auto-backup is enabled
      if (this.isAutoBackupEnabled()) {
        this.scheduleBackup();
      }

      return category;
    } catch (error) {
      console.error('Error saving income category:', error);
      throw error;
    }
  }

  static async updateIncomeCategory(category: IncomeCategory) {
    try {
      const categories = await this.getIncomeCategories();
      const index = categories.findIndex(c => c.id === category.id);

      if (index !== -1) {
        categories[index] = category;
        await this.saveIncomeCategories(categories);

        // Sync with Google Sheets if auto-backup is enabled
        if (this.isAutoBackupEnabled()) {
          this.scheduleBackup();
        }

        return category;
      }
      throw new Error('Income category not found');
    } catch (error) {
      console.error('Error updating income category:', error);
      throw error;
    }
  }

  static async deleteIncomeCategory(categoryId: string) {
    try {
      const categories = await this.getIncomeCategories();
      const filtered = categories.filter(c => c.id !== categoryId);
      await this.saveIncomeCategories(filtered);

      // Sync with Google Sheets if auto-backup is enabled
      if (this.isAutoBackupEnabled()) {
        this.scheduleBackup();
      }
    } catch (error) {
      console.error('Error deleting income category:', error);
      throw error;
    }
  }

  // Loan Management
  static async saveLoan(loan: Omit<Loan, 'id' | 'dateCreated' | 'localId' | 'syncStatus'>) {
    try {
      const loans = await this.getLoans();
      const newLoan: Loan = {
        ...loan,
        id: Date.now().toString(),
        dateCreated: new Date().toISOString(),
        localId: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        syncStatus: 'pending',
        history: [], // Initialize history array for new loans
      };
      loans.push(newLoan);
      await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(loans));

      // Trigger auto backup
      this.scheduleBackup();

      return newLoan;
    } catch (error) {
      console.error('Error saving loan:', error);
      throw error;
    }
  }

  static async getLoans(): Promise<Loan[]> {
    try {
      const loansJson = await AsyncStorage.getItem(LOANS_KEY);
      if (!loansJson) return [];
      
      const loans: Loan[] = JSON.parse(loansJson);
      
      // Ensure all loans have history arrays initialized and valid dates (migration for existing loans)
      let needsUpdate = false;
      const normalizedLoans = loans.map(loan => {
        const normalizedLoan = { ...loan };
        
        // Ensure history array exists
        if (!normalizedLoan.history) {
          normalizedLoan.history = [];
          needsUpdate = true;
        }
        
        // Fix invalid dateCreated
        if (!normalizedLoan.dateCreated || isNaN(new Date(normalizedLoan.dateCreated).getTime())) {
          console.warn(`[StorageService] Loan ${normalizedLoan.id} has invalid dateCreated, fixing...`);
          normalizedLoan.dateCreated = new Date().toISOString();
          needsUpdate = true;
        }
        
        // Fix invalid dateFulfilled
        if (normalizedLoan.dateFulfilled && isNaN(new Date(normalizedLoan.dateFulfilled).getTime())) {
          console.warn(`[StorageService] Loan ${normalizedLoan.id} has invalid dateFulfilled, fixing...`);
          normalizedLoan.dateFulfilled = new Date().toISOString();
          needsUpdate = true;
        }
        
        // Fix invalid dates in history entries
        if (normalizedLoan.history) {
          normalizedLoan.history = normalizedLoan.history.map(entry => {
            if (!entry.date || isNaN(new Date(entry.date).getTime())) {
              console.warn(`[StorageService] Loan ${normalizedLoan.id} has invalid history date, fixing...`);
              return { ...entry, date: new Date().toISOString() };
            }
            return entry;
          });
        }
        
        return normalizedLoan;
      });
      
      // Save normalized loans if any were fixed
      if (needsUpdate) {
        await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(normalizedLoans));
        console.log('[StorageService] Migrated loans to fix invalid data');
      }
      
      return normalizedLoans;
    } catch (error) {
      console.error('Error getting loans:', error);
      return [];
    }
  }

  static async updateLoan(id: string, updates: Partial<Loan>) {
    try {
      const loans = await this.getLoans();
      const index = loans.findIndex(l => l.id === id);
      if (index !== -1) {
        const currentLoan = loans[index];

        // Create history entry if amount or description is being changed
        const historyEntry: LoanHistoryEntry | null =
          (updates.amount !== undefined && updates.amount !== currentLoan.amount) ||
            (updates.description !== undefined && updates.description !== currentLoan.description)
            ? {
              date: new Date().toISOString(),
              ...(updates.amount !== undefined && updates.amount !== currentLoan.amount
                ? { amount: updates.amount, previousAmount: currentLoan.amount }
                : {}),
              ...(updates.description !== undefined && updates.description !== currentLoan.description
                ? { description: updates.description, previousDescription: currentLoan.description }
                : {}),
            }
            : null;

        // Initialize history array if it doesn't exist
        if (!currentLoan.history) {
          currentLoan.history = [];
        }

        // Add history entry if there are changes to track
        if (historyEntry) {
          currentLoan.history.push(historyEntry);
          console.log(`[StorageService] Added history entry to loan ${id}:`, historyEntry);
        }

        // Handle history preservation - if updates contains history, use it (could be from sync/fix)
        // Otherwise preserve existing history
        let finalHistory: LoanHistoryEntry[];
        if (updates.history !== undefined) {
          // Updates explicitly provide history - use it (but ensure it's an array)
          finalHistory = Array.isArray(updates.history) ? [...updates.history] : (currentLoan.history || []);
        } else {
          // No history in updates - preserve existing history
          finalHistory = [...(currentLoan.history || [])];
        }

        // Apply updates - explicitly preserve history array
        loans[index] = { 
          ...currentLoan, 
          ...updates,
          history: finalHistory // Ensure history is preserved with correct array
        };
        
        console.log(`[StorageService] Updated loan ${id}, history entries: ${finalHistory.length}`);

        if (updates.status === 'fulfilled' && !loans[index].dateFulfilled) {
          loans[index].dateFulfilled = new Date().toISOString();
        }

        // Mark as pending sync to prioritize local changes
        loans[index].syncStatus = 'pending';

        await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(loans));
        console.log(`[StorageService] Updated loan ${id} with status: ${updates.status || currentLoan.status}, history entries: ${loans[index].history?.length || 0}`);
        if (historyEntry) {
          console.log(`[StorageService] History entry details:`, JSON.stringify(historyEntry));
        }

        // Trigger backup to sync changes to sheets
        this.scheduleBackup();

        return loans[index];
      }
      throw new Error('Loan not found');
    } catch (error) {
      console.error('Error updating loan:', error);
      throw error;
    }
  }

  static async deleteLoan(id: string) {
    try {
      const loans = await this.getLoans();
      const filtered = loans.filter(l => l.id !== id);
      await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(filtered));

      // Track deletion for sync
      await this.trackDeletion('loan', id);
      this.scheduleBackup();
    } catch (error) {
      console.error('Error deleting loan:', error);
      throw error;
    }
  }

  // Income Management
  static async saveIncome(income: Omit<Income, 'id' | 'timestamp' | 'localId' | 'syncStatus'>) {
    try {
      const incomes = await this.getIncome();
      const newIncome: Income = {
        ...income,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        date: income.date || new Date().toISOString().split('T')[0],
        localId: `income_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        syncStatus: 'pending',
      };
      incomes.push(newIncome);
      await AsyncStorage.setItem(INCOME_KEY, JSON.stringify(incomes));

      // Trigger auto backup
      this.scheduleBackup();

      return newIncome;
    } catch (error) {
      console.error('Error saving income:', error);
      throw error;
    }
  }

  static async getIncome(): Promise<Income[]> {
    try {
      const incomeJson = await AsyncStorage.getItem(INCOME_KEY);
      return incomeJson ? JSON.parse(incomeJson) : [];
    } catch (error) {
      console.error('Error getting income:', error);
      return [];
    }
  }

  static async getIncomeByMonth(year: number, month: number): Promise<Income[]> {
    try {
      const allIncome = await this.getIncome();
      return allIncome.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getFullYear() === year && incomeDate.getMonth() === month;
      });
    } catch (error) {
      console.error('Error getting income by month:', error);
      return [];
    }
  }

  static async getIncomeByYear(year: number): Promise<Income[]> {
    try {
      const allIncome = await this.getIncome();
      return allIncome.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getFullYear() === year;
      });
    } catch (error) {
      console.error('Error getting income by year:', error);
      return [];
    }
  }

  static async getIncomeByCategory(categoryId: string, year?: number, month?: number): Promise<Income[]> {
    try {
      let income = await this.getIncome();
      
      // Filter by category
      income = income.filter(i => i.category === categoryId);
      
      // Filter by year if provided
      if (year !== undefined) {
        income = income.filter(i => {
          const incomeDate = new Date(i.date);
          return incomeDate.getFullYear() === year;
        });
      }
      
      // Filter by month if provided
      if (month !== undefined) {
        income = income.filter(i => {
          const incomeDate = new Date(i.date);
          return incomeDate.getMonth() === month;
        });
      }
      
      return income;
    } catch (error) {
      console.error('Error getting income by category:', error);
      return [];
    }
  }

  static async getMonthlyIncomeTotal(year: number, month: number, categoryIds?: string[]): Promise<number> {
    try {
      let income = await this.getIncomeByMonth(year, month);
      
      // Filter by categories if provided
      if (categoryIds && categoryIds.length > 0) {
        income = income.filter(i => categoryIds.includes(i.category));
      }
      
      return income.reduce((sum, i) => sum + i.amount, 0);
    } catch (error) {
      console.error('Error getting monthly income total:', error);
      return 0;
    }
  }

  static async getYearlyIncomeTotal(year: number, categoryIds?: string[]): Promise<number> {
    try {
      let income = await this.getIncomeByYear(year);
      
      // Filter by categories if provided
      if (categoryIds && categoryIds.length > 0) {
        income = income.filter(i => categoryIds.includes(i.category));
      }
      
      return income.reduce((sum, i) => sum + i.amount, 0);
    } catch (error) {
      console.error('Error getting yearly income total:', error);
      return 0;
    }
  }

  static async updateIncome(id: string, updates: Partial<Income>) {
    try {
      const incomes = await this.getIncome();
      const index = incomes.findIndex(i => i.id === id);
      if (index !== -1) {
        incomes[index] = { ...incomes[index], ...updates, syncStatus: 'pending' };
        await AsyncStorage.setItem(INCOME_KEY, JSON.stringify(incomes));
        this.scheduleBackup();
        return incomes[index];
      }
      throw new Error('Income not found');
    } catch (error) {
      console.error('Error updating income:', error);
      throw error;
    }
  }

  static async deleteIncome(id: string) {
    try {
      const incomes = await this.getIncome();
      const filtered = incomes.filter(i => i.id !== id);
      await AsyncStorage.setItem(INCOME_KEY, JSON.stringify(filtered));

      // Track deletion for sync
      await this.trackDeletion('income', id);
      this.scheduleBackup();
    } catch (error) {
      console.error('Error deleting income:', error);
      throw error;
    }
  }

  // Comparison Preferences
  static async saveComparisonIncomeCategories(categoryIds: string[]) {
    try {
      await AsyncStorage.setItem(COMPARISON_INCOME_CATEGORIES_KEY, JSON.stringify(categoryIds));
    } catch (error) {
      console.error('Error saving comparison income categories:', error);
      throw error;
    }
  }

  static async getComparisonIncomeCategories(): Promise<string[]> {
    try {
      const categoriesJson = await AsyncStorage.getItem(COMPARISON_INCOME_CATEGORIES_KEY);
      return categoriesJson ? JSON.parse(categoriesJson) : [];
    } catch (error) {
      console.error('Error getting comparison income categories:', error);
      return [];
    }
  }

  static async saveComparisonExpenseCategories(categoryIds: string[]) {
    try {
      await AsyncStorage.setItem(COMPARISON_EXPENSE_CATEGORIES_KEY, JSON.stringify(categoryIds));
    } catch (error) {
      console.error('Error saving comparison expense categories:', error);
      throw error;
    }
  }

  static async getComparisonExpenseCategories(): Promise<string[]> {
    try {
      const categoriesJson = await AsyncStorage.getItem(COMPARISON_EXPENSE_CATEGORIES_KEY);
      return categoriesJson ? JSON.parse(categoriesJson) : [];
    } catch (error) {
      console.error('Error getting comparison expense categories:', error);
      return [];
    }
  }

  // User Management
  static async getUsers(): Promise<User[]> {
    try {
      const users = await AsyncStorage.getItem(USERS_KEY);
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  static async saveUser(user: User) {
    try {
      const users = await this.getUsers();
      const existingIndex = users.findIndex(u => u.id === user.id);

      if (existingIndex !== -1) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }

      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      return user;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<string> {
    try {
      const userId = await AsyncStorage.getItem(CURRENT_USER_KEY);
      return userId || 'default_user';
    } catch (error) {
      console.error('Error getting current user:', error);
      return 'default_user';
    }
  }

  static async setCurrentUser(userId: string) {
    try {
      await AsyncStorage.setItem(CURRENT_USER_KEY, userId);
    } catch (error) {
      console.error('Error setting current user:', error);
      throw error;
    }
  }

  // ZT (Zakat Tracking) Management
  static async getZTBalances(): Promise<ZTBalance[]> {
    try {
      const balances = await AsyncStorage.getItem(ZT_BALANCES_KEY);
      return balances ? JSON.parse(balances) : [];
    } catch (error) {
      console.error('Error getting ZT balances:', error);
      return [];
    }
  }

  static async addZTBalance(balance: Omit<ZTBalance, 'id' | 'dateAdded'>): Promise<ZTBalance> {
    try {
      const balances = await this.getZTBalances();
      const newBalance: ZTBalance = {
        ...balance,
        id: `zt_bal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dateAdded: new Date().toISOString(),
      };
      balances.push(newBalance);
      await AsyncStorage.setItem(ZT_BALANCES_KEY, JSON.stringify(balances));
      return newBalance;
    } catch (error) {
      console.error('Error adding ZT balance:', error);
      throw error;
    }
  }

  static async deleteZTBalance(id: string) {
    try {
      const balances = await this.getZTBalances();
      const filtered = balances.filter(b => b.id !== id);
      await AsyncStorage.setItem(ZT_BALANCES_KEY, JSON.stringify(filtered));

      // Track deletion for sync
      await this.trackDeletion('zt_balance', id);
      this.scheduleBackup();
    } catch (error) {
      console.error('Error deleting ZT balance:', error);
      throw error;
    }
  }

  static async getZTPayments(): Promise<ZTPayment[]> {
    try {
      const payments = await AsyncStorage.getItem(ZT_PAYMENTS_KEY);
      return payments ? JSON.parse(payments) : [];
    } catch (error) {
      console.error('Error getting ZT payments:', error);
      return [];
    }
  }

  static async addZTPayment(payment: Omit<ZTPayment, 'id' | 'date'>): Promise<ZTPayment> {
    try {
      const payments = await this.getZTPayments();
      const newPayment: ZTPayment = {
        ...payment,
        id: `zt_pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString(),
      };
      payments.push(newPayment);
      await AsyncStorage.setItem(ZT_PAYMENTS_KEY, JSON.stringify(payments));
      return newPayment;
    } catch (error) {
      console.error('Error adding ZT payment:', error);
      throw error;
    }
  }

  static async deleteZTPayment(id: string) {
    try {
      const payments = await this.getZTPayments();
      const filtered = payments.filter(p => p.id !== id);
      await AsyncStorage.setItem(ZT_PAYMENTS_KEY, JSON.stringify(filtered));

      // Track deletion for sync
      await this.trackDeletion('zt_payment', id);
      this.scheduleBackup();
    } catch (error) {
      console.error('Error deleting ZT payment:', error);
      throw error;
    }
  }

  static async saveAllZTBalances(balances: ZTBalance[]) {
    try {
      await AsyncStorage.setItem(ZT_BALANCES_KEY, JSON.stringify(balances));
    } catch (error) {
      console.error('Error saving all ZT balances:', error);
      throw error;
    }
  }

  static async saveAllZTPayments(payments: ZTPayment[]) {
    try {
      await AsyncStorage.setItem(ZT_PAYMENTS_KEY, JSON.stringify(payments));
    } catch (error) {
      console.error('Error saving all ZT payments:', error);
      throw error;
    }
  }

  // Deletion tracking methods
  static async trackDeletion(type: 'expense' | 'loan' | 'zt_balance' | 'zt_payment', id: string) {
    try {
      const deletionsStr = await AsyncStorage.getItem(DELETED_ITEMS_KEY);
      const deletions = deletionsStr ? JSON.parse(deletionsStr) : {};

      if (!deletions[type]) {
        deletions[type] = [];
      }

      // Add to deletion list if not already there
      if (!deletions[type].includes(id)) {
        deletions[type].push(id);
      }

      await AsyncStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(deletions));
    } catch (error) {
      console.error('Error tracking deletion:', error);
    }
  }

  static async getDeletedItems(): Promise<Record<string, string[]>> {
    try {
      const deletionsStr = await AsyncStorage.getItem(DELETED_ITEMS_KEY);
      return deletionsStr ? JSON.parse(deletionsStr) : {};
    } catch (error) {
      console.error('Error getting deleted items:', error);
      return {};
    }
  }

  static async clearDeletedItems() {
    try {
      await AsyncStorage.removeItem(DELETED_ITEMS_KEY);
    } catch (error) {
      console.error('Error clearing deleted items:', error);
    }
  }

  // Clear all data
  static async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        EXPENSES_KEY,
        CATEGORIES_KEY,
        LOANS_KEY,
        USERS_KEY,
        CURRENT_USER_KEY,
        ZT_BALANCES_KEY,
        ZT_PAYMENTS_KEY,
      ]);
      await this.init();
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  // Auto Backup Methods
  static async enableAutoBackup() {
    this.autoBackupEnabled = true;
    await GoogleSheetsService.initialize();
  }

  static async disableAutoBackup() {
    this.autoBackupEnabled = false;
  }

  static isAutoBackupEnabled() {
    return this.autoBackupEnabled;
  }

  private static scheduleBackup() {
    if (!this.autoBackupEnabled) return;

    // Add to backup queue
    this.backupQueue.push(async () => {
      try {
        const [expenses, loans, categories] = await Promise.all([
          this.getExpenses(),
          this.getLoans(),
          this.getCategories(),
        ]);

        // Use bidirectional sync to preserve manual sheet edits
        const result = await GoogleSheetsService.performBidirectionalSync();
        console.log('Auto backup completed successfully:', result.message);
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    });

    // Process queue if not already processing
    if (!this.isProcessingBackup) {
      this.processBackupQueue();
    }
  }

  private static async processBackupQueue() {
    if (this.isProcessingBackup || this.backupQueue.length === 0) return;

    this.isProcessingBackup = true;

    // Wait a bit to batch multiple changes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Process all pending backups (only execute the last one)
    while (this.backupQueue.length > 0) {
      const backup = this.backupQueue.pop();
      if (backup && this.backupQueue.length === 0) {
        await backup();
      }
    }

    this.isProcessingBackup = false;
  }

  static async manualBackup(): Promise<boolean> {
    try {
      const [expenses, loans, categories] = await Promise.all([
        this.getExpenses(),
        this.getLoans(),
        this.getCategories(),
      ]);

      // Use bidirectional sync to preserve manual sheet edits
      const result = await GoogleSheetsService.performBidirectionalSync();
      return result.uploaded > 0 || result.downloaded > 0;
    } catch (error) {
      console.error('Manual backup failed:', error);
      return false;
    }
  }

  static async restoreFromBackup(): Promise<boolean> {
    try {
      const data = await GoogleSheetsService.restoreFromBackup();
      if (!data) return false;

      // Save restored data - use saveAllLoans to ensure proper normalization including history arrays
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(data.expenses));
      await this.saveAllLoans(data.loans); // Use saveAllLoans to ensure history arrays are properly initialized
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(data.categories));

      console.log(`[StorageService] Data restored successfully: ${data.expenses.length} expenses, ${data.loans.length} loans (${data.loans.filter(l => l.history && l.history.length > 0).length} with history), ${data.categories.length} categories`);
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }
}