import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import ExpenseListScreen from './src/screens/ExpenseListScreen';
import SyncScreen from './src/screens/SyncScreen';
import ChartsScreen from './src/screens/ChartsScreen';
import LoansScreen from './src/screens/LoansScreen';
import CategoryDetailsScreen from './src/screens/CategoryDetailsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {StorageService} from './src/services/StorageService';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';

const Stack = createStackNavigator();

function AppContent(): React.JSX.Element {
  const {colors} = useTheme();

  useEffect(() => {
    StorageService.init();
  }, []);

  return (
    <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#ffffff',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#f0f0f5',
            },
            headerTintColor: '#667eea',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
              color: '#1a1a2e',
            },
            headerBackTitleVisible: false,
            cardStyle: {
              backgroundColor: '#f8f9fd',
            },
          }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{
              title: 'Add Expense',
              headerStyle: {
                backgroundColor: '#ffffff',
                elevation: 0,
                shadowOpacity: 0,
              },
            }}
          />
          <Stack.Screen
            name="ExpenseList"
            component={ExpenseListScreen}
            options={{title: 'All Expenses'}}
          />
          <Stack.Screen
            name="Loans"
            component={LoansScreen}
            options={{title: 'Loan Management'}}
          />
          <Stack.Screen
            name="CategoryDetails"
            component={CategoryDetailsScreen}
            options={{title: 'Category Details'}}
          />
          <Stack.Screen
            name="Sync"
            component={SyncScreen}
            options={{title: 'Sync to Google Sheets'}}
          />
          <Stack.Screen
            name="Charts"
            component={ChartsScreen}
            options={{title: 'Expense Analytics'}}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{title: 'Settings'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
