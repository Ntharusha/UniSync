import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiGet } from '../../lib/api';
import { colors } from '../../constants/theme';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

interface AcademicRequestType {
  _id: string;
  studentId: string;
  faculty: string;
  department: string;
  degreeProgram: string;
  requestType: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
}

export default function MyRequests() {
  const { data: requests = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => apiGet<AcademicRequestType[]>('/api/academic-requests'),
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'emergency':
        return 'danger';
      case 'academic_urgent':
        return 'warning';
      case 'normal':
      default:
        return 'info';
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'pending':
      default:
        return 'warning';
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
        data={requests}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Card className="mb-4">
            <View className="flex-row justify-between items-start mb-3">
              <View className="bg-vau-maroon/5 px-2.5 py-1 rounded-full">
                <Text className="text-[10px] font-black text-vau-maroon uppercase">
                  {item.requestType.replace('-', ' ')}
                </Text>
              </View>
              <Text className="text-[10px] text-gray-400 font-bold">
                {format(new Date(item.createdAt), 'MMM d, yyyy')}
              </Text>
            </View>

            <Text className="text-sm font-bold text-gray-900 mb-1">{item.title}</Text>
            <Text className="text-[10px] text-gray-500 font-medium mb-3">
              {item.faculty} • {item.department} • {item.degreeProgram}
            </Text>

            <Text className="text-xs text-gray-600 font-medium leading-relaxed italic bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-3">
              "{item.description}"
            </Text>

            <View className="flex-row gap-2">
              <Badge label={item.priority} variant={getPriorityColor(item.priority)} />
              <Badge label={item.status} variant={getStatusColor(item.status)} />
            </View>
          </Card>
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
            title="No academic requests"
            message="Any special requests or course issue tickets you submit will appear here."
            icon="document-text-outline"
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
