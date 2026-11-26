<script lang="ts">
  import {
    currentChat,
    currentChatId,
    favorites,
    toggleFavorite,
  } from '../../stores/chatStore';
  import {
    sidebarCollapsed,
    toggleSidebar,
    theme,
    toggleTheme,
    zoom,
    adjustZoom,
    allDetailsExpanded,
    ttsSpeed,
    filterByProject,
  } from '../../stores/uiStore';
  import { getChatTitle } from '../../utils/formatters';
  import { exportChat, openAllDetailsInNewTab } from '../../utils/export';

  let exportMenuOpen = $state(false);

  function handleExport(format: 'md' | 'html') {
    exportMenuOpen = false;
    if ($currentChat) {
      const container = document.getElementById('messages-container');
      exportChat($currentChat, format, container?.innerHTML || '');
    }
  }

  function handleOpenInTab() {
    exportMenuOpen = false;
    if ($currentChat) {
      openAllDetailsInNewTab($currentChat);
    }
  }

  function handlePrint() {
    exportMenuOpen = false;
    window.print();
  }

  function toggleAllDetails() {
    allDetailsExpanded.update(v => !v);
  }
</script>

<header
  class="h-16 bg-white dark:bg-darkpanel border-b border-slate-200 dark:border-slate-700 flex items-center px-4 justify-between shadow-sm z-10 shrink-0 gap-4"
>
  <!-- Left Side: Mobile toggle + Chat Title & Meta -->
  <div class="flex items-center gap-3 overflow-hidden min-w-0">
    <button
      onclick={toggleSidebar}
      class="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full md:hidden"
      title="Toggle sidebar"
      aria-label="Toggle sidebar"
    >
      <i class="ph ph-list text-2xl"></i>
    </button>
    <div class="flex flex-col overflow-hidden">
      <div class="flex items-center gap-2">
        <h2 class="font-semibold text-slate-800 dark:text-white truncate">
          {$currentChat ? getChatTitle($currentChat) : 'Select a chat'}
        </h2>
        {#if $currentChat}
          <button
            onclick={() => toggleFavorite($currentChat.id)}
            class="text-slate-400 hover:text-yellow-500 transition-colors"
            title="Toggle favorite"
            aria-label="Toggle favorite"
          >
            <i class="ph {$favorites.has($currentChat.id) ? 'ph-star-fill text-yellow-500' : 'ph-star'} text-lg"></i>
          </button>
        {/if}
      </div>
      {#if $currentChat}
        {@const lastModel = [...$currentChat.messages].reverse().find(m => m.model)?.model}
        <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format($currentChat.date)}</span>
          {#if lastModel}
            <span class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-mono">
              {lastModel}
            </span>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Right Side: Tools & Actions -->
  <div class="flex items-center gap-2 md:gap-3 shrink-0">
    <!-- TTS Speed -->
    <div class="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full px-2 border border-slate-200 dark:border-slate-700">
      <i class="ph ph-speaker-high text-slate-400 text-xs"></i>
      <input
        type="range"
        min="0.5"
        max="2"
        step="0.1"
        bind:value={$ttsSpeed}
        class="w-16 h-1 accent-blue-600"
        title="Speech Speed"
      />
    </div>

    <!-- Zoom Controls -->
    <div class="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
      <button onclick={() => adjustZoom(-0.1)} class="hover:text-blue-500 dark:text-slate-400" title="Zoom out" aria-label="Zoom out">
        <i class="ph ph-minus"></i>
      </button>
      <span class="text-xs font-mono w-8 text-center">{Math.round($zoom * 100)}%</span>
      <button onclick={() => adjustZoom(0.1)} class="hover:text-blue-500 dark:text-slate-400" title="Zoom in" aria-label="Zoom in">
        <i class="ph ph-plus"></i>
      </button>
    </div>

    {#if $currentChat}
      <!-- Details Toggle Button -->
      <button
        onclick={toggleAllDetails}
        class="hidden sm:inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer transition-colors"
        title="Expand or collapse all Tool Responses & System Context"
      >
        <i class="ph ph-sliders text-sm text-blue-500"></i>
        <span>{$allDetailsExpanded ? 'Hide Details' : 'Show Details'}</span>
      </button>

      <!-- Open in Tab Button -->
      <button
        onclick={handleOpenInTab}
        class="hidden sm:inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer transition-colors"
        title="Open all Context & Tool Responses in a separate tab"
      >
        <i class="ph ph-arrow-square-out text-sm text-emerald-500"></i>
        <span>Open in Tab</span>
      </button>

      <!-- Export Menu -->
      <div class="relative">
        <button
          onclick={() => { exportMenuOpen = !exportMenuOpen; }}
          class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          title="Export options"
        >
          <i class="ph ph-export"></i>
        </button>
        {#if exportMenuOpen}
          <div
            class="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50"
          >
            <button
              onclick={handleOpenInTab}
              class="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
            >
              <i class="ph ph-arrow-square-out mr-2 text-emerald-500"></i> Context & Tools in Tab
            </button>
            <button
              onclick={() => handleExport('md')}
              class="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
            >
              <i class="ph ph-file-text mr-2"></i> Markdown (.md)
            </button>
            <button
              onclick={() => handleExport('html')}
              class="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
            >
              <i class="ph ph-browsers mr-2"></i> Portable HTML
            </button>
            <button
              onclick={handlePrint}
              class="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200"
            >
              <i class="ph ph-printer mr-2"></i> Print / PDF
            </button>
          </div>
        {/if}
      </div>

      <!-- Project Pill -->
      <button
        onclick={() => filterByProject($currentChat.projectName || $currentChat.projectHash)}
        class="hidden lg:inline-block text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer transition-colors"
        title="Filter by this project"
      >
        {$currentChat.projectName || ($currentChat.projectHash ? $currentChat.projectHash.substring(0, 8) : 'N/A')}
      </button>
    {/if}

    <!-- Theme Toggle -->
    <button
      onclick={toggleTheme}
      class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      <i class="ph {$theme === 'dark' ? 'ph-sun' : 'ph-moon'}"></i>
    </button>
  </div>
</header>
