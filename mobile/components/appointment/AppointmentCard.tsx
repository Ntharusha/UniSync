import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Appointment, parseReason, User } from '../../types';
import { colors } from '../../constants/theme';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

interface AppointmentCardProps {
  appt: Appointment;
  onApprove?: () => void;
  onReject?: () => void;
  onReschedulePress?: () => void;
  onAcceptReschedule?: () => void;
  onDeclineReschedulePress?: () => void;
  onChat?: () => void;
  role: 'student' | 'lecturer';
}

export default function AppointmentCard({
  appt,
  onApprove,
  onReject,
  onReschedulePress,
  onAcceptReschedule,
  onDeclineReschedulePress,
  onChat,
  role,
}: AppointmentCardProps) {
  const opponent = (role === 'student' ? appt.lecturerId : appt.studentId) as User;
  const docs = appt.documents || [];
  const parsed = parseReason(appt.reason);

  const getPriorityColor = () => {
    switch (appt.priority) {
      case 'emergency':
        return 'danger';
      case 'academic_urgent':
        return 'warning';
      case 'normal':
      default:
        return 'info';
    }
  };

  const getStatusColor = () => {
    switch (appt.status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'cancelled':
        return 'neutral';
      case 'rescheduled':
        return 'warning';
      case 'pending':
      default:
        return 'warning';
    }
  };

  return (
    <Card className="mb-4">
      {/* Header (Opponent Info & Time) */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="h-10 w-10 rounded-full bg-gray-100 items-center justify-center mr-3">
            <Text className="text-gray-500 font-bold text-sm">
              {opponent?.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-900 truncate">
              {opponent?.name || 'Unknown'}
            </Text>
            <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              {opponent?.role || 'User'}
            </Text>
          </View>
        </View>
        <View className="bg-vau-maroon/5 px-2.5 py-1 rounded-full flex-row items-center">
          <Ionicons name="time-outline" size={12} color={colors.primary} className="mr-1" />
          <Text className="text-[10px] font-black text-vau-maroon">
            {format(new Date(appt.requestedStart), 'HH:mm')}
          </Text>
        </View>
      </View>

      {/* Badges Info */}
      <View className="flex-row gap-2 flex-wrap mb-3">
        <Badge label={appt.priority} variant={getPriorityColor()} />
        <Badge label={appt.status} variant={getStatusColor()} />
        <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
          <Ionicons name="calendar-outline" size={10} color="#9CA3AF" className="mr-1" />
          <Text className="text-[10px] font-bold text-gray-500">
            {format(new Date(appt.requestedStart), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>

      {/* Student Details (Visible to lecturers) */}
      {role === 'lecturer' && opponent?.regNumber ? (
        <View className="p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-3 space-y-1">
          <View className="flex-row">
            <Text className="text-[9px] font-black text-gray-400 uppercase w-12">ID:</Text>
            <Text className="text-[11px] font-semibold text-gray-900">{opponent.regNumber}</Text>
          </View>
          {opponent.email ? (
            <View className="flex-row">
              <Text className="text-[9px] font-black text-gray-400 uppercase w-12">Email:</Text>
              <Text className="text-[11px] font-semibold text-gray-900 truncate flex-1">{opponent.email}</Text>
            </View>
          ) : null}
          {opponent.department ? (
            <View className="flex-row">
              <Text className="text-[9px] font-black text-gray-400 uppercase w-12">Dept:</Text>
              <Text className="text-[11px] font-semibold text-gray-900">{opponent.department}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Appointment Details / Content */}
      <View className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
        {parsed.isAcademic ? (
          <View className="space-y-1">
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className="bg-vau-maroon px-1.5 py-0.5 rounded">
                <Text className="text-[8px] font-black text-white uppercase">
                  {parsed.requestType.replace('-', ' ')}
                </Text>
              </View>
              <Text className="text-[9px] text-gray-400 font-bold uppercase">Academic Request</Text>
            </View>
            <Text className="text-xs font-bold text-gray-900">Title: {parsed.title}</Text>
            <Text className="text-[9px] text-gray-500 font-medium leading-relaxed">
              {parsed.faculty} • {parsed.department} • {parsed.degreeProgram}
            </Text>
            {parsed.description ? (
              <Text className="text-xs text-gray-600 font-medium italic mt-1">
                "{parsed.description}"
              </Text>
            ) : null}
          </View>
        ) : (
          <View className="space-y-1">
            <Text className="text-[9px] text-gray-400 font-bold uppercase">General Meeting</Text>
            <Text className="text-xs text-gray-700 font-medium leading-relaxed">
              {parsed.description || 'No description provided.'}
            </Text>
          </View>
        )}
      </View>

      {/* Attachments Section */}
      {docs.length > 0 ? (
        <View className="mt-3">
          <Text className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
            Attachments
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {docs.map((doc, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(doc.fileUrl)}
                className="flex-row items-center bg-gray-50 border border-gray-100/80 rounded-full px-3 py-1"
              >
                <Ionicons name="document-text-outline" size={12} color={colors.text.secondary} />
                <Text className="text-[9px] font-bold text-gray-600 ml-1 truncate max-w-[120px]">
                  {doc.fileName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* Proposed Rescheduled Slot Display */}
      {(appt.status === 'rescheduled' || appt.proposedStart) && appt.proposedStart ? (
        <View className="mt-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-1">
          <Text className="text-[9px] font-black text-indigo-800 uppercase tracking-widest block">
            Proposed Time Slot:
          </Text>
          <Text className="text-xs font-bold text-indigo-900">
            {format(new Date(appt.proposedStart), 'EEEE, MMMM d, yyyy')}
          </Text>
          <Text className="text-xs font-semibold text-indigo-800">
            {format(new Date(appt.proposedStart), 'HH:mm')} — {format(new Date(appt.proposedEnd!), 'HH:mm')}
          </Text>
          {(() => {
            const latestReschedule = appt.statusHistory 
              ? [...appt.statusHistory].reverse().find((h: any) => h.status === 'rescheduled') 
              : null;
            return latestReschedule?.reason ? (
              <Text className="text-[10px] text-indigo-700 font-medium italic mt-1 bg-white/50 p-1.5 rounded-lg">
                "{latestReschedule.reason}"
              </Text>
            ) : null;
          })()}
        </View>
      ) : null}

      {/* Action Buttons */}
      <View className="flex-row justify-end items-center mt-4 border-t border-gray-100/80 pt-3 gap-2 flex-wrap">
        {onChat ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onChat}
            className="flex-row items-center bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
            <Text className="text-xs font-bold text-vau-maroon ml-1.5">Chat</Text>
          </TouchableOpacity>
        ) : null}

        {role === 'lecturer' && appt.status === 'pending' ? (
          <React.Fragment>
            {onReject ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onReject}
                className="flex-row items-center bg-red-50 px-3.5 py-2 rounded-xl border border-red-100"
              >
                <Ionicons name="close" size={16} color={colors.danger} />
                <Text className="text-xs font-bold text-red-600 ml-1">Decline</Text>
              </TouchableOpacity>
            ) : null}
            {onReschedulePress ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onReschedulePress}
                className="flex-row items-center bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-100"
              >
                <Ionicons name="time-outline" size={16} color="#D97706" />
                <Text className="text-xs font-bold text-amber-600 ml-1">Reschedule</Text>
              </TouchableOpacity>
            ) : null}
            {onApprove ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onApprove}
                className="flex-row items-center bg-green-50 px-3.5 py-2 rounded-xl border border-green-100"
              >
                <Ionicons name="checkmark" size={16} color={colors.success} />
                <Text className="text-xs font-bold text-green-600 ml-1">Approve</Text>
              </TouchableOpacity>
            ) : null}
          </React.Fragment>
        ) : null}

        {role === 'student' && appt.status === 'rescheduled' ? (
          <React.Fragment>
            {onDeclineReschedulePress ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onDeclineReschedulePress}
                className="flex-row items-center bg-red-50 px-3.5 py-2 rounded-xl border border-red-100"
              >
                <Ionicons name="close" size={16} color={colors.danger} />
                <Text className="text-xs font-bold text-red-600 ml-1">Decline & Cancel</Text>
              </TouchableOpacity>
            ) : null}
            {onAcceptReschedule ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onAcceptReschedule}
                className="flex-row items-center bg-green-50 px-3.5 py-2 rounded-xl border border-green-100"
              >
                <Ionicons name="checkmark" size={16} color={colors.success} />
                <Text className="text-xs font-bold text-green-600 ml-1">Accept Slot</Text>
              </TouchableOpacity>
            ) : null}
          </React.Fragment>
        ) : null}
      </View>
    </Card>
  );
}
