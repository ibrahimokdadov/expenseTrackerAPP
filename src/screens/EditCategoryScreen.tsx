import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StorageService} from '../services/StorageService';
import {Category, Subcategory} from '../types';
import {useTheme} from '../contexts/ThemeContext';

const EditCategoryScreen = ({navigation, route}: any) => {
  const {category} = route.params;
  const {colors} = useTheme();

  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color || '#6B5FFF');
  const [subcategories, setSubcategories] = useState<Subcategory[]>(category.subcategories || []);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  const colors_palette = [
    '#6B5FFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#FD79A8', '#E17055', '#00B894', '#0984E3',
    '#A29BFE', '#FF7675', '#55A3FF', '#FD79A8', '#FDCB6E',
  ];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    try {
      const updatedCategory: Category = {
        ...category,
        name: name.trim(),
        color,
        subcategories,
      };

      await StorageService.updateCategory(updatedCategory);
      Alert.alert('Success', 'Category updated successfully', [
        {text: 'OK', onPress: () => navigation.goBack()}
      ]);
    } catch (error) {
      console.error('Failed to update category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  };

  const handleAddSubcategory = () => {
    if (!newSubcategoryName.trim()) {
      Alert.alert('Error', 'Subcategory name is required');
      return;
    }

    const newSubcategory: Subcategory = {
      id: `${category.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newSubcategoryName.trim(),
      categoryId: category.id,
    };

    setSubcategories([...subcategories, newSubcategory]);
    setNewSubcategoryName('');
    setShowAddSubcategory(false);
  };

  const handleEditSubcategory = (sub: Subcategory) => {
    setEditingSubcategory(sub);
    setNewSubcategoryName(sub.name);
    setShowAddSubcategory(true);
  };

  const handleUpdateSubcategory = () => {
    if (!newSubcategoryName.trim() || !editingSubcategory) return;

    setSubcategories(subcategories.map(sub =>
      sub.id === editingSubcategory.id
        ? {...sub, name: newSubcategoryName.trim()}
        : sub
    ));
    setEditingSubcategory(null);
    setNewSubcategoryName('');
    setShowAddSubcategory(false);
  };

  const handleDeleteSubcategory = (subId: string) => {
    Alert.alert(
      'Delete Subcategory',
      'Are you sure you want to delete this subcategory?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setSubcategories(subcategories.filter(sub => sub.id !== subId))
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
        <Text style={styles.headerTitle}>Edit Category</Text>
        <View style={{width: 40}} />
      </LinearGradient>

      <View style={styles.form}>
        <View style={styles.section}>
          <Text style={[styles.label, {color: colors.text}]}>Category Name</Text>
          <TextInput
            style={[styles.input, {backgroundColor: colors.card, color: colors.text}]}
            value={name}
            onChangeText={setName}
            placeholder="Enter category name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, {color: colors.text}]}>Color</Text>
          <View style={styles.colorGrid}>
            {colors_palette.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorOption,
                  {backgroundColor: c},
                  color === c && styles.selectedColor
                ]}
                onPress={() => setColor(c)}>
                {color === c && <Icon name="check" size={20} color="#FFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, {color: colors.text}]}>Subcategories</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddSubcategory(true)}>
              <Icon name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {subcategories.length === 0 ? (
            <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
              No subcategories added
            </Text>
          ) : (
            <View style={styles.subcategoryList}>
              {subcategories.map(sub => (
                <View key={sub.id} style={[styles.subcategoryItem, {backgroundColor: colors.card}]}>
                  <Text style={[styles.subcategoryName, {color: colors.text}]}>{sub.name}</Text>
                  <View style={styles.subcategoryActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleEditSubcategory(sub)}>
                      <Icon name="edit" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteSubcategory(sub.id)}>
                      <Icon name="delete" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}>
          <LinearGradient
            colors={[color, color + 'DD']}
            style={styles.saveButtonGradient}>
            <Icon name="check" size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAddSubcategory}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddSubcategory(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddSubcategory(false)}>
          <View style={[styles.modalContent, {backgroundColor: colors.card}]}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>
              {editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}
            </Text>
            <TextInput
              style={[styles.modalInput, {backgroundColor: colors.background, color: colors.text}]}
              value={newSubcategoryName}
              onChangeText={setNewSubcategoryName}
              placeholder="Subcategory name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddSubcategory(false);
                  setNewSubcategoryName('');
                  setEditingSubcategory(null);
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={editingSubcategory ? handleUpdateSubcategory : handleAddSubcategory}>
                <LinearGradient
                  colors={['#6B5FFF', '#5147CC']}
                  style={styles.confirmButtonGradient}>
                  <Text style={styles.confirmButtonText}>
                    {editingSubcategory ? 'Update' : 'Add'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B5FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  subcategoryList: {
    gap: 10,
  },
  subcategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  subcategoryName: {
    fontSize: 15,
  },
  subcategoryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    padding: 5,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
  },
  saveButton: {
    marginTop: 30,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
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

export default EditCategoryScreen;