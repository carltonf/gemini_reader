<script lang="ts">
  import {
    recentFolders,
    dirHandle,
    openRecentFolder,
    removeRecentFolder,
    clearRecentFolders,
    scanDirectory,
    ingestFileList,
    startPolling,
  } from '../../stores/folderStore';
  import { formatRelativeTime } from '../../utils/formatters';

  let folderInput: HTMLInputElement;
  let filesInput: HTMLInputElement;
  let isDragActive = $state(false);
  let errorMessage = $state('');

  async function handleSelectFolder() {
    errorMessage = '';
    try {
      if (!(window as any).showDirectoryPicker) {
        folderInput?.click();
        return;
      }
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      dirHandle.set(handle);
      await scanDirectory(handle);
      startPolling(handle);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Folder picker error:', err);
        folderInput?.click();
      }
    }
  }

  async function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    const rawFiles = files.map(f => ({
      file: f,
      path: (f as any).webkitRelativePath || f.name,
    }));
    await ingestFileList(rawFiles);
    input.value = '';
  }

  async function scanWebkitDirectory(dirEntry: any, outputList: { file: File; path: string }[]) {
    const reader = dirEntry.createReader();
    const readEntries = () => new Promise<any[]>(resolve => reader.readEntries(resolve, () => resolve([])));

    let batch;
    do {
      batch = await readEntries();
      for (const child of batch) {
        if (child.name === '.git' || child.name === 'node_modules') continue;
        if (child.isFile) {
          const f = await new Promise<File>(res => child.file(res));
          outputList.push({ file: f, path: child.fullPath || child.name });
        } else if (child.isDirectory) {
          await scanWebkitDirectory(child, outputList);
        }
      }
    } while (batch && batch.length > 0);
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragActive = false;
    const items = e.dataTransfer?.items;
    if (!items || items.length === 0) return;

    const rawFiles: { file: File; path: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if ((item as any).webkitGetAsEntry) {
        const entry = (item as any).webkitGetAsEntry();
        if (entry) {
          if (entry.isFile) {
            const f = await new Promise<File>(res => entry.file(res));
            rawFiles.push({ file: f, path: entry.fullPath || entry.name });
          } else if (entry.isDirectory) {
            await scanWebkitDirectory(entry, rawFiles);
          }
        }
      } else if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) rawFiles.push({ file: f, path: f.name });
      }
    }

    if (rawFiles.length > 0) {
      await ingestFileList(rawFiles);
    }
  }
</script>

<svelte:window
  ondragenter={(e) => { e.preventDefault(); isDragActive = true; }}
  ondragover={(e) => { e.preventDefault(); isDragActive = true; }}
  ondragleave={(e) => { e.preventDefault(); isDragActive = false; }}
  ondrop={handleDrop}
/>

<div
  id="landing-screen"
  class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-darkbg p-6 transition-all duration-300 overflow-y-auto {isDragActive ? 'drop-target-active' : ''}"
