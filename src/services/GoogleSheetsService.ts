import {Expense, ConflictItem, Loan, Category} from '../types';
import GoogleAuthService from './GoogleAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHEETS_API_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

interface SheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  createdAt: string;
}

export class GoogleSheetsService {
  private static sheetInfo: SheetInfo | null = null;

  static async initialize(): Promise<boolean> {
    try {
      const isSignedIn = await GoogleAuthService.isSignedIn();
      if (!isSignedIn) return false;

      // Check if we have a saved sheet
      const savedSheet = await AsyncStorage.getItem('@expense_tracker_sheet');
      if (savedSheet) {
        this.sheetInfo = JSON.parse(savedSheet);
        return true;
      }

      // Create a new sheet if none exists
      await this.createBackupSheet();
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
      return false;
    }
  }

  static async createBackupSheet(): Promise<void> {
    try {
      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) throw new Error('No access token');

      const user = await GoogleAuthService.getCurrentUser();
      if (!user) throw new Error('No user signed in');

      const sheetTitle = `ExpenseTracker_Backup_${user.email.split('@')[0]}`;

      // Create spreadsheet
      const createResponse = await fetch(SHEETS_API_BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: sheetTitle,
          },
          sheets: [
            {
              properties: {
                sheetId: 0,
                title: 'Expenses',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10,
                },
              },
            },
            {
              properties: {
                sheetId: 1,
                title: 'Loans',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 8,
                },
              },
            },
            {
              properties: {
                sheetId: 2,
                title: 'Categories',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 5,
                },
              },
            },
            {
              properties: {
                sheetId: 3,
                title: 'Metadata',
                gridProperties: {
                  rowCount: 10,
                  columnCount: 3,
                },
              },
            },
          ],
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create spreadsheet');
      }

      const spreadsheet = await createResponse.json();

      // Set up headers for each sheet
      await this.setupSheetHeaders(spreadsheet.spreadsheetId, accessToken);

      // Save sheet info
      this.sheetInfo = {
        spreadsheetId: spreadsheet.spreadsheetId,
        spreadsheetUrl: spreadsheet.spreadsheetUrl,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('@expense_tracker_sheet', JSON.stringify(this.sheetInfo));

      console.log('Created backup sheet:', spreadsheet.spreadsheetUrl);
    } catch (error) {
      console.error('Failed to create backup sheet:', error);
      throw error;
    }
  }

  private static async setupSheetHeaders(spreadsheetId: string, accessToken: string): Promise<void> {
    const batchUpdateRequest = {
      requests: [
        // Expenses headers
        {
          updateCells: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 8,
            },
            rows: [
              {
                values: [
                  {userEnteredValue: {stringValue: 'ID'}},
                  {userEnteredValue: {stringValue: 'Date'}},
                  {userEnteredValue: {stringValue: 'Amount'}},
                  {userEnteredValue: {stringValue: 'Category'}},
                  {userEnteredValue: {stringValue: 'Description'}},
                  {userEnteredValue: {stringValue: 'Currency'}},
                  {userEnteredValue: {stringValue: 'Timestamp'}},
                  {userEnteredValue: {stringValue: 'SyncStatus'}},
                ],
              },
            ],
            fields: 'userEnteredValue',
          },
        },
        // Loans headers
        {
          updateCells: {
            range: {
              sheetId: 1,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            rows: [
              {
                values: [
                  {userEnteredValue: {stringValue: 'ID'}},
                  {userEnteredValue: {stringValue: 'Person'}},
                  {userEnteredValue: {stringValue: 'Amount'}},
                  {userEnteredValue: {stringValue: 'Type'}},
                  {userEnteredValue: {stringValue: 'Date'}},
                  {userEnteredValue: {stringValue: 'Status'}},
                  {userEnteredValue: {stringValue: 'Notes'}},
                ],
              },
            ],
            fields: 'userEnteredValue',
          },
        },
        // Categories headers
        {
          updateCells: {
            range: {
              sheetId: 2,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            rows: [
              {
                values: [
                  {userEnteredValue: {stringValue: 'ID'}},
                  {userEnteredValue: {stringValue: 'Name'}},
                  {userEnteredValue: {stringValue: 'Budget'}},
                  {userEnteredValue: {stringValue: 'Color'}},
                ],
              },
            ],
            fields: 'userEnteredValue',
          },
        },
        // Metadata
        {
          updateCells: {
            range: {
              sheetId: 3,
              startRowIndex: 0,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            rows: [
              {
                values: [
                  {userEnteredValue: {stringValue: 'Key'}},
                  {userEnteredValue: {stringValue: 'Value'}},
                ],
              },
              {
                values: [
                  {userEnteredValue: {stringValue: 'LastSync'}},
                  {userEnteredValue: {stringValue: new Date().toISOString()}},
                ],
              },
            ],
            fields: 'userEnteredValue',
          },
        },
        // Format headers as bold
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true,
                },
                backgroundColor: {
                  red: 0.9,
                  green: 0.9,
                  blue: 0.95,
                },
              },
            },
            fields: 'userEnteredFormat.textFormat.bold,userEnteredFormat.backgroundColor',
          },
        },
      ],
    };

    const response = await fetch(`${SHEETS_API_BASE_URL}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchUpdateRequest),
    });

    if (!response.ok) {
      throw new Error('Failed to setup sheet headers');
    }
  }

  static async syncExpenses(expenses: Expense[]): Promise<boolean> {
    try {
      if (!this.sheetInfo) {
        await this.initialize();
        if (!this.sheetInfo) throw new Error('No sheet configured');
      }

      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) throw new Error('No access token');

      // Prepare expense data
      const values = expenses.map(expense => [
        expense.id,
        expense.date,
        expense.amount.toString(),
        expense.category || '',
        expense.description || '',
        expense.currency || 'DZD',
        expense.timestamp,
        'synced',
      ]);

      // Clear existing data and write new data
      const clearResponse = await fetch(
        `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Expenses!A2:H:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!clearResponse.ok) {
        console.warn('Failed to clear existing data');
      }

      // Write new data
      const updateResponse = await fetch(
        `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Expenses!A2:H?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: values,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update expenses');
      }

      // Update last sync time
      await this.updateLastSyncTime();

      return true;
    } catch (error) {
      console.error('Failed to sync expenses:', error);
      throw error;
    }
  }

  static async syncLoans(loans: Loan[]): Promise<boolean> {
    try {
      if (!this.sheetInfo) {
        await this.initialize();
        if (!this.sheetInfo) throw new Error('No sheet configured');
      }

      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) throw new Error('No access token');

      const values = loans.map(loan => [
        loan.id,
        loan.person,
        loan.amount.toString(),
        loan.type,
        loan.date,
        loan.status,
        loan.notes || '',
      ]);

      // Clear and update
      await fetch(
        `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Loans!A2:G:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const response = await fetch(
        `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Loans!A2:G?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: values,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to sync loans:', error);
      return false;
    }
  }

  static async syncCategories(categories: Category[]): Promise<boolean> {
    try {
      if (!this.sheetInfo) {
        await this.initialize();
        if (!this.sheetInfo) throw new Error('No sheet configured');
      }

      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) throw new Error('No access token');

      const values = categories.map(cat => [
        cat.id,
        cat.name,
        cat.budget?.toString() || '0',
        cat.color || '',
      ]);

      await fetch(
        `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Categories!A2:D:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const response = await fetch(
        `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Categories!A2:D?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: values,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to sync categories:', error);
      return false;
    }
  }

  static async syncAll(expenses: Expense[], loans: Loan[], categories: Category[]): Promise<boolean> {
    try {
      const [expensesResult, loansResult, categoriesResult] = await Promise.all([
        this.syncExpenses(expenses),
        this.syncLoans(loans),
        this.syncCategories(categories),
      ]);

      return expensesResult && loansResult && categoriesResult;
    } catch (error) {
      console.error('Failed to sync all data:', error);
      return false;
    }
  }

  private static async updateLastSyncTime(): Promise<void> {
    try {
      if (!this.sheetInfo) return;

      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) return;

      await fetch(
        `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Metadata!B2?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[new Date().toISOString()]],
          }),
        }
      );

      await AsyncStorage.setItem('@last_sync_time', new Date().toISOString());
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  static async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('@last_sync_time');
    } catch (error) {
      return null;
    }
  }

  static async getSheetUrl(): Promise<string | null> {
    if (this.sheetInfo) {
      return this.sheetInfo.spreadsheetUrl;
    }

    const savedSheet = await AsyncStorage.getItem('@expense_tracker_sheet');
    if (savedSheet) {
      const info = JSON.parse(savedSheet);
      return info.spreadsheetUrl;
    }

    return null;
  }

  static async restoreFromBackup(): Promise<{expenses: Expense[], loans: Loan[], categories: Category[]} | null> {
    try {
      if (!this.sheetInfo) {
        await this.initialize();
        if (!this.sheetInfo) throw new Error('No sheet configured');
      }

      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) throw new Error('No access token');

      // Fetch all data
      const [expensesRes, loansRes, categoriesRes] = await Promise.all([
        fetch(`${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Expenses!A2:H`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Loans!A2:G`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Categories!A2:D`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const [expensesData, loansData, categoriesData] = await Promise.all([
        expensesRes.json(),
        loansRes.json(),
        categoriesRes.json(),
      ]);

      // Parse expenses
      const expenses: Expense[] = (expensesData.values || []).map((row: any[]) => ({
        id: row[0],
        date: row[1],
        amount: parseFloat(row[2]),
        category: row[3],
        description: row[4],
        currency: row[5],
        timestamp: row[6],
        localId: row[0],
        type: 'expense',
        purpose: row[4],
      }));

      // Parse loans
      const loans: Loan[] = (loansData.values || []).map((row: any[]) => ({
        id: row[0],
        person: row[1],
        amount: parseFloat(row[2]),
        type: row[3] as 'given' | 'taken',
        date: row[4],
        status: row[5] as 'pending' | 'paid',
        notes: row[6],
      }));

      // Parse categories
      const categories: Category[] = (categoriesData.values || []).map((row: any[]) => ({
        id: row[0],
        name: row[1],
        budget: parseFloat(row[2]),
        color: row[3],
      }));

      return { expenses, loans, categories };
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return null;
    }
  }

  static async deleteSheet(): Promise<void> {
    try {
      await AsyncStorage.removeItem('@expense_tracker_sheet');
      await AsyncStorage.removeItem('@last_sync_time');
      this.sheetInfo = null;
    } catch (error) {
      console.error('Failed to delete sheet info:', error);
    }
  }
}

export default GoogleSheetsService;