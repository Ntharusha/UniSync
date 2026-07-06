import React from 'react';
import { View, Text, Switch, ScrollView, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { apiPatch } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { success, error, warning } = useToast();
  const [pushEnabled, setPushEnabled] = React.useState(!!user?.pushToken);
  const [registering, setRegistering] = React.useState(false);

  const requestPushPermission = async () => {
    if (!Device.isDevice) {
      warning('Simulator limit', 'Push notifications require physical test devices.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      error('Denied', 'Push notification permissions denied.');
      return null;
    }

    const tokenRes = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-expo-project-id',
    });

    return tokenRes.data;
  };

  const handlePushToggle = async (val: boolean) => {
    setRegistering(true);
    try {
      if (val) {
        const token = await requestPushPermission();
        if (token) {
          // Send push token to backend API
          const updatedUser = await apiPatch<any>('/api/users/push-token', { pushToken: token });
          await updateUser(updatedUser);
          setPushEnabled(true);
          success('Push Subscribed', 'Native push notifications activated successfully.');
        } else {
          setPushEnabled(false);
        }
      } else {
        const updatedUser = await apiPatch<any>('/api/users/push-token', { pushToken: null });
        await updateUser(updatedUser);
        setPushEnabled(false);
        success('Push Deactivated', 'You will no longer receive native push indicators.');
      }
    } catch (e: any) {
      error('Update Failed', e.response?.data?.error || 'Failed to update push configurations.');
      setPushEnabled(!val);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background px-4 py-4" showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <Card className="items-center py-6 mb-4">
        <View className="h-20 w-20 rounded-full bg-vau-maroon/5 border-2 border-vau-maroon items-center justify-center mb-3">
          <Text className="text-vau-maroon font-black text-2xl">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text className="text-lg font-black text-gray-900">{user?.name}</Text>
        <Text className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
          {user?.role}
        </Text>
        <Text className="text-xs text-gray-550 mt-1">{user?.email}</Text>
      </Card>

      {/* Notifications Controls */}
      <Card className="mb-6 space-y-4">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
          App Settings
        </Text>

        <View className="flex-row justify-between items-center py-1">
          <View className="flex-row items-center flex-1 mr-3">
            <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
            <View className="ml-3">
              <Text className="text-sm font-bold text-gray-950">Push Notifications</Text>
              <Text className="text-[10px] text-gray-500 mt-0.5 leading-none">
                Toggle native alert status flags
              </Text>
            </View>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handlePushToggle}
            disabled={registering}
            thumbColor={pushEnabled ? colors.primary : '#D1D5DB'}
            trackColor={{ false: '#E5E7EB', true: colors.primaryLight }}
          />
        </View>
      </Card>

      {/* Logout button */}
      <Button label="Sign Out" onPress={logout} variant="danger" style={{ marginBottom: 40 }} />
    </ScrollView>
  );
}
