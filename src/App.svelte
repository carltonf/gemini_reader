<script lang="ts">
  import { allChats } from './lib/stores/chatStore';
  import LandingScreen from './lib/components/layout/LandingScreen.svelte';
  import Sidebar from './lib/components/layout/Sidebar.svelte';
  import Header from './lib/components/layout/Header.svelte';
  import StatsModal from './lib/components/layout/StatsModal.svelte';
  import ChatContainer from './lib/components/chat/ChatContainer.svelte';
  import ToastContainer from './lib/components/ui/ToastContainer.svelte';
</script>

<main class="h-full w-full flex flex-col overflow-hidden relative">
  {#if $allChats.length === 0}
    <LandingScreen />
  {:else}
    <div class="flex w-full h-full overflow-hidden">
      <Sidebar />
      <div class="flex-1 flex flex-col bg-slate-50 dark:bg-darkbg relative min-w-0 h-full">
        <Header />
        <ChatContainer />
      </div>
    </div>
  {/if}

  <StatsModal />
  <ToastContainer />
</main>