>
  <div class="max-w-2xl w-full text-center space-y-6 my-auto">
    <div class="inline-block p-4 rounded-full bg-blue-50 dark:bg-slate-800 mb-2 shadow-inner">
      <i class="ph ph-chat-circle-text text-6xl text-blue-500"></i>
    </div>
    <h1 class="text-4xl font-bold text-slate-900 dark:text-white">
      Gemini CLI Reader <span class="text-sm align-top text-blue-500 font-mono">v3.5</span>
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-400">
      The ultimate local Hub for your chats.<br />
      <span class="text-sm opacity-75">Global search, Export, Stats, and Auto-refresh.</span>
    </p>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
      <button
        onclick={handleSelectFolder}
        class="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 font-semibold text-white transition-all duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-blue-500/40 transform hover:-translate-y-0.5 cursor-pointer"
      >
        <i class="ph ph-folder-open text-xl mr-2"></i> Open .gemini folder
      </button>
      <button
        onclick={() => folderInput?.click()}
        class="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 cursor-pointer"
      >
        <i class="ph ph-folder mr-2"></i> Choose Directory
      </button>
      <button
        onclick={() => filesInput?.click()}
        class="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 cursor-pointer"
      >
        <i class="ph ph-file mr-2"></i> Select File(s)
      </button>
    </div>

    <!-- Hidden file inputs -->
    <input
      type="file"
      bind:this={folderInput}
      webkitdirectory
      multiple
      class="hidden"
      onchange={handleFileInput}
    />
    <input
      type="file"
      bind:this={filesInput}
      multiple
      accept=".jsonl,.json"
      class="hidden"
      onchange={handleFileInput}
    />

    <div class="text-xs text-slate-400">
      Supports Windows, MacOS & Linux &bull; 100% Local in Browser &bull; Drag & drop supported
    </div>

    <!-- Recently Opened Folders -->
    <div
      class="text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm w-full"
    >
      <div class="flex items-center justify-between mb-3">
        <h3
          class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
        >
          <i class="ph ph-clock-counter-clockwise text-blue-500 text-sm"></i> Recently Opened Folders
        </h3>
        {#if $recentFolders.length > 0}
          <button
            onclick={clearRecentFolders}
            class="text-[11px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            Clear History
          </button>
        {/if}
      </div>

      <div class="space-y-2">
        {#if $recentFolders.length === 0}
          <div
            class="text-center py-6 px-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400"
          >
            <i class="ph ph-folder-open text-3xl mb-2 opacity-50 block"></i>
            <p class="text-xs font-medium text-slate-600 dark:text-slate-400">No recent folders yet</p>
            <p class="text-[11px] text-slate-400 mt-1">
              Folders opened with "Open .gemini folder" will be remembered here.
            </p>
            <div class="mt-2 text-[10px] font-mono text-slate-400">
              Common locations: ~/.gemini or C:\Users\NAME\.gemini
            </div>
          </div>
        {:else}
          {#each $recentFolders as item (item.id)}
            {@const actualPath = item.actualPath || item.name || item.path || 'Folder'}
            {@const originalPath = item.originalPath !== undefined ? item.originalPath : (item.actualPath ? '' : (item.path !== item.name ? item.path : ''))}
            {@const hasDiffOrig = Boolean(originalPath && originalPath !== actualPath)}

            <div
              role="button"
              tabindex="0"
              class="group flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer"
              onclick={() => openRecentFolder(item.id)}
              onkeydown={(e) => { if (e.key === 'Enter') openRecentFolder(item.id); }}
            >
              <div class="flex items-center gap-3 min-w-0 pr-2">
                <div
                  class="p-2 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform"
                >
                  <i class="ph ph-folder text-lg"></i>
                </div>
                <div class="min-w-0">
                  <div
                    class="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    title={actualPath}
                  >
                    {actualPath}
                  </div>
                  {#if hasDiffOrig}
                    <div
                      class="font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 flex items-center gap-1"
                      title="Original path: {originalPath}"
                    >
                      <span class="opacity-60 text-[9px] uppercase tracking-wider font-sans shrink-0">orig:</span>
                      <span class="truncate">{originalPath}</span>
                    </div>
                  {/if}
                  <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{formatRelativeTime(item.lastOpened)}</span>
                    {#if item.chatCount}
                      <span class="opacity-75">• {item.chatCount} chats</span>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  onclick={(e) => { e.stopPropagation(); removeRecentFolder(item.id); }}
                  title="Remove from history"
                  class="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <i class="ph ph-trash text-sm"></i>
                </button>
                <span class="p-1.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <i class="ph ph-arrow-right text-sm"></i>
                </span>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div
        class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
      >
        <i class="ph ph-lightbulb text-amber-500 text-sm shrink-0"></i>
        <span>Folders opened with <b>Open .gemini folder</b> are remembered here. Click any path to reopen.</span>
      </div>
    </div>

    {#if errorMessage}
      <p class="text-xs text-red-500">{errorMessage}</p>
    {/if}
  </div>
</div>
