/**
 * Ordo Component Foundation (8時間実装 - 基本版)
 * 
 * 共通コンポーネントライブラリの基盤
 * Material Design 3 + Ordo デザインシステム準拠
 * TypeScript完全対応
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';
import { LIGHT_THEME, DARK_THEME, ColorTheme } from './Colors';
import { TYPOGRAPHY_TOKENS } from './Typography';
import { SPACING, BORDER_RADIUS } from './DesignSystem';

// =============================================================================
// ELEVATION SYSTEM
// =============================================================================

export const ELEVATION = {
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
// TYPES
// =============================================================================

export interface ComponentProps {
  theme?: ColorTheme;
  style?: ViewStyle;
  testID?: string;
}

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

// =============================================================================
// BUTTON COMPONENT
// =============================================================================

export interface OrdoButtonProps extends ComponentProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  onPress?: () => void;
}

export const OrdoButton: React.FC<OrdoButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  style,
  theme = LIGHT_THEME,
  testID,
  onPress
}) => {
  const buttonStyles = getButtonStyles(variant, size, disabled, fullWidth, theme);
  const textStyles = getButtonTextStyles(variant, size, disabled, theme);

  return (
    <TouchableOpacity
      style={[buttonStyles.container, style]}
      disabled={disabled || loading}
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      <Text style={textStyles}>{children}</Text>
    </TouchableOpacity>
  );
};

// =============================================================================
// CARD COMPONENT
// =============================================================================

export interface OrdoCardProps extends ComponentProps {
  elevation?: 0 | 1 | 2 | 4 | 8;
  padding?: keyof typeof SPACING;
  children: ReactNode;
}

export const OrdoCard: React.FC<OrdoCardProps> = ({
  elevation = 2,
  padding = 'md',
  children,
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const cardStyles = getCardStyles(elevation, padding, theme);

  return (
    <View style={[cardStyles.container, style]} testID={testID}>
      {children}
    </View>
  );
};

// =============================================================================
// INPUT COMPONENT
// =============================================================================

export interface OrdoInputProps extends ComponentProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  size?: ComponentSize;
  variant?: 'outline' | 'filled';
}

export const OrdoInput: React.FC<OrdoInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  size = 'md',
  variant = 'outline',
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const inputStyles = getInputStyles(variant, size, error, theme);

  return (
    <View style={inputStyles.container}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <TextInput
        style={[inputStyles.input, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text.tertiary}
        testID={testID}
      />
      {error && <Text style={inputStyles.error}>{error}</Text>}
    </View>
  );
};

// =============================================================================
// BADGE COMPONENT
// =============================================================================

export interface OrdoBadgeProps extends ComponentProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  children: ReactNode;
}

export const OrdoBadge: React.FC<OrdoBadgeProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  style,
  theme = LIGHT_THEME,
  testID
}) => {
  const badgeStyles = getBadgeStyles(variant, size, theme);

  return (
    <View style={[badgeStyles.container, style]} testID={testID}>
      <Text style={badgeStyles.text}>{children}</Text>
    </View>
  );
};

// =============================================================================
// FOOD CARD COMPONENT (Ordo専用)
// =============================================================================

export interface FoodItem {
  id: string;
  name: string;
  expiryDate: string;
  status: 'fresh' | 'good' | 'acceptable' | 'poor' | 'spoiled';
  category?: string;
  quantity?: string;
}

export interface OrdoFoodCardProps extends ComponentProps {
  foodItem: FoodItem;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const OrdoFoodCard: React.FC<OrdoFoodCardProps> = ({
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
    <OrdoCard 
      style={foodCardStyles.container} 
      testID={testID} 
      theme={theme}
    >
      <TouchableOpacity onPress={onPress} style={foodCardStyles.touchable}>
        {/* 食品情報 */}
        <View style={foodCardStyles.content}>
          <Text style={foodCardStyles.name}>{foodItem.name}</Text>
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
        
        {/* ステータスバッジ */}
        <OrdoBadge
          variant="primary"
          size="sm"
          style={{ backgroundColor: statusColor.main }}
        >
          {getStatusText(foodItem.status)}
        </OrdoBadge>
      </TouchableOpacity>
    </OrdoCard>
  );
};

// =============================================================================
// STYLE GENERATORS
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
    xl: { paddingVertical: SPACING.xl, paddingHorizontal: SPACING.xxl, minHeight: 60 }
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
      ...(variant === 'outline' || variant === 'ghost' ? ELEVATION[0] : ELEVATION[1])
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
    fontWeight: '600',
    textAlign: 'center'
  };
};

const getCardStyles = (
  elevation: 0 | 1 | 2 | 4 | 8,
  padding: keyof typeof SPACING,
  theme: ColorTheme
) => {
  // SPACINGの値が複雑な場合は、数値のみ使用
  const paddingValue = typeof SPACING[padding] === 'number' ? SPACING[padding] : SPACING.md;
  
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface.primary,
      borderRadius: BORDER_RADIUS.lg,
      padding: paddingValue,
      ...ELEVATION[elevation]
    }
  });
};

const getInputStyles = (
  variant: 'outline' | 'filled',
  size: ComponentSize,
  error: string | undefined,
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
      borderColor: error ? theme.status.error : theme.border.primary,
      backgroundColor: theme.background.default
    },
    filled: {
      borderWidth: 0,
      backgroundColor: theme.surface.secondary
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
    input: {
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...TYPOGRAPHY_TOKENS.bodyMedium,
      color: theme.text.primary,
      paddingHorizontal: SPACING.md,
      borderRadius: BORDER_RADIUS.md
    },
    error: {
      ...TYPOGRAPHY_TOKENS.bodySmall,
      color: theme.status.error,
      marginTop: SPACING.xs
    }
  });
};

const getBadgeStyles = (
  variant: ComponentVariant,
  size: ComponentSize,
  theme: ColorTheme
) => {
  const sizeStyles = {
    xs: { paddingHorizontal: SPACING.xs, paddingVertical: 2 },
    sm: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
    md: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    lg: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    xl: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg }
  };

  return StyleSheet.create({
    container: {
      backgroundColor: theme.primary.main,
      borderRadius: BORDER_RADIUS.round,
      ...sizeStyles[size],
      alignSelf: 'flex-start'
    },
    text: {
      ...TYPOGRAPHY_TOKENS.labelSmall,
      color: theme.primary.contrastText,
      fontWeight: '600',
      textAlign: 'center'
    }
  });
};

const getFoodCardStyles = (theme: ColorTheme) => StyleSheet.create({
  container: {
    margin: SPACING.sm
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  content: {
    flex: 1
  },
  name: {
    ...TYPOGRAPHY_TOKENS.titleMedium,
    color: theme.text.primary,
    marginBottom: SPACING.xs
  },
  category: {
    ...TYPOGRAPHY_TOKENS.bodySmall,
    color: theme.text.secondary,
    marginBottom: SPACING.xs
  },
  expiryDate: {
    ...TYPOGRAPHY_TOKENS.labelMedium,
    fontWeight: '600',
    marginBottom: SPACING.xs
  },
  quantity: {
    ...TYPOGRAPHY_TOKENS.bodySmall,
    color: theme.text.tertiary
  }
});

// =============================================================================
// UTILITY FUNCTIONS
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
  OrdoButton as Button,
  OrdoCard as Card,
  OrdoInput as Input,
  OrdoBadge as Badge,
  OrdoFoodCard as FoodCard
};

export default {
  Button: OrdoButton,
  Card: OrdoCard,
  Input: OrdoInput,
  Badge: OrdoBadge,
  FoodCard: OrdoFoodCard,
  ELEVATION
};
