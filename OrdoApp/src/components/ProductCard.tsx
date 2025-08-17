/**
 * Ordo App - Product Card Component
 * Displays product information in a card format
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Product, FreshnessLevel } from '../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { ProductUtils, DateUtils } from '../utils';

export interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  style?: ViewStyle;
  showExpiration?: boolean;
  showLocation?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  style,
  showExpiration = true,
  showLocation = true,
}) => {
  const freshnessLevel = ProductUtils.getFreshnessLevel(product);
  const freshnessColor = ProductUtils.getFreshnessColor(freshnessLevel);
  const daysUntilExpiration = product.expirationDate 
    ? DateUtils.getDaysUntilExpiration(product.expirationDate)
    : null;

  const getFreshnessText = (): string => {
    if (!product.expirationDate || daysUntilExpiration === null) return '';
    
    if (daysUntilExpiration < 0) return '期限切れ';
    if (daysUntilExpiration === 0) return '今日期限';
    if (daysUntilExpiration === 1) return '明日期限';
    return `${daysUntilExpiration}日後`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.imageUri ? (
            <Image source={{ uri: product.imageUri }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: freshnessColor }]}>
              <Text style={styles.imagePlaceholderText}>
                {product.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
          
          <Text style={styles.category}>
            {product.category}
          </Text>

          {/* Expiration Info */}
          {showExpiration && product.expirationDate && (
            <View style={styles.expirationContainer}>
              <View
                style={[
                  styles.freshnessIndicator,
                  { backgroundColor: freshnessColor },
                ]}
              />
              <Text
                style={[
                  styles.expirationText,
                  { color: freshnessColor },
                ]}
              >
                {getFreshnessText()}
              </Text>
            </View>
          )}

          {/* Location */}
          {showLocation && product.location && (
            <Text style={styles.location}>
              📍 {product.location}
            </Text>
          )}
        </View>

        {/* AI Confidence Badge */}
        {product.confidence && product.confidence < 1 && (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              AI {Math.round(product.confidence * 100)}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    marginBottom: SPACING.SM,
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  content: {
    flexDirection: 'row',
    padding: SPACING.MD,
    alignItems: 'center',
  },

  imageContainer: {
    marginRight: SPACING.MD,
  },

  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },

  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  imagePlaceholderText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE_XLARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
  },

  info: {
    flex: 1,
  },

  name: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },

  category: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
    textTransform: 'capitalize',
  },

  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },

  freshnessIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.XS,
  },

  expirationText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
  },

  location: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
  },

  confidenceBadge: {
    position: 'absolute',
    top: SPACING.XS,
    right: SPACING.XS,
    backgroundColor: COLORS.INFO,
    paddingHorizontal: SPACING.XS,
    paddingVertical: 2,
    borderRadius: 4,
  },

  confidenceText: {
    fontSize: 10,
    color: COLORS.WHITE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
  },
});
