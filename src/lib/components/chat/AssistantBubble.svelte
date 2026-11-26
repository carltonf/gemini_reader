<script lang="ts">
  import type { ChatMessage } from '../../types';
  import { extractConversationalText, extractMessageText, prepareMarkdown } from '../../utils/formatters';
  import { renderMarkdown } from '../../utils/markdown';
  import { ttsSpeed } from '../../stores/uiStore';

  let { message }: { message: ChatMessage } = $props();

  let answerText = $derived(
    extractConversationalText(message.content) || extractMessageText(message.content) || ''
  );
  let renderedHtml = $derived(renderMarkdown(prepareMarkdown(answerText)));

  let copied = $state(false);
  let isSpeaking = $state(false);

  function copyAnswer() {
    navigator.clipboard.writeText(answerText);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function toggleTTS() {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isSpeaking) {
      synth.cancel();
      isSpeaking = false;
      return;
    }

    synth.cancel();
    const sel = window.getSelection()?.toString().trim();
    const cleanText = (sel || answerText).replace(/[#*`_]/g, '').replace(/https?:\/\/[^\s]+/g, 'link');

    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = 'en-US';
    u.rate = $ttsSpeed || 1;
    u.onstart = () => {
      isSpeaking = true;
    };
    u.onend = () => {
      isSpeaking = false;
    };
    synth.speak(u);
  }

  function handleContainerClick(e: MouseEvent) {
    const target = (e.target as HTMLElement).closest('.copy-code-btn') as HTMLElement | null;
    if (target) {
      const code = decodeURIComponent(target.dataset.code || '');
      navigator.clipboard.writeText(code);
      const originalHtml = target.innerHTML;
      target.innerHTML = '<i class="ph ph-check text-green-400"></i> Copied';
      setTimeout(() => {
        target.innerHTML = originalHtml;
      }, 1500);
    }
  }
</script>

<div class="flex w-full justify-start mb-4">
  <div
    class="chat-content w-full max-w-full md:max-w-[96%] lg:max-w-[94%] rounded-2xl px-6 py-5 shadow-xs leading-relaxed overflow-hidden relative group transition-all bg-white dark:bg-darkpanel text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 rounded-tl-none"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="prose dark:prose-invert max-w-none text-sm break-words"
      onclick={handleContainerClick}
    >
      {@html renderedHtml}
    </div>

    <!-- Assistant Footer -->
    <div class="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 no-print text-[11px]">
      <button
        onclick={copyAnswer}
        title="Copy answer"
        class="opacity-60 hover:opacity-100 transition-opacity mr-auto cursor-pointer"
      >
        {#if copied}
          <i class="ph ph-check text-green-400"></i>
        {:else}
          <i class="ph ph-copy"></i>
        {/if}
      </button>

      <div class="flex items-center gap-3">
        {#if (message as any).tokens?.total}
          <span
            class="text-[10px] opacity-60 font-mono"
            title="Input: {(message as any).tokens.input || 0}, Output: {(message as any).tokens.output || 0}"
          >
            {(message as any).tokens.total.toLocaleString()} tokens
          </span>
        {/if}

        <button
          onclick={toggleTTS}
          title="Read aloud"
          class="opacity-60 hover:opacity-100 transition-all cursor-pointer {isSpeaking ? 'text-red-500 opacity-100' : ''}"
        >
          <i class="ph {isSpeaking ? 'ph-stop' : 'ph-play'}"></i>
        </button>

        {#if message.timestamp}
          <span class="text-[10px] opacity-60">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        {/if}
      </div>
    </div>
  </div>
</div>
