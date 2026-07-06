import React from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { apiPost } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';

export default function Signup() {
  const router = useRouter();
  const { adminToken } = useLocalSearchParams<{ adminToken?: string }>();
  const { success, error } = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      regNumber: '',
      department: '',
    }
  });

  const passwordVal = watch('password');

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      await apiPost('/api/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'student', // mobile app registration is specifically for student self-signup
        regNumber: data.regNumber || undefined,
        department: data.department || undefined,
        adminToken, // Optional admin verification token if configuring special privileges
      });

      success('Account Created', 'Your student account has been created. Please sign in.');
      router.replace('/(auth)/login');
    } catch (err: any) {
      error('Registration Failed', err.response?.data?.error || 'Registration failed. Please check inputs.');
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
          <View className="items-center mb-8">
            <Text className="text-3xl font-black text-gray-900 tracking-tight">Register Student</Text>
            <Text className="text-xs text-gray-555 font-bold uppercase tracking-widest mt-1">
              Create a new student account
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Full Name
              </Text>
              <Controller
                control={control}
                rules={{ required: 'Full name is required' }}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-gray-50 border ${
                      errors.name ? 'border-red-300' : 'border-gray-100'
                    } rounded-2xl px-5 py-3.5 text-gray-800 font-bold text-sm`}
                    placeholder="John Doe"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.name ? (
                <Text className="text-[10px] text-red-500 font-bold ml-1">
                  {errors.name.message}
                </Text>
              ) : null}
            </View>

            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                University Email Address
              </Text>
              <Controller
                control={control}
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address',
                  },
                }}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-gray-50 border ${
                      errors.email ? 'border-red-300' : 'border-gray-100'
                    } rounded-2xl px-5 py-3.5 text-gray-800 font-bold text-sm`}
                    placeholder="name@vau.ac.lk"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
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

            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Registration Number (e.g. 2020-AS-01)
              </Text>
              <Controller
                control={control}
                name="regNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-gray-800 font-bold text-sm"
                    placeholder="2020/ICT/99"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Password (min 8 characters)
              </Text>
              <Controller
                control={control}
                rules={{
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters long',
                  },
                }}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-gray-50 border ${
                      errors.password ? 'border-red-300' : 'border-gray-100'
                    } rounded-2xl px-5 py-3.5 text-gray-800 font-bold text-sm`}
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

            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Confirm Password
              </Text>
              <Controller
                control={control}
                rules={{
                  required: 'Confirm password is required',
                  validate: (val) => val === passwordVal || 'Passwords do not match',
                }}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-gray-50 border ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-100'
                    } rounded-2xl px-5 py-3.5 text-gray-800 font-bold text-sm`}
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
              {errors.confirmPassword ? (
                <Text className="text-[10px] text-red-500 font-bold ml-1">
                  {errors.confirmPassword.message}
                </Text>
              ) : null}
            </View>

            <Button
              label="Sign Up"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              style={{ marginTop: 12 }}
            />
          </View>

          {/* Footer */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            className="mt-6 self-center"
          >
            <Text className="text-xs text-vau-maroon font-bold">
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
