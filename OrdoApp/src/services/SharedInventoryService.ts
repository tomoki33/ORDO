/**
 * Shared Inventory Service
 * 共有在庫管理システム
 */

import { userManagementService, User, FamilyGroup } from './UserManagementService';
import { firebaseService } from './FirebaseServiceSwitcher';

export interface SharedInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  expiryDate?: string;
  purchaseDate?: string;
  cost?: number;
  currency: string;
  barcode?: string;
  brand?: string;
  description?: string;
  photos: string[];
  
  // 共有管理
  familyId: string;
  isShared: boolean;
  sharedWith: string[]; // ユーザーIDのリスト
  visibility: 'all' | 'specific' | 'private';
  
  // 作成・更新情報
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
  
  // 在庫管理
  minQuantity?: number;
  maxQuantity?: number;
  autoReorderEnabled: boolean;
  lowStockAlerted: boolean;
  
  // メタデータ
  tags: string[];
  customFields: Record<string, any>;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  lastSyncAt: number;
}

export interface SharedShoppingList {
  id: string;
  name: string;
  description?: string;
  familyId: string;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
  
  items: SharedShoppingListItem[];
  isCompleted: boolean;
  dueDate?: number;
  priority: 'low' | 'medium' | 'high';
  
  // 共有設定
  isShared: boolean;
  sharedWith: string[];
  collaborators: ShoppingListCollaborator[];
  
  // 設定
  allowAdditions: boolean;
  allowModifications: boolean;
  requireApproval: boolean;
  
  // ステータス
  status: 'draft' | 'active' | 'completed' | 'archived';
  completedAt?: number;
  completedBy?: string;
}

export interface SharedShoppingListItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  estimatedCost?: number;
  currency: string;
  notes?: string;
  
  // ステータス
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: number;
  
  // 購入情報
  actualCost?: number;
  purchaseLocation?: string;
  purchaseDate?: number;
  
  // 在庫連携
  inventoryItemId?: string;
  addToInventoryAfterPurchase: boolean;
  
  // 追加者情報
  addedBy: string;
  addedAt: number;
  priority: 'low' | 'medium' | 'high';
}

export interface ShoppingListCollaborator {
  userId: string;
  displayName: string;
  role: 'viewer' | 'editor' | 'manager';
  joinedAt: number;
  lastActiveAt: number;
  permissions: {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canComplete: boolean;
    canManageCollaborators: boolean;
  };
}

export interface SharedInventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  expiringItems: number;
  recentlyAdded: number;
  categoryBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  contributorStats: Record<string, {
    itemsAdded: number;
    itemsUpdated: number;
    lastActivity: number;
  }>;
}

export interface ShareRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserEmail: string;
  itemType: 'inventory' | 'shoppingList';
  itemId: string;
  itemName: string;
  permissions: string[];
  message?: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
}

class SharedInventoryService {
  private isInitialized = false;
  private listeners: Array<(event: string, data: any) => void> = [];
  private realtimeListeners: Array<() => void> = [];

  constructor() {
    // 初期化時にユーザー管理サービスの状態を監視
    userManagementService.addEventListener((event, data) => {
      this.handleUserManagementEvent(event, data);
    });
  }

  /**
   * 共有在庫サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('📦 Initializing Shared Inventory Service...');

    try {
      // ユーザー管理サービスの初期化確認
      const userStatus = userManagementService.getInitializationStatus();
      if (!userStatus.isInitialized) {
        await userManagementService.initialize();
      }

      // Firebase初期化確認
      await firebaseService.initialize();

      // リアルタイムリスナー設定
      await this.setupRealtimeListeners();

      this.isInitialized = true;
      console.log('✅ Shared Inventory Service initialized');

    } catch (error) {
      console.error('❌ Shared Inventory Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * ユーザー管理サービスイベント処理
   */
  private handleUserManagementEvent(event: string, data: any): void {
    switch (event) {
      case 'user_signed_in':
        this.handleUserSignIn(data.user);
        break;
      case 'user_signed_out':
        this.handleUserSignOut();
        break;
      case 'family_created':
      case 'invitation_accepted':
        this.handleFamilyChange(data.family);
        break;
      case 'family_left':
      case 'family_deleted':
        this.handleFamilyLeave();
        break;
    }
  }

