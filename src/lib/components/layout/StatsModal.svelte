<script lang="ts">
  import { allChats } from '../../stores/chatStore';
  import { statsModalOpen, filterByProject } from '../../stores/uiStore';

  let totalChats = $derived($allChats.length);
  let totalMessages = $derived($allChats.reduce((acc, c) => acc + c.messages.length, 0));
  let totalTokens = $derived(
    $allChats.reduce((acc, c) => {
      let chars = 0;
      for (const m of c.messages) {
        if (typeof m.content === 'string') chars += m.content.length;
        else if (Array.isArray(m.content)) {
          for (const p of m.content) {
            if (p?.text) chars += p.text.length;
          }
        }
      }
      return acc + Math.round(chars / 4);
    }, 0)
  );

  let modelsBreakdown = $derived.by(() => {
    const models: Record<string, number> = {};
    for (const c of $allChats) {
      for (const m of c.messages) {
        if (m.model) {
          models[m.model] = (models[m.model] || 0) + 1;
        }
      }
    }
    return Object.entries(models).sort((a, b) => b[1] - a[1]);
  });

  let projectsBreakdown = $derived.by(() => {
    const projects: Record<string, number> = {};
    for (const c of $allChats) {
      const p = c.projectName || c.projectHash || 'workspace';
      projects[p] = (projects[p] || 0) + 1;
    }
    return Object.entries(projects).sort((a, b) => b[1] - a[1]);
  });

  function handleFilterProject(name: string) {
    statsModalOpen.set(false);
    filterByProject(name);
  }
</script>

{#if $statsModalOpen}
  <div
    id="stats-modal"
    role="dialog"
    aria-modal="true"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4"
  >
    <div
      class="bg-white dark:bg-darkpanel w-full max-w-xl rounded-2xl shadow-2xl p-6 transform transition-all max-h-[90vh] flex flex-col"
    >
      <div class="flex justify-between items-center mb-6 shrink-0">
        <h3 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <i class="ph ph-chart-pie-slice text-blue-500"></i> Workspace Statistics
        </h3>
        <button
          onclick={() => statsModalOpen.set(false)}
          class="text-slate-400 hover:text-red-500"
          title="Close statistics modal"
          aria-label="Close statistics modal"
        >
          <i class="ph ph-x text-xl"></i>
        </button>
      </div>

      <!-- Top 3 Metrics -->
      <div class="grid grid-cols-3 gap-3 mb-6 shrink-0">
        <div class="bg-blue-50 dark:bg-slate-800 p-3 rounded-xl text-center">
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalChats}</div>
          <div class="text-[10px] text-slate-500 uppercase tracking-wide">Sessions</div>
        </div>
        <div class="bg-indigo-50 dark:bg-slate-800 p-3 rounded-xl text-center">
          <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalMessages}</div>
          <div class="text-[10px] text-slate-500 uppercase tracking-wide">Messages</div>
        </div>
        <div class="bg-purple-50 dark:bg-slate-800 p-3 rounded-xl text-center">
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalTokens.toLocaleString()}</div>
          <div class="text-[10px] text-slate-500 uppercase tracking-wide">Tokens</div>
        </div>
      </div>

      <div class="overflow-y-auto space-y-4 pr-1">
        <!-- Models Used -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Models Used</h4>
          <div class="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            {#if modelsBreakdown.length === 0}
              <div class="text-xs text-slate-400 italic">No model metadata recorded</div>
            {:else}
              {#each modelsBreakdown as [name, count]}
                <div class="flex justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1 last:border-0">
                  <span class="font-mono text-xs">{name}</span>
                  <span class="font-bold font-mono text-xs">{count} responses</span>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Projects -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Projects</h4>
          <div class="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            {#if projectsBreakdown.length === 0}
              <div class="text-xs text-slate-400 italic">No project data recorded</div>
            {:else}
              {#each projectsBreakdown as [name, count]}
                <button
                  type="button"
                  class="flex justify-between w-full border-b border-slate-100 dark:border-slate-700/60 pb-1 last:border-0 cursor-pointer hover:text-blue-500 text-left"
                  onclick={() => handleFilterProject(name)}
                >
                  <span>{name}</span>
                  <span class="font-bold font-mono text-xs">{count} chats</span>
                </button>
              {/each}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
