/**
 * Ordo Common Components Library (8時間実装)
 * 
 * Atomic Design準拠の再利用可能コンポーネント
 * Material Design 3 + カスタムOrdoデザイン
 * 完全TypeScript対応 + ストーリーブック準備
 */

import React, { ReactNode, forwardRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  TextInputProps,
  ScrollViewProps,
  Animated,
  ActivityIndicator
} from 'react-native';
import { LIGHT_THEME, DARK_THEME, ColorTheme } from './Colors';
import { TYPOGRAPHY_TOKENS, JAPANESE_TYPOGRAPHY } from './Typography';
import { SPACING, BORDER_RADIUS } from './DesignSystem';

// =============================================================================
// ELEVATION SYSTEM - エレベーション (Material Design準拠)
// =============================================================================

const ELEVATION = {
  0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1
  },
  2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2
  },
  4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4
  },
  8: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8
  }
} as const;

// =============================================================================
// TYPES & INTERFACES - 型定義
// =============================================================================

export interface ThemeContextType {
  theme: ColorTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

export interface ComponentProps {
  theme?: ColorTheme;
  style?: ViewStyle | TextStyle;
  testID?: string;
}

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ComponentState = 'default' | 'hover' | 'pressed' | 'focused' | 'disabled';

// =============================================================================
// ATOMS - 最小コンポーネント
// =============================================================================

/**
 * Button - 基本ボタンコンポーネント
 */
export interface ButtonProps extends ComponentProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

const OrdoButton = forwardRef<View, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  style,
  theme = LIGHT_THEME,
  testID,
  ...props
}, ref) => {
  const buttonStyles = getButtonStyles(variant, size, disabled, fullWidth, theme);
  const textStyles = getButtonTextStyles(variant, size, disabled, theme);

  return (
    <TouchableOpacity
      ref={ref}
      style={[buttonStyles.container, style]}
      disabled={disabled || loading}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      accessibilityState={{ disabled: disabled || loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size={size === 'xs' || size === 'sm' ? 'small' : 'large'}
          color={textStyles.color}
        />
      ) : (
        <View style={buttonStyles.content}>
          {icon && iconPosition === 'left' && (
            <View style={buttonStyles.iconLeft}>{icon}</View>
          )}
          <Text style={[textStyles, buttonStyles.text]}>{children}</Text>
          {icon && iconPosition === 'right' && (
            <View style={buttonStyles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

/**
 * Input - テキスト入力コンポーネント
 */
export interface InputProps extends TextInputProps, ComponentProps {
  label?: string;
  error?: string;
  hint?: string;
  size?: ComponentSize;
  variant?: 'outline' | 'filled' | 'underline';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  size = 'md',
  variant = 'outline',
  leftIcon,
  rightIcon,
  required = false,
  style,
  theme = LIGHT_THEME,
  testID,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputStyles = getInputStyles(variant, size, error, isFocused, theme);

  return (
    <View style={inputStyles.container}>
      {label && (
        <Text style={inputStyles.label}>
          {label}
          {required && <Text style={inputStyles.required}> *</Text>}
        </Text>
      )}
      
      <View style={inputStyles.inputContainer}>
        {leftIcon && <View style={inputStyles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          ref={ref}
          style={[inputStyles.input, style]}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={theme.text.tertiary}
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...props}
        />
        
        {rightIcon && <View style={inputStyles.rightIcon}>{rightIcon}</View>}
      </View>
      
      {error && <Text style={inputStyles.error}>{error}</Text>}
      {hint && !error && <Text style={inputStyles.hint}>{hint}</Text>}
    </View>
  );
});

/**
 * Card - カードコンポーネント
 */
export interface CardProps extends ComponentProps {
  elevation?: number;
  padding?: keyof typeof SPACING;
  children: ReactNode;
}

export const Card: React.FC<CardProps> = ({
  elevation = 2,
  padding = 'md',
  children,
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const cardStyles = getCardStyles(elevation, padding, theme);

  return (
    <View
      style={[cardStyles.container, style]}
      testID={testID}
      accessibilityRole="region"
    >
      {children}
    </View>
  );
};

/**
 * Badge - バッジコンポーネント
 */
export interface BadgeProps extends ComponentProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  children: ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const badgeStyles = getBadgeStyles(variant, size, theme);

  return (
    <View
      style={[badgeStyles.container, style]}
      testID={testID}
      accessibilityRole="text"
    >
      <Text style={badgeStyles.text}>{children}</Text>
    </View>
  );
};

// =============================================================================
// MOLECULES - 複合コンポーネント
// =============================================================================

/**
 * SearchBar - 検索バーコンポーネント
 */
export interface SearchBarProps extends ComponentProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  onClear?: () => void;
  loading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = '検索...',
  onSubmit,
  onClear,
  loading = false,
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const searchStyles = getSearchBarStyles(theme);

  const handleClear = useCallback(() => {
    onChangeText('');
    onClear?.();
  }, [onChangeText, onClear]);

  return (
    <View style={[searchStyles.container, style]} testID={testID}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        variant="filled"
        leftIcon={
          loading ? (
            <ActivityIndicator size="small" color={theme.text.secondary} />
          ) : (
            <Text style={searchStyles.searchIcon}>🔍</Text>
          )
        }
        rightIcon={
          value ? (
            <TouchableOpacity onPress={handleClear} style={searchStyles.clearButton}>
              <Text style={searchStyles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null
        }
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        theme={theme}
      />
    </View>
  );
};

/**
 * ListItem - リストアイテムコンポーネント
 */
export interface ListItemProps extends TouchableOpacityProps, ComponentProps {
  title: string;
  subtitle?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftImage?: string;
  onPress?: () => void;
  divider?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  leftImage,
  onPress,
  divider = true,
  style,
  theme = LIGHT_THEME,
  testID,
  ...props
}) => {
  const listItemStyles = getListItemStyles(theme);

  return (
    <>
      <TouchableOpacity
        style={[listItemStyles.container, style]}
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
        {...props}
      >
        {(leftIcon || leftImage) && (
          <View style={listItemStyles.leftContent}>
            {leftIcon}
            {/* 画像サポートは実装で追加 */}
          </View>
        )}
        
        <View style={listItemStyles.content}>
          <Text style={listItemStyles.title}>{title}</Text>
          {subtitle && <Text style={listItemStyles.subtitle}>{subtitle}</Text>}
        </View>
        
        {rightIcon && (
          <View style={listItemStyles.rightContent}>
            {rightIcon}
          </View>
        )}
      </TouchableOpacity>
      
      {divider && <View style={listItemStyles.divider} />}
    </>
  );
};

/**
 * Modal - モーダルコンポーネント
 */
export interface ModalProps extends ComponentProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  animationType?: 'slide' | 'fade' | 'none';
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  animationType = 'fade',
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const modalStyles = getModalStyles(theme);

  if (!visible) return null;

  return (
    <View style={modalStyles.overlay} testID={testID}>
      <TouchableOpacity
        style={modalStyles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      
      <View style={[modalStyles.container, style]}>
        {title && (
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Text style={modalStyles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={modalStyles.content}>
          {children}
        </View>
      </View>
    </View>
  );
};

// =============================================================================
// ORGANISMS - 複雑なコンポーネント
// =============================================================================

/**
 * FoodCard - 食品カードコンポーネント (Ordo専用)
 */
export interface FoodCardProps extends ComponentProps {
  foodItem: {
    id: string;
    name: string;
    expiryDate: string;
    status: 'fresh' | 'good' | 'acceptable' | 'poor' | 'spoiled';
    image?: string;
    category?: string;
    quantity?: string;
  };
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  foodItem,
  onPress,
  onEdit,
  onDelete,
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const foodCardStyles = getFoodCardStyles(theme);
  const statusColor = theme.food[foodItem.status];

  return (
    <Card style={[foodCardStyles.container, style]} testID={testID} theme={theme}>
      <TouchableOpacity onPress={onPress} style={foodCardStyles.touchable}>
        {/* 食品画像エリア */}
        <View style={foodCardStyles.imageContainer}>
          {/* 画像実装は後で追加 */}
          <View style={[foodCardStyles.imagePlaceholder, { backgroundColor: statusColor.background }]}>
            <Text style={foodCardStyles.imagePlaceholderText}>🍎</Text>
          </View>
          
          {/* ステータスバッジ */}
          <Badge
            variant="primary"
            size="sm"
            style={[foodCardStyles.statusBadge, { backgroundColor: statusColor.main }]}
          >
            {getStatusText(foodItem.status)}
          </Badge>
        </View>
        
        {/* 食品情報エリア */}
        <View style={foodCardStyles.content}>
          <Text style={foodCardStyles.name} numberOfLines={2}>
            {foodItem.name}
          </Text>
          
          {foodItem.category && (
            <Text style={foodCardStyles.category}>{foodItem.category}</Text>
          )}
          
          <Text style={[foodCardStyles.expiryDate, { color: statusColor.main }]}>
            {formatExpiryDate(foodItem.expiryDate)}
          </Text>
          
          {foodItem.quantity && (
            <Text style={foodCardStyles.quantity}>{foodItem.quantity}</Text>
          )}
        </View>
        
        {/* アクションボタンエリア */}
        <View style={foodCardStyles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={foodCardStyles.actionButton}>
              <Text style={foodCardStyles.actionIcon}>✏️</Text>
            </TouchableOpacity>
          )}
          
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={foodCardStyles.actionButton}>
              <Text style={foodCardStyles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
};

/**
 * TabBar - タブバーコンポーネント
 */
export interface TabItem {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: number;
}

export interface TabBarProps extends ComponentProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const tabBarStyles = getTabBarStyles(theme);

  return (
    <View style={[tabBarStyles.container, style]} testID={testID}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            tabBarStyles.tab,
            activeTab === tab.id && tabBarStyles.activeTab
          ]}
          onPress={() => onTabPress(tab.id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab.id }}
          accessibilityLabel={tab.title}
        >
          {tab.icon && (
            <View style={tabBarStyles.tabIcon}>
              {tab.icon}
            </View>
          )}
          
          <Text
            style={[
              tabBarStyles.tabText,
              activeTab === tab.id && tabBarStyles.activeTabText
            ]}
          >
            {tab.title}
          </Text>
          
          {tab.badge !== undefined && tab.badge > 0 && (
            <Badge
              variant="danger"
              size="xs"
              style={tabBarStyles.badge}
            >
              {tab.badge > 99 ? '99+' : tab.badge.toString()}
            </Badge>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// =============================================================================
// STYLE GENERATORS - スタイル生成関数
// =============================================================================

const getButtonStyles = (
  variant: ComponentVariant,
  size: ComponentSize,
  disabled: boolean,
  fullWidth: boolean,
  theme: ColorTheme
) => {
  const sizeStyles = {
    xs: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, minHeight: 32 },
    sm: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, minHeight: 36 },
    md: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, minHeight: 44 },
    lg: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xl, minHeight: 52 },
    xl: { paddingVertical: SPACING.xl, paddingHorizontal: SPACING['2xl'], minHeight: 60 }
  };

  const variantStyles = {
    primary: {
      backgroundColor: disabled ? theme.surface.variant : theme.primary.main,
      borderWidth: 0
    },
    secondary: {
      backgroundColor: disabled ? theme.surface.variant : theme.secondary.main,
      borderWidth: 0
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: disabled ? theme.border.disabled : theme.primary.main
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0
    },
    danger: {
      backgroundColor: disabled ? theme.surface.variant : theme.status.error,
      borderWidth: 0
    }
  };

  return StyleSheet.create({
    container: {
      ...sizeStyles[size],
      ...variantStyles[variant],
      borderRadius: BORDER_RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled ? 0.6 : 1,
      width: fullWidth ? '100%' : 'auto',
      ...ELEVATION[variant === 'outline' || variant === 'ghost' ? 0 : 1]
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    text: {
      textAlign: 'center'
    },
    iconLeft: {
      marginRight: SPACING.xs
    },
    iconRight: {
      marginLeft: SPACING.xs
    }
  });
};

const getButtonTextStyles = (
  variant: ComponentVariant,
  size: ComponentSize,
  disabled: boolean,
  theme: ColorTheme
): TextStyle => {
  const sizeStyles = {
    xs: TYPOGRAPHY_TOKENS.labelSmall,
    sm: TYPOGRAPHY_TOKENS.labelMedium,
    md: TYPOGRAPHY_TOKENS.labelLarge,
    lg: TYPOGRAPHY_TOKENS.titleSmall,
    xl: TYPOGRAPHY_TOKENS.titleMedium
  };

  const variantColors = {
    primary: theme.primary.contrastText,
    secondary: theme.secondary.contrastText,
    outline: disabled ? theme.text.disabled : theme.primary.main,
    ghost: disabled ? theme.text.disabled : theme.text.primary,
    danger: theme.primary.contrastText
  };

  return {
    ...sizeStyles[size],
    color: variantColors[variant],
    fontWeight: '600'
  };
};

// 他のスタイル生成関数も同様に実装...

const getInputStyles = (
  variant: 'outline' | 'filled' | 'underline',
  size: ComponentSize,
  error: string | undefined,
  isFocused: boolean,
  theme: ColorTheme
) => {
  const sizeStyles = {
    xs: { height: 32, fontSize: 12 },
    sm: { height: 36, fontSize: 14 },
    md: { height: 44, fontSize: 16 },
    lg: { height: 52, fontSize: 18 },
    xl: { height: 60, fontSize: 20 }
  };

  const variantStyles = {
    outline: {
      borderWidth: 1,
      borderColor: error ? theme.status.error : isFocused ? theme.border.focus : theme.border.primary,
      backgroundColor: theme.background.default,
      borderRadius: BORDER_RADIUS.md
    },
    filled: {
      borderWidth: 0,
      backgroundColor: theme.surface.secondary,
      borderRadius: BORDER_RADIUS.md
    },
    underline: {
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: error ? theme.status.error : isFocused ? theme.border.focus : theme.border.primary,
      backgroundColor: 'transparent',
      borderRadius: 0
    }
  };

  return StyleSheet.create({
    container: {
      marginVertical: SPACING.xs
    },
    label: {
      ...TYPOGRAPHY_TOKENS.labelMedium,
      color: theme.text.primary,
      marginBottom: SPACING.xs
    },
    required: {
      color: theme.status.error
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      ...variantStyles[variant]
    },
    input: {
      flex: 1,
      ...sizeStyles[size],
      ...TYPOGRAPHY_TOKENS.bodyMedium,
      color: theme.text.primary,
      paddingHorizontal: SPACING.md
    },
    leftIcon: {
      paddingLeft: SPACING.md
    },
    rightIcon: {
      paddingRight: SPACING.md
    },
    error: {
      ...TYPOGRAPHY_TOKENS.bodySmall,
      color: theme.status.error,
      marginTop: SPACING.xs
    },
    hint: {
      ...TYPOGRAPHY_TOKENS.bodySmall,
      color: theme.text.secondary,
      marginTop: SPACING.xs
    }
  });
};

// 追加のスタイル生成関数（簡略化）
const getCardStyles = (elevation: number, padding: keyof typeof SPACING, theme: ColorTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[padding],
    ...ELEVATION[elevation]
  }
});

const getBadgeStyles = (variant: ComponentVariant, size: ComponentSize, theme: ColorTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.primary.main,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignSelf: 'flex-start'
  },
  text: {
    ...TYPOGRAPHY_TOKENS.labelSmall,
    color: theme.primary.contrastText,
    fontWeight: '600'
  }
});

const getSearchBarStyles = (theme: ColorTheme) => StyleSheet.create({
  container: {
    marginVertical: SPACING.sm
  },
  searchIcon: {
    fontSize: 16
  },
  clearButton: {
    padding: SPACING.xs
  },
  clearIcon: {
    fontSize: 14,
    color: theme.text.secondary
  }
});

const getListItemStyles = (theme: ColorTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: theme.background.default
  },
  leftContent: {
    marginRight: SPACING.md
  },
  content: {
    flex: 1
  },
  title: {
    ...TYPOGRAPHY_TOKENS.bodyLarge,
    color: theme.text.primary
  },
  subtitle: {
    ...TYPOGRAPHY_TOKENS.bodyMedium,
    color: theme.text.secondary,
    marginTop: SPACING.xs
  },
  rightContent: {
    marginLeft: SPACING.md
  },
  divider: {
    height: 1,
    backgroundColor: theme.border.primary,
    marginLeft: SPACING.lg
  }
});

const getModalStyles = (theme: ColorTheme) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay.backdrop
  },
  container: {
    backgroundColor: theme.background.paper,
    borderRadius: BORDER_RADIUS.lg,
    margin: SPACING.lg,
    maxWidth: '90%',
    maxHeight: '80%',
    ...ELEVATION[8]
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.primary
  },
  title: {
    ...TYPOGRAPHY_TOKENS.headlineSmall,
    color: theme.text.primary
  },
  closeButton: {
    padding: SPACING.sm
  },
  closeIcon: {
    fontSize: 18,
    color: theme.text.secondary
  },
  content: {
    padding: SPACING.lg
  }
});

