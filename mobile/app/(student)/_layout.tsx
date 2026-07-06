import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { TouchableOpacity, View, Text } from 'react-native';

export default function StudentLayout() {
  const router = useRouter();

  const renderHeaderRight = () => (
    <View className="flex-row items-center mr-4 gap-3">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/notifications')}
        className="p-2 bg-gray-50 rounded-full border border-gray-100 relative"
      >
        <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/profile')}
        className="p-2 bg-gray-50 rounded-full border border-gray-100"
      >
        <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          borderTopColor: '#F3F4F6',
          elevation: 8,
          shadowOpacity: 0.05,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
        headerRight: renderHeaderRight,
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 20,
          color: '#111827',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Book slot',
          tabBarLabel: 'Book Slot',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarLabel: 'Appointments',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'My Requests',
          tabBarLabel: 'My Requests',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
