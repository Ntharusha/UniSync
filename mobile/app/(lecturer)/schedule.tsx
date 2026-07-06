import React from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiGet } from '../../lib/api';
import { Appointment, User } from '../../types';
import { colors } from '../../constants/theme';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function LecturerSchedule() {
  const { user } = useAuth();

  const { data: appointments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['lecturer-schedule', user?._id],
    queryFn: () => apiGet<Appointment[]>(`/api/appointments?lecturerId=${user?._id}`),
    enabled: !!user?._id,
  });

  const upcomingApproved = appointments
    .filter((a) => a.status === 'approved')
    .sort((a, b) => new Date(a.requestedStart).getTime() - new Date(b.requestedStart).getTime());

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
      {/* Date Header */}
      <View className="flex-row justify-between items-center mb-4 ml-1">
        <Text className="text-base font-black text-gray-900 uppercase tracking-wide">
          {format(new Date(), 'EEEE, MMMM do')}
        </Text>
        <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Today's Timeline
        </Text>
      </View>

      {/* Schedule list */}
      <View className="bg-white rounded-[2.5rem] p-6 border border-gray-100 mb-10 shadow-sm">
        {upcomingApproved.length === 0 ? (
          <EmptyState
            title="No appointments today"
            message="You are free! Check back later if any last-minute emergency bookings appear."
          />
        ) : (
          upcomingApproved.map((appt, i) => {
            const student = appt.studentId as User;
            const duration = Math.round(
              (new Date(appt.requestedEnd).getTime() - new Date(appt.requestedStart).getTime()) / 60000
            );

            return (
              <View key={appt._id} className="relative flex-row gap-5 pb-6 last:pb-0">
                {/* Timeline connector line */}
                {i !== upcomingApproved.length - 1 ? (
                  <View className="absolute left-3 top-10 bottom-0 w-0.5 bg-gray-100" />
                ) : null}

                {/* Left Dot */}
                <View className="h-6 w-6 rounded-full bg-blue-500 border-4 border-white shadow-sm z-10 mt-1 shrink-0" />

                {/* Right Card Content */}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="font-black text-sm text-gray-900">
                      {format(new Date(appt.requestedStart), 'HH:mm')} — {format(new Date(appt.requestedEnd), 'HH:mm')}
                    </Text>
                    <Text className="text-[9px] font-black text-gray-400 uppercase">
                      {duration} MINS
                    </Text>
                  </View>
                  <View className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex-row items-center justify-between">
                    <View>
                      <Text className="text-xs font-black text-blue-900">{student?.name || 'Unknown'}</Text>
                      {student?.regNumber ? (
                        <Text className="text-[9px] text-blue-600 font-bold mt-0.5">{student.regNumber}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="calendar" size={18} color={colors.info} />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
