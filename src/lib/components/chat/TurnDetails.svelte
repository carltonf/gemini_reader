<script lang="ts">
  import type { ConversationTurn } from '../../types';
  import { allDetailsExpanded } from '../../stores/uiStore';
  import { renderCodeWithLineNumbers } from '../../utils/formatters';

  let { turn, projectName }: { turn: ConversationTurn; projectName: string } = $props();

  let ctxOpen = $state(false);
  let filesOpen = $state(false);
  let toolsOpen = $state(false);
  let thoughtsOpen = $state(false);

  // Sync with global allDetailsExpanded
  $effect(() => {
    ctxOpen = $allDetailsExpanded;
    filesOpen = $allDetailsExpanded;
    toolsOpen = $allDetailsExpanded;
    thoughtsOpen = $allDetailsExpanded;
  });

  let copiedCtx = $state(false);
  let copiedFiles = $state(false);
  let copiedTools = $state(false);

  function copyText(text: string, flag: 'ctx' | 'files' | 'tools') {
    navigator.clipboard.writeText(text);
    if (flag === 'ctx') {
      copiedCtx = true;
      setTimeout(() => (copiedCtx = false), 1500);
    } else if (flag === 'files') {
      copiedFiles = true;
      setTimeout(() => (copiedFiles = false), 1500);
    } else if (flag === 'tools') {
      copiedTools = true;
      setTimeout(() => (copiedTools = false), 1500);
    }
  }

  function copyCode(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="mt-2 flex flex-col gap-2 max-w-[90%] md:max-w-[85%] ml-auto text-xs no-print">
  <!-- Action Pill Buttons -->
  <div class="flex flex-wrap items-center justify-end gap-1.5">
    {#if turn.systemContext}
      <button
        onclick={() => (ctxOpen = !ctxOpen)}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 {ctxOpen ? 'ring-2 ring-blue-500/50 dark:ring-blue-400/50' : ''}"
        title="Session Context & Environment Variables"
      >
        <i class="ph ph-brackets-curly text-blue-500"></i>
        <span>Context</span>
        <i class="ph ph-caret-down text-[10px] transition-transform {ctxOpen ? 'rotate-180' : ''}"></i>
      </button>
    {/if}

    {#if turn.filesContext}
      <button
        onclick={() => (filesOpen = !filesOpen)}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 {filesOpen ? 'ring-2 ring-blue-500/50 dark:ring-blue-400/50' : ''}"
        title="Files loaded into prompt"
      >
        <i class="ph ph-file-text text-indigo-500"></i>
        <span>Files</span>
        <i class="ph ph-caret-down text-[10px] transition-transform {filesOpen ? 'rotate-180' : ''}"></i>
      </button>
    {/if}

    {#if turn.toolCalls && turn.toolCalls.length > 0}
      <button
        onclick={() => (toolsOpen = !toolsOpen)}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 {toolsOpen ? 'ring-2 ring-blue-500/50 dark:ring-blue-400/50' : ''}"
        title="Tools executed during this turn"
      >
        <i class="ph ph-terminal text-emerald-500"></i>
        <span>Tools ({turn.toolCalls.length})</span>
        <i class="ph ph-caret-down text-[10px] transition-transform {toolsOpen ? 'rotate-180' : ''}"></i>
      </button>
    {/if}

    {#if turn.thoughts && turn.thoughts.length > 0}
      <button
        onclick={() => (thoughtsOpen = !thoughtsOpen)}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 {thoughtsOpen ? 'ring-2 ring-blue-500/50 dark:ring-blue-400/50' : ''}"
        title="Reasoning Thoughts"
      >
        <i class="ph ph-brain text-purple-400"></i>
        <span>Thoughts ({turn.thoughts.length})</span>
        <i class="ph ph-caret-down text-[10px] transition-transform {thoughtsOpen ? 'rotate-180' : ''}"></i>
      </button>
    {/if}
  </div>

  <!-- Expandable: System Context Panel -->
  {#if turn.systemContext && ctxOpen}
    <div
      class="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shadow-md flex flex-col gap-2"
    >
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <span class="font-bold text-[11px] text-blue-400 flex items-center gap-1.5">
          <i class="ph ph-brackets-curly"></i> System Context ({projectName})
        </span>
        <button
          onclick={() => copyText(turn.systemContext!, 'ctx')}
          class="hover:text-white text-slate-400 text-xs flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
        >
          {#if copiedCtx}
            <i class="ph ph-check text-green-400"></i> Copied
          {:else}
            <i class="ph ph-copy"></i> Copy
          {/if}
        </button>
      </div>
      <div class="code-content rounded-md border border-slate-800 max-h-60 overflow-y-auto">
        {@html renderCodeWithLineNumbers(turn.systemContext, 'text')}
      </div>
    </div>
  {/if}

  <!-- Expandable: Files Context Panel -->
  {#if turn.filesContext && filesOpen}
    <div
      class="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shadow-md flex flex-col gap-2"
    >
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <span class="font-bold text-[11px] text-indigo-400 flex items-center gap-1.5">
          <i class="ph ph-file-text"></i> Referenced Files
        </span>
        <button
          onclick={() => copyText(turn.filesContext!, 'files')}
          class="hover:text-white text-slate-400 text-xs flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
        >
          {#if copiedFiles}
            <i class="ph ph-check text-green-400"></i> Copied
          {:else}
            <i class="ph ph-copy"></i> Copy
          {/if}
        </button>
      </div>
      <div class="code-content rounded-md border border-slate-800 max-h-60 overflow-y-auto">
        {@html renderCodeWithLineNumbers(turn.filesContext, 'text')}
      </div>
    </div>
  {/if}

  <!-- Expandable: Tool Responses Panel -->
  {#if turn.toolCalls && turn.toolCalls.length > 0 && toolsOpen}
    <div
      class="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shadow-md flex flex-col gap-2"
    >
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <span class="font-bold text-[11px] text-emerald-400 flex items-center gap-1.5">
          <i class="ph ph-terminal"></i> Tool Calls & Outputs ({turn.toolCalls.length})
        </span>
        <button
          onclick={() =>
            copyText(
              turn.toolCalls
                .map(tc => {
                  const r = tc.result?.[0]?.functionResponse?.response?.output || '';
                  return typeof r === 'string' ? r : JSON.stringify(r, null, 2);
                })
                .join('\n\n'),
              'tools'
            )}
          class="hover:text-white text-slate-400 text-xs flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
        >
          {#if copiedTools}
            <i class="ph ph-check text-green-400"></i> Copied All
          {:else}
            <i class="ph ph-copy"></i> Copy All
          {/if}
        </button>
      </div>
      <div class="space-y-3">
        {#each turn.toolCalls as c (c.id)}
          {@const resp = c.result?.[0]?.functionResponse?.response || {}}
          {@const output = resp.output || resp.error || (typeof c.result === 'string' ? c.result : '') || '(No output)'}
          {@const outputStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
          {@const isError = Boolean(resp.error || c.status === 'error')}

          {@const cmdHeader = c.args?.command
            ? `$ ${c.args.command}`
            : c.args?.file_path
              ? `${c.name}: ${c.args.file_path}`
              : c.args?.pattern
                ? `${c.name}: "${c.args.pattern}"`
                : c.args?.query
                  ? `${c.name}: "${c.args.query}"`
                  : c.name}

          <div class="p-3 rounded-lg bg-slate-950 border {isError ? 'border-red-900/60' : 'border-slate-800'}">
            <div class="flex items-center justify-between mb-1.5 gap-2">
              <span class="font-mono font-bold text-xs {isError ? 'text-red-400' : 'text-emerald-300'} truncate">
                {cmdHeader}
              </span>
              <div class="flex items-center gap-1.5 shrink-0">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded font-mono {isError ? 'bg-red-900/60 text-red-200' : 'bg-slate-800 text-slate-400'}"
                >
                  {c.name}
                </span>
                <button
                  class="hover:text-white text-slate-400 text-xs flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 cursor-pointer"
                  onclick={() => copyCode(outputStr)}
                  title="Copy output"
                >
                  <i class="ph ph-copy"></i> Copy
                </button>
              </div>
            </div>
            <div
              class="code-content rounded-md border {isError ? 'border-red-900/60' : 'border-slate-900/80'} bg-black/60 max-h-56 overflow-y-auto"
            >
              {@html renderCodeWithLineNumbers(outputStr, 'text')}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Expandable: Thoughts Panel -->
  {#if turn.thoughts && turn.thoughts.length > 0 && thoughtsOpen}
    <div
      class="mt-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shadow-md flex flex-col gap-2"
    >
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <span class="font-bold text-[11px] text-purple-400 flex items-center gap-1.5">
          <i class="ph ph-brain"></i> Agent Thoughts ({turn.thoughts.length})
        </span>
      </div>
      <div class="space-y-2">
        {#each turn.thoughts as th, i}
          <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <div class="font-bold text-purple-400 text-xs mb-1">{i + 1}. {th.subject || 'Thought'}</div>
            <div class="text-xs text-slate-300 whitespace-pre-wrap">{th.description || ''}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
