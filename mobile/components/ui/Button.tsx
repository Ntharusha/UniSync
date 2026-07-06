import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  labelStyle,
  icon,
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-amber-500 border border-transparent';
      case 'danger':
        return 'bg-red-500 border border-transparent';
      case 'outline':
        return 'bg-transparent border border-gray-300';
      case 'ghost':
        return 'bg-transparent border border-transparent';
      case 'primary':
      default:
        return 'bg-vau-maroon border border-transparent';
    }
  };

  const getLabelStyles = () => {
    switch (variant) {
      case 'outline':
        return 'text-gray-700 font-bold';
      case 'ghost':
        return 'text-vau-maroon font-bold';
      case 'primary':
      case 'secondary':
      case 'danger':
      default:
        return 'text-white font-bold';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 rounded-xl text-xs';
      case 'lg':
        return 'px-8 py-4 rounded-3xl text-lg';
      case 'md':
      default:
        return 'px-6 py-3 rounded-2xl text-sm';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center transition-all ${getVariantStyles()} ${getSizeStyles()} ${
        disabled ? 'opacity-50' : ''
      }`}
      style={style}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
          className="mr-2"
        />
      ) : icon ? (
        <React.Fragment>
          {icon}
          <Text className={`${getLabelStyles()} ml-2`} style={labelStyle}>
            {label}
          </Text>
        </React.Fragment>
      ) : (
        <Text className={getLabelStyles()} style={labelStyle}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