  /**
   * ユーザーサインイン処理
   */
  private async handleUserSignIn(user: User): Promise<void> {
    console.log(`👤 User signed in: ${user.displayName}`);
    
    // 個人在庫データの初期化やマイグレーション処理
    await this.initializeUserInventory(user);
    
    this.notifyListeners('user_inventory_loaded', { user });
  }

  /**
   * ユーザーサインアウト処理
   */
  private handleUserSignOut(): void {
    console.log('👤 User signed out - cleaning up inventory listeners');
    
    // リアルタイムリスナーをクリア
    this.cleanupRealtimeListeners();
    
    this.notifyListeners('user_inventory_unloaded', {});
  }

  /**
   * 家族グループ変更処理
   */
  private async handleFamilyChange(family: FamilyGroup): Promise<void> {
    console.log(`👨‍👩‍👧‍👦 Family group changed: ${family.name}`);
    
    // 新しい家族グループの共有在庫をロード
    await this.loadFamilyInventory(family.id);
    
    // リアルタイムリスナーを再設定
    await this.setupRealtimeListeners();
    
    this.notifyListeners('family_inventory_loaded', { family });
  }

  /**
   * 家族グループ離脱処理
   */
  private handleFamilyLeave(): void {
    console.log('👨‍👩‍👧‍👦 Left family group - switching to personal inventory');
    
    // 共有在庫リスナーをクリア
    this.cleanupRealtimeListeners();
    
    this.notifyListeners('family_inventory_unloaded', {});
  }

  /**
   * リアルタイムリスナー設定
   */
  private async setupRealtimeListeners(): Promise<void> {
    const currentUser = userManagementService.getCurrentUser();
    const currentFamily = userManagementService.getCurrentFamilyGroup();

    if (!currentUser) return;

    // 既存リスナーをクリア
    this.cleanupRealtimeListeners();

    try {
      // 個人在庫リスナー
      const personalInventoryListener = firebaseService
        .collection('inventory')
        .where('createdBy', '==', currentUser.id)
        .where('isShared', '==', false)
        .onSnapshot((snapshot: any) => {
          this.handleInventorySnapshot(snapshot, 'personal');
        });

      this.realtimeListeners.push(personalInventoryListener);

      // 家族共有在庫リスナー
      if (currentFamily) {
        const sharedInventoryListener = firebaseService
          .collection('inventory')
          .where('familyId', '==', currentFamily.id)
          .where('isShared', '==', true)
          .onSnapshot((snapshot: any) => {
            this.handleInventorySnapshot(snapshot, 'shared');
          });

        this.realtimeListeners.push(sharedInventoryListener);

        // 共有ショッピングリストリスナー
        const shoppingListListener = firebaseService
          .collection('shoppingLists')
          .where('familyId', '==', currentFamily.id)
          .onSnapshot((snapshot: any) => {
            this.handleShoppingListSnapshot(snapshot);
          });

        this.realtimeListeners.push(shoppingListListener);
      }

      console.log('📡 Realtime listeners setup completed');

    } catch (error) {
      console.error('Failed to setup realtime listeners:', error);
    }
  }

