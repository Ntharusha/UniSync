import React from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Slot } from '../../types';
import { format } from 'date-fns';
import { colors } from '../../constants/theme';

interface SlotPickerProps {
  slots: Slot[];
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  loading?: boolean;
}

export default function SlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  loading = false,
}: SlotPickerProps) {
  if (loading) {
    return (
      <View className="py-12 items-center justify-center bg-white rounded-3xl border border-gray-100">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text className="text-xs text-gray-500 font-bold mt-2">Loading slots...</Text>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View className="py-12 items-center justify-center bg-white rounded-3xl border border-gray-100 px-4">
        <Text className="text-sm font-bold text-gray-700 text-center mb-1">
          No slots available
        </Text>
        <Text className="text-xs text-gray-400 text-center leading-relaxed">
          Please select another date or contact the lecturer.
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Slot }) => {
    const isSelected = selectedSlot?.start === item.start;
    const isFree = item.status === 'free';

    const getBgClass = () => {
      if (!isFree) return 'bg-gray-100 border-gray-200';
      if (isSelected) return 'bg-vau-maroon border-transparent';
      return 'bg-white border-gray-200';
    };

    const getTextClass = () => {
      if (!isFree) return 'text-gray-400 line-through';
      if (isSelected) return 'text-white font-black';
      return 'text-gray-800 font-bold';
    };

    const getStatusText = () => {
      switch (item.status) {
        case 'blocked':
          return 'Blocked';
        case 'teaching':
          return 'Lecture';
        case 'normal_booked':
        case 'priority_booked':
          return 'Booked';
        case 'free':
        default:
          return 'Available';
      }
    };

    return (
      <TouchableOpacity
        activeOpacity={isFree ? 0.8 : 1}
        onPress={() => isFree && onSelectSlot(item)}
        disabled={!isFree}
        className={`flex-1 m-1 p-3 rounded-2xl border items-center justify-center ${getBgClass()}`}
      >
        <Text className={`text-xs ${getTextClass()}`}>
          {format(new Date(item.start), 'HH:mm')}
        </Text>
        <Text className={`text-[8px] font-bold mt-0.5 uppercase tracking-tighter ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
          {getStatusText()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="bg-white p-4 rounded-3xl border border-gray-100">
      <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
        Select a Time Slot
      </Text>
      <FlatList
        data={slots}
        renderItem={renderItem}
        keyExtractor={(item) => item.start}
        numColumns={3}
        scrollEnabled={false}
      />
    </View>
  );
}
