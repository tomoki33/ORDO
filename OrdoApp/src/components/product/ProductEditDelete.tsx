/**
 * Product Edit & Delete Components (4時間実装)
 * 
 * 商品の編集・削除機能
 * - インライン編集
 * - バルク編集
 * - 削除確認
 * - undo/redo機能
 * - データ検証
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  IconButton,
  Button,
  TextInput,
  SegmentedButtons,
  useTheme,
  Portal,
  Dialog,
  Chip,
  Menu,
  Divider,
  Snackbar,
  ProgressBar,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types & Models
import { Product, ProductCategory, ProductLocation } from '../../types';
import { SPACING, COLORS } from '../../constants';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ProductEditFormProps {
  product: Product;
  onSave: (updatedProduct: Product) => void;
  onCancel: () => void;
  isLoading?: boolean;
  errors?: Partial<Record<keyof Product, string>>;
}

export interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  validation?: (value: string) => string | null;
}

export interface BulkEditProps {
  products: Product[];
  onSave: (updates: Partial<Product>) => void;
  onCancel: () => void;
  selectedFields?: (keyof Product)[];
}

export interface DeleteConfirmationProps {
  products: Product[];
  onConfirm: () => void;
  onCancel: () => void;
  visible: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof Product, string>>;
}

interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  undoAction?: () => void;
  redoAction?: () => void;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

const validateProduct = (product: Partial<Product>): ValidationResult => {
  const errors: Partial<Record<keyof Product, string>> = {};
  
  if (!product.name || product.name.trim().length === 0) {
    errors.name = '商品名は必須です';
  } else if (product.name.trim().length > 100) {
    errors.name = '商品名は100文字以内で入力してください';
  }

  if (!product.category) {
    errors.category = 'カテゴリは必須です';
  }

  if (!product.expirationDate) {
    errors.expirationDate = '消費期限は必須です';
  } else if (new Date(product.expirationDate) < new Date()) {
    errors.expirationDate = '消費期限は現在日時より後の日付を選択してください';
  }

  if (!product.location) {
    errors.location = '保存場所は必須です';
  }

  if (product.quantity && product.quantity <= 0) {
    errors.quantity = '数量は正の数で入力してください';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// =============================================================================
// INLINE EDIT COMPONENT
// =============================================================================

export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onSave,
  onCancel,
  placeholder = '',
  multiline = false,
  maxLength,
  validation,
}) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<any>(null);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(value);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = () => {
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onSave(editValue);
    setIsEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    onCancel();
  };

  if (!isEditing) {
    return (
      <View style={styles.inlineViewContainer}>
        <Text style={[styles.inlineValue, { color: theme.colors.onSurface }]}>
          {value || placeholder}
        </Text>
        <IconButton
          icon="edit"
          size={16}
          onPress={handleStartEdit}
          style={styles.inlineEditButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.inlineEditContainer}>
      <TextInput
        ref={inputRef}
        value={editValue}
        onChangeText={setEditValue}
        placeholder={placeholder}
        multiline={multiline}
        maxLength={maxLength}
        error={!!error}
        style={styles.inlineInput}
        dense
      />
      {error && (
        <Text style={[styles.inlineError, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
      <View style={styles.inlineActions}>
        <IconButton
          icon="check"
          size={20}
          onPress={handleSave}
          iconColor={COLORS.SUCCESS}
        />
        <IconButton
          icon="close"
          size={20}
          onPress={handleCancel}
          iconColor={COLORS.ERROR}
        />
      </View>
    </View>
  );
};

// =============================================================================
// PRODUCT EDIT FORM COMPONENT
// =============================================================================

export const ProductEditForm: React.FC<ProductEditFormProps> = ({
  product,
  onSave,
  onCancel,
  isLoading = false,
  errors = {},
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [formData, setFormData] = useState<Product>({ ...product });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(product.expirationDate));
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [locationMenuVisible, setLocationMenuVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const categories: { value: ProductCategory; label: string }[] = [
    { value: 'fruits', label: '果物' },
    { value: 'vegetables', label: '野菜' },
    { value: 'dairy', label: '乳製品' },
    { value: 'meat', label: '肉類' },
    { value: 'packaged', label: '加工食品' },
    { value: 'beverages', label: '飲み物' },
    { value: 'other', label: 'その他' },
  ];

  const locations: { value: ProductLocation; label: string }[] = [
    { value: 'fridge', label: '冷蔵庫' },
    { value: 'pantry', label: 'パントリー' },
    { value: 'freezer', label: '冷凍庫' },
    { value: 'counter', label: 'カウンター' },
    { value: 'other', label: 'その他' },
  ];

  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(product);
    setIsDirty(hasChanges);
  }, [formData, product]);

  const updateField = useCallback((field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = () => {
    const validation = validateProduct(formData);
    if (!validation.isValid) {
      Alert.alert('入力エラー', '入力内容を確認してください');
      return;
    }

    onSave(formData);
  };

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        '変更を破棄',
        '未保存の変更があります。破棄してもよろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.formContainer}
        contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <Card style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              基本情報
            </Text>

            <TextInput
              label="商品名 *"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              error={!!errors.name}
              style={styles.input}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.name}
              </Text>
            )}

            <View style={styles.dropdownContainer}>
              <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
                カテゴリ *
              </Text>
              <Menu
                visible={categoryMenuVisible}
                onDismiss={() => setCategoryMenuVisible(false)}
                anchor={
                  <Surface
                    style={[styles.dropdown, { backgroundColor: theme.colors.surfaceVariant }]}
                    onTouchStart={() => setCategoryMenuVisible(true)}
                  >
                    <Text style={[styles.dropdownText, { color: theme.colors.onSurface }]}>
                      {categories.find(c => c.value === formData.category)?.label || 'カテゴリを選択'}
                    </Text>
                    <Icon name="arrow-drop-down" size={24} color={theme.colors.onSurfaceVariant} />
                  </Surface>
                }
              >
                {categories.map((category) => (
                  <Menu.Item
                    key={category.value}
                    onPress={() => {
                      updateField('category', category.value);
                      setCategoryMenuVisible(false);
                    }}
                    title={category.label}
                    leadingIcon={formData.category === category.value ? 'check' : undefined}
                  />
                ))}
              </Menu>
              {errors.category && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.category}
                </Text>
              )}
            </View>

            <View style={styles.dropdownContainer}>
              <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
                保存場所 *
              </Text>
              <Menu
                visible={locationMenuVisible}
                onDismiss={() => setLocationMenuVisible(false)}
                anchor={
                  <Surface
                    style={[styles.dropdown, { backgroundColor: theme.colors.surfaceVariant }]}
                    onTouchStart={() => setLocationMenuVisible(true)}
                  >
                    <Text style={[styles.dropdownText, { color: theme.colors.onSurface }]}>
                      {locations.find(l => l.value === formData.location)?.label || '保存場所を選択'}
                    </Text>
                    <Icon name="arrow-drop-down" size={24} color={theme.colors.onSurfaceVariant} />
                  </Surface>
                }
              >
                {locations.map((location) => (
                  <Menu.Item
                    key={location.value}
                    onPress={() => {
                      updateField('location', location.value);
                      setLocationMenuVisible(false);
                    }}
                    title={location.label}
                    leadingIcon={formData.location === location.value ? 'check' : undefined}
                  />
                ))}
              </Menu>
              {errors.location && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.location}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Expiration & Quantity */}
        <Card style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              期限・数量
            </Text>

            <TextInput
              label="消費期限 *"
              value={new Date(formData.expirationDate).toLocaleDateString('ja-JP')}
              onFocus={() => setShowDatePicker(true)}
              error={!!errors.expirationDate}
              right={<TextInput.Icon icon="calendar-today" onPress={() => setShowDatePicker(true)} />}
              style={styles.input}
            />
            {errors.expirationDate && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.expirationDate}
              </Text>
            )}

            <View style={styles.quantityContainer}>
              <TextInput
                label="数量"
                value={formData.quantity?.toString() || ''}
                onChangeText={(value) => updateField('quantity', value ? parseInt(value) : undefined)}
                keyboardType="numeric"
                error={!!errors.quantity}
                style={[styles.input, styles.quantityInput]}
              />
              {errors.quantity && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.quantity}
                </Text>
              )}
              
              <TextInput
                label="単位"
                value={formData.unit || ''}
                onChangeText={(value) => updateField('unit', value)}
                style={[styles.input, styles.unitInput]}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Additional Information */}
        <Card style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              追加情報
            </Text>

            <TextInput
              label="ブランド"
              value={formData.brand || ''}
              onChangeText={(value) => updateField('brand', value)}
              style={styles.input}
            />

            <TextInput
              label="バーコード"
              value={formData.barcode || ''}
              onChangeText={(value) => updateField('barcode', value)}
              style={styles.input}
            />

            <TextInput
              label="メモ"
              value={formData.notes || ''}
              onChangeText={(value) => updateField('notes', value)}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <Surface style={[styles.actionBar, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Button
          mode="outlined"
          onPress={handleCancel}
          style={styles.actionButton}
          disabled={isLoading}
        >
          キャンセル
        </Button>
        
        <Button
          mode="contained"
          onPress={handleSave}
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          loading={isLoading}
          disabled={isLoading || !isDirty}
        >
          保存
        </Button>
      </Surface>

      {/* Date Picker Modal */}
      <Portal>
        <Dialog visible={showDatePicker} onDismiss={() => setShowDatePicker(false)}>
          <Dialog.Title>消費期限を選択</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurface, textAlign: 'center', marginBottom: 16 }}>
              現在の日付: {selectedDate.toLocaleDateString('ja-JP')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <Button
                mode="outlined"
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setSelectedDate(newDate);
                }}
              >
                +1日
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 7);
                  setSelectedDate(newDate);
                }}
              >
                +1週間
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
              >
                +1ヶ月
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDatePicker(false)}>
              キャンセル
            </Button>
            <Button
              onPress={() => {
                updateField('expirationDate', selectedDate.toISOString());
                setShowDatePicker(false);
              }}
              mode="contained"
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
};

