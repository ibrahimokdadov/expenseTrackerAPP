import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Picker} from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import {StorageService} from '../services/StorageService';
import {Category, Expense} from '../types';
import {useTheme} from '../contexts/ThemeContext';

const EditExpenseScreen = ({navigation, route}: any) => {
  const {expense} = route.params;
  const {colors} = useTheme();

  const [amount, setAmount] = useState(expense.amount.toString());
  const [selectedCategory, setSelectedCategory] = useState(expense.category);
  const [description, setDescription] = useState(expense.description || '');
  const [date, setDate] = useState(new Date(expense.date));
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const cats = await StorageService.getCategories();
    setCategories(cats);
  };

  const handleUpdate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setLoading(true);

    try {
      const updates = {
        amount: parseFloat(amount),
        category: selectedCategory,
        description: description.trim(),
        date: date.toISOString().split('T')[0],
        // timestamp will be set by StorageService.updateExpense
      };

      await StorageService.updateExpense(expense.id, updates);

      Alert.alert('Success', 'Expense updated successfully', [
        {text: 'OK', onPress: () => navigation.goBack()}
      ]);
    } catch (error) {
      console.error('Failed to update expense:', error);
      Alert.alert('Error', 'Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await StorageService.deleteExpense(expense.id);
              Alert.alert('Success', 'Expense deleted successfully', [
                {text: 'OK', onPress: () => navigation.goBack()}
              ]);
            } catch (error) {
              console.error('Failed to delete expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, {backgroundColor: colors.background}]}>
      <LinearGradient
        colors={['#6B5FFF', '#5147CC']}
        style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Expense</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}>
          <Icon name="delete" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Amount</Text>
          <TextInput
            style={[styles.input, {backgroundColor: colors.card, color: colors.text}]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Category</Text>
          <View style={[styles.pickerContainer, {backgroundColor: colors.card}]}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={setSelectedCategory}
              style={[styles.picker, {color: colors.text}]}
              dropdownIconColor={colors.text}>
              <Picker.Item label="Select a category" value="" />
              {categories.map(cat => (
                <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, {backgroundColor: colors.card, color: colors.text}]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.text}]}>Date</Text>
          <TouchableOpacity
            style={[styles.dateButton, {backgroundColor: colors.card}]}
            onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar-today" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateText, {color: colors.text}]}>
              {date.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        <DatePicker
          modal
          open={showDatePicker}
          date={date}
          mode="date"
          maximumDate={new Date()}
          onConfirm={(selectedDate) => {
            setShowDatePicker(false);
            setDate(selectedDate);
          }}
          onCancel={() => setShowDatePicker(false)}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.updateButton, loading && styles.disabledButton]}
            onPress={handleUpdate}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="check" size={20} color="#FFF" />
                <Text style={styles.updateText}>Update</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  deleteButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  dateText: {
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  updateButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B5FFF',
    gap: 8,
  },
  updateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default EditExpenseScreen;