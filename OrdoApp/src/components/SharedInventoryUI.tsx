import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Switch,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { sharedInventoryService } from '../services/SharedInventoryService';
import { notificationService } from '../services/NotificationService';

interface SharedInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  cost?: number;
  expiryDate?: string;
  minQuantity?: number;
  notes?: string;
  imageUrl?: string;
  barcode?: string;
  addedBy: string;
  addedByName: string;
  lastModifiedBy: string;
  lastModifiedByName: string;
  createdAt: number;
  updatedAt: number;
}

interface SharedInventoryUIProps {
  familyId: string;
  onNavigateBack?: () => void;
}

export const SharedInventoryUI: React.FC<SharedInventoryUIProps> = ({ 
  familyId, 
  onNavigateBack 
}) => {
  const [items, setItems] = useState<SharedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiry' | 'updated'>('name');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  
  // 新しいアイテム追加用の状態
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    location: '',
    cost: '',
    expiryDate: '',
    minQuantity: '',
    notes: '',
  });

  const categories = [
    'all', '食品', '飲料', '調味料', '冷凍食品', '日用品', '清掃用品', 'その他'
  ];

  const locations = [
    'all', '冷蔵庫', '冷凍庫', '常温保存', 'パントリー', '洗面所', 'キッチン', 'その他'
  ];

  useEffect(() => {
    loadInventoryData();
    
    // リアルタイム更新のリスナーを設定
    const unsubscribe = sharedInventoryService.addEventListener(
      (event: string, data: any) => {
        if (event === 'family_inventory_loaded' || event === 'inventory_item_updated') {
          loadInventoryData();
        }
      }
    );

    return unsubscribe;
  }, [familyId]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      // SharedInventoryServiceにgetSharedInventoryメソッドがないため、
      // 統計から在庫情報を取得するか、別の方法を使用
      // ここでは仮の実装として空配列を設定
      setItems([]);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      Alert.alert('エラー', '在庫データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !newItem.quantity.trim()) {
      Alert.alert('エラー', '商品名と数量は必須です');
      return;
    }

    try {
      setLoading(true);
      const itemData: Omit<SharedInventoryItem, 'id' | 'addedBy' | 'addedByName' | 'lastModifiedBy' | 'lastModifiedByName' | 'createdAt' | 'updatedAt'> = {
        name: newItem.name.trim(),
        category: newItem.category || 'その他',
        quantity: parseInt(newItem.quantity),
        unit: newItem.unit || '個',
        location: newItem.location || 'その他',
        cost: newItem.cost ? parseFloat(newItem.cost) : undefined,
        expiryDate: newItem.expiryDate || undefined,
        minQuantity: newItem.minQuantity ? parseInt(newItem.minQuantity) : undefined,
        notes: newItem.notes.trim() || undefined,
      };

      const addedItem = await sharedInventoryService.addInventoryItem(itemData);
      
      Alert.alert('成功', '商品を追加しました');
      setShowAddModal(false);
      resetNewItem();
      
      // 通知を送信
      await notificationService.sendSharedInventoryNotification(
        familyId,
        'current-user-id', // 実際のユーザーIDを使用
        'added',
        newItem.name,
        addedItem.id
      );
    } catch (error) {
      console.error('Failed to add item:', error);
      Alert.alert('エラー', '商品の追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (item: SharedInventoryItem, change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity < 0) return;

    try {
      await sharedInventoryService.updateInventoryItem(item.id, {
        quantity: newQuantity,
      });

      // 在庫不足の通知チェック
      if (item.minQuantity && newQuantity <= item.minQuantity) {
        await notificationService.sendSharedInventoryNotification(
          familyId,
          'current-user-id',
          'low_stock',
          item.name,
          item.id
        );
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      Alert.alert('エラー', '数量の更新に失敗しました');
    }
  };

  const handleDeleteItem = async (item: SharedInventoryItem) => {
    Alert.alert(
      '削除確認',
      `${item.name}を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await sharedInventoryService.deleteInventoryItem(item.id);
              
              // 通知を送信
              await notificationService.sendSharedInventoryNotification(
                familyId,
                'current-user-id',
                'removed',
                item.name,
                item.id
              );
            } catch (error) {
              console.error('Failed to delete item:', error);
              Alert.alert('エラー', '商品の削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const resetNewItem = () => {
    setNewItem({
      name: '',
      category: '',
      quantity: '',
      unit: '',
      location: '',
      cost: '',
      expiryDate: '',
      minQuantity: '',
      notes: '',
    });
  };

  const getFilteredAndSortedItems = () => {
    let filtered = items;

    // 検索フィルター
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // カテゴリフィルター
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // ロケーションフィルター
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.location === selectedLocation);
    }

    // 在庫不足フィルター
    if (showLowStock) {
      filtered = filtered.filter(item => 
        item.minQuantity && item.quantity <= item.minQuantity
      );
    }

    // 期限切れ間近フィルター
    if (showExpiring) {
      const threeDaysFromNow = Date.now() + (3 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => {
        if (!item.expiryDate) return false;
        return new Date(item.expiryDate).getTime() <= threeDaysFromNow;
      });
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'expiry':
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        case 'updated':
          return b.updatedAt - a.updatedAt;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getStatusColor = (item: SharedInventoryItem) => {
    // 期限切れチェック
    if (item.expiryDate) {
      const now = Date.now();
      const expiryTime = new Date(item.expiryDate).getTime();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      
      if (expiryTime <= now) return '#FF3B30'; // 期限切れ
      if (expiryTime <= now + threeDays) return '#FF9500'; // 期限切れ間近
    }
    
    // 在庫不足チェック
    if (item.minQuantity && item.quantity <= item.minQuantity) {
      return '#FF9500'; // 在庫不足
    }
    
    return '#34C759'; // 正常
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const renderInventoryItem = ({ item }: { item: SharedInventoryItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDetails}>
            {item.category} • {item.location}
          </Text>
          {item.expiryDate && (
            <Text style={[styles.itemExpiry, { color: getStatusColor(item) }]}>
              期限: {formatDate(item.expiryDate)}
            </Text>
          )}
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item) }]} />
      </View>

      <View style={styles.itemActions}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item, -1)}
            disabled={item.quantity <= 0}
          >
            <Icon name="remove" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>
            {item.quantity} {item.unit}
          </Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item, 1)}
          >
            <Icon name="add" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.itemActionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="edit" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteActionButton]}
            onPress={() => handleDeleteItem(item)}
          >
            <Icon name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {item.notes && (
        <Text style={styles.itemNotes}>{item.notes}</Text>
      )}

      <Text style={styles.itemMeta}>
        追加者: {item.addedByName} • 更新: {new Date(item.updatedAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const filteredItems = getFilteredAndSortedItems();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>共有在庫</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* 検索とフィルター */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="商品を検索..."
            placeholderTextColor="#8E8E93"
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="filter-list" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* 統計表示 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{items.length}</Text>
          <Text style={styles.statLabel}>総商品数</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {items.filter(item => item.minQuantity && item.quantity <= item.minQuantity).length}
          </Text>
          <Text style={styles.statLabel}>在庫不足</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {items.filter(item => {
              if (!item.expiryDate) return false;
              const threeDays = 3 * 24 * 60 * 60 * 1000;
              return new Date(item.expiryDate).getTime() <= Date.now() + threeDays;
            }).length}
          </Text>
          <Text style={styles.statLabel}>期限間近</Text>
        </View>
      </View>

      {/* 在庫リスト */}
      <FlatList
        data={filteredItems}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        style={styles.itemsList}
        contentContainerStyle={styles.itemsListContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 商品追加モーダル */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                resetNewItem();
              }}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>商品追加</Text>
            <TouchableOpacity
              onPress={handleAddItem}
              style={styles.modalDoneButton}
            >
              <Text style={styles.modalDoneText}>追加</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>商品名 *</Text>
              <TextInput
                style={styles.textInput}
                value={newItem.name}
                onChangeText={(text) => setNewItem({ ...newItem, name: text })}
                placeholder="商品名を入力"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>数量 *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newItem.quantity}
                  onChangeText={(text) => setNewItem({ ...newItem, quantity: text })}
                  placeholder="数量"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>単位</Text>
                <TextInput
                  style={styles.textInput}
                  value={newItem.unit}
                  onChangeText={(text) => setNewItem({ ...newItem, unit: text })}
                  placeholder="個"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>カテゴリ</Text>
                <TextInput
                  style={styles.textInput}
                  value={newItem.category}
                  onChangeText={(text) => setNewItem({ ...newItem, category: text })}
                  placeholder="食品"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>保存場所</Text>
                <TextInput
                  style={styles.textInput}
                  value={newItem.location}
                  onChangeText={(text) => setNewItem({ ...newItem, location: text })}
                  placeholder="冷蔵庫"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>期限日</Text>
              <TextInput
                style={styles.textInput}
                value={newItem.expiryDate}
                onChangeText={(text) => setNewItem({ ...newItem, expiryDate: text })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>メモ</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newItem.notes}
                onChangeText={(text) => setNewItem({ ...newItem, notes: text })}
                placeholder="商品に関するメモ"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* フィルターモーダル */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            <Text style={styles.filterModalTitle}>フィルター</Text>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>表示オプション</Text>
              <View style={styles.filterOption}>
                <Text style={styles.filterOptionText}>在庫不足のみ</Text>
                <Switch
                  value={showLowStock}
                  onValueChange={setShowLowStock}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.filterOption}>
                <Text style={styles.filterOptionText}>期限切れ間近のみ</Text>
                <Switch
                  value={showExpiring}
                  onValueChange={setShowExpiring}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={styles.filterCancelButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.filterCancelText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1C1C1E',
  },
  filterButton: {
    marginLeft: 12,
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  itemsList: {
    flex: 1,
    marginTop: 16,
  },
  itemsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  itemExpiry: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginHorizontal: 12,
    minWidth: 60,
    textAlign: 'center',
  },
  itemActionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteActionButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 6,
  },
  itemNotes: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancelButton: {
    padding: 8,
  },
  modalCancelText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalDoneButton: {
    padding: 8,
  },
  modalDoneText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1C1C1E',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  filterButtons: {
    alignItems: 'center',
  },
  filterCancelButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  filterCancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SharedInventoryUI;
