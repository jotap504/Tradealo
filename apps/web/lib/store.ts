import { create } from 'zustand';
import { auth } from './api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setInitialized: (value: boolean) => void;
  clearUser: () => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  initialized: false,
  setUser: (user) => set({ user }),
  setInitialized: (value) => set({ initialized: value }),
  clearUser: () => set({ user: null }),
  initialize: async () => {
    if (get().initialized) return;
    // Skip the network call entirely if there's no token in storage
    if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
      set({ user: null, isLoading: false, initialized: true });
      return;
    }
    set({ isLoading: true });
    try {
      const me = await auth.getMe();
      set({ user: me, isLoading: false, initialized: true });
    } catch {
      // Don't overwrite user if login() set it while getMe() was in-flight
      set((state) => ({
        user: state.user,
        isLoading: false,
        initialized: true,
      }));
    }
  },
  logout: async () => {
    try {
      await auth.logout();
    } catch {
      /* ignore */
    }
    set({ user: null });
  },
}));

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  show: (type: ToastItem['type'], message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (type, message) => {
    const id = Math.random().toString(36).slice(2, 10);
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().show('success', msg),
  error: (msg: string) => useToastStore.getState().show('error', msg),
  info: (msg: string) => useToastStore.getState().show('info', msg),
};
