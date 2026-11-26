import { writable } from 'svelte/store';

const initialTheme = (() => {
  if (typeof window === 'undefined') return 'light';
  if (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
    return 'dark';
  }
  document.documentElement.classList.remove('dark');
  return 'light';
})();

export const theme = writable<'light' | 'dark'>(initialTheme);

export function toggleTheme() {
  theme.update(current => {
    const next = current === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.theme = next;
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return next;
  });
}

export const zoom = writable<number>(1.0);

export function adjustZoom(delta: number) {
  zoom.update(current => {
    const next = Math.max(0.7, Math.min(1.8, +(current + delta).toFixed(1)));
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--chat-zoom', `${next}rem`);
    }
    return next;
  });
}

export const sidebarCollapsed = writable<boolean>(false);

export function toggleSidebar() {
  sidebarCollapsed.update(v => !v);
}

export const activeFilter = writable<'all' | 'favorites' | 'project'>('all');
export const currentProjectFilter = writable<string | null>(null);
export const searchQuery = writable<string>('');
export const statsModalOpen = writable<boolean>(false);
export const allDetailsExpanded = writable<boolean>(false);
export const ttsSpeed = writable<number>(1.0);

export function setFilter(type: 'all' | 'favorites') {
  activeFilter.set(type);
  currentProjectFilter.set(null);
}

export function filterByProject(projectName: string) {
  if (!projectName || projectName === 'N/A') return;
  activeFilter.set('project');
  currentProjectFilter.set(projectName);
}

export function clearProjectFilter() {
  setFilter('all');
}
