<script lang="ts">
  import { currentChat } from '../../stores/chatStore';
  import { buildConversationTurns } from '../../utils/parser';
  import { extractMessageText } from '../../utils/formatters';
  import MessageBubble from './MessageBubble.svelte';
  import TurnDetails from './TurnDetails.svelte';
  import AssistantBubble from './AssistantBubble.svelte';

  let turns = $derived($currentChat ? buildConversationTurns($currentChat.messages) : []);
</script>

<div
  id="messages-container"
  class="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
>
  {#if !$currentChat}
    <div class="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
      <i class="ph ph-chats-circle text-6xl mb-4 opacity-50"></i>
      <p class="text-lg font-medium">Select a chat</p>
    </div>
  {:else if turns.length === 0}
    <div class="h-full flex flex-col items-center justify-center text-slate-400">
      <p>This session is empty.</p>
    </div>
  {:else}
    {#each turns as turn (turn.id)}
      <div class="conversation-turn mb-8" id="turn-{turn.id}">
        <!-- 1. User Message Box -->
        {#if turn.userMsg}
          <MessageBubble {turn} />
          <TurnDetails {turn} projectName={$currentChat.projectName} />
        {/if}

        <!-- 2. Info Messages -->
        {#if turn.infoMsgs && turn.infoMsgs.length > 0}
          {#each turn.infoMsgs as im}
            {@const infoText = extractMessageText(im.content)}
            {#if infoText}
              <div class="flex justify-center my-3 no-print">
                <span
                  class="px-3 py-1 rounded-full text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5"
                >
                  <i class="ph ph-info"></i> {infoText}
                </span>
              </div>
            {/if}
          {/each}
        {/if}

        <!-- 3. Assistant Messages -->
        {#if turn.assistantMsgs && turn.assistantMsgs.length > 0}
          {#each turn.assistantMsgs as am}
            <AssistantBubble message={am} />
          {/each}
        {:else if turn.toolCalls.length > 0 && !turn.cancelled}
          <div class="flex justify-start my-2 pl-2 no-print">
            <span class="italic text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <i class="ph ph-check-circle text-emerald-500"></i> Completed tool execution ({turn.toolCalls.length} call{turn.toolCalls.length > 1 ? 's' : ''})
            </span>
          </div>
        {/if}

        <!-- 4. Cancellation Banner -->
        {#if turn.cancelled}
          <div class="flex justify-start my-2">
            <div
              class="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold border border-orange-200 dark:border-orange-800/60 shadow-xs"
            >
              <i class="ph ph-warning"></i> Generation Cancelled
            </div>
          </div>
        {/if}

        <!-- 5. Error Messages -->
        {#if turn.errorMsgs && turn.errorMsgs.length > 0}
          {#each turn.errorMsgs as em}
            {@const errText = extractMessageText(em.content)}
            <div class="flex justify-start my-3">
              <div
                class="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl p-4 text-xs shadow-sm max-w-[85%]"
              >
                <div class="flex items-start gap-2">
                  <i class="ph ph-warning-circle text-base shrink-0 mt-0.5"></i>
                  <div class="whitespace-pre-wrap font-mono">{errText}</div>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/each}
  {/if}
</div>
