import AsyncStorage from '@react-native-async-storage/async-storage';
import {Expense, Category, Subcategory, Loan, User} from '../types';
import GoogleSheetsService from './GoogleSheetsService';
import GoogleAuthService from './GoogleAuthService';

const EXPENSES_KEY = '@expenses';
const CATEGORIES_KEY = '@categories';
const LOANS_KEY = '@loans';
const USERS_KEY = '@users';
const CURRENT_USER_KEY = '@current_user';

export class StorageService {
  private static autoBackupEnabled = false;
  private static backupQueue: (() => Promise<void>)[] = [];
  private static isProcessingBackup = false;

  static async init() {
    // Initialize categories with predefined ones
    const categories = await this.getCategories();
    if (categories.length === 0) {
      await this.initializeDefaultCategories();
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
      await GoogleSheetsService.initialize();
    }
  }

  static async initializeDefaultCategories() {
    const defaultCategories: Category[] = [
      {id: 'villa', name: 'Villa', color: '#FF6B6B', subcategories: []},
      {id: 'khodem', name: 'Khodem', color: '#4ECDC4', subcategories: []},
      {id: 'apartment', name: 'Apartment', color: '#45B7D1', subcategories: []},
      {id: 'wahiba', name: 'Wahiba', color: '#96CEB4', subcategories: []},
      {id: 'khadija', name: 'Khadija', color: '#FFEAA7', subcategories: []},
      {id: 'youcef', name: 'Youcef', color: '#DDA0DD', subcategories: []},
      {id: 'syakhn', name: 'Syakhn', color: '#98D8C8', subcategories: []},
      {id: 'ouled_djellal', name: 'Ouled Djellal', color: '#FFB6C1', subcategories: []},
      {id: 'imane_djebabra', name: 'Imane Djebabra', color: '#87CEEB', subcategories: []},
      {id: 'a_milka', name: 'A Milka', color: '#DEB887', subcategories: []},
      {
        id: 'personal',
        name: 'Personal',
        color: '#667EEA',
        subcategories: [
          {id: 'transport', name: 'Transport', categoryId: 'personal'},
          {id: 'food', name: 'Food', categoryId: 'personal'},
          {id: 'entertainment', name: 'Entertainment', categoryId: 'personal'},
          {id: 'healthcare', name: 'Healthcare', categoryId: 'personal'},
          {id: 'shopping', name: 'Shopping', categoryId: 'personal'},
          {id: 'utilities', name: 'Utilities', categoryId: 'personal'},
          {id: 'education', name: 'Education', categoryId: 'personal'},
          {id: 'other', name: 'Other', categoryId: 'personal'},
        ],
      },
    ];

    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
    return defaultCategories;
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
      await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(loans));
    } catch (error) {
      console.error('Failed to save all loans:', error);
      throw error;
    }
  }

  static async saveAllCategories(categories: Category[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
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
      const categories = await AsyncStorage.getItem(CATEGORIES_KEY);
      return categories ? JSON.parse(categories) : [];
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
          id: `${categoryId}_${Date.now()}`,
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
      const loans = await AsyncStorage.getItem(LOANS_KEY);
      return loans ? JSON.parse(loans) : [];
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
        loans[index] = {...loans[index], ...updates};
        if (updates.status === 'fulfilled' && !loans[index].dateFulfilled) {
          loans[index].dateFulfilled = new Date().toISOString();
        }
        await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(loans));
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
    } catch (error) {
      console.error('Error deleting loan:', error);
      throw error;
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

  // Clear all data
  static async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        EXPENSES_KEY,
        CATEGORIES_KEY,
        LOANS_KEY,
        USERS_KEY,
        CURRENT_USER_KEY,
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

      // Save restored data
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(data.expenses));
      await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(data.loans));
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(data.categories));

      console.log('Data restored successfully from backup');
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }
}