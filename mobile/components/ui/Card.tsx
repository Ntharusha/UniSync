import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export default function Card({ children, className = '', style }: CardProps) {
  return (
    <View
      className={`bg-white p-5 rounded-3xl border border-gray-100/80 shadow-sm ${className}`}
      style={style}
    >
      {children}
    </View>
  );
}
