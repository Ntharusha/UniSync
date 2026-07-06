import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function EmptyState({
  title,
  message,
  icon = 'calendar-outline',
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8 bg-transparent py-16">
      <View className="p-5 bg-gray-50 rounded-full mb-4 border border-gray-100">
        <Ionicons name={icon} size={36} color={colors.text.muted} />
      </View>
      <Text className="text-base font-bold text-gray-900 text-center mb-1">{title}</Text>
      {message ? (
        <Text className="text-xs text-gray-500 text-center max-w-[240px] leading-relaxed">
          {message}
        </Text>
      ) : null}
    </View>
  );
}
