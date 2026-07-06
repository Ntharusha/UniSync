import React from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { apiPost } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, error } = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const response = await apiPost<{ user: any; token: string }>('/api/auth/login', {
        email: data.email,
        password: data.password,
      });

      await login(response.user, response.token);
      success('Welcome back!', `${response.user.name} logged in successfully.`);
    } catch (err: any) {
      error('Login Failed', err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="px-6"
      >
        <View className="flex-1 justify-center py-12">
          {/* Header */}
          <View className="items-center mb-10">
            <View className="h-16 w-16 bg-vau-maroon rounded-3xl items-center justify-center shadow-lg shadow-vau-maroon/20 mb-4">
              <Text className="text-white text-3xl font-black">U</Text>
            </View>
            <Text className="text-3xl font-black text-gray-900 tracking-tight">Uni Sync</Text>
            <Text className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              University Appointment Hub
            </Text>
          </View>

          {/* Form */}
            <View className="space-y-4">
              <View className="space-y-1.5">
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Email or Registration Number
                </Text>
                <Controller
                  control={control}
                  rules={{
                    required: 'Email or Registration Number is required',
                  }}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-gray-50 border ${
                        errors.email ? 'border-red-300' : 'border-gray-100'
                      } rounded-2xl px-5 py-4 text-gray-800 font-bold text-sm`}
                      placeholder="Email or Reg Number"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.email ? (
                  <Text className="text-[10px] text-red-500 font-bold ml-1">
                    {errors.email.message}
                  </Text>
                ) : null}
              </View>

            <View className="space-y-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Password
              </Text>
              <Controller
                control={control}
                rules={{ required: 'Password is required' }}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-gray-50 border ${
                      errors.password ? 'border-red-300' : 'border-gray-100'
                    } rounded-2xl px-5 py-4 text-gray-800 font-bold text-sm`}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.password ? (
                <Text className="text-[10px] text-red-500 font-bold ml-1">
                  {errors.password.message}
                </Text>
              ) : null}
            </View>

            <Button
              label="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              style={{ marginTop: 12 }}
            />
          </View>

          {/* Footer Info */}
          <View className="mt-8 items-center">
            <Text className="text-xs text-gray-400 font-semibold text-center">
              Please contact your administrator if you do not have an account.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
