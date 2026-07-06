import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppointmentPriority } from '../../types';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface PrioritySelectorProps {
  value: AppointmentPriority;
  onChange: (priority: AppointmentPriority) => void;
}

export default function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const priorities: {
    value: AppointmentPriority;
    title: string;
    desc: string;
    bg: string;
    border: string;
    textColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
  }[] = [
    {
      value: 'normal',
      title: 'Normal',
      desc: 'Routine query',
      bg: 'bg-green-50',
      border: 'border-green-150',
      textColor: 'text-green-800',
      icon: 'checkmark-circle-outline',
      iconColor: colors.success,
    },
    {
      value: 'academic_urgent',
      title: 'Urgent',
      desc: 'Academic deadline',
      bg: 'bg-amber-50',
      border: 'border-amber-150',
      textColor: 'text-amber-800',
      icon: 'alert-circle-outline',
      iconColor: colors.warning,
    },
    {
      value: 'emergency',
      title: 'Emergency',
      desc: 'Medical / Critical',
      bg: 'bg-red-50',
      border: 'border-red-150',
      textColor: 'text-red-800',
      icon: 'warning-outline',
      iconColor: colors.danger,
    },
  ];

  return (
    <View className="space-y-2">
      <Text className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
        Priority Level
      </Text>
      <View className="space-y-2">
        {priorities.map((p) => {
          const isSelected = value === p.value;

          return (
            <TouchableOpacity
              key={p.value}
              activeOpacity={0.8}
              onPress={() => onChange(p.value)}
              className={`p-4 rounded-2xl border-2 flex-row items-center ${
                isSelected ? `${p.bg} ${p.border}` : 'bg-white border-gray-150'
              }`}
            >
              <Ionicons
                name={p.icon}
                size={22}
                color={isSelected ? p.iconColor : colors.text.muted}
              />
              <View className="flex-1 ml-3">
                <Text className={`font-black text-sm ${isSelected ? p.textColor : 'text-gray-900'}`}>
                  {p.title}
                </Text>
                <Text className="text-[10px] text-gray-500 mt-0.5 leading-none">{p.desc}</Text>
              </View>
              <View
                style={{ borderColor: isSelected ? p.iconColor : '#D1D5DB' }}
                className="h-5 w-5 rounded-full border-2 items-center justify-center"
              >
                {isSelected ? (
                  <View
                    style={{ backgroundColor: p.iconColor }}
                    className="h-2.5 w-2.5 rounded-full"
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
