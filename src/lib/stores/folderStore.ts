import { writable } from 'svelte/store';
import type { RecentFolder, ChatSession } from '../types';
import {
  getHandleFromDb,
  removeHandleFromDb,
  saveHandleToDb,
  detectActualFolderPath,
  detectGeminiRootPath,
} from '../utils/fileSystem';
import { parseSessionFile } from '../utils/parser';
import { extractMessageText } from '../utils/formatters';
import { allChats, currentChatId, loadChat } from './chatStore';
import { showToast } from './toastStore';

function getStoredRecentFolders(): RecentFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('gemini_recent_folders');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export const recentFolders = writable<RecentFolder[]>(getStoredRecentFolders());
export const dirHandle = writable<any>(null);
export const scanStatus = writable<string>('Ready');

let pollTimer: ReturnType<typeof setInterval> | null = null;

export async function recordRecentFolder(
  id: string,
  actualPath: string,
  originalPath = '',
  chatCount = 0,
  handle: any = null
) {
  if (!actualPath && !originalPath) return;

  const folderId =
    id ||
    'folder_' +
      (actualPath || 'default') +
      (originalPath ? '_' + originalPath.replace(/[^a-zA-Z0-9_-]/g, '_') : '');

  if (handle) {
    await saveHandleToDb(folderId, handle);
  }

  recentFolders.update(list => {
    const filtered = list.filter(
      f => f.id !== folderId && !(f.actualPath === actualPath && f.originalPath === originalPath)
    );
    const updated = [
      {
        id: folderId,
        actualPath: actualPath || originalPath,
        originalPath: originalPath || '',
        path: actualPath || originalPath,
        name: actualPath || originalPath,
        chatCount: chatCount || 0,
        lastOpened: Date.now(),
      },
      ...filtered,
    ].slice(0, 8);

    try {
      localStorage.setItem('gemini_recent_folders', JSON.stringify(updated));
    } catch {}

    return updated;
  });
}

export async function removeRecentFolder(id: string) {
  recentFolders.update(list => {
    const updated = list.filter(f => f.id !== id);
    try {
      localStorage.setItem('gemini_recent_folders', JSON.stringify(updated));
    } catch {}
    return updated;
  });
  await removeHandleFromDb(id);
  showToast('Removed from recent history.', 'info', 2000);
}

export async function clearRecentFolders() {
  const current = getStoredRecentFolders();
  for (const item of current) {
    await removeHandleFromDb(item.id);
  }
  recentFolders.set([]);
  try {
    localStorage.removeItem('gemini_recent_folders');
  } catch {}
  showToast('Recent folders history cleared.', 'info', 2000);
}

async function* getFilesRecursively(entry: any, currentPath = ''): AsyncGenerator<{ fileHandle: any; path: string }> {
  if (entry.kind === 'file') {
    yield { fileHandle: entry, path: currentPath ? `${currentPath}/${entry.name}` : entry.name };
  } else if (entry.kind === 'directory') {
    if (entry.name === '.git' || entry.name === 'node_modules') return;
    for await (const handle of entry.values()) {
      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      yield* getFilesRecursively(handle, nextPath);
    }
  }
}

export async function scanDirectory(handle: any, isPolling = false) {
  if (!isPolling) scanStatus.set('Scanning...');

  try {
    const rawFiles: { file: File; path: string }[] = [];
    for await (const item of getFilesRecursively(handle)) {
      const name = item.fileHandle.name.toLowerCase();
      if (name.endsWith('.jsonl') || name.endsWith('.json')) {
        try {
          const file = await item.fileHandle.getFile();
          rawFiles.push({ file, path: item.path });
        } catch {}
      }
    }

    await ingestFileList(rawFiles, isPolling, handle);
  } catch (err) {
    scanStatus.set('Scan Error');
    console.error('scanDirectory failed:', err);
  }
}

export async function ingestFileList(
  rawFiles: { file: File; path: string }[],
  isPolling = false,
  handle: any = null
) {
  const tempChats: ChatSession[] = [];

  for (const { file, path: filePath } of rawFiles) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.jsonl') && !name.endsWith('.json')) continue;
    if (
      name === 'settings.json' ||
      name === 'oauth_creds.json' ||
      name === 'logs.json' ||
      name === 'trustedfolders.json'
    )
      continue;

    try {
      const txt = await file.text();
      const chat = parseSessionFile(txt, file.name, filePath);
      if (chat && chat.messages && chat.messages.length > 0) {
        tempChats.push(chat);
      }
    } catch (e) {
      console.debug('Failed to parse session file:', file.name, e);
    }
  }

  tempChats.sort((a, b) => b.date.getTime() - a.date.getTime());

  allChats.update(current => {
    const hasChanged =
      tempChats.length !== current.length ||
      tempChats[0]?.id !== current[0]?.id ||
      tempChats[0]?.messages?.length !== current[0]?.messages?.length;

    if (hasChanged || !isPolling) {
      scanStatus.set(`Ready (${tempChats.length} chats)`);

      // Record in recent history if directory handle is active
      if (!isPolling && tempChats.length > 0 && handle) {
        let detectedOrigPath = '';
        for (const c of tempChats) {
          if (c.messages) {
            for (const m of c.messages) {
              const raw = extractMessageText(m.content);
              const p = detectGeminiRootPath(raw, '');
              if (p) {
                detectedOrigPath = p;
                break;
              }
            }
          }
          if (detectedOrigPath) break;
        }

        const actualPath = detectActualFolderPath(handle, rawFiles) || handle.name || 'folder';
        const originalPath = detectedOrigPath || '';
        const idSuffix = originalPath ? '_' + originalPath.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
        const folderId = 'folder_' + (handle.name || 'default') + idSuffix;

        recordRecentFolder(folderId, actualPath, originalPath, tempChats.length, handle);
      }

      return tempChats;
    } else {
      if (isPolling) scanStatus.set(`Ready (${current.length} chats)`);
      return current;
    }
  });
}

export async function openRecentFolder(id: string) {
  const currentFolders = getStoredRecentFolders();
  const item = currentFolders.find(f => f.id === id);
  if (!item) {
    showToast('Folder not found in history.', 'error');
    return;
  }

  const displayName = item.actualPath || item.name || item.path || 'Folder';

  try {
    const handle = await getHandleFromDb(item.id);
    if (!handle) {
      showToast(
        `Could not open "${displayName}". Directory access handle is unavailable. Click "Open .gemini folder" to select it again.`,
        'error',
        5000
      );
      return;
    }

    let perm = await handle.queryPermission({ mode: 'read' });
    if (perm !== 'granted') {
      perm = await handle.requestPermission({ mode: 'read' });
    }
    if (perm !== 'granted') {
      showToast(`Permission denied to open "${displayName}".`, 'error', 4000);
      return;
    }

    const testIter = handle.values();
    await testIter.next();

    dirHandle.set(handle);
    await scanDirectory(handle);

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => scanDirectory(handle, true), 10000);

    showToast(`Opened "${displayName}"`, 'success');
  } catch (err) {
    console.error('Failed to open recent folder:', err);
    showToast(
      `Could not open "${displayName}". The folder may have been moved, renamed, or deleted.`,
      'error',
      5000
    );
  }
}

export function startPolling(handle: any) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => scanDirectory(handle, true), 10000);
}
