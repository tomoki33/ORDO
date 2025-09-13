/**
 * User Management Service
 * ユーザー管理システム - 家族メンバー招待と管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseService } from './FirebaseServiceSwitcher';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: number;
  lastLoginAt: number;
  isActive: boolean;
  preferences: UserPreferences;
  profile: UserProfile;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  location?: string;
  timezone: string;
  language: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    expiryAlerts: boolean;
    lowStockAlerts: boolean;
    sharedItemUpdates: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'family' | 'private';
    shareActivity: boolean;
    allowInvitations: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
}

export interface FamilyGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  members: FamilyMember[];
  settings: FamilySettings;
  invitations: FamilyInvitation[];
}

export interface FamilyMember {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  permissions: Permission[];
  joinedAt: number;
  lastActiveAt: number;
  isActive: boolean;
  contributionStats: {
    itemsAdded: number;
    itemsUpdated: number;
    itemsRemoved: number;
    shoppingListsCreated: number;
  };
}

export interface FamilySettings {
  allowGuestAccess: boolean;
  requireApprovalForNewMembers: boolean;
  autoShareNewItems: boolean;
  defaultMemberRole: UserRole;
  maxMembers: number;
  inventoryVisibility: 'all' | 'category' | 'location';
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  familyName: string;
  invitedBy: string;
  invitedByName: string;
  invitedEmail: string;
  role: UserRole;
  permissions: Permission[];
  message?: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
}

export interface UserRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  level: number; // 0=Guest, 1=Member, 2=Admin, 3=Owner
  isCustom: boolean;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'inventory' | 'shopping' | 'family' | 'settings' | 'admin';
  level: 'read' | 'write' | 'delete' | 'admin';
}

export interface UserActivity {
  id: string;
  userId: string;
  familyId?: string;
  action: string;
  targetType: 'product' | 'shoppingList' | 'family' | 'user' | 'system';
  targetId?: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: number;
  isVisible: boolean;
}

class UserManagementService {
  private currentUser: User | null = null;
  private currentFamilyGroup: FamilyGroup | null = null;
  private isInitialized = false;
  private listeners: Array<(event: string, data: any) => void> = [];

  // 事前定義された権限
  private readonly DEFAULT_PERMISSIONS: Permission[] = [
    // 在庫管理権限
    { id: 'inventory.read', name: 'inventory_read', displayName: '在庫閲覧', description: '在庫アイテムを閲覧できます', category: 'inventory', level: 'read' },
    { id: 'inventory.add', name: 'inventory_add', displayName: '在庫追加', description: '新しいアイテムを追加できます', category: 'inventory', level: 'write' },
    { id: 'inventory.edit', name: 'inventory_edit', displayName: '在庫編集', description: 'アイテム情報を編集できます', category: 'inventory', level: 'write' },
    { id: 'inventory.delete', name: 'inventory_delete', displayName: '在庫削除', description: 'アイテムを削除できます', category: 'inventory', level: 'delete' },
    
    // ショッピングリスト権限
    { id: 'shopping.read', name: 'shopping_read', displayName: 'リスト閲覧', description: 'ショッピングリストを閲覧できます', category: 'shopping', level: 'read' },
    { id: 'shopping.create', name: 'shopping_create', displayName: 'リスト作成', description: 'ショッピングリストを作成できます', category: 'shopping', level: 'write' },
    { id: 'shopping.edit', name: 'shopping_edit', displayName: 'リスト編集', description: 'ショッピングリストを編集できます', category: 'shopping', level: 'write' },
    { id: 'shopping.delete', name: 'shopping_delete', displayName: 'リスト削除', description: 'ショッピングリストを削除できます', category: 'shopping', level: 'delete' },
    
    // 家族管理権限
    { id: 'family.invite', name: 'family_invite', displayName: 'メンバー招待', description: '新しいメンバーを招待できます', category: 'family', level: 'write' },
    { id: 'family.manage', name: 'family_manage', displayName: 'メンバー管理', description: 'メンバーの役割を管理できます', category: 'family', level: 'admin' },
    { id: 'family.remove', name: 'family_remove', displayName: 'メンバー削除', description: 'メンバーを削除できます', category: 'family', level: 'delete' },
    
    // 設定権限
    { id: 'settings.personal', name: 'settings_personal', displayName: '個人設定', description: '個人設定を変更できます', category: 'settings', level: 'write' },
    { id: 'settings.family', name: 'settings_family', displayName: '家族設定', description: '家族グループ設定を変更できます', category: 'settings', level: 'admin' },
    
    // 管理者権限
    { id: 'admin.full', name: 'admin_full', displayName: '完全管理者', description: '全ての操作を実行できます', category: 'admin', level: 'admin' },
  ];

  // 事前定義された役割
  private readonly DEFAULT_ROLES: UserRole[] = [
    {
      id: 'guest',
      name: 'guest',
      displayName: 'ゲスト',
      description: '限定的な閲覧権限のみ',
      level: 0,
      isCustom: false,
      permissions: this.DEFAULT_PERMISSIONS.filter(p => p.level === 'read'),
    },
    {
      id: 'member',
      name: 'member',
      displayName: 'メンバー',
      description: '標準的な家族メンバー権限',
      level: 1,
      isCustom: false,
      permissions: this.DEFAULT_PERMISSIONS.filter(p => 
        p.category === 'inventory' || 
        p.category === 'shopping' || 
        p.id === 'settings.personal'
      ),
    },
    {
      id: 'admin',
      name: 'admin',
      displayName: '管理者',
      description: '家族グループの管理権限',
      level: 2,
      isCustom: false,
      permissions: this.DEFAULT_PERMISSIONS.filter(p => p.category !== 'admin'),
    },
    {
      id: 'owner',
      name: 'owner',
      displayName: 'オーナー',
      description: '完全な管理権限',
      level: 3,
      isCustom: false,
      permissions: [...this.DEFAULT_PERMISSIONS],
    },
  ];

  constructor() {
    // Firebaseリスナー設定は初期化時に行う
  }

  /**
   * ユーザー管理サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('👥 Initializing User Management Service...');

    try {
      // Firebase初期化確認
      await firebaseService.initialize();

      // 認証状態リスナー設定
      firebaseService.onAuthStateChanged(async (firebaseUser) => {
        await this.handleAuthStateChange(firebaseUser);
      });

      // 現在の認証状態確認
      const firebaseUser = firebaseService.getCurrentUser();
      if (firebaseUser) {
        await this.handleAuthStateChange(firebaseUser);
      }

      this.isInitialized = true;
      console.log('✅ User Management Service initialized');

    } catch (error) {
      console.error('❌ User Management Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * 認証状態変更処理
   */
  private async handleAuthStateChange(firebaseUser: any): Promise<void> {
    if (firebaseUser) {
      // ユーザー情報取得・作成
      await this.loadOrCreateUser(firebaseUser);
      
      // 家族グループ情報取得
      await this.loadUserFamilyGroup();
      
      this.notifyListeners('user_signed_in', { user: this.currentUser });
    } else {
      this.currentUser = null;
      this.currentFamilyGroup = null;
      this.notifyListeners('user_signed_out', {});
    }
  }

  /**
   * ユーザー情報の取得または作成
   */
  private async loadOrCreateUser(firebaseUser: any): Promise<void> {
    try {
      // Firestoreからユーザー情報取得
      const userDoc = await firebaseService.collection('users').doc(firebaseUser.uid).get();
      
      if (userDoc.exists) {
        // 既存ユーザー
        this.currentUser = userDoc.data() as User;
        
        // 最終ログイン時刻更新
        await this.updateLastLoginTime();
      } else {
        // 新規ユーザー作成
        this.currentUser = await this.createNewUser(firebaseUser);
      }

      console.log(`👤 User loaded: ${this.currentUser.displayName}`);
      
    } catch (error) {
      console.error('Failed to load or create user:', error);
      throw error;
    }
  }

  /**
   * 新規ユーザー作成
   */
  private async createNewUser(firebaseUser: any): Promise<User> {
    const newUser: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'ユーザー',
      photoURL: firebaseUser.photoURL,
      phoneNumber: firebaseUser.phoneNumber,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isActive: true,
      preferences: this.getDefaultUserPreferences(),
      profile: this.getDefaultUserProfile(firebaseUser),
    };

    // Firestoreに保存
    await firebaseService.collection('users').doc(newUser.id).set(newUser);
    
    // アクティビティ記録
    await this.recordActivity(newUser.id, 'user_created', 'user', newUser.id, 'ユーザーアカウントが作成されました');
    
    console.log(`👤 New user created: ${newUser.displayName}`);
    return newUser;
  }

  /**
   * デフォルトユーザー設定
   */
  private getDefaultUserPreferences(): UserPreferences {
    return {
      notifications: {
        email: true,
        push: true,
        sms: false,
        expiryAlerts: true,
        lowStockAlerts: true,
        sharedItemUpdates: true,
      },
      privacy: {
        profileVisibility: 'family',
        shareActivity: true,
        allowInvitations: true,
      },
      ui: {
        theme: 'auto',
        language: 'ja',
        currency: 'JPY',
        dateFormat: 'YYYY/MM/DD',
        timeFormat: '24h',
      },
    };
  }

  /**
   * デフォルトユーザープロフィール
   */
  private getDefaultUserProfile(firebaseUser: any): UserProfile {
    const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'ユーザー';
    
    return {
      firstName: name,
      lastName: '',
      avatar: firebaseUser.photoURL,
      bio: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'ja',
    };
  }

  /**
   * 最終ログイン時刻更新
   */
  private async updateLastLoginTime(): Promise<void> {
    if (!this.currentUser) return;

    try {
      const now = Date.now();
      this.currentUser.lastLoginAt = now;
      
      await firebaseService.collection('users').doc(this.currentUser.id).update({
        lastLoginAt: now,
      });
      
    } catch (error) {
      console.error('Failed to update last login time:', error);
    }
  }

  /**
   * 家族グループ情報取得
   */
  private async loadUserFamilyGroup(): Promise<void> {
    if (!this.currentUser) return;

    try {
      // ユーザーが所属する家族グループを検索
      const familyQuery = await firebaseService
        .collection('families')
        .where('members.userId', '==', this.currentUser.id)
        .get();

      if (!familyQuery.docs.length) {
        this.currentFamilyGroup = null;
        return;
      }

      const familyDoc = familyQuery.docs[0];
      this.currentFamilyGroup = familyDoc.data() as FamilyGroup;
      
      console.log(`👨‍👩‍👧‍👦 Family group loaded: ${this.currentFamilyGroup.name}`);
      
    } catch (error) {
      console.error('Failed to load family group:', error);
    }
  }

  // === 家族グループ管理 ===

  /**
   * 家族グループ作成
   */
  async createFamilyGroup(name: string, description?: string): Promise<FamilyGroup> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    if (this.currentFamilyGroup) {
      throw new Error('User already belongs to a family group');
    }

    try {
      const familyId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newFamily: FamilyGroup = {
        id: familyId,
        name,
        description,
        createdBy: this.currentUser.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        members: [{
          userId: this.currentUser.id,
          email: this.currentUser.email,
          displayName: this.currentUser.displayName,
          photoURL: this.currentUser.photoURL,
          role: this.DEFAULT_ROLES.find(r => r.name === 'owner')!,
          permissions: this.DEFAULT_PERMISSIONS,
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          isActive: true,
          contributionStats: {
            itemsAdded: 0,
            itemsUpdated: 0,
            itemsRemoved: 0,
            shoppingListsCreated: 0,
          },
        }],
        settings: {
          allowGuestAccess: false,
          requireApprovalForNewMembers: true,
          autoShareNewItems: true,
          defaultMemberRole: this.DEFAULT_ROLES.find(r => r.name === 'member')!,
          maxMembers: 20,
          inventoryVisibility: 'all',
        },
        invitations: [],
      };

      // Firestoreに保存
      await firebaseService.collection('families').doc(familyId).set(newFamily);
      
      this.currentFamilyGroup = newFamily;
      
      // アクティビティ記録
      await this.recordActivity(
        this.currentUser.id, 
        'family_created', 
        'family', 
        familyId, 
        `家族グループ「${name}」を作成しました`,
        familyId
      );

      console.log(`👨‍👩‍👧‍👦 Family group created: ${name}`);
      this.notifyListeners('family_created', { family: newFamily });
      
      return newFamily;

    } catch (error) {
      console.error('Failed to create family group:', error);
      throw error;
    }
  }

  /**
   * 家族メンバー招待
   */
  async inviteFamilyMember(
    email: string, 
    role: UserRole, 
    message?: string
  ): Promise<FamilyInvitation> {
    if (!this.currentUser || !this.currentFamilyGroup) {
      throw new Error('User not authenticated or not in a family group');
    }

    // 権限チェック
    if (!this.hasPermission('family.invite')) {
      throw new Error('Insufficient permissions to invite members');
    }

    try {
      // 既存メンバーチェック
      const existingMember = this.currentFamilyGroup.members.find(m => m.email === email);
      if (existingMember) {
        throw new Error('User is already a member of this family group');
      }

      // 既存招待チェック
      const existingInvitation = this.currentFamilyGroup.invitations.find(
        i => i.invitedEmail === email && i.status === 'pending'
      );
      if (existingInvitation) {
        throw new Error('Invitation already sent to this email');
      }

      const invitationId = `invitation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const token = this.generateInvitationToken();
      
      const invitation: FamilyInvitation = {
        id: invitationId,
        familyId: this.currentFamilyGroup.id,
        familyName: this.currentFamilyGroup.name,
        invitedBy: this.currentUser.id,
        invitedByName: this.currentUser.displayName,
        invitedEmail: email,
        role,
        permissions: role.permissions,
        message,
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7日間有効
        status: 'pending',
        token,
      };

      // 家族グループに招待追加
      this.currentFamilyGroup.invitations.push(invitation);
      this.currentFamilyGroup.updatedAt = Date.now();
      
      await firebaseService.collection('families').doc(this.currentFamilyGroup.id).update({
        invitations: this.currentFamilyGroup.invitations,
        updatedAt: this.currentFamilyGroup.updatedAt,
      });

      // 招待メール送信（実装は後で）
      await this.sendInvitationEmail(invitation);
      
      // アクティビティ記録
      await this.recordActivity(
        this.currentUser.id,
        'member_invited',
        'family',
        this.currentFamilyGroup.id,
        `${email} を家族グループに招待しました`,
        this.currentFamilyGroup.id
      );

      console.log(`📧 Family invitation sent to: ${email}`);
      this.notifyListeners('member_invited', { invitation });
      
      return invitation;

    } catch (error) {
      console.error('Failed to invite family member:', error);
      throw error;
    }
  }

  /**
   * 招待トークン生成
   */
  private generateInvitationToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 招待メール送信（モック実装）
   */
  private async sendInvitationEmail(invitation: FamilyInvitation): Promise<void> {
    // 実際の実装ではメール送信サービスを使用
    console.log(`📧 Sending invitation email to ${invitation.invitedEmail}`);
    console.log(`Invitation link: https://ordo.app/invite/${invitation.token}`);
    
    // 今後の実装:
    // - SendGrid / AWS SES / Firebase Functions での実際のメール送信
    // - カスタムメールテンプレート
    // - ディープリンク対応
  }

  /**
   * 招待承諾
   */
  async acceptInvitation(token: string): Promise<FamilyMember> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // 招待情報検索
      const familiesQuery = await firebaseService
        .collection('families')
        .where('invitations.token', '==', token)
        .get();

      if (!familiesQuery.docs.length) {
        throw new Error('Invalid invitation token');
      }

      const familyDoc = familiesQuery.docs[0];
      const family = familyDoc.data() as FamilyGroup;
      
      const invitation = family.invitations.find(i => i.token === token);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation is no longer valid');
      }

      if (invitation.expiresAt < Date.now()) {
        throw new Error('Invitation has expired');
      }

      if (invitation.invitedEmail !== this.currentUser.email) {
        throw new Error('Invitation email does not match current user');
      }

      // 既存家族グループから離脱（必要に応じて）
      if (this.currentFamilyGroup) {
        await this.leaveFamilyGroup();
      }

      // 新しいメンバーとして追加
      const newMember: FamilyMember = {
        userId: this.currentUser.id,
        email: this.currentUser.email,
        displayName: this.currentUser.displayName,
        photoURL: this.currentUser.photoURL,
        role: invitation.role,
        permissions: invitation.permissions,
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
        isActive: true,
        contributionStats: {
          itemsAdded: 0,
          itemsUpdated: 0,
          itemsRemoved: 0,
          shoppingListsCreated: 0,
        },
      };

      family.members.push(newMember);
      
      // 招待ステータス更新
      invitation.status = 'accepted';
      
      family.updatedAt = Date.now();

      // Firestore更新
      await firebaseService.collection('families').doc(family.id).update({
        members: family.members,
        invitations: family.invitations,
        updatedAt: family.updatedAt,
      });

      this.currentFamilyGroup = family;
      
      // アクティビティ記録
      await this.recordActivity(
        this.currentUser.id,
        'member_joined',
        'family',
        family.id,
        `${this.currentUser.displayName} が家族グループに参加しました`,
        family.id
      );

      console.log(`👨‍👩‍👧‍👦 Joined family group: ${family.name}`);
      this.notifyListeners('invitation_accepted', { family, member: newMember });
      
      return newMember;

    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  }

  /**
   * 招待拒否
   */
  async declineInvitation(token: string): Promise<void> {
    try {
      // 招待情報検索と更新
      const familiesQuery = await firebaseService
        .collection('families')
        .where('invitations.token', '==', token)
        .get();

      if (!familiesQuery.docs.length) {
        throw new Error('Invalid invitation token');
      }

      const familyDoc = familiesQuery.docs[0];
      const family = familyDoc.data() as FamilyGroup;
      
      const invitation = family.invitations.find(i => i.token === token);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      invitation.status = 'declined';
      family.updatedAt = Date.now();

      await firebaseService.collection('families').doc(family.id).update({
        invitations: family.invitations,
        updatedAt: family.updatedAt,
      });

      console.log(`❌ Invitation declined: ${invitation.invitedEmail}`);
      this.notifyListeners('invitation_declined', { invitation });

    } catch (error) {
      console.error('Failed to decline invitation:', error);
      throw error;
    }
  }

  /**
   * 家族グループから離脱
   */
  async leaveFamilyGroup(): Promise<void> {
    if (!this.currentUser || !this.currentFamilyGroup) {
      throw new Error('User not in a family group');
    }

    try {
      const memberIndex = this.currentFamilyGroup.members.findIndex(
        m => m.userId === this.currentUser!.id
      );

      if (memberIndex === -1) {
        throw new Error('User not found in family group');
      }

      // オーナーの場合は特別な処理が必要
      const member = this.currentFamilyGroup.members[memberIndex];
      if (member.role.name === 'owner') {
        if (this.currentFamilyGroup.members.length > 1) {
          throw new Error('Owner cannot leave family group with other members. Transfer ownership first.');
        }
        
        // 最後のメンバー（オーナー）の場合はグループ削除
        await this.deleteFamilyGroup();
        return;
      }

      // メンバーを削除
      this.currentFamilyGroup.members.splice(memberIndex, 1);
      this.currentFamilyGroup.updatedAt = Date.now();

      await firebaseService.collection('families').doc(this.currentFamilyGroup.id).update({
        members: this.currentFamilyGroup.members,
        updatedAt: this.currentFamilyGroup.updatedAt,
      });

      // アクティビティ記録
      await this.recordActivity(
        this.currentUser.id,
        'member_left',
        'family',
        this.currentFamilyGroup.id,
        `${this.currentUser.displayName} が家族グループから離脱しました`,
        this.currentFamilyGroup.id
      );

      const familyName = this.currentFamilyGroup.name;
      this.currentFamilyGroup = null;

      console.log(`👋 Left family group: ${familyName}`);
      this.notifyListeners('family_left', { familyName });

    } catch (error) {
      console.error('Failed to leave family group:', error);
      throw error;
    }
  }

  /**
   * 家族グループ削除
   */
  async deleteFamilyGroup(): Promise<void> {
    if (!this.currentUser || !this.currentFamilyGroup) {
      throw new Error('User not in a family group');
    }

    // オーナー権限チェック
    const currentMember = this.currentFamilyGroup.members.find(m => m.userId === this.currentUser!.id);
    if (!currentMember || currentMember.role.name !== 'owner') {
      throw new Error('Only the owner can delete the family group');
    }

    try {
      // 関連データ削除（在庫、ショッピングリストなど）
      await this.deleteRelatedFamilyData(this.currentFamilyGroup.id);
      
      // 家族グループ削除
      await firebaseService.collection('families').doc(this.currentFamilyGroup.id).delete();

      const familyName = this.currentFamilyGroup.name;
      this.currentFamilyGroup = null;

      console.log(`🗑️ Family group deleted: ${familyName}`);
      this.notifyListeners('family_deleted', { familyName });

    } catch (error) {
      console.error('Failed to delete family group:', error);
      throw error;
    }
  }

  /**
   * 関連する家族データ削除
   */
  private async deleteRelatedFamilyData(familyId: string): Promise<void> {
    // バッチ削除で効率的に実行
    const batch = firebaseService.collection('families').doc(familyId); // バッチ操作のベース

    try {
      // 共有在庫アイテム削除
      const inventoryQuery = await firebaseService
        .collection('inventory')
        .where('familyId', '==', familyId)
        .get();

      for (const doc of inventoryQuery.docs) {
        await firebaseService.collection('inventory').doc(doc.id).delete();
      }

      // 共有ショッピングリスト削除
      const shoppingListsQuery = await firebaseService
        .collection('shoppingLists')
        .where('familyId', '==', familyId)
        .get();

      for (const doc of shoppingListsQuery.docs) {
        await firebaseService.collection('shoppingLists').doc(doc.id).delete();
      }

      // アクティビティログ削除
      const activityQuery = await firebaseService
        .collection('activities')
        .where('familyId', '==', familyId)
        .get();

      for (const doc of activityQuery.docs) {
        await firebaseService.collection('activities').doc(doc.id).delete();
      }

      console.log(`🗑️ Related family data deleted for family: ${familyId}`);

    } catch (error) {
      console.error('Failed to delete related family data:', error);
      throw error;
    }
  }

  // === 権限管理 ===

  /**
   * 権限チェック
   */
  hasPermission(permissionId: string): boolean {
    if (!this.currentUser || !this.currentFamilyGroup) {
      return false;
    }

    const member = this.currentFamilyGroup.members.find(m => m.userId === this.currentUser!.id);
    if (!member) {
      return false;
    }

    return member.permissions.some(p => p.id === permissionId);
  }

  /**
   * 複数権限チェック
   */
  hasPermissions(permissionIds: string[]): boolean {
    return permissionIds.every(id => this.hasPermission(id));
  }

  /**
   * 役割レベルチェック
   */
  hasRoleLevel(minLevel: number): boolean {
    if (!this.currentUser || !this.currentFamilyGroup) {
      return false;
    }

    const member = this.currentFamilyGroup.members.find(m => m.userId === this.currentUser!.id);
    if (!member) {
      return false;
    }

    return member.role.level >= minLevel;
  }

  /**
   * メンバー役割更新
   */
  async updateMemberRole(userId: string, newRole: UserRole): Promise<void> {
    if (!this.currentUser || !this.currentFamilyGroup) {
      throw new Error('User not in a family group');
    }

    // 権限チェック
    if (!this.hasPermission('family.manage')) {
      throw new Error('Insufficient permissions to manage members');
    }

    try {
      const memberIndex = this.currentFamilyGroup.members.findIndex(m => m.userId === userId);
      if (memberIndex === -1) {
        throw new Error('Member not found');
      }

      const member = this.currentFamilyGroup.members[memberIndex];
      
      // オーナーの役割変更は制限
      if (member.role.name === 'owner' && newRole.name !== 'owner') {
        if (this.currentFamilyGroup.members.filter(m => m.role.name === 'owner').length === 1) {
          throw new Error('Cannot remove the last owner. Transfer ownership first.');
        }
      }

      member.role = newRole;
      member.permissions = newRole.permissions;
      this.currentFamilyGroup.updatedAt = Date.now();

      await firebaseService.collection('families').doc(this.currentFamilyGroup.id).update({
        members: this.currentFamilyGroup.members,
        updatedAt: this.currentFamilyGroup.updatedAt,
      });

      // アクティビティ記録
      await this.recordActivity(
        this.currentUser.id,
        'member_role_updated',
        'family',
        this.currentFamilyGroup.id,
        `${member.displayName} の役割を ${newRole.displayName} に変更しました`,
        this.currentFamilyGroup.id
      );

      console.log(`👤 Member role updated: ${member.displayName} -> ${newRole.displayName}`);
      this.notifyListeners('member_role_updated', { member, newRole });

    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  }

  /**
   * メンバー削除
   */
  async removeFamilyMember(userId: string): Promise<void> {
    if (!this.currentUser || !this.currentFamilyGroup) {
      throw new Error('User not in a family group');
    }

    // 権限チェック
    if (!this.hasPermission('family.remove')) {
      throw new Error('Insufficient permissions to remove members');
    }

    try {
      const memberIndex = this.currentFamilyGroup.members.findIndex(m => m.userId === userId);
      if (memberIndex === -1) {
        throw new Error('Member not found');
      }

      const member = this.currentFamilyGroup.members[memberIndex];
      
      // オーナーは削除不可
      if (member.role.name === 'owner') {
        throw new Error('Cannot remove the owner. Transfer ownership first.');
      }

      // 自分自身は削除不可（離脱を使用）
      if (userId === this.currentUser.id) {
        throw new Error('Cannot remove yourself. Use leave family group instead.');
      }

      this.currentFamilyGroup.members.splice(memberIndex, 1);
      this.currentFamilyGroup.updatedAt = Date.now();

      await firebaseService.collection('families').doc(this.currentFamilyGroup.id).update({
        members: this.currentFamilyGroup.members,
        updatedAt: this.currentFamilyGroup.updatedAt,
      });

      // アクティビティ記録
      await this.recordActivity(
        this.currentUser.id,
        'member_removed',
        'family',
        this.currentFamilyGroup.id,
        `${member.displayName} を家族グループから削除しました`,
        this.currentFamilyGroup.id
      );

      console.log(`👤 Member removed: ${member.displayName}`);
      this.notifyListeners('member_removed', { member });

    } catch (error) {
      console.error('Failed to remove family member:', error);
      throw error;
    }
  }

  // === アクティビティ記録 ===

  /**
   * ユーザーアクティビティ記録
   */
  async recordActivity(
    userId: string,
    action: string,
    targetType: UserActivity['targetType'],
    targetId: string,
    description: string,
    familyId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const activity: UserActivity = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        familyId,
        action,
        targetType,
        targetId,
        description,
        metadata,
        timestamp: Date.now(),
        isVisible: true,
      };

      await firebaseService.collection('activities').doc(activity.id).set(activity);
      
    } catch (error) {
      console.error('Failed to record activity:', error);
      // アクティビティ記録の失敗は致命的エラーではないので、エラーを投げない
    }
  }

  /**
   * ユーザーアクティビティ取得
   */
  async getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      const activitiesQuery = await firebaseService
        .collection('activities')
        .where('userId', '==', userId)
        .where('isVisible', '==', true)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return activitiesQuery.docs.map((doc: any) => doc.data() as UserActivity);

    } catch (error) {
      console.error('Failed to get user activities:', error);
      return [];
    }
  }

  /**
   * 家族アクティビティ取得
   */
  async getFamilyActivities(familyId: string, limit: number = 100): Promise<UserActivity[]> {
    try {
      const activitiesQuery = await firebaseService
        .collection('activities')
        .where('familyId', '==', familyId)
        .where('isVisible', '==', true)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return activitiesQuery.docs.map((doc: any) => doc.data() as UserActivity);

    } catch (error) {
      console.error('Failed to get family activities:', error);
      return [];
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
   * 現在のユーザー取得
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * 現在の家族グループ取得
   */
  getCurrentFamilyGroup(): FamilyGroup | null {
    return this.currentFamilyGroup;
  }

  /**
   * 利用可能な役割取得
   */
  getAvailableRoles(): UserRole[] {
    return [...this.DEFAULT_ROLES];
  }

  /**
   * 利用可能な権限取得
   */
  getAvailablePermissions(): Permission[] {
    return [...this.DEFAULT_PERMISSIONS];
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
    this.listeners = [];
    this.currentUser = null;
    this.currentFamilyGroup = null;
    this.isInitialized = false;
    
    console.log('🧹 User Management Service cleanup completed');
  }
}

export const userManagementService = new UserManagementService();