const getFoodCardStyles = (theme: ColorTheme) => StyleSheet.create({
  container: {
    margin: SPACING.sm
  },
  touchable: {
    flexDirection: 'row'
  },
  imageContainer: {
    position: 'relative',
    marginRight: SPACING.md
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center'
  },
  imagePlaceholderText: {
    fontSize: 24
  },
  statusBadge: {
    position: 'absolute',
    top: -SPACING.xs,
    right: -SPACING.xs
  },
  content: {
    flex: 1,
    justifyContent: 'space-between'
  },
  name: {
    ...TYPOGRAPHY_TOKENS.titleMedium,
    color: theme.text.primary
  },
  category: {
    ...TYPOGRAPHY_TOKENS.bodySmall,
    color: theme.text.secondary
  },
  expiryDate: {
    ...TYPOGRAPHY_TOKENS.labelMedium,
    fontWeight: '600'
  },
  quantity: {
    ...TYPOGRAPHY_TOKENS.bodySmall,
    color: theme.text.tertiary
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs
  },
  actionIcon: {
    fontSize: 16
  }
});

const getTabBarStyles = (theme: ColorTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.surface.primary,
    borderTopWidth: 1,
    borderTopColor: theme.border.primary,
    ...ELEVATION[2]
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm
  },
  activeTab: {
    backgroundColor: theme.primary.main + '10'
  },
  tabIcon: {
    marginBottom: SPACING.xs
  },
  tabText: {
    ...TYPOGRAPHY_TOKENS.labelSmall,
    color: theme.text.secondary
  },
  activeTabText: {
    color: theme.primary.main,
    fontWeight: '600'
  },
  badge: {
    position: 'absolute',
    top: SPACING.xs,
    right: '25%'
  }
});

// =============================================================================
// UTILITY FUNCTIONS - ユーティリティ関数
// =============================================================================

const getStatusText = (status: string): string => {
  const statusMap = {
    fresh: '新鮮',
    good: '良好',
    acceptable: '普通',
    poor: '劣化',
    spoiled: '腐敗'
  };
  return statusMap[status as keyof typeof statusMap] || status;
};

const formatExpiryDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}日前に期限切れ`;
  } else if (diffDays === 0) {
    return '今日が期限';
  } else if (diffDays === 1) {
    return '明日が期限';
  } else {
    return `あと${diffDays}日`;
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  Button,
  Input,
  Card,
  Badge,
  SearchBar,
  ListItem,
  Modal,
  FoodCard,
  TabBar
};

export default {
  atoms: { Button, Input, Card, Badge },
  molecules: { SearchBar, ListItem, Modal },
  organisms: { FoodCard, TabBar }
};
