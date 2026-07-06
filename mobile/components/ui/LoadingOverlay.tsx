import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors } from '../../constants/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export default function LoadingOverlay({ visible, message = 'Loading...' }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 items-center justify-center">
      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-xs font-bold text-gray-500 mt-3">{message}</Text>
      </View>
    </View>
  );
}
