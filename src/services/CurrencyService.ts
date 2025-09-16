import AsyncStorage from '@react-native-async-storage/async-storage';
import {Currency, CurrencyInfo} from '../types';

const CURRENCY_KEY = '@selected_currency';

export const CURRENCIES: CurrencyInfo[] = [
  {code: 'EUR', symbol: '€', name: 'Euro'},
  {code: 'USD', symbol: '$', name: 'US Dollar'},
  {code: 'DZD', symbol: 'DA', name: 'Algerian Dinar'},
];

export class CurrencyService {
  static async getSelectedCurrency(): Promise<Currency> {
    try {
      const currency = await AsyncStorage.getItem(CURRENCY_KEY);
      return (currency as Currency) || 'DZD';
    } catch (error) {
      console.error('Error getting currency:', error);
      return 'DZD';
    }
  }

  static async setSelectedCurrency(currency: Currency) {
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, currency);
    } catch (error) {
      console.error('Error setting currency:', error);
      throw error;
    }
  }

  static getCurrencyInfo(code: Currency): CurrencyInfo {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  }

  static getCurrencyByCode(code: Currency): CurrencyInfo {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  }

  static formatAmount(amount: number, currency?: Currency): string {
    const currencyCode = currency || 'DZD';
    const info = this.getCurrencyInfo(currencyCode);

    if (currencyCode === 'DZD') {
      return `${amount.toFixed(2)} ${info.symbol}`;
    }

    return `${info.symbol}${amount.toFixed(2)}`;
  }

  static formatCompactAmount(amount: number, currency?: Currency): string {
    const currencyCode = currency || 'DZD';
    const info = this.getCurrencyInfo(currencyCode);

    let formattedNumber: string;
    let suffix = '';

    if (amount >= 1_000_000_000) {
      formattedNumber = (amount / 1_000_000_000).toFixed(1);
      suffix = 'B';
    } else if (amount >= 1_000_000) {
      formattedNumber = (amount / 1_000_000).toFixed(1);
      suffix = 'M';
    } else if (amount >= 1_000) {
      formattedNumber = (amount / 1_000).toFixed(1);
      suffix = 'K';
    } else {
      formattedNumber = amount.toFixed(0);
    }

    // Remove unnecessary .0
    if (formattedNumber.endsWith('.0')) {
      formattedNumber = formattedNumber.slice(0, -2);
    }

    if (currencyCode === 'DZD') {
      return `${formattedNumber}${suffix} ${info.symbol}`;
    }

    return `${info.symbol}${formattedNumber}${suffix}`;
  }
}