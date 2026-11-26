<script lang="ts">
  import {
    filteredChats,
    currentChatId,
    favorites,
    loadChat,
  } from '../../stores/chatStore';
  import {
    sidebarCollapsed,
    toggleSidebar,
    searchQuery,
    activeFilter,
    currentProjectFilter,
    setFilter,
    clearProjectFilter,
    statsModalOpen,
  } from '../../stores/uiStore';
  import { scanStatus, scanDirectory, dirHandle, startPolling } from '../../stores/folderStore';
  import { getChatTitle } from '../../utils/formatters';

  let searchTimeout: ReturnType<typeof setTimeout>;

  function handleSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery.set(val);
    }, 200);
  }

  function clearSearch() {
    searchQuery.set('');
  }

  async function handleOpenFolder() {
    try {
      if ((window as any).showDirectoryPicker) {
        const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
        dirHandle.set(handle);
        await scanDirectory(handle);
        startPolling(handle);
      }
    } catch {}
  }
</script>

<aside
  id="sidebar"
  class="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-darkpanel border-r border-slate-200 dark:border-slate-700 relative z-20 h-full shadow-xl md:shadow-none {$sidebarCollapsed ? 'sidebar-collapsed' : ''}"
>
  <div
    class="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/50 backdrop-blur"
  >
    <div class="flex justify-between items-center">
      <h2 class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
        <i class="ph ph-chats-circle text-blue-500"></i> Library
      </h2>
      <div class="flex gap-1 items-center">
        <button
          onclick={handleOpenFolder}
          title="Open another folder or files"
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <i class="ph ph-folder-open"></i>
        </button>
        <button
          onclick={() => statsModalOpen.set(true)}
          title="View statistics"
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <i class="ph ph-chart-pie-slice"></i>
        </button>
        <button
          onclick={toggleSidebar}
          title="Collapse sidebar"
          class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <i class="ph ph-caret-left"></i>
        </button>
      </div>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <i class="ph ph-magnifying-glass absolute left-3 top-2.5 text-slate-400"></i>
      <input
        type="text"
        placeholder="Search chats..."
        value={$searchQuery}
        oninput={handleSearchInput}
        class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-blue-500 dark:text-slate-200 placeholder-slate-400 transition-colors"
      />
      {#if $searchQuery}
        <button
          onclick={clearSearch}
          class="absolute right-2 top-2.5 text-slate-400 hover:text-red-500"
          title="Clear search"
          aria-label="Clear search"
        >
          <i class="ph ph-x-circle"></i>
        </button>
      {/if}
    </div>

    <!-- Filter Buttons -->
    <div class="flex gap-2 text-xs">
      <button
        onclick={() => setFilter('all')}
        class="flex-1 py-1 rounded font-medium transition-colors {$activeFilter === 'all' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}"
      >
        All
      </button>
      <button
        onclick={() => setFilter('favorites')}
        class="flex-1 py-1 rounded transition-colors {$activeFilter === 'favorites' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}"
      >
        <i class="ph ph-star-fill text-yellow-500"></i> Favorites
      </button>
    </div>

    <!-- Active Project Filter Badge -->
    {#if $currentProjectFilter}
      <div
        class="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs flex justify-between items-center"
      >
        <span class="truncate font-mono flex items-center gap-1">
          <i class="ph ph-folder text-blue-500"></i>
          <span>{$currentProjectFilter}</span>
        </span>
        <button onclick={clearProjectFilter} title="Clear project filter" class="hover:text-red-500 p-0.5">
          <i class="ph ph-x"></i>
        </button>
      </div>
    {/if}
  </div>

  <!-- Chat List -->
  <div id="chat-list" class="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
    {#if $filteredChats.length === 0}
      <div class="text-center text-slate-400 text-xs mt-10">No chats found</div>
    {:else}
      {#each $filteredChats as chat (chat.id)}
        {@const title = getChatTitle(chat)}
        {@const isFav = $favorites.has(chat.id)}
        {@const isActive = chat.id === $currentChatId}
        {@const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(chat.date)}
        {@const projectLabel = chat.projectName || (chat.projectHash ? chat.projectHash.substring(0, 6) : '')}
        {@const messageCount = chat.messages.filter(m => m.type === 'user' || m.type === 'gemini').length}

        <div
          role="button"
          tabindex="0"
          class="p-3 mx-2 rounded-lg cursor-pointer mb-1 border-l-4 transition-all relative group {isActive ? 'bg-blue-50 dark:bg-slate-800 border-blue-500 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 border-transparent'}"
          onclick={() => loadChat(chat.id)}
          onkeydown={(e) => { if (e.key === 'Enter') loadChat(chat.id); }}
        >
          <div class="flex justify-between items-start gap-1">
            <div class="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate flex-1">
              {title}
            </div>
            {#if isFav}
              <i class="ph ph-star-fill text-yellow-500 text-xs shrink-0 mt-0.5"></i>
            {/if}
          </div>
          <div class="text-[10px] text-slate-400 mt-1 flex justify-between items-center">
            <span>{dateStr}</span>
            <div class="flex items-center gap-1.5">
              <span class="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                {projectLabel}
              </span>
              <span class="opacity-60">{messageCount} msgs</span>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer -->
  <div
    class="p-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-center text-slate-400 flex justify-between px-4"
  >
    <span id="scan-status">{$scanStatus}</span>
    <span class="flex items-center gap-1"><i class="ph ph-arrows-clockwise"></i> Auto</span>
  </div>
</aside>
