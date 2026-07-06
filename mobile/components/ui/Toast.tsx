import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../hooks/useToast';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function Toast() {
  const { toasts, hide } = useToast();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={{ top: insets.top + 10 }}
      className="absolute left-4 right-4 z-50 space-y-2 pointer-events-box-none"
    >
      {toasts.map((toast) => {
        const getStyles = () => {
          switch (toast.type) {
            case 'success':
              return {
                bg: 'bg-green-50 border-green-200',
                text: 'text-green-800',
                icon: 'checkmark-circle',
                iconColor: colors.success,
              };
            case 'error':
              return {
                bg: 'bg-red-50 border-red-200',
                text: 'text-red-800',
                icon: 'alert-circle',
                iconColor: colors.danger,
              };
            case 'warning':
              return {
                bg: 'bg-amber-50 border-amber-200',
                text: 'text-amber-800',
                icon: 'warning',
                iconColor: colors.warning,
              };
            case 'info':
            default:
              return {
                bg: 'bg-blue-50 border-blue-200',
                text: 'text-blue-800',
                icon: 'information-circle',
                iconColor: colors.info,
              };
          }
        };

        const config = getStyles();

        return (
          <TouchableOpacity
            key={toast.id}
            activeOpacity={0.9}
            onPress={() => hide(toast.id)}
            className={`flex-row items-center p-4 rounded-2xl border ${config.bg} shadow-md`}
          >
            <Ionicons name={config.icon as any} size={22} color={config.iconColor} />
            <View className="flex-1 ml-3 mr-2">
              <Text className={`font-black text-sm ${config.text}`}>{toast.title}</Text>
              {toast.message ? (
                <Text className="text-xs text-gray-600 mt-0.5 leading-snug">{toast.message}</Text>
              ) : null}
            </View>
            <Ionicons name="close" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
