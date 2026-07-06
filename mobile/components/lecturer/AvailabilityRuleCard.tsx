import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvailabilityRule } from '../../types';
import { colors } from '../../constants/theme';
import { DAYS_OF_WEEK } from '../../constants/faculties';
import { format } from 'date-fns';

interface AvailabilityRuleCardProps {
  rule: AvailabilityRule;
  onDelete: () => void;
}

export default function AvailabilityRuleCard({ rule, onDelete }: AvailabilityRuleCardProps) {
  const getBadgeColors = () => {
    switch (rule.type) {
      case 'office_hours':
        return 'bg-green-100 text-green-700';
      case 'blackout':
        return 'bg-red-100 text-red-700';
      case 'lectures':
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getRuleDay = () => {
    if (rule.dayOfWeek !== undefined) {
      return DAYS_OF_WEEK[rule.dayOfWeek];
    }
    if (rule.date) {
      return format(new Date(rule.date), 'MMM d, yyyy');
    }
    return 'All days';
  };

  return (
    <View className="bg-white p-4 rounded-2xl border border-gray-100/80 flex-row justify-between items-center mb-2">
      <View className="flex-row items-center flex-1 mr-2">
        <View className={`p-2.5 rounded-xl ${getBadgeColors()} mr-3`}>
          <Ionicons name="time-outline" size={20} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900 capitalize">
            {rule.type.replace('_', ' ')}
          </Text>
          <Text className="text-[10px] text-gray-500 font-bold mt-0.5 leading-none">
            {getRuleDay()} • {rule.startTime} - {rule.endTime}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onDelete}
        className="p-2 bg-red-50 hover:bg-red-100 rounded-xl"
      >
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}