  /**
   * リアルタイムリスナークリア
   */
  private cleanupRealtimeListeners(): void {
    this.realtimeListeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Failed to cleanup listener:', error);
      }
    });
    this.realtimeListeners = [];
  }

  /**
   * 在庫スナップショット処理
   */
  private handleInventorySnapshot(snapshot: any, type: 'personal' | 'shared'): void {
    const items = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as SharedInventoryItem[];

    this.notifyListeners('inventory_updated', { type, items });
  }

  /**
   * ショッピングリストスナップショット処理
   */
  private handleShoppingListSnapshot(snapshot: any): void {
    const lists = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as SharedShoppingList[];

    this.notifyListeners('shopping_lists_updated', { lists });
  }

  // === 在庫管理 ===

  /**
   * ユーザー在庫初期化
   */
  private async initializeUserInventory(user: User): Promise<void> {
    // 個人在庫の確認と初期化
    console.log(`📦 Initializing inventory for user: ${user.displayName}`);
  }

  /**
   * 家族在庫ロード
   */
  private async loadFamilyInventory(familyId: string): Promise<void> {
    console.log(`📦 Loading family inventory: ${familyId}`);
  }

  /**
   * 在庫アイテム追加
   */
  async addInventoryItem(itemData: Partial<SharedInventoryItem>): Promise<SharedInventoryItem> {
    const currentUser = userManagementService.getCurrentUser();
    const currentFamily = userManagementService.getCurrentFamilyGroup();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // 権限チェック
    if (itemData.isShared && !userManagementService.hasPermission('inventory.add')) {
      throw new Error('Insufficient permissions to add shared inventory items');
    }

    try {
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newItem: SharedInventoryItem = {
        id: itemId,
        name: itemData.name || '',
        category: itemData.category || 'その他',
        quantity: itemData.quantity || 1,
        unit: itemData.unit || '個',
        location: itemData.location || '',
        expiryDate: itemData.expiryDate,
        purchaseDate: itemData.purchaseDate,
        cost: itemData.cost,
        currency: itemData.currency || 'JPY',
        barcode: itemData.barcode,
        brand: itemData.brand,
        description: itemData.description,
        photos: itemData.photos || [],
        
        // 共有管理
        familyId: currentFamily?.id || '',
        isShared: itemData.isShared || false,
        sharedWith: itemData.sharedWith || [],
        visibility: itemData.visibility || 'all',
        
        // 作成・更新情報
        createdBy: currentUser.id,
        createdAt: Date.now(),
        updatedBy: currentUser.id,
        updatedAt: Date.now(),
        
        // 在庫管理
        minQuantity: itemData.minQuantity,
        maxQuantity: itemData.maxQuantity,
        autoReorderEnabled: itemData.autoReorderEnabled || false,
        lowStockAlerted: false,
        
        // メタデータ
        tags: itemData.tags || [],
        customFields: itemData.customFields || {},
        syncStatus: 'synced',
        lastSyncAt: Date.now(),
      };

      // Firestoreに保存
      await firebaseService.collection('inventory').doc(itemId).set(newItem);

      // アクティビティ記録
      await userManagementService.recordActivity(
        currentUser.id,
        'inventory_item_added',
        'product',
        itemId,
        `「${newItem.name}」を${newItem.isShared ? '共有' : '個人'}在庫に追加しました`,
        newItem.isShared ? currentFamily?.id : undefined,
        { item: newItem }
      );

      console.log(`📦 Inventory item added: ${newItem.name}`);
      this.notifyListeners('item_added', { item: newItem });

      return newItem;

    } catch (error) {
      console.error('Failed to add inventory item:', error);
      throw error;
    }
  }

  /**
   * 在庫アイテム更新
   */
  async updateInventoryItem(itemId: string, updates: Partial<SharedInventoryItem>): Promise<SharedInventoryItem> {
    const currentUser = userManagementService.getCurrentUser();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // 既存アイテム取得
      const itemDoc = await firebaseService.collection('inventory').doc(itemId).get();
      if (!itemDoc.exists) {
        throw new Error('Inventory item not found');
      }

      const existingItem = itemDoc.data() as SharedInventoryItem;

      // 権限チェック
      if (existingItem.isShared && !userManagementService.hasPermission('inventory.edit')) {
        throw new Error('Insufficient permissions to edit shared inventory items');
      }

      // 個人アイテムの場合は作成者のみ編集可能
      if (!existingItem.isShared && existingItem.createdBy !== currentUser.id) {
        throw new Error('You can only edit your own inventory items');
      }

      // 更新データ準備
      const updatedItem: SharedInventoryItem = {
        ...existingItem,
        ...updates,
        id: itemId, // IDは変更不可
        updatedBy: currentUser.id,
        updatedAt: Date.now(),
        lastSyncAt: Date.now(),
        syncStatus: 'synced',
      };

      // Firestore更新
      await firebaseService.collection('inventory').doc(itemId).update(updatedItem);

      // アクティビティ記録
      await userManagementService.recordActivity(
        currentUser.id,
        'inventory_item_updated',
        'product',
        itemId,
        `「${updatedItem.name}」を更新しました`,
        updatedItem.isShared ? updatedItem.familyId : undefined,
        { updates, item: updatedItem }
      );

      console.log(`📦 Inventory item updated: ${updatedItem.name}`);
      this.notifyListeners('item_updated', { item: updatedItem, updates });

      return updatedItem;

    } catch (error) {
      console.error('Failed to update inventory item:', error);
      throw error;
    }
  }

  /**
   * 在庫アイテム削除
   */
  async deleteInventoryItem(itemId: string): Promise<void> {
    const currentUser = userManagementService.getCurrentUser();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // 既存アイテム取得
      const itemDoc = await firebaseService.collection('inventory').doc(itemId).get();
      if (!itemDoc.exists) {
        throw new Error('Inventory item not found');
      }

      const item = itemDoc.data() as SharedInventoryItem;

      // 権限チェック
      if (item.isShared && !userManagementService.hasPermission('inventory.delete')) {
        throw new Error('Insufficient permissions to delete shared inventory items');
      }

      // 個人アイテムの場合は作成者のみ削除可能
      if (!item.isShared && item.createdBy !== currentUser.id) {
        throw new Error('You can only delete your own inventory items');
      }

      // Firestoreから削除
      await firebaseService.collection('inventory').doc(itemId).delete();

      // アクティビティ記録
      await userManagementService.recordActivity(
        currentUser.id,
        'inventory_item_deleted',
        'product',
        itemId,
        `「${item.name}」を削除しました`,
        item.isShared ? item.familyId : undefined,
        { item }
      );

      console.log(`📦 Inventory item deleted: ${item.name}`);
      this.notifyListeners('item_deleted', { item });

    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      throw error;
    }
  }

  /**
   * アイテム共有設定変更
   */
  async updateItemSharingSettings(
    itemId: string, 
    isShared: boolean, 
    sharedWith: string[] = [],
    visibility: SharedInventoryItem['visibility'] = 'all'
  ): Promise<void> {
    const currentUser = userManagementService.getCurrentUser();
    const currentFamily = userManagementService.getCurrentFamilyGroup();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    if (isShared && !currentFamily) {
      throw new Error('Cannot share items without being in a family group');
    }

    try {
      const updates: Partial<SharedInventoryItem> = {
        isShared,
        sharedWith,
        visibility,
        familyId: isShared ? currentFamily!.id : '',
        updatedBy: currentUser.id,
        updatedAt: Date.now(),
      };

      await this.updateInventoryItem(itemId, updates);

      const action = isShared ? 'item_shared' : 'item_unshared';
      const description = isShared ? 'アイテムを共有にしました' : 'アイテムの共有を解除しました';

      // アクティビティ記録
      await userManagementService.recordActivity(
        currentUser.id,
        action,
        'product',
        itemId,
        description,
        isShared ? currentFamily!.id : undefined,
        { isShared, sharedWith, visibility }
      );

      this.notifyListeners('item_sharing_updated', { itemId, isShared, sharedWith, visibility });

    } catch (error) {
      console.error('Failed to update item sharing settings:', error);
      throw error;
    }
  }

  // === ショッピングリスト管理 ===

  /**
   * 共有ショッピングリスト作成
   */
  async createShoppingList(listData: Partial<SharedShoppingList>): Promise<SharedShoppingList> {
    const currentUser = userManagementService.getCurrentUser();
    const currentFamily = userManagementService.getCurrentFamilyGroup();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // 権限チェック
    if (listData.isShared && !userManagementService.hasPermission('shopping.create')) {
      throw new Error('Insufficient permissions to create shared shopping lists');
    }

    try {
      const listId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newList: SharedShoppingList = {
        id: listId,
        name: listData.name || '新しいショッピングリスト',
        description: listData.description,
        familyId: listData.isShared ? currentFamily?.id || '' : '',
        createdBy: currentUser.id,
        createdAt: Date.now(),
        updatedBy: currentUser.id,
        updatedAt: Date.now(),
        
        items: [],
        isCompleted: false,
        dueDate: listData.dueDate,
        priority: listData.priority || 'medium',
        
        // 共有設定
        isShared: listData.isShared || false,
        sharedWith: listData.sharedWith || [],
        collaborators: [{
          userId: currentUser.id,
          displayName: currentUser.displayName,
          role: 'manager',
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          permissions: {
            canAdd: true,
            canEdit: true,
            canDelete: true,
            canComplete: true,
            canManageCollaborators: true,
          },
        }],
        
        // 設定
        allowAdditions: listData.allowAdditions !== false,
        allowModifications: listData.allowModifications !== false,
        requireApproval: listData.requireApproval || false,
        
        // ステータス
        status: 'active',
      };

      // Firestoreに保存
      await firebaseService.collection('shoppingLists').doc(listId).set(newList);

      // アクティビティ記録
      await userManagementService.recordActivity(
        currentUser.id,
        'shopping_list_created',
        'shoppingList',
        listId,
        `ショッピングリスト「${newList.name}」を作成しました`,
        newList.isShared ? currentFamily?.id : undefined,
        { list: newList }
      );

      console.log(`🛒 Shopping list created: ${newList.name}`);
      this.notifyListeners('shopping_list_created', { list: newList });

      return newList;

    } catch (error) {
      console.error('Failed to create shopping list:', error);
      throw error;
    }
  }

  /**
   * ショッピングリストにアイテム追加
   */
  async addShoppingListItem(
    listId: string, 
    itemData: Partial<SharedShoppingListItem>
  ): Promise<SharedShoppingListItem> {
    const currentUser = userManagementService.getCurrentUser();

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // ショッピングリスト取得
      const listDoc = await firebaseService.collection('shoppingLists').doc(listId).get();
      if (!listDoc.exists) {
        throw new Error('Shopping list not found');
      }

      const shoppingList = listDoc.data() as SharedShoppingList;

      // 権限チェック
      const collaborator = shoppingList.collaborators.find(c => c.userId === currentUser.id);
      if (!collaborator || !collaborator.permissions.canAdd) {
        throw new Error('Insufficient permissions to add items to this list');
      }

      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newItem: SharedShoppingListItem = {
        id: itemId,
        name: itemData.name || '',
        category: itemData.category,
        quantity: itemData.quantity || 1,
        unit: itemData.unit || '個',
        estimatedCost: itemData.estimatedCost,
        currency: itemData.currency || 'JPY',
        notes: itemData.notes,
        
        // ステータス
        isCompleted: false,
        
        // 在庫連携
        inventoryItemId: itemData.inventoryItemId,
        addToInventoryAfterPurchase: itemData.addToInventoryAfterPurchase || false,
        
        // 追加者情報
        addedBy: currentUser.id,
        addedAt: Date.now(),
        priority: itemData.priority || 'medium',
      };

      // リストに追加
      shoppingList.items.push(newItem);
      shoppingList.updatedBy = currentUser.id;
      shoppingList.updatedAt = Date.now();

      // Firestore更新
      await firebaseService.collection('shoppingLists').doc(listId).update({
        items: shoppingList.items,
        updatedBy: shoppingList.updatedBy,
        updatedAt: shoppingList.updatedAt,
      });

      // アクティビティ記録
      await userManagementService.recordActivity(
        currentUser.id,
        'shopping_list_item_added',
        'shoppingList',
        listId,
        `「${newItem.name}」をショッピングリストに追加しました`,
        shoppingList.isShared ? shoppingList.familyId : undefined,
        { item: newItem, listName: shoppingList.name }
      );

      console.log(`🛒 Shopping list item added: ${newItem.name}`);
      this.notifyListeners('shopping_list_item_added', { listId, item: newItem });

      return newItem;

    } catch (error) {
      console.error('Failed to add shopping list item:', error);
      throw error;
    }
  }

  // === 統計・分析 ===

  /**
   * 共有在庫統計取得
   */
  async getSharedInventoryStats(familyId?: string): Promise<SharedInventoryStats> {
    const currentUser = userManagementService.getCurrentUser();
    const currentFamily = userManagementService.getCurrentFamilyGroup();
    
    const targetFamilyId = familyId || currentFamily?.id;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // 共有在庫アイテム取得
      const inventoryQuery = await firebaseService
        .collection('inventory')
        .where('familyId', '==', targetFamilyId)
        .where('isShared', '==', true)
        .get();

      const items = inventoryQuery.docs.map((doc: any) => doc.data() as SharedInventoryItem);

      // 統計計算
      const stats: SharedInventoryStats = {
        totalItems: items.length,
        totalValue: items.reduce((sum: number, item: SharedInventoryItem) => sum + (item.cost || 0), 0),
        lowStockItems: items.filter((item: SharedInventoryItem) => 
          item.minQuantity && item.quantity <= item.minQuantity
        ).length,
        expiringItems: items.filter((item: SharedInventoryItem) => {
          if (!item.expiryDate) return false;
          const expiryTime = new Date(item.expiryDate).getTime();
          const now = Date.now();
          const threeDays = 3 * 24 * 60 * 60 * 1000;
          return expiryTime <= now + threeDays;
        }).length,
        recentlyAdded: items.filter((item: SharedInventoryItem) => 
          Date.now() - item.createdAt <= 7 * 24 * 60 * 60 * 1000
        ).length,
        categoryBreakdown: {},
        locationBreakdown: {},
        contributorStats: {},
      };

      // カテゴリー別集計
      items.forEach((item: SharedInventoryItem) => {
        stats.categoryBreakdown[item.category] = 
          (stats.categoryBreakdown[item.category] || 0) + 1;
      });

      // ロケーション別集計
      items.forEach((item: SharedInventoryItem) => {
        stats.locationBreakdown[item.location] = 
          (stats.locationBreakdown[item.location] || 0) + 1;
      });

      // コントリビューター別集計
      items.forEach((item: SharedInventoryItem) => {
        if (!stats.contributorStats[item.createdBy]) {
          stats.contributorStats[item.createdBy] = {
            itemsAdded: 0,
            itemsUpdated: 0,
            lastActivity: 0,
          };
        }
        
        stats.contributorStats[item.createdBy].itemsAdded++;
        stats.contributorStats[item.createdBy].lastActivity = Math.max(
          stats.contributorStats[item.createdBy].lastActivity,
          item.updatedAt
        );
      });

      return stats;

    } catch (error) {
      console.error('Failed to get shared inventory stats:', error);
      throw error;
    }
  }

  // === ユーティリティ ===

  /**
   * リスナー通知
   */
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Listener notification failed:', error);
      }
    });
  }

  // === 公開API ===

  /**
   * イベントリスナー追加
   */
  addEventListener(listener: (event: string, data: any) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 初期化状態取得
   */
  getInitializationStatus(): { isInitialized: boolean } {
    return { isInitialized: this.isInitialized };
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    this.cleanupRealtimeListeners();
    this.listeners = [];
    this.isInitialized = false;
    
    console.log('🧹 Shared Inventory Service cleanup completed');
  }
}

export const sharedInventoryService = new SharedInventoryService();
