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

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const stored = localStorage.getItem('authUser');

      if (token && stored) {
        try {
          const user = JSON.parse(stored);
          set({ user, isLoading: false, initialized: true });
          return;
        } catch {
          // Corrupt stored user, fall through to clear
          localStorage.removeItem('authUser');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    }

    // No token or corrupt data: mark as initialized without a user
    set({ user: null, isLoading: false, initialized: true });
  },
  logout: async () => {
    try {
      await auth.logout();
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authUser');
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
