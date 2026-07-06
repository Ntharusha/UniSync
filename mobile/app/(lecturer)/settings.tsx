import React from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { apiGet, apiPost, apiDelete, apiPostForm } from '../../lib/api';
import { AvailabilityRule } from '../../types';
import { colors } from '../../constants/theme';
import AvailabilityRuleCard from '../../components/lecturer/AvailabilityRuleCard';
import AddRuleSheet from '../../components/lecturer/AddRuleSheet';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function LecturerSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { success, error, warning } = useToast();
  const [showAddModal, setShowAddModal] = React.useState(false);

  // Timetable Upload & Preview states
  const [previewBlocks, setPreviewBlocks] = React.useState<any[]>([]);
  const [conflicts, setConflicts] = React.useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);
  const [isActivating, setIsActivating] = React.useState(false);

  // Query Availability Rules
  const { data: rules = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['rules', user?._id],
    queryFn: () => apiGet<AvailabilityRule[]>(`/api/availability/rules/${user?._id}`),
    enabled: !!user?._id,
  });

  const addRuleMutation = useMutation({
    mutationFn: (rule: Partial<AvailabilityRule>) =>
      apiPost('/api/availability/rules', { ...rule, lecturerId: user?._id }),
    onSuccess: () => {
      success('Added!', 'Availability rule added successfully.');
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setShowAddModal(false);
    },
    onError: (err: any) => {
      error('Failed to Add', err.response?.data?.error || 'An error occurred.');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/availability/rules/${id}`),
    onSuccess: () => {
      success('Deleted', 'Rule deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
    onError: (err: any) => {
      error('Delete Failed', err.response?.data?.error || 'Failed to delete rule.');
    },
  });

  const parseTimetable = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!doc.canceled && doc.assets && doc.assets.length > 0) {
        const file = doc.assets[0];
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.name.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
        } as any);

        const parsed = await apiPostForm<any[]>('/api/timetable/parse', formData);
        setPreviewBlocks(parsed);
        
        // Fetch conflicts
        const conflictData = await apiPost<any[]>('/api/timetable/conflicts', {
          lecturerId: user?._id,
          blocks: parsed,
        });
        setConflicts(conflictData);
        setShowPreviewModal(true);
      }
    } catch (err: any) {
      error('Parsing Failed', err.response?.data?.error || 'Failed to parse timetable file.');
    }
  };

  const handleActivateTimetable = async () => {
    setIsActivating(true);
    try {
      const result = await apiPost<{ conflictsFound: number }>('/api/timetable/activate', {
        lecturerId: user?._id,
        blocks: previewBlocks,
      });
      success('Activated!', `Timetable activated successfully. ${result.conflictsFound} conflicting appointments cancelled.`);
      setShowPreviewModal(false);
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    } catch (err: any) {
      error('Activation Failed', err.response?.data?.error || 'Failed to activate timetable.');
    } finally {
      setIsActivating(false);
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
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-black text-gray-900">Availability Rules</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowAddModal(true)}
          className="p-2.5 bg-vau-maroon rounded-full"
        >
          <Ionicons name="plus" size={16} color="white" />
        </TouchableOpacity>
      </View>

      {/* Rules list */}
      <View className="gap-2 mb-6">
        {rules.length === 0 ? (
          <View className="bg-white p-8 rounded-3xl border border-gray-100 items-center justify-center">
            <Text className="text-xs text-gray-400 font-bold italic">No active availability rules.</Text>
          </View>
        ) : (
          rules.map((rule) => (
            <AvailabilityRuleCard
              key={rule._id}
              rule={rule}
              onDelete={() => deleteRuleMutation.mutate(rule._id)}
            />
          ))
        )}
      </View>

      {/* Timetable Upload options */}
      <View className="bg-white p-5 rounded-3xl border border-gray-100 gap-4 mb-10 shadow-sm">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest">
          Sync Weekly Timetable
        </Text>
        <Text className="text-xs text-gray-500 leading-relaxed font-medium">
          Upload your timetable document (PDF, XLS, CSV) to automatically sync lecturing slots and blackout periods.
        </Text>
        <Button
          label="Upload Timetable"
          onPress={parseTimetable}
          variant="outline"
          icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />}
        />
      </View>

      {/* Add rule Modal Sheet */}
      <AddRuleSheet
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(rule) => addRuleMutation.mutate(rule)}
      />

      {/* Preview Timetable & Conflicts Modal */}
      <Modal visible={showPreviewModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[2.5rem] max-h-[85%]">
            <View className="p-6 border-b border-gray-100 flex-row justify-between items-center bg-vau-maroon rounded-t-[2.5rem]">
              <View>
                <Text className="text-lg font-black text-white">Review Timetable</Text>
                <Text className="text-[10px] font-bold text-white/80 uppercase mt-0.5">Parsed Timetable Blocks</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
              {/* Conflicts indicator */}
              {conflicts.length > 0 ? (
                <View className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="alert-circle" size={20} color={colors.danger} className="mr-1.5" />
                    <Text className="font-black text-red-800 text-sm">
                      Conflicting Appointments ({conflicts.length})
                    </Text>
                  </View>
                  <Text className="text-xs text-red-650 leading-relaxed mb-3 font-semibold">
                    Activating this timetable will automatically cancel the following conflicting appointments:
                  </Text>
                  <View className="gap-2">
                    {conflicts.map((c, idx) => (
                      <View key={idx} className="bg-white p-3 rounded-xl border border-red-150 flex-row justify-between items-center">
                        <View>
                          <Text className="text-xs font-black text-gray-900">{c.student?.name || 'Student'}</Text>
                          <Text className="text-[9px] text-gray-400 font-bold mt-0.5">
                            {format(new Date(c.requestedStart), 'MMM d')} at {format(new Date(c.requestedStart), 'HH:mm')}
                          </Text>
                        </View>
                        <Badge label={c.priority} variant="danger" />
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="bg-green-50 p-4 rounded-2xl border border-green-100 mb-6 flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} className="mr-2" />
                  <Text className="text-xs font-bold text-green-800">
                    No conflicting appointments detected. Safe to activate.
                  </Text>
                </View>
              )}

              {/* Parsed blocks table */}
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
                New Schedule Blocks
              </Text>
              <View className="border border-gray-100 rounded-3xl overflow-hidden mb-12">
                {previewBlocks.map((b, idx) => (
                  <View key={idx} className="flex-row p-4 border-b border-gray-50 justify-between items-center">
                    <View>
                      <Text className="text-xs font-black text-gray-900">{b.courseName}</Text>
                      <Text className="text-[9px] text-gray-400 font-bold mt-0.5">Room {b.room}</Text>
                    </View>
                    <Text className="text-xs font-bold text-vau-maroon">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][b.dayOfWeek]} • {b.startTime} - {b.endTime}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View className="p-6 bg-gray-50 border-t border-gray-150 flex-row gap-3">
              <Button
                label="Discard"
                onPress={() => setShowPreviewModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                label="Confirm & Sync"
                onPress={handleActivateTimetable}
                loading={isActivating}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
