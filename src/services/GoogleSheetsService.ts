import {Expense, ConflictItem, Loan, Category} from '../types';
import GoogleAuthService from './GoogleAuthService';
import {StorageService} from './StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHEETS_API_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

interface SheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  createdAt: string;
}

export interface SyncResult {
  uploaded: number;
  downloaded: number;
  conflicts: number;
  message: string;
}

export class GoogleSheetsService {
  private static sheetInfo: SheetInfo | null = null;
  private static initPromise: Promise<boolean> | null = null;
  private static isFirstSyncWithExistingSheet: boolean = false;

  static async initialize(): Promise<boolean> {
    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      console.log('[GoogleSheetsService] Init already in progress, waiting...');
      return await this.initPromise;
    }

    // Start new initialization
    this.initPromise = this._initializeInternal();

    try {
      const result = await this.initPromise;
      return result;
    } finally {
      this.initPromise = null;
    }
  }

  private static async _initializeInternal(): Promise<boolean> {
    try {
      console.log('[GoogleSheetsService] Initializing...');
      const isSignedIn = await GoogleAuthService.isSignedIn();
      console.log('[GoogleSheetsService] Is signed in:', isSignedIn);
      if (!isSignedIn) return false;

      // Check if we have a saved sheet
      const savedSheet = await AsyncStorage.getItem('@expense_tracker_sheet');
      console.log('[GoogleSheetsService] Saved sheet info:', savedSheet ? 'Found' : 'Not found');

      if (savedSheet) {
        this.sheetInfo = JSON.parse(savedSheet);
        console.log('[GoogleSheetsService] Checking saved sheet:', this.sheetInfo.spreadsheetId);

        // Verify sheet still exists and is accessible
        const sheetExists = await this.verifySheetExists();
        if (sheetExists) {
          console.log('[GoogleSheetsService] ✅ Saved sheet verified and accessible');
          console.log('[GoogleSheetsService] Sheet URL:', this.sheetInfo.spreadsheetUrl);
          return true;
        } else {
          console.log('[GoogleSheetsService] ⚠️ Saved sheet no longer exists or is not accessible');
          console.log('[GoogleSheetsService] Will search for other existing sheets before creating new...');
          await AsyncStorage.removeItem('@expense_tracker_sheet');
          this.sheetInfo = null;
        }
      }

      // ALWAYS try to find existing sheets first, even if saved sheet was invalid
      console.log('[GoogleSheetsService] 🔍 Searching for existing ExpenseTracker sheets...');
      const existingSheet = await this.findExistingSheet();
      if (existingSheet) {
        console.log('[GoogleSheetsService] ✅ Found existing sheet:', existingSheet.spreadsheetId);
        console.log('[GoogleSheetsService] Sheet URL:', existingSheet.spreadsheetUrl);
        this.sheetInfo = existingSheet;
        await AsyncStorage.setItem('@expense_tracker_sheet', JSON.stringify(this.sheetInfo));

        // Important: Mark this as first sync with existing sheet to prevent data clearing
        this.isFirstSyncWithExistingSheet = true;
        console.log('[GoogleSheetsService] 🔒 Using existing sheet - will preserve existing data on first sync');
        return true;
      }

      // Only create a new sheet if absolutely no sheets exist
      console.log('[GoogleSheetsService] ⚠️ No existing sheets found at all');
      console.log('[GoogleSheetsService] Creating new backup sheet...');
      await this.createBackupSheet();
      return true;
    } catch (error) {
      console.error('[GoogleSheetsService] Failed to initialize:', error);
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
              endColumnIndex: 9,
            },
            rows: [
              {
                values: [
                  {userEnteredValue: {stringValue: 'ID'}},
                  {userEnteredValue: {stringValue: 'Date'}},
                  {userEnteredValue: {stringValue: 'Amount'}},
                  {userEnteredValue: {stringValue: 'Category'}},
                  {userEnteredValue: {stringValue: 'Sub_Category'}},
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

  static async syncExpenses(expenses: Expense[], preserveExisting: boolean = false): Promise<boolean> {
    try {
      console.log('\n🔴 [syncExpenses] DIRECT CALL DETECTED');
      console.log('[syncExpenses] Caller should use performBidirectionalSync to preserve manual edits!');
      console.trace('[syncExpenses] Call stack:');

      if (!this.sheetInfo) {
        await this.initialize();
        if (!this.sheetInfo) throw new Error('No sheet configured');
      }

      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) throw new Error('No access token');

      console.log(`[syncExpenses] Syncing ${expenses.length} expenses to sheet`);
      console.log(`[syncExpenses] Preserve existing: ${preserveExisting}`);

      // Only clear existing data if we should NOT preserve it
      if (!this.isFirstSyncWithExistingSheet && !preserveExisting) {
        console.log('[syncExpenses] ⚠️ Clearing existing sheet data before sync...');
        const clearResponse = await fetch(
          `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Expenses!A2:I:clear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!clearResponse.ok) {
          console.warn('[syncExpenses] Failed to clear existing data:', clearResponse.status);
        }
      } else {
        console.log('[syncExpenses] ✅ Preserving existing sheet data');
        // Reset the flag after first sync
        if (this.isFirstSyncWithExistingSheet) {
          this.isFirstSyncWithExistingSheet = false;
        }
      }

      // Only write data if we have expenses
      if (expenses.length > 0) {
        // Prepare expense data
        const values = expenses.map(expense => [
          expense.id || expense.localId || '',
          expense.date || new Date().toISOString().split('T')[0],
          (expense.amount || 0).toString(),
          expense.category || '',
          expense.subcategory || '',
          expense.description || expense.purpose || '',
          expense.currency || 'DZD',
          expense.timestamp || new Date().toISOString(),
          'synced',
        ]);

        // Write new data
        const updateResponse = await fetch(
          `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Expenses!A2:I?valueInputOption=USER_ENTERED`,
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
          const errorText = await updateResponse.text();
          console.error('[syncExpenses] Update failed:', errorText);
          throw new Error('Failed to update expenses');
        }

        console.log('[syncExpenses] Successfully synced expenses');
      } else {
        console.log('[syncExpenses] No expenses to sync');
      }

      // Update last sync time
      await this.updateLastSyncTime();

      return true;
    } catch (error) {
      console.error('[syncExpenses] Failed to sync expenses:', error);
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
      console.log('[syncAll] WARNING: This method bypasses manual edit detection!');
      console.log('[syncAll] Should use performBidirectionalSync instead');

      // DO NOT directly sync - use bidirectional sync to preserve manual edits
      const result = await this.performBidirectionalSync();
      return result.uploaded > 0 || result.downloaded > 0;
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

  static async getSheetInfo(): Promise<{id: string, url: string, created: string} | null> {
    if (this.sheetInfo) {
      return {
        id: this.sheetInfo.spreadsheetId,
        url: this.sheetInfo.spreadsheetUrl,
        created: this.sheetInfo.createdAt,
      };
    }

    const savedSheet = await AsyncStorage.getItem('@expense_tracker_sheet');
    if (savedSheet) {
      const info = JSON.parse(savedSheet);
      return {
        id: info.spreadsheetId,
        url: info.spreadsheetUrl,
        created: info.createdAt,
      };
    }

    return null;
  }

  static async performBidirectionalSync(): Promise<SyncResult> {
    const result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      message: 'Sync completed',
    };

    try {
      console.log('[Sync] ↔️ Starting bidirectional sync...');

      if (!this.sheetInfo) {
        console.log('[Sync] No sheet info, initializing...');
        await this.initialize();
        if (!this.sheetInfo) throw new Error('No sheet configured');
      }

      // If this is first sync with existing sheet, ensure we download data first
      if (this.isFirstSyncWithExistingSheet) {
        console.log('[Sync] 🔒 First sync with existing sheet - will merge with existing data');
        console.log('[Sync] Remote data will be preserved and merged with local data');
      }

      const accessToken = await GoogleAuthService.getAccessToken();
      console.log('[Sync] Access token:', accessToken ? 'Retrieved' : 'Missing');
      if (!accessToken) throw new Error('No access token');

      // Get local data
      console.log('[Sync] Fetching local data...');
      const [localExpenses, localLoans, localCategories] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getLoans(),
        StorageService.getCategories(),
      ]);
      console.log(`[Sync] Local data: ${localExpenses.length} expenses, ${localLoans.length} loans, ${localCategories.length} categories`);

      // Get remote data from sheets FIRST (priority for manual edits)
      console.log('[Sync] 📥 Fetching remote data from sheets (checking for manual edits)...');
      const remoteData = await this.fetchRemoteData();
      if (!remoteData) {
        console.error('[Sync] Failed to fetch remote data');
        throw new Error('Failed to fetch remote data');
      }
      console.log(`[Sync] Remote data found: ${remoteData.expenses.length} expenses, ${remoteData.loans.length} loans, ${remoteData.categories.length} categories`);

      // If remote has data but local doesn't, this might be a restore scenario
      if (remoteData.expenses.length > 0 && localExpenses.length === 0) {
        console.log('[Sync] 📥 Remote has data but local is empty - importing all from sheet');
      }

      // Merge expenses
      console.log('[Sync] Merging expenses...');
      const expenseMergeResult = await this.mergeExpenses(
        localExpenses,
        remoteData.expenses
      );
      result.uploaded += expenseMergeResult.uploaded;
      result.downloaded += expenseMergeResult.downloaded;
      result.conflicts += expenseMergeResult.conflicts;
      console.log(`[Sync] Expense merge: ${expenseMergeResult.uploaded} uploaded, ${expenseMergeResult.downloaded} downloaded, ${expenseMergeResult.conflicts} conflicts`);

      // Merge loans
      const loanMergeResult = await this.mergeLoans(
        localLoans,
        remoteData.loans
      );
      result.uploaded += loanMergeResult.uploaded;
      result.downloaded += loanMergeResult.downloaded;
      result.conflicts += loanMergeResult.conflicts;

      // Merge categories
      const categoryMergeResult = await this.mergeCategories(
        localCategories,
        remoteData.categories
      );
      result.uploaded += categoryMergeResult.uploaded;
      result.downloaded += categoryMergeResult.downloaded;

      // Update last sync time
      await this.updateLastSyncTime();

      // Generate result message
      if (result.conflicts > 0) {
        result.message = `Sync completed with ${result.conflicts} conflicts resolved`;
      } else if (result.uploaded > 0 && result.downloaded > 0) {
        result.message = `Synced: ${result.uploaded} uploaded, ${result.downloaded} downloaded`;
      } else if (result.uploaded > 0) {
        result.message = `Uploaded ${result.uploaded} items to Google Sheets`;
      } else if (result.downloaded > 0) {
        result.message = `Downloaded ${result.downloaded} items from Google Sheets`;
      } else {
        result.message = 'Everything is up to date';
      }

      return result;
    } catch (error) {
      console.error('Bidirectional sync failed:', error);
      throw error;
    }
  }

  private static async mergeExpenses(
    localExpenses: Expense[],
    remoteExpenses: Expense[]
  ): Promise<{uploaded: number; downloaded: number; conflicts: number}> {
    const result = {uploaded: 0, downloaded: 0, conflicts: 0};
    const localMap = new Map(localExpenses.map(e => [e.id || e.localId, e]));
    const remoteMap = new Map(remoteExpenses.map(e => [e.id, e]));
    const mergedExpenses: Expense[] = [];
    const processedIds = new Set<string>();

    console.log('\n========== MERGE EXPENSES DEBUG ==========');
    console.log('Local count:', localExpenses.length);
    console.log('Remote count:', remoteExpenses.length);

    // Helper function to create a content hash for comparison
    const getContentHash = (expense: Expense): string => {
      return `${expense.amount}|${expense.category}|${expense.subcategory || ''}|${expense.description || ''}|${expense.date}`;
    };

    // Store the last known state to detect manual edits
    const lastSyncState = await AsyncStorage.getItem('@last_sync_state');
    const lastKnownHashes = lastSyncState ? JSON.parse(lastSyncState) : {};

    console.log('[mergeExpenses] Starting merge:');
    console.log(`  Local expenses: ${localExpenses.length}`);
    console.log(`  Remote expenses: ${remoteExpenses.length}`);
    console.log(`  Last sync state: ${Object.keys(lastKnownHashes).length} items`);

    // Process ALL remote expenses first - they take priority for manual edits
    for (const remoteExpense of remoteExpenses) {
      const localExpense = localMap.get(remoteExpense.id);
      processedIds.add(remoteExpense.id);

      if (!localExpense) {
        // New expense from remote (manual addition in sheet)
        console.log(`  📥 NEW from sheet: ${remoteExpense.id}`);
        mergedExpenses.push(remoteExpense);
        result.downloaded++;
      } else {
        // Both have this expense - need to determine which is newer
        const localHash = getContentHash(localExpense);
        const remoteHash = getContentHash(remoteExpense);
        const lastKnownHash = lastKnownHashes[remoteExpense.id];

        console.log(`  Comparing expense ${remoteExpense.id}:`);
        console.log(`    Local hash: ${localHash.substring(0, 20)}...`);
        console.log(`    Remote hash: ${remoteHash.substring(0, 20)}...`);
        console.log(`    Last known: ${lastKnownHash ? lastKnownHash.substring(0, 20) + '...' : 'unknown'}`);

        // Decision logic:
        // 1. If remote changed from last known state -> manual edit in sheet, use remote
        // 2. If local changed from last known state but remote didn't -> local edit, use local
        // 3. If both changed -> conflict, prefer remote (manual sheet edit)
        // 4. If neither changed -> keep local

        const remoteChanged = lastKnownHash ? remoteHash !== lastKnownHash : false;
        const localChanged = lastKnownHash ? localHash !== lastKnownHash : false;
        const dataIsDifferent = localHash !== remoteHash;

        if (dataIsDifferent) {
          console.log(`    ⚠️ DATA DIFFERS for ${remoteExpense.id}`);
          console.log(`      Local: amount=${localExpense.amount}, cat=${localExpense.category}, subcat=${localExpense.subcategory || 'none'}`);
          console.log(`      Remote: amount=${remoteExpense.amount}, cat=${remoteExpense.category}, subcat=${remoteExpense.subcategory || 'none'}`);
          console.log(`      Local timestamp: ${localExpense.timestamp}`);
          console.log(`      Remote timestamp: ${remoteExpense.timestamp}`);

          // Compare timestamps to determine which is newer
          const localTime = new Date(localExpense.timestamp || '2000-01-01').getTime();
          const remoteTime = new Date(remoteExpense.timestamp || '2000-01-01').getTime();

          if (localTime > remoteTime) {
            // Local is newer - this is a local edit that needs to be uploaded
            console.log(`    📤 LOCAL is NEWER (edited in app) - keeping local`);
            mergedExpenses.push(localExpense);
            result.uploaded++;
          } else if (remoteTime > localTime) {
            // Remote is newer - could be from another device
            console.log(`    📥 REMOTE is NEWER - using remote`);
            mergedExpenses.push(remoteExpense);
            result.downloaded++;
          } else {
            // Same timestamp but different data - this is likely a manual sheet edit
            console.log(`    📥 SAME timestamp but DATA DIFFERS - assuming manual sheet edit`);
            mergedExpenses.push(remoteExpense);
            result.downloaded++;
          }
        } else {
          // Data is the same
          console.log(`    ✓ Data unchanged for ${localExpense.id}`);
          mergedExpenses.push(localExpense);
        }
      }
    }

    // Add remaining local expenses (new local items not in sheet)
    for (const [id, localExpense] of localMap.entries()) {
      if (!processedIds.has(id)) {
        console.log(`  📤 NEW local expense: ${id}`);
        mergedExpenses.push(localExpense);
        result.uploaded++;
      }
    }

    // Save the current state for future comparisons
    const newSyncState: Record<string, string> = {};
    for (const expense of mergedExpenses) {
      newSyncState[expense.id] = getContentHash(expense);
    }
    await AsyncStorage.setItem('@last_sync_state', JSON.stringify(newSyncState));

    console.log('[mergeExpenses] Merge complete:');
    console.log(`  Total merged: ${mergedExpenses.length}`);
    console.log(`  Downloaded: ${result.downloaded}`);
    console.log(`  Uploaded: ${result.uploaded}`);
    console.log(`  Conflicts: ${result.conflicts}`);

    // Save merged data locally
    await StorageService.saveAllExpenses(mergedExpenses);

    console.log('\n========== UPLOAD DECISION ==========');
    console.log('Result - Downloaded:', result.downloaded);
    console.log('Result - Uploaded:', result.uploaded);
    console.log('Result - Conflicts:', result.conflicts);

    // Determine if we should upload based on what changed
    const shouldUpload = result.uploaded > 0;  // We have local changes to push

    console.log('Should Upload?', shouldUpload);

    if (shouldUpload) {
      // We have local changes that need to be uploaded
      console.log('\n📤 Local changes detected - uploading to sheets...');
      await this.syncExpenses(mergedExpenses, false);
    } else if (result.downloaded > 0) {
      // Only downloaded changes, no need to upload
      console.log('\n📥 Only downloaded changes - no upload needed');
    } else {
      console.log('\n✅ No changes needed');
    }

    console.log('========== END MERGE ==========\n');

    return result;
  }

  private static async mergeLoans(
    localLoans: Loan[],
    remoteLoans: Loan[]
  ): Promise<{uploaded: number; downloaded: number; conflicts: number}> {
    const result = {uploaded: 0, downloaded: 0, conflicts: 0};
    const localMap = new Map(localLoans.map(l => [l.id, l]));
    const remoteMap = new Map(remoteLoans.map(l => [l.id, l]));
    const mergedLoans: Loan[] = [];

    // Process remote loans
    for (const remoteLoan of remoteLoans) {
      const localLoan = localMap.get(remoteLoan.id);

      if (!localLoan) {
        // New loan from remote
        mergedLoans.push(remoteLoan);
        result.downloaded++;
      } else {
        // Loan exists locally - use remote if status differs
        if (remoteLoan.status !== localLoan.status) {
          mergedLoans.push(remoteLoan);
          result.conflicts++;
        } else {
          mergedLoans.push(localLoan);
        }
        localMap.delete(remoteLoan.id);
      }
    }

    // Add remaining local loans
    for (const localLoan of localMap.values()) {
      mergedLoans.push(localLoan);
      result.uploaded++;
    }

    // Save merged data
    await StorageService.saveAllLoans(mergedLoans);
    await this.syncLoans(mergedLoans);

    return result;
  }

  private static async mergeCategories(
    localCategories: Category[],
    remoteCategories: Category[]
  ): Promise<{uploaded: number; downloaded: number}> {
    const result = {uploaded: 0, downloaded: 0};
    const localMap = new Map(localCategories.map(c => [c.id, c]));
    const remoteMap = new Map(remoteCategories.map(c => [c.id, c]));
    const mergedCategories: Category[] = [];

    // Add all remote categories
    for (const remoteCategory of remoteCategories) {
      mergedCategories.push(remoteCategory);
      if (!localMap.has(remoteCategory.id)) {
        result.downloaded++;
      }
      localMap.delete(remoteCategory.id);
    }

    // Add remaining local categories
    for (const localCategory of localMap.values()) {
      mergedCategories.push(localCategory);
      result.uploaded++;
    }

    // Save merged data
    await StorageService.saveAllCategories(mergedCategories);
    await this.syncCategories(mergedCategories);

    return result;
  }

  private static async fetchRemoteData(): Promise<{expenses: Expense[], loans: Loan[], categories: Category[]} | null> {
    try {
      if (!this.sheetInfo) {
        console.log('[fetchRemoteData] No sheet info available');
        return null;
      }

      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) {
        console.log('[fetchRemoteData] No access token available');
        return null;
      }

      console.log('[fetchRemoteData] Fetching from spreadsheet:', this.sheetInfo.spreadsheetId);

      // Fetch all data from sheets
      const [expensesRes, loansRes, categoriesRes] = await Promise.all([
        fetch(`${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Expenses!A2:I`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Loans!A2:G`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Categories!A2:D`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      console.log('[fetchRemoteData] API responses:', {
        expenses: `${expensesRes.status} ${expensesRes.ok ? 'OK' : 'FAILED'}`,
        loans: `${loansRes.status} ${loansRes.ok ? 'OK' : 'FAILED'}`,
        categories: `${categoriesRes.status} ${categoriesRes.ok ? 'OK' : 'FAILED'}`,
      });

      const [expensesData, loansData, categoriesData] = await Promise.all([
        expensesRes.json(),
        loansRes.json(),
        categoriesRes.json(),
      ]);

      console.log('[fetchRemoteData] Raw data:', {
        expenses: expensesData.values ? `${expensesData.values.length} rows` : 'No values',
        loans: loansData.values ? `${loansData.values.length} rows` : 'No values',
        categories: categoriesData.values ? `${categoriesData.values.length} rows` : 'No values',
      });

      // Parse expenses
      const expenses: Expense[] = (expensesData.values || []).map((row: any[]) => ({
        id: row[0],
        date: row[1],
        amount: parseFloat(row[2] || '0'),
        category: row[3],
        subcategory: row[4] || undefined,
        description: row[5],
        currency: row[6] || 'DZD',
        timestamp: row[7] || new Date().toISOString(),
        syncStatus: 'synced',
      }));

      // Parse loans - fixed field names to match Loan type
      const loans: Loan[] = (loansData.values || []).map((row: any[]) => ({
        id: row[0],
        person: row[1],  // Fixed: was 'personName', should be 'person'
        amount: parseFloat(row[2] || '0'),
        type: row[3] as 'given' | 'taken',  // Fixed: order and values
        date: row[4],
        status: row[5] as 'pending' | 'paid',  // Fixed: values to match type
        notes: row[6],  // Fixed: was 'description', should be 'notes'
        dateCreated: row[4],  // Add required field
        localId: row[0],  // Add required field
        syncStatus: 'synced' as const,  // Add required field
      }));

      // Parse categories
      const categories: Category[] = (categoriesData.values || []).map((row: any[]) => ({
        id: row[0],
        name: row[1],
        budget: parseFloat(row[2] || '0'),
        color: row[3],
      }));

      return { expenses, loans, categories };
    } catch (error) {
      console.error('Failed to fetch remote data:', error);
      return null;
    }
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
        fetch(`${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}/values/Expenses!A2:I`, {
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
        subcategory: row[4] || undefined,
        description: row[5],
        currency: row[6],
        timestamp: row[7],
        localId: row[0],
        type: 'expense',
        purpose: row[5],
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
      await AsyncStorage.removeItem('@last_sync_state');  // Clear sync state too
      this.sheetInfo = null;
    } catch (error) {
      console.error('Failed to delete sheet info:', error);
    }
  }

  private static async verifySheetExists(): Promise<boolean> {
    try {
      if (!this.sheetInfo) {
        console.log('[verifySheetExists] No sheet info to verify');
        return false;
      }

      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) {
        console.log('[verifySheetExists] No access token available');
        return false;
      }

      console.log('[verifySheetExists] Verifying sheet:', this.sheetInfo.spreadsheetId);

      // Try to get sheet metadata with more detailed fields
      const response = await fetch(
        `${SHEETS_API_BASE_URL}/${this.sheetInfo.spreadsheetId}?fields=spreadsheetId,properties(title),sheets(properties(title))`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[verifySheetExists] Sheet exists with title:', data.properties?.title);

        // Verify it has the required sheets
        const hasExpenses = data.sheets?.some((s: any) => s.properties?.title === 'Expenses');
        const hasLoans = data.sheets?.some((s: any) => s.properties?.title === 'Loans');
        const hasCategories = data.sheets?.some((s: any) => s.properties?.title === 'Categories');

        if (hasExpenses && hasLoans && hasCategories) {
          console.log('[verifySheetExists] ✅ Sheet has all required tabs');
          return true;
        } else {
          console.log('[verifySheetExists] ⚠️ Sheet exists but missing required tabs');
          return true; // Still return true since the sheet exists
        }
      } else {
        console.log('[verifySheetExists] Sheet not accessible, status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('[verifySheetExists] Error:', error);
      return false;
    }
  }

  private static async findExistingSheet(): Promise<SheetInfo | null> {
    try {
      const accessToken = await GoogleAuthService.getAccessToken();
      if (!accessToken) {
        console.log('[findExistingSheet] No access token available');
        return null;
      }

      const user = await GoogleAuthService.getCurrentUser();
      if (!user) {
        console.log('[findExistingSheet] No user signed in');
        return null;
      }

      console.log('[findExistingSheet] Searching for sheets for user:', user.email);

      // Search for ANY ExpenseTracker sheets, not just ones with the exact name
      // This will find sheets even if they were created manually or renamed
      const searchQuery = encodeURIComponent(
        "(name contains 'ExpenseTracker' or name contains 'Expense Tracker') and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
      );

      const searchUrl = `${DRIVE_API_BASE_URL}?q=${searchQuery}&orderBy=createdTime desc&fields=files(id,name,createdTime,webViewLink,modifiedTime)`;
      console.log('[findExistingSheet] Search URL:', searchUrl);

      const searchResponse = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('[findExistingSheet] Search failed:', searchResponse.status, errorText);
        return null;
      }

      const data = await searchResponse.json();
      console.log('[findExistingSheet] Found sheets:', data.files?.length || 0);

      if (data.files && data.files.length > 0) {
        console.log('[findExistingSheet] Available sheets:');
        data.files.forEach((file: any, index: number) => {
          console.log(`  ${index + 1}. ${file.name} (ID: ${file.id}, Modified: ${file.modifiedTime})`);
        });

        // Try to find a sheet specifically for this user
        const userSpecificSheet = data.files.find((file: any) =>
          file.name.includes(user.email.split('@')[0])
        );

        const sheetToUse = userSpecificSheet || data.files[0];
        console.log('[findExistingSheet] Using sheet:', sheetToUse.name);

        // Verify the sheet structure before using it
        const verifyResponse = await fetch(
          `${SHEETS_API_BASE_URL}/${sheetToUse.id}?fields=sheets(properties(title))`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (verifyResponse.ok) {
          const sheetData = await verifyResponse.json();
          const hasRequiredSheets =
            sheetData.sheets?.some((s: any) => s.properties?.title === 'Expenses') &&
            sheetData.sheets?.some((s: any) => s.properties?.title === 'Loans') &&
            sheetData.sheets?.some((s: any) => s.properties?.title === 'Categories');

          if (hasRequiredSheets) {
            console.log('[findExistingSheet] Sheet has required structure, using it');
            return {
              spreadsheetId: sheetToUse.id,
              spreadsheetUrl: sheetToUse.webViewLink,
              createdAt: sheetToUse.createdTime,
            };
          } else {
            console.log('[findExistingSheet] Sheet exists but missing required sheets, will create new');
          }
        }
      }

      console.log('[findExistingSheet] No suitable existing sheet found');
      return null;
    } catch (error) {
      console.error('[findExistingSheet] Error:', error);
      return null;
    }
  }
}

export default GoogleSheetsService;