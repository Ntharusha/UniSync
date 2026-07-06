import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AvailabilityRule } from '../../types';
import { DAYS_OF_WEEK } from '../../constants/faculties';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';

interface AddRuleSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (rule: Partial<AvailabilityRule>) => void;
}

export default function AddRuleSheet({ visible, onClose, onAdd }: AddRuleSheetProps) {
  const [type, setType] = React.useState<AvailabilityRule['type']>('office_hours');
  const [dayOfWeek, setDayOfWeek] = React.useState<number>(1);
  const [startTime, setStartTime] = React.useState<string>('08:00');
  const [endTime, setEndTime] = React.useState<string>('17:00');

  const handleSubmit = () => {
    onAdd({
      type,
      dayOfWeek,
      startTime,
      endTime,
    });
    // Reset forms
    setType('office_hours');
    setDayOfWeek(1);
    setStartTime('08:00');
    setEndTime('17:00');
  };

  const renderSelectGroup = <T extends string | number>(
    label: string,
    currentValue: T,
    options: { value: T; label: string }[],
    onSelect: (val: T) => void
  ) => {
    return (
      <View className="space-y-1.5">
        <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
          {label}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {options.map((opt) => {
            const isSelected = currentValue === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.8}
                onPress={() => onSelect(opt.value)}
                className={`px-4 py-2.5 rounded-xl border ${
                  isSelected
                    ? 'bg-vau-maroon border-transparent'
                    : 'bg-white border-gray-250'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const times = Array.from({ length: 24 }).flatMap((_, hour) => {
    const padded = String(hour).padStart(2, '0');
    return [
      { value: `${padded}:00`, label: `${padded}:00` },
      { value: `${padded}:30`, label: `${padded}:30` },
    ];
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add Rule">
      <View className="space-y-6">
        {/* Type Selector */}
        {renderSelectGroup(
          'Rule Type',
          type,
          [
            { value: 'office_hours', label: 'Office Hours' },
            { value: 'lectures', label: 'Lectures' },
            { value: 'blackout', label: 'Blackout Period' },
          ],
          (val) => setType(val as any)
        )}

        {/* Day Selector */}
        {renderSelectGroup(
          'Recurrent Day',
          dayOfWeek,
          DAYS_OF_WEEK.map((d, idx) => ({ value: idx, label: d })),
          setDayOfWeek
        )}

        {/* Start Time Selector */}
        <View className="space-y-1.5">
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
            Start Time
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            className="flex-row"
          >
            {times.map((t) => {
              const isSelected = startTime === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  activeOpacity={0.8}
                  onPress={() => setStartTime(t.value)}
                  className={`px-3 py-2 rounded-xl border ${
                    isSelected
                      ? 'bg-vau-maroon border-transparent'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-650'}`}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* End Time Selector */}
        <View className="space-y-1.5">
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
            End Time
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            className="flex-row"
          >
            {times.map((t) => {
              const isSelected = endTime === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  activeOpacity={0.8}
                  onPress={() => setEndTime(t.value)}
                  className={`px-3 py-2 rounded-xl border ${
                    isSelected
                      ? 'bg-vau-maroon border-transparent'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-650'}`}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Submit */}
        <Button label="Add Availability Rule" onPress={handleSubmit} style={{ marginTop: 10 }} />
      </View>
    </BottomSheet>
  );
}
