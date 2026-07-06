import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../../lib/api';
import { User } from '../../types';
import { colors } from '../../constants/theme';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

export default function UserDirectories() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const { data: users = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiGet<User[]>('/api/admin/users'), // Admin role restricts this route
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiPatch(`/api/admin/users/${id}/status`, { isActive }),
    onSuccess: () => {
      success('Updated', 'User account status toggled successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      error('Failed to Toggle', err.response?.data?.error || 'An error occurred.');
    },
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'purple';
      case 'lecturer':
        return 'info';
      case 'student':
      default:
        return 'neutral';
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-4 pt-4">
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Card className="mb-3 flex-row justify-between items-center">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="h-10 w-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                <Text className="text-gray-500 font-bold text-sm">
                  {item.name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900 truncate">{item.name}</Text>
                <Text className="text-xs text-gray-500 truncate mt-0.5">{item.email}</Text>
                <View className="flex-row gap-1.5 mt-1.5">
                  <Badge label={item.role} variant={getRoleColor(item.role)} />
                  {item.regNumber ? (
                    <View className="bg-gray-50 px-2 py-0.5 rounded-full border border-gray-150">
                      <Text className="text-[9px] font-bold text-gray-500">{item.regNumber}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {item.role !== 'admin' ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  toggleStatusMutation.mutate({ id: item._id, isActive: !item.isActive })
                }
                className={`p-2.5 rounded-xl border ${
                  item.isActive
                    ? 'bg-red-50 border-red-100'
                    : 'bg-green-50 border-green-100'
                }`}
              >
                <Ionicons
                  name={item.isActive ? 'lock-closed-outline' : 'lock-open-outline'}
                  size={16}
                  color={item.isActive ? colors.danger : colors.success}
                />
              </TouchableOpacity>
            ) : null}
          </Card>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
