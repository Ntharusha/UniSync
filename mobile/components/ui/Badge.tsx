import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple';
}

export default function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const getBadgeColors = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'danger':
        return 'bg-red-100 text-red-700';
      case 'info':
        return 'bg-blue-100 text-blue-700';
      case 'purple':
        return 'bg-purple-100 text-purple-700';
      case 'neutral':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <View className={`px-2.5 py-0.5 rounded-full ${getBadgeColors()}`}>
      <Text className="text-[10px] font-black uppercase tracking-wider text-center">
        {label}
      </Text>
    </View>
  );
}
