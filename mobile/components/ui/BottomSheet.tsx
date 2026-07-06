import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeightPercent?: number;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightPercent = 0.8,
}: BottomSheetProps) {
  const animatedOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(animatedOpacity, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animatedOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Animated.View
          style={{ opacity: animatedOpacity }}
          className="absolute inset-0 bg-black"
        >
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        </Animated.View>

        {/* Sheet Content */}
        <View
          style={{ maxHeight: `${maxHeightPercent * 100}%` }}
          className="bg-white rounded-t-[2.5rem] shadow-2xl border-t border-gray-100 z-10"
        >
          {/* Header */}
          <View className="px-6 py-5 border-b border-gray-100 flex-row justify-between items-center bg-gray-50 rounded-t-[2.5rem]">
            <View>
              <Text className="text-lg font-black text-gray-900">{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Body */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            className="p-6"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