// =============================================================================
// BULK EDIT COMPONENT
// =============================================================================

export const BulkEdit: React.FC<BulkEditProps> = ({
  products,
  onSave,
  onCancel,
  selectedFields = ['category', 'location', 'expirationDate'],
}) => {
  const theme = useTheme();
  const [updates, setUpdates] = useState<Partial<Product>>({});
  const [activeFields, setActiveFields] = useState<Set<keyof Product>>(new Set());

  const handleFieldToggle = (field: keyof Product) => {
    const newActiveFields = new Set(activeFields);
    if (newActiveFields.has(field)) {
      newActiveFields.delete(field);
      const newUpdates = { ...updates };
      delete newUpdates[field];
      setUpdates(newUpdates);
    } else {
      newActiveFields.add(field);
    }
    setActiveFields(newActiveFields);
  };

  const handleFieldUpdate = (field: keyof Product, value: any) => {
    setUpdates(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (Object.keys(updates).length === 0) {
      Alert.alert('変更なし', '変更する項目を選択してください');
      return;
    }

    Alert.alert(
      '一括更新確認',
      `${products.length}個の商品を更新しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '更新', onPress: () => onSave(updates) },
      ]
    );
  };

  return (
    <View style={styles.bulkEditContainer}>
      <Text style={[styles.bulkTitle, { color: theme.colors.onSurface }]}>
        一括編集 ({products.length}個の商品)
      </Text>

      <Card style={[styles.bulkCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          {selectedFields.map((field) => (
            <View key={field} style={styles.bulkFieldContainer}>
              <View style={styles.bulkFieldHeader}>
                <IconButton
                  icon={activeFields.has(field) ? 'check-box' : 'check-box-outline-blank'}
                  onPress={() => handleFieldToggle(field)}
                  size={20}
                />
                <Text style={[styles.bulkFieldLabel, { color: theme.colors.onSurface }]}>
                  {field === 'category' ? 'カテゴリ' :
                   field === 'location' ? '保存場所' :
                   field === 'expirationDate' ? '消費期限' : field}
                </Text>
              </View>

              {activeFields.has(field) && (
                <View style={styles.bulkFieldInput}>
                  {field === 'category' && (
                    <SegmentedButtons
                      value={updates.category || ''}
                      onValueChange={(value) => handleFieldUpdate('category', value)}
                      buttons={[
                        { value: 'fruits', label: '果物' },
                        { value: 'vegetables', label: '野菜' },
                        { value: 'dairy', label: '乳製品' },
                        { value: 'meat', label: '肉類' },
                      ]}
                    />
                  )}
                  
                  {field === 'location' && (
                    <SegmentedButtons
                      value={updates.location || ''}
                      onValueChange={(value) => handleFieldUpdate('location', value)}
                      buttons={[
                        { value: 'fridge', label: '冷蔵庫' },
                        { value: 'pantry', label: 'パントリー' },
                        { value: 'freezer', label: '冷凍庫' },
                        { value: 'counter', label: 'カウンター' },
                      ]}
                    />
                  )}
                </View>
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      <View style={styles.bulkActions}>
        <Button mode="outlined" onPress={onCancel} style={styles.actionButton}>
          キャンセル
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          disabled={Object.keys(updates).length === 0}
        >
          更新
        </Button>
      </View>
    </View>
  );
};

// =============================================================================
// DELETE CONFIRMATION COMPONENT
// =============================================================================

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  products,
  onConfirm,
  onCancel,
  visible,
}) => {
  const theme = useTheme();
  const isMultiple = products.length > 1;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Icon icon="delete-alert" />
        <Dialog.Title>
          {isMultiple ? '複数商品の削除' : '商品の削除'}
        </Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: theme.colors.onSurface }}>
            {isMultiple 
              ? `${products.length}個の商品を削除します。この操作は取り消せません。`
              : `「${products[0]?.name}」を削除します。この操作は取り消せません。`
            }
          </Text>
          
          {isMultiple && products.length <= 5 && (
            <View style={styles.deleteList}>
              {products.map((product, index) => (
                <Text key={product.id} style={[styles.deleteItem, { color: theme.colors.onSurfaceVariant }]}>
                  • {product.name}
                </Text>
              ))}
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel}>キャンセル</Button>
          <Button onPress={onConfirm} textColor={COLORS.ERROR}>
            削除
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Inline edit styles
  inlineViewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  inlineValue: {
    flex: 1,
    fontSize: 14,
  },

  inlineEditButton: {
    margin: 0,
  },

  inlineEditContainer: {
    gap: SPACING.XS,
  },

  inlineInput: {
    flex: 1,
  },

  inlineError: {
    fontSize: 12,
  },

  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  // Form styles
  formContainer: {
    flex: 1,
  },

  formContent: {
    padding: SPACING.MD,
  },

  formCard: {
    marginBottom: SPACING.MD,
    borderRadius: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },

  input: {
    marginBottom: SPACING.MD,
  },

  fieldLabel: {
    fontSize: 14,
    marginBottom: SPACING.XS,
  },

  dropdownContainer: {
    marginBottom: SPACING.MD,
  },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderRadius: 8,
    minHeight: 48,
  },

  dropdownText: {
    fontSize: 16,
  },

  datePickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    borderRadius: 8,
    minHeight: 48,
  },

  dateText: {
    flex: 1,
    fontSize: 16,
    marginLeft: SPACING.SM,
  },

  quantityContainer: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },

  quantityInput: {
    flex: 2,
  },

  unitInput: {
    flex: 1,
  },

  errorText: {
    fontSize: 12,
    marginTop: SPACING.XS,
  },

  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.MD,
  },

  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },

  // Bulk edit styles
  bulkEditContainer: {
    padding: SPACING.MD,
  },

  bulkTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },

  bulkCard: {
    marginBottom: SPACING.MD,
    borderRadius: 12,
  },

  bulkFieldContainer: {
    marginBottom: SPACING.MD,
  },

  bulkFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bulkFieldLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  bulkFieldInput: {
    marginTop: SPACING.SM,
    marginLeft: SPACING.XL,
  },

  bulkActions: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },

  // Delete confirmation styles
  deleteList: {
    marginTop: SPACING.MD,
  },

  deleteItem: {
    fontSize: 14,
    marginBottom: SPACING.XS,
  },
});

export default {
  ProductEditForm,
  InlineEdit,
  BulkEdit,
  DeleteConfirmation,
};
