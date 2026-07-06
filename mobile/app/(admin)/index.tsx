import React from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { AdminAnalytics } from '../../types';
import { colors } from '../../constants/theme';
import Card from '../../components/ui/Card';

export default function AdminDashboard() {
  const { data: analytics, isLoading, refetch, isRefetching } = useQuery<AdminAnalytics>({
    queryKey: ['admin-analytics'],
    queryFn: () => apiGet<AdminAnalytics>('/api/admin/analytics'),
  });

  const renderStat = (label: string, value: string | number, color: string) => (
    <Card className="flex-1 min-w-[45%] mb-3">
      <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</Text>
      <Text className={`text-2xl font-black ${color} mt-1`}>{value}</Text>
    </Card>
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background px-4 py-4"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[colors.primary]}
        />
      }
    >
      <Text className="text-xl font-black text-gray-900 mb-4">System Overview</Text>

      {/* Row 1 */}
      <View className="flex-row flex-wrap gap-2.5">
        {renderStat('Total Users', analytics?.totalUsers || 0, 'text-gray-900')}
        {renderStat('Lecturers', analytics?.totalLecturers || 0, 'text-blue-600')}
        {renderStat('Students', analytics?.totalStudents || 0, 'text-indigo-600')}
        {renderStat('Total Appts', analytics?.totalAppointments || 0, 'text-vau-maroon')}
      </View>

      <Text className="text-xl font-black text-gray-900 mt-6 mb-4">Health & Operations</Text>

      {/* Health metrics */}
      <View className="space-y-3 mb-10">
        <Card className="flex-row justify-between items-center">
          <View>
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Server Uptime</Text>
            <Text className="text-base font-bold text-gray-900 mt-0.5">{analytics?.uptime || 'N/A'}</Text>
          </View>
          <View className="h-2 w-2 rounded-full bg-green-500" />
        </Card>

        <Card className="flex-row justify-between items-center">
          <View>
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Average Response Delay</Text>
            <Text className="text-base font-bold text-gray-900 mt-0.5">{analytics?.avgResponse || 'N/A'}</Text>
          </View>
          <View className="h-2 w-2 rounded-full bg-blue-500" />
        </Card>
      </View>
    </ScrollView>
  );
}
