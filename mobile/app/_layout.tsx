import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '../lib/queryClient';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/ui/Toast';
import { ActivityIndicator, View, Platform } from 'react-native';
import { colors } from '../constants/theme';
import '../global.css';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if user is not authenticated and trying to access app
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect authenticated user to appropriate dashboard
      if (user.role === 'student') {
        router.replace('/(student)');
      } else if (user.role === 'lecturer') {
        router.replace('/(lecturer)');
      } else if (user.role === 'admin') {
        router.replace('/(admin)');
      }
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function AppResponsiveContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: '100%',
          maxWidth: 480,
          height: '100%',
          maxHeight: 900,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          ...Platform.select({
            web: {
              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
              borderRadius: '24px',
            } as any,
            default: {},
          }),
        }}>
          {children}
        </View>
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const { restoreSession } = useAuth();

  React.useEffect(() => {
    restoreSession();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppResponsiveContainer>
            <AuthGuard>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(student)" options={{ headerShown: false }} />
                <Stack.Screen name="(lecturer)" options={{ headerShown: false }} />
                <Stack.Screen name="(admin)" options={{ headerShown: false }} />
                <Stack.Screen name="chat/[appointmentId]" options={{ presentation: 'modal', headerShown: true, title: 'Chat' }} />
                <Stack.Screen name="notifications" options={{ presentation: 'modal', headerShown: true, title: 'Notifications' }} />
                <Stack.Screen name="profile" options={{ presentation: 'modal', headerShown: true, title: 'Profile Settings' }} />
              </Stack>
              <Toast />
              <StatusBar style="dark" />
            </AuthGuard>
          </AppResponsiveContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
