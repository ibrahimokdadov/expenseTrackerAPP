export type Currency = 'EUR' | 'USD' | 'DZD';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface Expense {
  id: string;
  amount: number;
  currency?: Currency;
  description: string;
  category: string;
  subcategory?: string;
  type?: string;
  purpose?: string;
  date: string;
  timestamp: string;
  localId: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface LoanHistoryEntry {
  date: string;
  amount?: number;
  description?: string;
  previousAmount?: number;
  previousDescription?: string;
}

export interface Loan {
  id: string;
  amount: number;
  currency?: Currency;
  description: string;
  giver: string;
  receiver: string;
  status: 'pending' | 'fulfilled';
  dateCreated: string;
  dateFulfilled?: string;
  category?: string;
  localId: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
  history?: LoanHistoryEntry[];
}

export interface User {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface ConflictItem {
  local: Expense;
  remote: Expense;
  resolution?: 'local' | 'remote' | 'both';
}

export interface FinancialSummary {
  totalSpent: number;
  totalLoansGiven: number;
  totalLoansReceived: number;
  totalPendingLoans: number;
  categoryBreakdown: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  subcategoryBreakdown?: SubcategoryBreakdown[];
}

export interface SubcategoryBreakdown {
  subcategoryId: string;
  subcategoryName: string;
  total: number;
  percentage: number;
}

// ZT (Zakat Tracking) Types
export interface ZTBalance {
  id: string;
  owner: string;
  value: number;
  year: number;
  dateAdded: string;
}

export interface ZTPayment {
  id: string;
  amount: number;
  purpose: string;
  date: string;
}