import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { TouchableOpacity, View } from 'react-native';

export default function AdminLayout() {
  const router = useRouter();

  const renderHeaderRight = () => (
    <View className="flex-row items-center mr-4 gap-3">
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
          title: 'System Analytics',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'User Directories',
          tabBarLabel: 'Users',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Audit Logs',
          tabBarLabel: 'Audit Logs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shield' : 'shield-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
