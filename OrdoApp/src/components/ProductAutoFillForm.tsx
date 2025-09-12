/**
 * Product Auto-Fill Form Component
 * 商品自動入力フォーム - UI統合
 * 
 * Features:
 * - バーコードスキャン結果の自動入力
 * - 手動編集可能フィールド
 * - 商品画像表示・編集
 * - カテゴリ選択
 * - 在庫情報入力
 * - 保存・キャンセル機能
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductAutoFillService, ProductData } from '../services/ProductAutoFillService';

interface ProductAutoFillFormProps {
  navigation: any;
  route: any;
}

interface FormData {
  name: string;
  barcode: string;
  description: string;
  price: string;
  category: string;
  brand: string;
  imageUrl: string;
  quantity: string;
  minQuantity: string;
  location: string;
  notes: string;
  isActive: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

export const ProductAutoFillForm: React.FC<ProductAutoFillFormProps> = ({
  navigation,
  route,
}) => {
  const { productData, isFromScan } = route.params || {};
  
  // Services
  const [autoFillService] = useState(() => ProductAutoFillService.getInstance());
  
  // State
  const [formData, setFormData] = useState<FormData>({
    name: '',
    barcode: '',
    description: '',
    price: '',
    category: '',
    brand: '',
    imageUrl: '',
    quantity: '1',
    minQuantity: '1',
    location: '',
    notes: '',
    isActive: true,
  });
  
  const [originalData, setOriginalData] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Categories
  const categories = [
    '食品・飲料',
    '日用品',
    '衣類',
    '電子機器',
    '書籍・文具',
    '化粧品・美容',
    '医薬品・健康',
    'スポーツ・レジャー',
    'ホーム・ガーデン',
    'その他',
  ];

  useEffect(() => {
    if (productData) {
      populateForm(productData);
      if (isFromScan) {
        setOriginalData(productData);
      }
    }
  }, [productData]);

  useEffect(() => {
    // Check for unsaved changes
    if (originalData) {
      const hasChanges = Object.keys(formData).some(key => {
        if (key === 'isActive') return false; // Skip boolean comparison
        return formData[key as keyof FormData] !== (originalData[key as keyof ProductData] || '');
      });
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalData]);

  /**
   * Populate form with product data
   */
  const populateForm = (data: ProductData) => {
    setFormData({
      name: data.name || '',
      barcode: data.barcode || '',
      description: data.description || '',
      price: data.price?.toString() || '',
      category: data.category || '',
      brand: data.brand || '',
      imageUrl: data.imageUrl || '',
      quantity: '1',
      minQuantity: '1',
      location: '',
      notes: '',
      isActive: true,
    });
  };

  /**
   * Handle field change
   */
  const handleFieldChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Scan barcode for auto-fill
   */
  const scanBarcode = async () => {
    try {
      setIsLoading(true);
      setShowBarcodeScanner(false);

      const result = await autoFillService.scanAndFill({
        useCache: true,
        enableFallback: true,
        confidenceThreshold: 0.6,
      });

      if (result.success && result.product) {
        // Merge with existing form data
        setFormData(prev => ({
          ...prev,
          name: result.product!.name || prev.name,
          barcode: result.product!.barcode || prev.barcode,
          description: result.product!.description || prev.description,
          price: result.product!.price?.toString() || prev.price,
          category: result.product!.category || prev.category,
          brand: result.product!.brand || prev.brand,
          imageUrl: result.product!.imageUrl || prev.imageUrl,
        }));

        Alert.alert(
          '自動入力完了',
          `商品情報を自動入力しました。\n信頼度: ${Math.round(result.confidence * 100)}%`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('スキャンエラー', result.error || 'バーコードの読み取りに失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', `スキャンに失敗しました: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Search by barcode manually
   */
  const searchByBarcode = async () => {
    if (!formData.barcode.trim()) {
      Alert.alert('エラー', 'バーコードを入力してください');
      return;
    }

    try {
      setIsLoading(true);

      const result = await autoFillService.fillProductInfo(formData.barcode.trim(), {
        useCache: true,
        enableFallback: true,
        confidenceThreshold: 0.5,
      });

      if (result.success && result.product) {
        setFormData(prev => ({
          ...prev,
          name: result.product!.name || prev.name,
          description: result.product!.description || prev.description,
          price: result.product!.price?.toString() || prev.price,
          category: result.product!.category || prev.category,
          brand: result.product!.brand || prev.brand,
          imageUrl: result.product!.imageUrl || prev.imageUrl,
        }));

        Alert.alert(
          '商品情報取得完了',
          `商品情報を取得しました。\n信頼度: ${Math.round(result.confidence * 100)}%`
        );
      } else {
        Alert.alert('商品が見つかりません', result.error || '商品情報を取得できませんでした');
      }
    } catch (error) {
      Alert.alert('エラー', `商品情報の取得に失敗しました: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '商品名は必須です';
    }

    if (!formData.barcode.trim()) {
      newErrors.barcode = 'バーコードは必須です';
    } else if (!/^[0-9]+$/.test(formData.barcode.trim())) {
      newErrors.barcode = 'バーコードは数字のみ入力してください';
    }

    if (formData.price && isNaN(Number(formData.price))) {
      newErrors.price = '価格は数値で入力してください';
    }

    if (formData.quantity && isNaN(Number(formData.quantity))) {
      newErrors.quantity = '数量は数値で入力してください';
    }

    if (formData.minQuantity && isNaN(Number(formData.minQuantity))) {
      newErrors.minQuantity = '最小在庫は数値で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Save product
   */
  const saveProduct = async () => {
    if (!validateForm()) {
      Alert.alert('入力エラー', '入力内容を確認してください');
      return;
    }

    try {
      setIsSaving(true);

      // Here you would typically save to your backend/database
      // For now, we'll just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        '保存完了',
        '商品情報を保存しました',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('保存エラー', `商品の保存に失敗しました: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        '未保存の変更があります',
        '変更を破棄して戻りますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderFormField = (
    label: string,
    field: keyof FormData,
    options: {
      placeholder?: string;
      multiline?: boolean;
      keyboardType?: 'default' | 'numeric' | 'email-address';
      editable?: boolean;
      rightButton?: () => React.ReactNode;
    } = {}
  ) => {
    const { placeholder, multiline = false, keyboardType = 'default', editable = true, rightButton } = options;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.fieldInputContainer}>
          <TextInput
            style={[
              styles.fieldInput,
              multiline && styles.fieldInputMultiline,
              !editable && styles.fieldInputDisabled,
              errors[field] && styles.fieldInputError,
            ]}
            value={String(formData[field])}
            onChangeText={(value) => handleFieldChange(field, value)}
            placeholder={placeholder}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            editable={editable}
          />
          {rightButton && rightButton()}
        </View>
        {errors[field] && (
          <Text style={styles.fieldError}>{errors[field]}</Text>
        )}
      </View>
    );
  };

  const renderCategoryPicker = () => (
    <Modal
      visible={showCategoryPicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCategoryPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.categoryPickerContainer}>
          <Text style={styles.categoryPickerTitle}>カテゴリを選択</Text>
          
          <ScrollView style={styles.categoryList}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryItem,
                  formData.category === category && styles.categoryItemSelected,
                ]}
                onPress={() => {
                  handleFieldChange('category', category);
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryItemText,
                    formData.category === category && styles.categoryItemTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.categoryPickerCancel}
            onPress={() => setShowCategoryPicker(false)}
          >
            <Text style={styles.categoryPickerCancelText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>商品情報入力</Text>
        <TouchableOpacity
          style={[styles.headerButton, (!formData.name || !formData.barcode) && styles.headerButtonDisabled]}
          onPress={saveProduct}
          disabled={!formData.name || !formData.barcode || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.saveButtonText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        {formData.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: formData.imageUrl }} style={styles.productImage} />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🖼️</Text>
            <Text style={styles.imagePlaceholderLabel}>商品画像</Text>
          </View>
        )}

        {/* Auto-Fill Controls */}
        <View style={styles.autoFillContainer}>
          <Text style={styles.autoFillTitle}>自動入力</Text>
          <View style={styles.autoFillButtons}>
            <TouchableOpacity
              style={[styles.autoFillButton, styles.scanButton]}
              onPress={scanBarcode}
              disabled={isLoading}
            >
              <Text style={styles.scanButtonIcon}>📷</Text>
              <Text style={styles.autoFillButtonText}>スキャン</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.autoFillButton, styles.searchButton]}
              onPress={searchByBarcode}
              disabled={isLoading || !formData.barcode.trim()}
            >
              <Text style={styles.searchButtonIcon}>🔍</Text>
              <Text style={styles.autoFillButtonText}>検索</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {renderFormField('商品名 *', 'name', {
            placeholder: '商品名を入力してください',
          })}

          {renderFormField('バーコード *', 'barcode', {
            placeholder: 'バーコード番号を入力',
            keyboardType: 'numeric',
          })}

          {renderFormField('商品説明', 'description', {
            placeholder: '商品の説明を入力',
            multiline: true,
          })}

          {renderFormField('価格', 'price', {
            placeholder: '価格を入力',
            keyboardType: 'numeric',
          })}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>カテゴリ</Text>
            <TouchableOpacity
              style={[styles.fieldInput, styles.categorySelector]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={[styles.categorySelectorText, !formData.category && styles.placeholderText]}>
                {formData.category || 'カテゴリを選択'}
              </Text>
              <Text style={styles.categorySelectorIcon}>▼</Text>
            </TouchableOpacity>
          </View>

          {renderFormField('ブランド', 'brand', {
            placeholder: 'ブランド名を入力',
          })}

          {renderFormField('数量', 'quantity', {
            placeholder: '在庫数量',
            keyboardType: 'numeric',
          })}

          {renderFormField('最小在庫', 'minQuantity', {
            placeholder: '最小在庫数',
            keyboardType: 'numeric',
          })}

          {renderFormField('保管場所', 'location', {
            placeholder: '保管場所を入力',
          })}

          {renderFormField('メモ', 'notes', {
            placeholder: 'メモや備考を入力',
            multiline: true,
          })}

          {/* Active Switch */}
          <View style={styles.fieldContainer}>
            <View style={styles.switchContainer}>
              <Text style={styles.fieldLabel}>アクティブ</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => handleFieldChange('isActive', value)}
                trackColor={{ false: '#ccc', true: '#007AFF' }}
                thumbColor={formData.isActive ? '#fff' : '#fff'}
              />
            </View>
            <Text style={styles.switchDescription}>
              オフにすると在庫管理から除外されます
            </Text>
          </View>
        </View>

        {/* Scan Source Info */}
        {isFromScan && originalData && (
          <View style={styles.scanInfoContainer}>
            <Text style={styles.scanInfoTitle}>スキャン情報</Text>
            <Text style={styles.scanInfoText}>
              データソース: {originalData.source}
            </Text>
            <Text style={styles.scanInfoText}>
              信頼度: {Math.round(originalData.confidence * 100)}%
            </Text>
            <Text style={styles.scanInfoText}>
              取得日時: {originalData.lastUpdated.toLocaleString('ja-JP')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Category Picker Modal */}
      {renderCategoryPicker()}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>処理中...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  backIcon: {
    fontSize: 20,
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  imagePlaceholderText: {
    fontSize: 60,
    color: '#ccc',
  },
  imagePlaceholderLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  autoFillContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  autoFillTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  autoFillButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  autoFillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  scanButton: {
    backgroundColor: '#007AFF',
  },
  searchButton: {
    backgroundColor: '#34C759',
  },
  scanButtonIcon: {
    fontSize: 16,
    color: '#fff',
  },
  searchButtonIcon: {
    fontSize: 16,
    color: '#fff',
  },
  autoFillButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  formContainer: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  fieldInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  fieldInputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  fieldInputError: {
    borderColor: '#FF6B6B',
  },
  fieldError: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categorySelectorText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  categorySelectorIcon: {
    fontSize: 12,
    color: '#666',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  scanInfoContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  scanInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  scanInfoText: {
    fontSize: 12,
    color: '#1976d2',
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 32,
    maxHeight: '70%',
    minWidth: 280,
  },
  categoryPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryItemSelected: {
    backgroundColor: '#007AFF',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
  },
  categoryItemTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  categoryPickerCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  categoryPickerCancelText: {
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});

export default ProductAutoFillForm;
