import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { apiGet, apiPatch } from '../../lib/api';
import { Appointment } from '../../types';
import { colors } from '../../constants/theme';
import AppointmentCard from '../../components/appointment/AppointmentCard';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

export default function LecturerRequests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [filterPriority, setFilterPriority] = React.useState<string>('all');

  // Reschedule Dialog States
  const [reschedulingAppt, setReschedulingAppt] = React.useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState('');
  const [rescheduleStart, setRescheduleStart] = React.useState('');
  const [rescheduleEnd, setRescheduleEnd] = React.useState('');
  const [rescheduleReason, setRescheduleReason] = React.useState('');

  const { data: appointments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['lecturer-appointments', user?._id],
    queryFn: () => apiGet<Appointment[]>(`/api/appointments?lecturerId=${user?._id}`),
    enabled: !!user?._id,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/api/appointments/${id}`, { status }),
    onSuccess: (_, variables) => {
      success('Status Updated', `Appointment ${variables.status} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['lecturer-appointments'] });
    },
    onError: (err: any) => {
      error('Failed to Update', err.response?.data?.error || 'An error occurred.');
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, proposedStart, proposedEnd, reason }: { id: string; proposedStart: string; proposedEnd: string; reason: string }) =>
      apiPatch(`/api/appointments/${id}`, { status: 'rescheduled', proposedStart, proposedEnd, reason }),
    onSuccess: () => {
      success('Reschedule Proposed', 'Proposed new slot to student.');
      setReschedulingAppt(null);
      queryClient.invalidateQueries({ queryKey: ['lecturer-appointments'] });
    },
    onError: (err: any) => {
      error('Failed to Reschedule', err.response?.data?.error || 'An error occurred.');
    },
  });

  const handleOpenReschedule = (appt: Appointment) => {
    const originalDate = new Date(appt.requestedStart);
    const dateStr = format(originalDate, 'yyyy-MM-dd');
    const startStr = format(originalDate, 'HH:mm');
    const endStr = format(new Date(appt.requestedEnd), 'HH:mm');
    setReschedulingAppt(appt);
    setRescheduleDate(dateStr);
    setRescheduleStart(startStr);
    setRescheduleEnd(endStr);
    setRescheduleReason('');
  };

  const filtered = filterPriority === 'all'
    ? appointments
    : appointments.filter((a) => a.priority === filterPriority);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const newRequests = filtered.filter(
    (a) =>
      a.status === 'pending' &&
      a.createdAt &&
      new Date(a.createdAt).getTime() >= startOfDay
  );
  const pendingRequests = filtered.filter(
    (a) =>
      a.status === 'pending' &&
      (!a.createdAt || new Date(a.createdAt).getTime() < startOfDay)
  );
  const approvedRequests = filtered.filter(
    (a) =>
      (a.status === 'approved' || a.status === 'rescheduled') &&
      new Date(a.requestedEnd).getTime() > now.getTime()
  );
  const completedRequests = filtered.filter(
    (a) =>
      a.status === 'approved' &&
      new Date(a.requestedEnd).getTime() <= now.getTime()
  );

  const renderStatsCard = (label: string, value: number, colorBg: string) => (
    <View className={`flex-1 p-4 rounded-3xl ${colorBg} items-center shadow-sm`}>
      <Text className="text-[10px] font-black uppercase text-white/80 tracking-widest">{label}</Text>
      <Text className="text-2xl font-black text-white mt-1">{value}</Text>
    </View>
  );

  const renderFilterButton = (p: string, title: string, desc: string, activeBg: string) => {
    const isSelected = filterPriority === p;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setFilterPriority(p)}
        className={`flex-1 p-3 rounded-2xl border items-center justify-center ${
          isSelected ? `${activeBg} border-transparent` : 'bg-white border-gray-150'
        }`}
      >
        <Text className={`font-black text-xs ${isSelected ? 'text-white' : 'text-gray-800'}`}>
          {title}
        </Text>
        <Text className={`text-[8px] font-bold mt-0.5 uppercase tracking-tighter ${
          isSelected ? 'text-white/80' : 'text-gray-400'
        }`}>
          {desc}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
      >
        {/* Overview Cards */}
        <View className="flex-row gap-2 mb-4">
          {renderStatsCard('New', newRequests.length, 'bg-indigo-500')}
          {renderStatsCard('Pending', pendingRequests.length, 'bg-amber-500')}
          {renderStatsCard('Approved', approvedRequests.length, 'bg-blue-500')}
          {renderStatsCard('Done', completedRequests.length, 'bg-green-500')}
        </View>

        {/* Filter Options */}
        <View className="space-y-2 mb-4">
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
            Filter Queue
          </Text>
          <View className="flex-row gap-1.5">
            {renderFilterButton('all', 'All', 'Queue', 'bg-vau-maroon')}
            {renderFilterButton('normal', 'Normal', 'Routine', 'bg-green-500')}
            {renderFilterButton('academic_urgent', 'Urgent', 'Academic', 'bg-amber-500')}
            {renderFilterButton('emergency', 'Emergency', 'Critical', 'bg-red-500')}
          </View>
        </View>

        {/* New Requests Section */}
        <View className="mb-4">
          <View className="flex-row items-center gap-2 mb-3 ml-1">
            <View className="h-2 w-2 rounded-full bg-indigo-500" />
            <Text className="font-black text-sm text-gray-800 uppercase tracking-wider">New Requests</Text>
            <View className="bg-indigo-100 px-2 py-0.5 rounded-full">
              <Text className="text-[9px] font-black text-indigo-600">{newRequests.length}</Text>
            </View>
          </View>
          {newRequests.length === 0 ? (
            <View className="bg-white p-6 rounded-3xl border border-gray-100 items-center justify-center">
              <Text className="text-xs text-gray-400 font-bold">No new requests today.</Text>
            </View>
          ) : (
            newRequests.map((appt) => (
              <AppointmentCard
                key={appt._id}
                appt={appt}
                role="lecturer"
                onChat={() => router.push(`/chat/${appt._id}`)}
                onApprove={() => statusMutation.mutate({ id: appt._id, status: 'approved' })}
                onReject={() => statusMutation.mutate({ id: appt._id, status: 'rejected' })}
                onReschedulePress={() => handleOpenReschedule(appt)}
              />
            ))
          )}
        </View>

        {/* Older Pending Section */}
        <View className="mb-4">
          <View className="flex-row items-center gap-2 mb-3 ml-1">
            <View className="h-2 w-2 rounded-full bg-amber-500" />
            <Text className="font-black text-sm text-gray-800 uppercase tracking-wider">Pending Requests</Text>
            <View className="bg-amber-100 px-2 py-0.5 rounded-full">
              <Text className="text-[9px] font-black text-amber-600">{pendingRequests.length}</Text>
            </View>
          </View>
          {pendingRequests.length === 0 ? (
            <View className="bg-white p-6 rounded-3xl border border-gray-100 items-center justify-center">
              <Text className="text-xs text-gray-400 font-bold">No older pending requests.</Text>
            </View>
          ) : (
            pendingRequests.map((appt) => (
              <AppointmentCard
                key={appt._id}
                appt={appt}
                role="lecturer"
                onChat={() => router.push(`/chat/${appt._id}`)}
                onApprove={() => statusMutation.mutate({ id: appt._id, status: 'approved' })}
                onReject={() => statusMutation.mutate({ id: appt._id, status: 'rejected' })}
                onReschedulePress={() => handleOpenReschedule(appt)}
              />
            ))
          )}
        </View>

        {/* Approved / Completed Section */}
        <View className="mb-10">
          <View className="flex-row items-center gap-2 mb-3 ml-1">
            <View className="h-2 w-2 rounded-full bg-blue-500" />
            <Text className="font-black text-sm text-gray-800 uppercase tracking-wider">Approved Requests</Text>
            <View className="bg-blue-100 px-2 py-0.5 rounded-full">
              <Text className="text-[9px] font-black text-blue-600">{approvedRequests.length}</Text>
            </View>
          </View>
          {approvedRequests.length === 0 ? (
            <View className="bg-white p-6 rounded-3xl border border-gray-100 items-center justify-center">
              <Text className="text-xs text-gray-400 font-bold">No approved requests.</Text>
            </View>
          ) : (
            approvedRequests.map((appt) => (
              <AppointmentCard
                key={appt._id}
                appt={appt}
                role="lecturer"
                onChat={() => router.push(`/chat/${appt._id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Reschedule Modal/Overlay */}
      {reschedulingAppt && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 16 }}>
          <View className="bg-white w-full rounded-3xl p-6 border border-gray-100 shadow-xl space-y-4">
            <Text className="text-base font-black text-gray-900">Reschedule Appointment</Text>
            
            <View className="space-y-1">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date (YYYY-MM-DD)</Text>
              <TextInput 
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
                placeholder="2026-07-06"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-gray-900"
              />
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1 space-y-1">
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Time (HH:MM)</Text>
                <TextInput 
                  value={rescheduleStart}
                  onChangeText={setRescheduleStart}
                  placeholder="14:30"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-gray-900"
                />
              </View>
              <View className="flex-1 space-y-1">
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Time (HH:MM)</Text>
                <TextInput 
                  value={rescheduleEnd}
                  onChangeText={setRescheduleEnd}
                  placeholder="15:00"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-gray-900"
                />
              </View>
            </View>

            <View className="space-y-1">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason for Rescheduling</Text>
              <TextInput 
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                placeholder="Alternative slot proposed due to..."
                multiline
                numberOfLines={2}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-gray-900 h-16 text-align-vertical-top"
              />
            </View>

            <View className="flex-row justify-end gap-2 pt-2 border-t border-gray-100">
              <TouchableOpacity
                onPress={() => setReschedulingAppt(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200"
              >
                <Text className="text-xs font-bold text-gray-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!rescheduleDate.trim() || !rescheduleStart.trim() || !rescheduleEnd.trim()}
                onPress={() => {
                  try {
                    const startDt = new Date(`${rescheduleDate}T${rescheduleStart}:00`);
                    const endDt = new Date(`${rescheduleDate}T${rescheduleEnd}:00`);
                    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
                      throw new Error("Invalid date or time format");
                    }
                    rescheduleMutation.mutate({
                      id: reschedulingAppt._id,
                      proposedStart: startDt.toISOString(),
                      proposedEnd: endDt.toISOString(),
                      reason: rescheduleReason
                    });
                  } catch (err) {
                    error('Invalid Format', 'Please check the date and time format (YYYY-MM-DD and HH:MM).');
                  }
                }}
                style={{ opacity: (rescheduleDate.trim() && rescheduleStart.trim() && rescheduleEnd.trim()) ? 1 : 0.5 }}
                className="bg-amber-500 px-5 py-2.5 rounded-xl"
              >
                <Text className="text-xs font-bold text-white">Propose Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
