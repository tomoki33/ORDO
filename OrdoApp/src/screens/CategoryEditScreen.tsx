import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  List,
  Switch,
  Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CategoryRepository, Category, CategoryCreateInput } from '../database/CategoryRepository';
import { SPACING } from '../constants';

interface CategoryEditScreenProps {
  navigation: any;
  route: {
    params?: {
      categoryId?: string;
    };
  };
}

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
  '#F1948A', '#85C1E9', '#F7DC6F', '#D7BDE2', '#A3E4D7',
];

const PRESET_ICONS = [
  'food-apple', 'food-croissant', 'food-variant', 'fish', 'cow',
  'carrot', 'ice-cream', 'coffee', 'bottle-wine', 'candy',
  'cake', 'pizza', 'hamburger', 'pasta', 'rice',
];

const CategoryEditScreen: React.FC<CategoryEditScreenProps> = ({ navigation, route }) => {
  const theme = useTheme();
  const { categoryId } = route.params || {};
  const isEditing = !!categoryId;

  const [formData, setFormData] = useState<CategoryCreateInput>({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    icon: PRESET_ICONS[0],
    parentId: undefined,
    isSystemCategory: false,
    displayOrder: 0,
    isActive: true,
    defaultExpirationDays: undefined,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const categoryRepository = new CategoryRepository();

  useEffect(() => {
    loadCategories();
    if (isEditing) {
      loadCategory();
    }
  }, [categoryId]);

  const loadCategories = async () => {
    try {
      const allCategories = await categoryRepository.findAll();
      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadCategory = async () => {
    if (!categoryId) return;
    
    try {
      const category = await categoryRepository.findById(categoryId);
      if (category) {
        setFormData({
          name: category.name,
          description: category.description || '',
          color: category.color || PRESET_COLORS[0],
          icon: category.icon || PRESET_ICONS[0],
          parentId: category.parentId,
          isSystemCategory: category.isSystemCategory,
          displayOrder: category.displayOrder || 0,
          isActive: category.isActive,
          defaultExpirationDays: category.defaultExpirationDays,
        });
      }
    } catch (error) {
      console.error('Failed to load category:', error);
      Alert.alert('エラー', 'カテゴリの読み込みに失敗しました');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'カテゴリ名は必須です';
    }

    if (formData.name.length > 50) {
      newErrors.name = 'カテゴリ名は50文字以内で入力してください';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = '説明は200文字以内で入力してください';
    }

    if (formData.defaultExpirationDays && (formData.defaultExpirationDays < 1 || formData.defaultExpirationDays > 365)) {
      newErrors.defaultExpirationDays = 'デフォルト期限は1-365日の範囲で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      if (isEditing) {
        await categoryRepository.update(categoryId!, formData);
        Alert.alert('成功', 'カテゴリを更新しました');
      } else {
        await categoryRepository.create(formData);
        Alert.alert('成功', 'カテゴリを作成しました');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Failed to save category:', error);
      Alert.alert('エラー', 'カテゴリの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !categoryId) return;

    try {
      const canDelete = await categoryRepository.canDeleteCategory(categoryId);
      
      if (!canDelete.canDelete) {
        Alert.alert('削除できません', canDelete.reason);
        return;
      }

      Alert.alert(
        'カテゴリを削除',
        'このカテゴリを削除してもよろしいですか？この操作は取り消せません。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                await categoryRepository.delete(categoryId);
                Alert.alert('成功', 'カテゴリを削除しました');
                navigation.goBack();
              } catch (error) {
                Alert.alert('エラー', 'カテゴリの削除に失敗しました');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to check category deletion:', error);
      Alert.alert('エラー', '削除の確認に失敗しました');
    }
  };

  const updateFormData = (key: keyof CategoryCreateInput, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const renderColorSelector = () => (
    <Card style={styles.section}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          カテゴリカラー
        </Text>
        <View style={styles.colorGrid}>
          {PRESET_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                formData.color === color && styles.selectedColor,
              ]}
              onPress={() => updateFormData('color', color)}
            >
              {formData.color === color && (
                <Icon name="check" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const renderIconSelector = () => (
    <Card style={styles.section}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          カテゴリアイコン
        </Text>
        <View style={styles.iconGrid}>
          {PRESET_ICONS.map((iconName) => (
            <TouchableOpacity
              key={iconName}
              style={[
                styles.iconOption,
                formData.icon === iconName && styles.selectedIcon,
              ]}
              onPress={() => updateFormData('icon', iconName)}
            >
              <Icon
                name={iconName}
                size={24}
                color={formData.icon === iconName ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const availableParentCategories = categories.filter(cat => 
    cat.id !== categoryId && cat.level < 3 // Prevent deep nesting
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 基本情報 */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              基本情報
            </Text>
            
            <TextInput
              label="カテゴリ名 *"
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
              error={!!errors.name}
              style={styles.input}
              mode="outlined"
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.name}
              </Text>
            )}

            <TextInput
              label="説明"
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              error={!!errors.description}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
            {errors.description && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.description}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* 親カテゴリ選択 */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              親カテゴリ
            </Text>
            
            <View style={styles.parentCategoryContainer}>
              <Chip
                selected={!formData.parentId}
                onPress={() => updateFormData('parentId', undefined)}
                style={styles.parentCategoryChip}
              >
                なし（ルートカテゴリ）
              </Chip>
              {availableParentCategories.map((category) => (
                <Chip
                  key={category.id}
                  selected={formData.parentId === category.id}
                  onPress={() => updateFormData('parentId', category.id)}
                  style={styles.parentCategoryChip}
                >
                  {category.name}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {renderColorSelector()}
        {renderIconSelector()}

        {/* 詳細設定 */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              詳細設定
            </Text>
            
            <List.Item
              title="アクティブ"
              description="カテゴリを有効にする"
              right={() => (
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => updateFormData('isActive', value)}
                />
              )}
            />

            <TextInput
              label="デフォルト期限日数"
              value={formData.defaultExpirationDays?.toString() || ''}
              onChangeText={(text) => {
                const days = parseInt(text) || undefined;
                updateFormData('defaultExpirationDays', days);
              }}
              keyboardType="numeric"
              error={!!errors.defaultExpirationDays}
              style={styles.input}
              mode="outlined"
              right={<TextInput.Affix text="日" />}
            />
            {errors.defaultExpirationDays && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.defaultExpirationDays}
              </Text>
            )}

            <TextInput
              label="表示順序"
              value={formData.displayOrder?.toString() || '0'}
              onChangeText={(text) => {
                const order = parseInt(text) || 0;
                updateFormData('displayOrder', order);
              }}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />
          </Card.Content>
        </Card>

        {/* プレビュー */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              プレビュー
            </Text>
            
            <View style={styles.previewContainer}>
              <View style={[styles.categoryColor, { backgroundColor: formData.color }]} />
              <Icon name={formData.icon} size={24} color={formData.color} style={styles.previewIcon} />
              <View style={styles.previewText}>
                <Text variant="titleMedium">{formData.name || 'カテゴリ名'}</Text>
                {formData.description && (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formData.description}
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* アクションボタン */}
      <View style={[styles.actionButtons, { backgroundColor: theme.colors.surface }]}>
        {isEditing && (
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={[styles.button, styles.deleteButton]}
            labelStyle={{ color: theme.colors.error }}
            loading={loading}
          >
            削除
          </Button>
        )}
        
        <Button
          mode="contained"
          onPress={handleSave}
          style={[styles.button, styles.saveButton]}
          loading={loading}
        >
          {isEditing ? '更新' : '作成'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
    paddingBottom: 100, // Space for action buttons
  },
  section: {
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    marginBottom: SPACING.MD,
    fontWeight: '600',
  },
  input: {
    marginBottom: SPACING.SM,
  },
  errorText: {
    fontSize: 12,
    marginTop: -SPACING.SM,
    marginBottom: SPACING.SM,
    marginLeft: SPACING.SM,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedIcon: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  parentCategoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  parentCategoryChip: {
    marginBottom: SPACING.SM,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  categoryColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: SPACING.SM,
  },
  previewIcon: {
    marginRight: SPACING.SM,
  },
  previewText: {
    flex: 1,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.MD,
    gap: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  button: {
    flex: 1,
  },
  deleteButton: {
    marginRight: SPACING.SM,
  },
  saveButton: {},
});

export default CategoryEditScreen;
