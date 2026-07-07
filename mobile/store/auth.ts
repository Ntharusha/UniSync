import { create } from 'zustand';
import { setSecureItem, getSecureItem, deleteSecureItem } from '../lib/secureStore';
import { User } from '../types';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (user, token) => {
    await setSecureItem('jwt_token', token);
    await setSecureItem('user_data', JSON.stringify(user));
    set({ user, token, isLoading: false });
    connectSocket(user._id);
  },

  logout: async () => {
    await deleteSecureItem('jwt_token');
    await deleteSecureItem('user_data');
    disconnectSocket();
    set({ user: null, token: null, isLoading: false });
  },

  updateUser: async (user) => {
    await setSecureItem('user_data', JSON.stringify(user));
    set({ user });
  },

  restoreSession: async () => {
    try {
      const token = await getSecureItem('jwt_token');
      const userDataStr = await getSecureItem('user_data');
      if (token && userDataStr) {
        const user = JSON.parse(userDataStr) as User;
        set({ user, token, isLoading: false });
        connectSocket(user._id);
      } else {
        set({ user: null, token: null, isLoading: false });
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
