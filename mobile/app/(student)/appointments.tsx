import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiGet, apiPatch } from '../../lib/api';
import { Appointment } from '../../types';
import { colors } from '../../constants/theme';
import AppointmentCard from '../../components/appointment/AppointmentCard';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export default function Appointments() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  
  const [decliningApptId, setDecliningApptId] = React.useState<string | null>(null);
  const [declineReason, setDeclineReason] = React.useState('');

  const { data: appointments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => apiGet<Appointment[]>('/api/appointments'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/appointments/${id}`, { status: 'cancelled' }),
    onSuccess: () => {
      success('Cancelled', 'Your appointment has been cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: (err: any) => {
      error('Cancel Failed', err.response?.data?.error || 'Failed to cancel appointment.');
    },
  });

  const acceptRescheduleMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/appointments/${id}`, { status: 'approved' }),
    onSuccess: () => {
      success('Reschedule Accepted', 'The rescheduled time slot has been accepted.');
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: (err: any) => {
      error('Failed to Accept', err.response?.data?.error || 'Failed to accept rescheduled slot.');
    },
  });

  const declineRescheduleMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiPatch(`/api/appointments/${id}`, { status: 'cancelled', reason }),
    onSuccess: () => {
      success('Declined', 'Proposed rescheduled slot has been declined.');
      setDecliningApptId(null);
      setDeclineReason('');
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: (err: any) => {
      error('Failed to Decline', err.response?.data?.error || 'Failed to decline rescheduled slot.');
    },
  });

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
        data={appointments}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <AppointmentCard
            appt={item}
            role="student"
            onChat={() => router.push(`/chat/${item._id}`)}
            onReject={
              item.status === 'pending'
                ? () => {
                    if (confirm?.('Are you sure you want to cancel this appointment request?')) {
                      cancelMutation.mutate(item._id);
                    }
                  }
                : undefined
            }
            onAcceptReschedule={() => acceptRescheduleMutation.mutate(item._id)}
            onDeclineReschedulePress={() => {
              setDecliningApptId(item._id);
              setDeclineReason('');
            }}
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
            title="No appointments yet"
            message="Your booked appointments and slot history will show up here."
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Decline Reason Modal/Overlay */}
      {decliningApptId && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 16 }}>
          <View className="bg-white w-full rounded-3xl p-6 border border-gray-100 shadow-xl space-y-4">
            <Text className="text-base font-black text-gray-900">Decline Rescheduled Slot</Text>
            
            <View className="space-y-1">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason for declining (Required)</Text>
              <TextInput 
                value={declineReason}
                onChangeText={setDeclineReason}
                placeholder="I cannot attend because..."
                multiline
                numberOfLines={3}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-gray-900 h-20"
              />
            </View>

            <View className="flex-row justify-end gap-2 pt-2 border-t border-gray-100">
              <TouchableOpacity
                onPress={() => {
                  setDecliningApptId(null);
                  setDeclineReason('');
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200"
              >
                <Text className="text-xs font-bold text-gray-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!declineReason.trim()}
                onPress={() => {
                  declineRescheduleMutation.mutate({ id: decliningApptId, reason: declineReason });
                }}
                style={{ opacity: declineReason.trim() ? 1 : 0.5 }}
                className="bg-red-500 px-5 py-2.5 rounded-xl"
              >
                <Text className="text-xs font-bold text-white">Decline & Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
