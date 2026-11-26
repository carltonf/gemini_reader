import { writable, derived } from 'svelte/store';
import type { ChatSession } from '../types';
import { activeFilter, currentProjectFilter, searchQuery } from './uiStore';

function getStoredFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const saved = localStorage.getItem('gemini_favs');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
}

export const allChats = writable<ChatSession[]>([]);
export const favorites = writable<Set<string>>(getStoredFavorites());
export const currentChatId = writable<string | null>(null);

export const currentChat = derived([allChats, currentChatId], ([$allChats, $currentChatId]) => {
  if (!$currentChatId) return null;
  return $allChats.find(c => c.id === $currentChatId) || null;
});

export const filteredChats = derived(
  [allChats, favorites, activeFilter, currentProjectFilter, searchQuery],
  ([$allChats, $favorites, $activeFilter, $currentProjectFilter, $searchQuery]) => {
    const q = ($searchQuery || '').toLowerCase().trim();
    return $allChats.filter(chat => {
      const matchesSearch = !q || chat.searchText.includes(q);
      let matchesFilter = true;

      if ($activeFilter === 'favorites') {
        matchesFilter = $favorites.has(chat.id);
      } else if ($activeFilter === 'project') {
        matchesFilter =
          chat.projectName === $currentProjectFilter || chat.projectHash === $currentProjectFilter;
      }

      return matchesSearch && matchesFilter;
    });
  }
);

export function toggleFavorite(chatId: string) {
  favorites.update(favs => {
    const next = new Set(favs);
    if (next.has(chatId)) {
      next.delete(chatId);
    } else {
      next.add(chatId);
    }
    try {
      localStorage.setItem('gemini_favs', JSON.stringify([...next]));
    } catch {}
    return next;
  });
}

export function loadChat(chatId: string) {
  currentChatId.set(chatId);
}

export function clearAllChats() {
  allChats.set([]);
  currentChatId.set(null);
}
