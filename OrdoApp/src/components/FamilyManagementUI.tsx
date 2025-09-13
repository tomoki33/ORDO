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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { userManagementService } from '../services/UserManagementService';
import { notificationService } from '../services/NotificationService';

interface FamilyMember {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  permissions: Record<string, any>;
  isActive: boolean;
  joinedAt: number;
  lastActiveAt: number;
}

interface FamilyGroup {
  id: string;
  name: string;
  description: string;
  members: FamilyMember[];
  settings: {
    isPrivate: boolean;
    requireApprovalForNewMembers: boolean;
    allowMemberInvites: boolean;
    maxMembers: number;
  };
  createdAt: number;
  updatedAt: number;
}

interface FamilyManagementUIProps {
  onNavigateBack?: () => void;
}

export const FamilyManagementUI: React.FC<FamilyManagementUIProps> = ({ onNavigateBack }) => {
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const family = userManagementService.getCurrentFamilyGroup();
      setFamilyGroup(family);
      
      if (family) {
        const invitations = await userManagementService.getPendingInvitations(family.id);
        setPendingInvitations(invitations);
      }
    } catch (error) {
      console.error('Failed to load family data:', error);
      Alert.alert('エラー', 'ファミリー情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }

    try {
      setLoading(true);
      await userManagementService.inviteFamilyMember({
        email: inviteEmail.trim(),
        role: inviteRole as any,
        permissions: getDefaultPermissions(inviteRole),
        customMessage: inviteMessage.trim() || undefined,
      });

      Alert.alert('成功', 'メンバーを招待しました');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteMessage('');
      await loadFamilyData();

      // 通知を送信
      if (familyGroup) {
        await notificationService.sendFamilyManagementNotification(
          familyGroup.id,
          userManagementService.getCurrentUser()?.id || '',
          'member_invited',
          inviteEmail,
          { newRole: inviteRole }
        );
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      Alert.alert('エラー', 'メンバーの招待に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'メンバー削除確認',
      `${memberName}をファミリーから削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await userManagementService.removeFamilyMember(memberId);
              Alert.alert('成功', 'メンバーを削除しました');
              await loadFamilyData();

              // 通知を送信
              if (familyGroup) {
                await notificationService.sendFamilyManagementNotification(
                  familyGroup.id,
                  userManagementService.getCurrentUser()?.id || '',
                  'member_left',
                  memberName
                );
              }
            } catch (error) {
              console.error('Failed to remove member:', error);
              Alert.alert('エラー', 'メンバーの削除に失敗しました');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (memberId: string, memberName: string, currentRole: string) => {
    const roles = ['member', 'moderator', 'admin'];
    const roleNames = { member: 'メンバー', moderator: 'モデレーター', admin: '管理者' };

    Alert.alert(
      '役割変更',
      '新しい役割を選択してください',
      roles.map(role => ({
        text: roleNames[role as keyof typeof roleNames],
        onPress: async () => {
          if (role === currentRole) return;
          
          try {
            setLoading(true);
            await userManagementService.updateMemberRole(memberId, role as any);
            Alert.alert('成功', '役割を変更しました');
            await loadFamilyData();

            // 通知を送信
            if (familyGroup) {
              await notificationService.sendFamilyManagementNotification(
                familyGroup.id,
                userManagementService.getCurrentUser()?.id || '',
                'role_changed',
                memberName,
                { oldRole: currentRole, newRole: role }
              );
            }
          } catch (error) {
            console.error('Failed to change role:', error);
            Alert.alert('エラー', '役割の変更に失敗しました');
          } finally {
            setLoading(false);
          }
        },
      }))
    );
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      setLoading(true);
      // 招待キャンセルのロジック（実装必要）
      Alert.alert('成功', '招待をキャンセルしました');
      await loadFamilyData();
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      Alert.alert('エラー', '招待のキャンセルに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPermissions = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          inventory: { read: true, write: true, delete: true },
          shopping: { read: true, write: true, delete: true },
          family: { read: true, write: true, delete: true },
          settings: { read: true, write: true, delete: true },
        };
      case 'moderator':
        return {
          inventory: { read: true, write: true, delete: true },
          shopping: { read: true, write: true, delete: true },
          family: { read: true, write: true, delete: false },
          settings: { read: true, write: false, delete: false },
        };
      default: // member
        return {
          inventory: { read: true, write: true, delete: false },
          shopping: { read: true, write: true, delete: false },
          family: { read: true, write: false, delete: false },
          settings: { read: true, write: false, delete: false },
        };
    }
  };

  const renderMemberItem = ({ item }: { item: FamilyMember }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.displayName}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
        <Text style={styles.memberRole}>
          {item.role === 'owner' ? 'オーナー' : 
           item.role === 'admin' ? '管理者' : 
           item.role === 'moderator' ? 'モデレーター' : 'メンバー'}
        </Text>
      </View>
      <View style={styles.memberActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleChangeRole(item.userId, item.displayName, item.role)}
          disabled={item.role === 'owner'}
        >
          <Icon name="edit" size={20} color="#007AFF" />
        </TouchableOpacity>
        {item.role !== 'owner' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleRemoveMember(item.userId, item.displayName)}
          >
            <Icon name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderInvitationItem = ({ item }: { item: any }) => (
    <View style={styles.invitationItem}>
      <View style={styles.invitationInfo}>
        <Text style={styles.invitationEmail}>{item.email}</Text>
        <Text style={styles.invitationStatus}>招待中</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => handleCancelInvitation(item.id)}
      >
        <Icon name="cancel" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (!familyGroup) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="family-restroom" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>ファミリーグループがありません</Text>
        <Text style={styles.emptyDescription}>
          ファミリーグループを作成して、家族と在庫を共有しましょう
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {/* ファミリー作成画面に遷移 */}}
        >
          <Text style={styles.createButtonText}>ファミリーを作成</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>ファミリー管理</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <Icon name="settings" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* ファミリー情報 */}
      <View style={styles.familyInfo}>
        <Text style={styles.familyName}>{familyGroup.name}</Text>
        <Text style={styles.familyDescription}>{familyGroup.description}</Text>
        <Text style={styles.memberCount}>
          メンバー数: {familyGroup.members.length}/{familyGroup.settings.maxMembers}
        </Text>
      </View>

      {/* メンバーリスト */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>メンバー</Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setShowInviteModal(true)}
          >
            <Icon name="person-add" size={20} color="white" />
            <Text style={styles.inviteButtonText}>招待</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={familyGroup.members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.userId}
          style={styles.membersList}
        />
      </View>

      {/* 保留中の招待 */}
      {pendingInvitations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>保留中の招待</Text>
          <FlatList
            data={pendingInvitations}
            renderItem={renderInvitationItem}
            keyExtractor={(item) => item.id}
            style={styles.invitationsList}
          />
        </View>
      )}

      {/* 招待モーダル */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowInviteModal(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>メンバー招待</Text>
            <TouchableOpacity
              onPress={handleInviteMember}
              style={styles.modalDoneButton}
            >
              <Text style={styles.modalDoneText}>招待</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>メールアドレス</Text>
              <TextInput
                style={styles.textInput}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>役割</Text>
              <View style={styles.roleSelector}>
                {['member', 'moderator', 'admin'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      inviteRole === role && styles.roleOptionSelected,
                    ]}
                    onPress={() => setInviteRole(role)}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        inviteRole === role && styles.roleOptionTextSelected,
                      ]}
                    >
                      {role === 'admin' ? '管理者' : 
                       role === 'moderator' ? 'モデレーター' : 'メンバー'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>招待メッセージ（任意）</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={inviteMessage}
                onChangeText={setInviteMessage}
                placeholder="家族と一緒に在庫管理をしませんか？"
                multiline
                numberOfLines={3}
              />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  settingsButton: {
    padding: 8,
  },
  familyInfo: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  familyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  familyDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inviteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  membersList: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  memberActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 6,
  },
  invitationsList: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  invitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  invitationInfo: {
    flex: 1,
  },
  invitationEmail: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  invitationStatus: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
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
    marginBottom: 24,
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
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
  },
  roleOptionSelected: {
    backgroundColor: '#007AFF',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  roleOptionTextSelected: {
    color: 'white',
    fontWeight: '500',
  },
});

export default FamilyManagementUI;
