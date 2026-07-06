import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  show: (title: string, message?: string, type?: ToastType, duration?: number) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  hide: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (title, message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, title, message, type, duration };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  success: (title, message, duration) => {
    useToastStore.getState().show(title, message, 'success', duration);
  },

  error: (title, message, duration) => {
    useToastStore.getState().show(title, message, 'error', duration);
  },

  warning: (title, message, duration) => {
    useToastStore.getState().show(title, message, 'warning', duration);
  },

  info: (title, message, duration) => {
    useToastStore.getState().show(title, message, 'info', duration);
  },

  hide: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export function useToast() {
  const toasts = useToastStore((state) => state.toasts);
  const success = useToastStore((state) => state.success);
  const error = useToastStore((state) => state.error);
  const warning = useToastStore((state) => state.warning);
  const info = useToastStore((state) => state.info);
  const hide = useToastStore((state) => state.hide);

  return { toasts, success, error, warning, info, hide };
}
