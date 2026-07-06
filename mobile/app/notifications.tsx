import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../lib/api';
import { AppNotification } from '../types';
import { colors } from '../constants/theme';
import NotificationItem from '../components/notifications/NotificationItem';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const { data: notifications = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', user?._id],
    queryFn: () => apiGet<AppNotification[]>(`/api/notifications/${user?._id}`),
    enabled: !!user?._id,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiPatch('/api/notifications/read-all'),
    onSuccess: () => {
      success('Cleared', 'All notifications marked as read.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      error('Failed to Clear', err.response?.data?.error || 'An error occurred.');
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View className="flex-1 bg-background px-4 pt-4">
      {unreadCount > 0 ? (
        <View className="mb-4 flex-row justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <Text className="text-xs font-bold text-gray-700">
            You have {unreadCount} unread notifications.
          </Text>
          <Button
            label="Mark all as read"
            onPress={() => markAllReadMutation.mutate()}
            size="sm"
            variant="ghost"
          />
        </View>
      ) : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => !item.read && markReadMutation.mutate(item._id)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="All caught up!"
            message="No system notifications or status change warnings to display."
            icon="notifications-off-outline"
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
