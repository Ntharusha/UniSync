import React from 'react';
import { View, Text, FlatList, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../lib/api';
import { Message, User } from '../../types';
import { colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

export default function ChatRoom() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { error } = useToast();
  const [text, setText] = React.useState('');
  const flatListRef = React.useRef<FlatList>(null);

  // Fetch Message Log
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', appointmentId],
    queryFn: () => apiGet<Message[]>(`/api/chat/${appointmentId}`),
    enabled: !!appointmentId,
  });

  // Socket listener for new messages
  useSocket('new_message', (msg: Message) => {
    if (msg.appointmentId === appointmentId) {
      queryClient.setQueryData<Message[]>(['messages', appointmentId], (old = []) => {
        // Prevent duplicate appends if client already updated Optimistically
        if (old.some((m) => m._id === msg._id)) return old;
        return [...old, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => apiPost<Message>(`/api/chat/${appointmentId}`, { body }),
    onMutate: async (newText) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['messages', appointmentId] });
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', appointmentId]);

      const optimisticMsg: Message = {
        _id: Math.random().toString(),
        appointmentId: appointmentId!,
        senderId: user!,
        body: newText,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(['messages', appointmentId], (old = []) => [
        ...old,
        optimisticMsg,
      ]);

      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      return { previousMessages };
    },
    onError: (err, _, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', appointmentId], context.previousMessages);
      }
      error('Send Failed', 'Failed to transmit message.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', appointmentId] });
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="flex-1 bg-background"
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const sender = item.senderId as User;
          const isMe = sender._id === user?._id;

          return (
            <View className={`flex-row mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe ? (
                <View className="h-8 w-8 rounded-full bg-gray-200 items-center justify-center mr-2 self-end mb-1">
                  <Text className="text-gray-600 font-bold text-[10px]">
                    {sender?.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              ) : null}
              <View className="max-w-[75%]">
                {!isMe ? (
                  <Text className="text-[9px] font-bold text-gray-400 uppercase mb-0.5 ml-1">
                    {sender?.name || 'User'}
                  </Text>
                ) : null}
                <View
                  className={`p-3.5 rounded-2xl ${
                    isMe
                      ? 'bg-vau-maroon rounded-tr-none'
                      : 'bg-white rounded-tl-none border border-gray-100'
                  }`}
                >
                  <Text className={`text-xs font-semibold leading-relaxed ${isMe ? 'text-white' : 'text-gray-800'}`}>
                    {item.body}
                  </Text>
                  <Text
                    className={`text-[8px] font-bold mt-1 text-right ${
                      isMe ? 'text-white/60' : 'text-gray-400'
                    }`}
                  >
                    {format(new Date(item.createdAt), 'HH:mm')}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Input bar */}
      <View className="p-4 bg-white border-t border-gray-100 flex-row items-center gap-3">
        <TextInput
          className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 font-semibold text-sm max-h-[100px]"
          placeholder="Type message..."
          placeholderTextColor="#9CA3AF"
          multiline
          onChangeText={setText}
          value={text}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          className="p-3 bg-vau-maroon rounded-full items-center justify-center shadow-md shadow-vau-maroon/10"
        >
          <Ionicons name="send" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
