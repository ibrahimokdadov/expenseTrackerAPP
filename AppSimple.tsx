import React, {useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StorageService} from './src/services/StorageService';
import GoogleAuthService from './src/services/GoogleAuthService';

function App(): React.JSX.Element {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[App] Initializing services...');
        await StorageService.init();
        console.log('[App] StorageService initialized');
        
        try {
          await GoogleAuthService.configure();
          console.log('[App] GoogleAuthService configured');
        } catch (authError) {
          console.log('[App] Google Sign-In not available, continuing without it');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('[App] Initialization error:', error);
        setIsInitialized(true); // Still show the app even if initialization fails
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View style={styles.centerContent}>
            <Text style={styles.title}>Expense Tracker</Text>
            <Text style={styles.subtitle}>Welcome to your expense tracking app!</Text>
            
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Add Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>View Expenses</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fd',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 10,
    minWidth: 200,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#667eea',
  },
});

export default App;