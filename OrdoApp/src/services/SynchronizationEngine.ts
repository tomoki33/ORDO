/**
 * Real-time Synchronization Engine
 * リアルタイム同期エンジン（Firebase + AWS + オフライン対応）
 */

import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import BackgroundJob from 'react-native-background-job';
import { authService } from './AuthenticationService';

export interface SyncData {
  id: string;
  collection: string;
  data: any;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  deviceId: string;
  userId: string;
  version: number;
  checksum: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
}

export interface SyncConfig {
  enableRealTime: boolean;
  enableBackground: boolean;
  syncInterval: number; // seconds
  maxRetries: number;
  batchSize: number;
  conflictResolution: 'client-wins' | 'server-wins' | 'manual' | 'timestamp-wins';
  enableCompression: boolean;
  enableEncryption: boolean;
}

export interface SyncStatistics {
  totalOperations: number;
  pendingOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictCount: number;
  lastSyncTime: number | null;
  averageSyncTime: number;
  networkStatus: string;
  isBackgroundSyncActive: boolean;
}

export interface ConflictData {
  id: string;
  collection: string;
  localData: any;
  remoteData: any;
  localTimestamp: number;
  remoteTimestamp: number;
  conflictType: 'data' | 'delete' | 'version';
}

class SynchronizationEngine {
  private isInitialized = false;
  private isOnline = true;
  private isSyncing = false;
  private syncQueue: SyncData[] = [];
  private conflictQueue: ConflictData[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private backgroundSyncActive = false;
  private syncStats: SyncStatistics;
  private listeners: Array<(event: string, data: any) => void> = [];

  private config: SyncConfig = {
    enableRealTime: true,
    enableBackground: true,
    syncInterval: 30, // 30秒
    maxRetries: 3,
    batchSize: 50,
    conflictResolution: 'timestamp-wins',
    enableCompression: true,
    enableEncryption: true,
  };

  // 同期対象コレクション
  private syncCollections = [
    'products',
    'inventory',
    'shopping_lists',
    'user_preferences',
    'voice_commands',
    'analytics',
  ];

  constructor() {
    this.syncStats = {
      totalOperations: 0,
      pendingOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictCount: 0,
      lastSyncTime: null,
      averageSyncTime: 0,
      networkStatus: 'unknown',
      isBackgroundSyncActive: false,
    };
  }

  /**
   * 同期エンジン初期化
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing Synchronization Engine...');

    try {
      // ネットワーク状態監視開始
      await this.setupNetworkMonitoring();

      // オフラインキューの復元
      await this.restoreSyncQueue();

      // リアルタイムリスナー設定
      if (this.config.enableRealTime) {
        await this.setupRealtimeListeners();
      }

      // バックグラウンド同期設定
      if (this.config.enableBackground) {
        await this.setupBackgroundSync();
      }

      // 定期同期開始
      this.startPeriodicSync();

      // 初回同期実行
      await this.performInitialSync();

      this.isInitialized = true;
      console.log('✅ Synchronization Engine initialized');

    } catch (error) {
      console.error('❌ Synchronization Engine initialization failed:', error);
      throw new Error(`Sync engine initialization failed: ${error}`);
    }
  }

  /**
   * ネットワーク監視設定
   */
  private async setupNetworkMonitoring(): Promise<void> {
    // 初期ネットワーク状態取得
    const networkState = await NetInfo.fetch();
    this.isOnline = networkState.isConnected ?? false;
    this.syncStats.networkStatus = networkState.type || 'unknown';

    console.log(`📶 Network status: ${this.syncStats.networkStatus} (${this.isOnline ? 'online' : 'offline'})`);

    // ネットワーク状態変更監視
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      this.syncStats.networkStatus = state.type || 'unknown';

      console.log(`📶 Network changed: ${this.syncStats.networkStatus} (${this.isOnline ? 'online' : 'offline'})`);

      // オンライン復帰時に同期実行
      if (!wasOnline && this.isOnline) {
        console.log('🌐 Network restored, starting sync...');
        this.triggerSync();
      }

      this.notifyListeners('network_changed', {
        isOnline: this.isOnline,
        networkType: this.syncStats.networkStatus,
      });
    });
  }

  /**
   * 同期キューの復元
   */
  private async restoreSyncQueue(): Promise<void> {
    try {
      const savedQueue = await AsyncStorage.getItem('ordo_sync_queue');
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue);
        this.syncStats.pendingOperations = this.syncQueue.length;
        console.log(`📦 Restored ${this.syncQueue.length} pending sync operations`);
      }
    } catch (error) {
      console.error('Failed to restore sync queue:', error);
    }
  }

  /**
   * リアルタイムリスナー設定
   */
  private async setupRealtimeListeners(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      console.log('⚠️ No authenticated user, skipping realtime listeners');
      return;
    }

    // 各コレクションにリアルタイムリスナーを設定
    this.syncCollections.forEach(collection => {
      const collectionRef = firestore()
        .collection(collection)
        .where('userId', '==', user.id);

      collectionRef.onSnapshot(
        snapshot => {
          snapshot.docChanges().forEach(change => {
            this.handleRealtimeChange(collection, change);
          });
        },
        error => {
          console.error(`Realtime listener error for ${collection}:`, error);
        }
      );
    });

    console.log('🔴 Realtime listeners setup complete');
  }

  /**
   * リアルタイム変更処理
   */
  private handleRealtimeChange(collection: string, change: any): void {
    const { type, doc } = change;
    const data = doc.data();

    // 自分のデバイスからの変更は無視
    if (data.deviceId === this.getDeviceId()) {
      return;
    }

    console.log(`🔴 Realtime ${type} detected in ${collection}:`, doc.id);

    this.notifyListeners('realtime_change', {
      collection,
      type,
      id: doc.id,
      data,
    });

    // ローカルデータを更新
    this.updateLocalData(collection, doc.id, data, type);
  }

  /**
   * バックグラウンド同期設定
   */
  private async setupBackgroundSync(): Promise<void> {
    try {
      BackgroundJob.register({
        jobKey: 'ordoBackgroundSync',
        job: () => {
          console.log('🔄 Background sync triggered');
          this.performBackgroundSync();
        },
      });

      this.backgroundSyncActive = true;
      this.syncStats.isBackgroundSyncActive = true;
      console.log('📱 Background sync setup complete');

    } catch (error) {
      console.error('Background sync setup failed:', error);
    }
  }

  /**
   * 定期同期開始
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        console.log('⏰ Periodic sync triggered');
        this.triggerSync();
      }
    }, this.config.syncInterval * 1000);

    console.log(`⏰ Periodic sync started (${this.config.syncInterval}s interval)`);
  }

  /**
   * 初回同期実行
   */
  private async performInitialSync(): Promise<void> {
    if (!this.isOnline) {
      console.log('📡 Offline - skipping initial sync');
      return;
    }

    console.log('🚀 Performing initial sync...');

    try {
      await this.downloadAllData();
      await this.uploadPendingChanges();
      console.log('✅ Initial sync completed');

    } catch (error) {
      console.error('❌ Initial sync failed:', error);
    }
  }

  // === 同期操作 ===

  /**
   * データ同期トリガー
   */
  async triggerSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress');
      return;
    }

    if (!this.isOnline) {
      console.log('📡 Offline - queueing changes for later sync');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Starting sync operation...');

      // 1. ペンディング変更をアップロード
      await this.uploadPendingChanges();

      // 2. サーバーからダウンロード
      await this.downloadLatestChanges();

      // 3. コンフリクト解決
      await this.resolveConflicts();

      const syncTime = Date.now() - startTime;
      this.updateSyncStats(true, syncTime);

      console.log(`✅ Sync completed in ${syncTime}ms`);
      this.notifyListeners('sync_completed', { success: true, duration: syncTime });

    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.updateSyncStats(false, Date.now() - startTime);
      this.notifyListeners('sync_failed', { error });

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * ペンディング変更のアップロード
   */
  private async uploadPendingChanges(): Promise<void> {
    if (this.syncQueue.length === 0) {
      return;
    }

    console.log(`📤 Uploading ${this.syncQueue.length} pending changes...`);

    const batchSize = this.config.batchSize;
    const batches = this.chunkArray(this.syncQueue, batchSize);

    for (const batch of batches) {
      await this.uploadBatch(batch);
    }

    // 成功した操作をキューから削除
    this.syncQueue = this.syncQueue.filter(item => item.syncStatus !== 'synced');
    await this.saveSyncQueue();

    this.syncStats.pendingOperations = this.syncQueue.length;
  }

  /**
   * バッチアップロード
   */
  private async uploadBatch(batch: SyncData[]): Promise<void> {
    const promises = batch.map(async (syncData) => {
      try {
        await this.uploadSingleChange(syncData);
        syncData.syncStatus = 'synced';
        this.syncStats.successfulSyncs++;

      } catch (error) {
        console.error(`Upload failed for ${syncData.id}:`, error);
        syncData.syncStatus = 'failed';
        this.syncStats.failedSyncs++;
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 単一変更のアップロード
   */
  private async uploadSingleChange(syncData: SyncData): Promise<void> {
    const { collection, id, data, operation } = syncData;

    switch (operation) {
      case 'create':
      case 'update':
        await firestore().collection(collection).doc(id).set(data, { merge: true });
        break;

      case 'delete':
        await firestore().collection(collection).doc(id).delete();
        break;
    }

    console.log(`📤 Uploaded ${operation} for ${collection}/${id}`);
  }

  /**
   * 最新変更のダウンロード
   */
  private async downloadLatestChanges(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      return;
    }

    console.log('📥 Downloading latest changes...');

    const lastSyncTime = this.syncStats.lastSyncTime || 0;

    for (const collection of this.syncCollections) {
      try {
        const query = firestore()
          .collection(collection)
          .where('userId', '==', user.id)
          .where('timestamp', '>', lastSyncTime)
          .orderBy('timestamp', 'desc')
          .limit(this.config.batchSize);

        const snapshot = await query.get();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          await this.handleRemoteChange(collection, doc.id, data);
        }

        console.log(`📥 Downloaded ${snapshot.size} changes from ${collection}`);

      } catch (error) {
        console.error(`Download failed for ${collection}:`, error);
      }
    }
  }

  /**
   * リモート変更処理
   */
  private async handleRemoteChange(collection: string, id: string, remoteData: any): Promise<void> {
    const localData = await this.getLocalData(collection, id);

    if (localData) {
      // 既存データの更新 - コンフリクトチェック
      const hasConflict = await this.detectConflict(collection, id, localData, remoteData);
      
      if (hasConflict) {
        this.addConflict(collection, id, localData, remoteData);
        return;
      }
    }

    // コンフリクトなし、またはリモートデータで更新
    await this.updateLocalData(collection, id, remoteData, 'update');
  }

  /**
   * 全データダウンロード（初回同期用）
   */
  private async downloadAllData(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      return;
    }

    console.log('📥 Downloading all data...');

    for (const collection of this.syncCollections) {
      try {
        const snapshot = await firestore()
          .collection(collection)
          .where('userId', '==', user.id)
          .get();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          await this.updateLocalData(collection, doc.id, data, 'update');
        }

        console.log(`📥 Downloaded ${snapshot.size} items from ${collection}`);

      } catch (error) {
        console.error(`Download all failed for ${collection}:`, error);
      }
    }
  }

  // === データ操作 ===

  /**
   * データ変更の追加（同期キューに追加）
   */
  async addChange(
    collection: string,
    id: string,
    data: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<void> {
    const syncData: SyncData = {
      id,
      collection,
      data,
      operation,
      timestamp: Date.now(),
      deviceId: this.getDeviceId(),
      userId: authService.getCurrentUser()?.id || '',
      version: await this.getNextVersion(collection, id),
      checksum: this.calculateChecksum(data),
      syncStatus: 'pending',
    };

    this.syncQueue.push(syncData);
    this.syncStats.totalOperations++;
    this.syncStats.pendingOperations++;

    await this.saveSyncQueue();

    console.log(`📝 Added ${operation} operation for ${collection}/${id}`);

    // オンラインなら即座に同期試行
    if (this.isOnline) {
      this.triggerSync();
    }

    this.notifyListeners('change_queued', { collection, id, operation });
  }

  /**
   * ローカルデータ更新
   */
  private async updateLocalData(
    collection: string,
    id: string,
    data: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<void> {
    const key = `local_${collection}_${id}`;

    switch (operation) {
      case 'create':
      case 'update':
        await AsyncStorage.setItem(key, JSON.stringify(data));
        break;

      case 'delete':
        await AsyncStorage.removeItem(key);
        break;
    }

    this.notifyListeners('local_data_updated', { collection, id, operation, data });
  }

  /**
   * ローカルデータ取得
   */
  private async getLocalData(collection: string, id: string): Promise<any | null> {
    try {
      const key = `local_${collection}_${id}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Local data retrieval failed:', error);
      return null;
    }
  }

  // === コンフリクト解決 ===

  /**
   * コンフリクト検出
   */
  private async detectConflict(
    collection: string,
    id: string,
    localData: any,
    remoteData: any
  ): Promise<boolean> {
    // バージョン比較
    if (localData.version && remoteData.version) {
      if (localData.version !== remoteData.version) {
        return true;
      }
    }

    // チェックサム比較
    const localChecksum = this.calculateChecksum(localData);
    const remoteChecksum = this.calculateChecksum(remoteData);

    if (localChecksum !== remoteChecksum) {
      return true;
    }

    // タイムスタンプ比較
    const timeDiff = Math.abs(localData.timestamp - remoteData.timestamp);
    if (timeDiff > 1000) { // 1秒以上の差
      return true;
    }

    return false;
  }

  /**
   * コンフリクト追加
   */
  private addConflict(
    collection: string,
    id: string,
    localData: any,
    remoteData: any
  ): void {
    const conflict: ConflictData = {
      id,
      collection,
      localData,
      remoteData,
      localTimestamp: localData.timestamp || 0,
      remoteTimestamp: remoteData.timestamp || 0,
      conflictType: 'data',
    };

    this.conflictQueue.push(conflict);
    this.syncStats.conflictCount++;

    console.log(`⚠️ Conflict detected for ${collection}/${id}`);
    this.notifyListeners('conflict_detected', conflict);
  }

  /**
   * コンフリクト解決
   */
  private async resolveConflicts(): Promise<void> {
    if (this.conflictQueue.length === 0) {
      return;
    }

    console.log(`⚠️ Resolving ${this.conflictQueue.length} conflicts...`);

    const resolvedConflicts: ConflictData[] = [];

    for (const conflict of this.conflictQueue) {
      try {
        const resolution = await this.resolveConflict(conflict);
        if (resolution) {
          await this.updateLocalData(
            conflict.collection,
            conflict.id,
            resolution,
            'update'
          );
          resolvedConflicts.push(conflict);
        }
      } catch (error) {
        console.error(`Conflict resolution failed for ${conflict.id}:`, error);
      }
    }

    // 解決済みコンフリクトを削除
    this.conflictQueue = this.conflictQueue.filter(
      conflict => !resolvedConflicts.includes(conflict)
    );

    console.log(`✅ Resolved ${resolvedConflicts.length} conflicts`);
  }

  /**
   * 単一コンフリクト解決
   */
  private async resolveConflict(conflict: ConflictData): Promise<any | null> {
    const { localData, remoteData, localTimestamp, remoteTimestamp } = conflict;

    switch (this.config.conflictResolution) {
      case 'client-wins':
        return localData;

      case 'server-wins':
        return remoteData;

      case 'timestamp-wins':
        return localTimestamp > remoteTimestamp ? localData : remoteData;

      case 'manual':
        // 手動解決が必要
        this.notifyListeners('manual_conflict_resolution_required', conflict);
        return null;

      default:
        return remoteData;
    }
  }

  /**
   * 手動コンフリクト解決
   */
  async resolveConflictManually(conflictId: string, resolvedData: any): Promise<void> {
    const conflictIndex = this.conflictQueue.findIndex(c => c.id === conflictId);
    
    if (conflictIndex >= 0) {
      const conflict = this.conflictQueue[conflictIndex];
      
      await this.updateLocalData(
        conflict.collection,
        conflict.id,
        resolvedData,
        'update'
      );

      this.conflictQueue.splice(conflictIndex, 1);
      console.log(`✅ Manually resolved conflict for ${conflict.id}`);
    }
  }

  // === バックグラウンド同期 ===

  /**
   * バックグラウンド同期実行
   */
  private async performBackgroundSync(): Promise<void> {
    if (!this.backgroundSyncActive) {
      return;
    }

    console.log('📱 Performing background sync...');

    try {
      // 軽量版の同期実行
      if (this.syncQueue.length > 0) {
        await this.uploadPendingChanges();
      }

      console.log('✅ Background sync completed');

    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }

  /**
   * バックグラウンド同期開始
   */
  startBackgroundSync(): void {
    if (this.backgroundSyncActive) {
      return;
    }

    BackgroundJob.start({
      jobKey: 'ordoBackgroundSync',
      period: this.config.syncInterval * 1000,
    });

    this.backgroundSyncActive = true;
    this.syncStats.isBackgroundSyncActive = true;
    console.log('📱 Background sync started');
  }

  /**
   * バックグラウンド同期停止
   */
  stopBackgroundSync(): void {
    if (!this.backgroundSyncActive) {
      return;
    }

    BackgroundJob.stop({ jobKey: 'ordoBackgroundSync' });

    this.backgroundSyncActive = false;
    this.syncStats.isBackgroundSyncActive = false;
    console.log('📱 Background sync stopped');
  }

  // === ユーティリティ ===

  /**
   * チェックサム計算
   */
  private calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return btoa(jsonString).slice(0, 16); // 簡易チェックサム
  }

  /**
   * 次のバージョン番号取得
   */
  private async getNextVersion(collection: string, id: string): Promise<number> {
    const localData = await this.getLocalData(collection, id);
    return localData?.version ? localData.version + 1 : 1;
  }

  /**
   * デバイスID取得
   */
  private getDeviceId(): string {
    // 実装では DeviceInfo.getDeviceId() を使用
    return 'device_' + Date.now();
  }

  /**
   * 配列をチャンクに分割
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 同期キュー保存
   */
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('ordo_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * 同期統計更新
   */
  private updateSyncStats(success: boolean, duration: number): void {
    this.syncStats.lastSyncTime = Date.now();
    
    if (success) {
      this.syncStats.successfulSyncs++;
    } else {
      this.syncStats.failedSyncs++;
    }

    // 平均同期時間更新
    const totalSyncs = this.syncStats.successfulSyncs + this.syncStats.failedSyncs;
    this.syncStats.averageSyncTime = 
      ((this.syncStats.averageSyncTime * (totalSyncs - 1)) + duration) / totalSyncs;
  }

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
   * 手動同期トリガー
   */
  async sync(): Promise<boolean> {
    try {
      await this.triggerSync();
      return true;
    } catch (error) {
      console.error('Manual sync failed:', error);
      return false;
    }
  }

  /**
   * オフライン状態で変更を追加
   */
  async queueChange(
    collection: string,
    id: string,
    data: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<void> {
    await this.addChange(collection, id, data, operation);
  }

  /**
   * 同期統計取得
   */
  getSyncStats(): SyncStatistics {
    return { ...this.syncStats };
  }

  /**
   * コンフリクトキュー取得
   */
  getConflicts(): ConflictData[] {
    return [...this.conflictQueue];
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // 設定変更に応じた処理
    if (oldConfig.syncInterval !== this.config.syncInterval) {
      this.startPeriodicSync();
    }

    if (oldConfig.enableBackground !== this.config.enableBackground) {
      if (this.config.enableBackground) {
        this.startBackgroundSync();
      } else {
        this.stopBackgroundSync();
      }
    }

    console.log('🔄 Sync config updated:', this.config);
  }

  /**
   * 初期化状態取得
   */
  getStatus(): {
    isInitialized: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    pendingChanges: number;
    conflicts: number;
    config: SyncConfig;
  } {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingChanges: this.syncQueue.length,
      conflicts: this.conflictQueue.length,
      config: { ...this.config },
    };
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    this.stopBackgroundSync();
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.listeners = [];
    console.log('🧹 Synchronization Engine cleanup completed');
  }
}

export const syncEngine = new SynchronizationEngine();
