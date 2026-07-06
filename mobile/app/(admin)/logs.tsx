import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiGet } from '../../lib/api';
import { AuditLog, User } from '../../types';
import { colors } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function AuditLogs() {
  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery<AuditLog[]>({
    queryKey: ['admin-logs'],
    queryFn: () => apiGet<AuditLog[]>('/api/admin/logs'),
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('APPROVED')) return 'success';
    if (action.includes('DELETE') || action.includes('REJECTED') || action.includes('CANCEL')) return 'danger';
    return 'info';
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
        data={logs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const actor = item.actorId as User;
          return (
            <Card className="mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <Badge label={item.action.replace('_', ' ')} variant={getActionColor(item.action)} />
                <Text className="text-[9px] text-gray-400 font-bold">
                  {format(new Date(item.timestamp), 'HH:mm:ss')}
                </Text>
              </View>

              <Text className="text-xs text-gray-800 font-bold mb-1.5">
                Actor: {actor?.name || 'System'} ({actor?.role || 'Service'})
              </Text>
              <Text className="text-[10px] text-gray-500 leading-relaxed font-semibold">
                Entity: {item.entityType} ({item.entityId})
              </Text>

              {item.metadata ? (
                <Text className="text-[9px] text-gray-450 font-bold font-mono mt-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                  {JSON.stringify(item.metadata, null, 2)}
                </Text>
              ) : null}

              <Text className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">
                {format(new Date(item.timestamp), 'MMM d, yyyy')}
              </Text>
            </Card>
          );
        }}
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
