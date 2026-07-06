import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { AppNotification } from '../../types';
import { colors } from '../../constants/theme';

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
}

export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const getBadgeColors = () => {
    switch (notification.type) {
      case 'success':
        return { bg: 'bg-green-50 border-green-100', text: 'text-green-700', icon: 'checkmark-circle' as const, color: colors.success };
      case 'error':
        return { bg: 'bg-red-50 border-red-100', text: 'text-red-700', icon: 'alert-circle' as const, color: colors.danger };
      case 'warning':
        return { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: 'warning' as const, color: colors.warning };
      case 'displacement':
        return { bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700', icon: 'swap-horizontal' as const, color: colors.displacement };
      case 'info':
      default:
        return { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: 'information-circle' as const, color: colors.info };
    }
  };

  const styleConfig = getBadgeColors();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`p-4 rounded-2xl border bg-white mb-2 flex-row items-start ${
        !notification.read ? 'border-gray-250 shadow-sm' : 'border-gray-100 opacity-70'
      }`}
    >
      <View className={`p-2 rounded-xl ${styleConfig.bg} mr-3`}>
        <Ionicons name={styleConfig.icon} size={20} color={styleConfig.color} />
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between items-start mb-0.5">
          <Text className={`font-bold text-sm ${!notification.read ? 'text-gray-900' : 'text-gray-500'} flex-1 mr-2`}>
            {notification.title}
          </Text>
          <Text className="text-[9px] text-gray-400 font-bold uppercase shrink-0 mt-0.5">
            {format(new Date(notification.createdAt), 'HH:mm')}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 leading-relaxed mb-1">
          {notification.message}
        </Text>
        <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
          {format(new Date(notification.createdAt), 'MMM d, yyyy')}
        </Text>
      </View>
      {!notification.read ? (
        <View className="h-2 w-2 rounded-full bg-vau-maroon shrink-0 ml-2 mt-1.5" />
      ) : null}
    </TouchableOpacity>
  );
}
