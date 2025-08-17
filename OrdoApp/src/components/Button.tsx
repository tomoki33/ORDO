/**
 * Ordo App - Button Component
 * Reusable button component with consistent styling
 */

import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles],
    styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? COLORS.PRIMARY : COLORS.WHITE} 
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  // Variants
  primary: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondary: {
    backgroundColor: COLORS.SECONDARY,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  danger: {
    backgroundColor: COLORS.ERROR,
  },

  // Sizes
  small: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    minHeight: 32,
  },
  medium: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    minHeight: 52,
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    textAlign: 'center',
  },
  textPrimary: {
    color: COLORS.WHITE,
  },
  textSecondary: {
    color: COLORS.WHITE,
  },
  textOutline: {
    color: COLORS.PRIMARY,
  },
  textDanger: {
    color: COLORS.WHITE,
  },
  textDisabled: {
    opacity: 0.7,
  },

  // Text sizes
  textSmall: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
  },
  textMedium: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
  },
  textLarge: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
  },
});
