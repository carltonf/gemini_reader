import { writable } from 'svelte/store';
import type { ToastNotification } from '../types';

export const toasts = writable<ToastNotification[]>([]);

export function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 4000) {
  const id = 'toast_' + Math.random().toString(36).substring(2, 9);
  const toast: ToastNotification = { id, message, type, duration };

  toasts.update(current => [...current, toast]);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

export function removeToast(id: string) {
  toasts.update(current => current.filter(t => t.id !== id));
}
