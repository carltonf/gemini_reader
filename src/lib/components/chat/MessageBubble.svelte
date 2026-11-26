<script lang="ts">
  import type { ConversationTurn } from '../../types';
  import { ttsSpeed } from '../../stores/uiStore';

  let { turn }: { turn: ConversationTurn } = $props();

  let copied = $state(false);
  let isSpeaking = $state(false);

  function copyPrompt() {
    navigator.clipboard.writeText(turn.cleanPrompt || turn.rawText);
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
    const cleanText = (sel || turn.cleanPrompt || turn.rawText)
      .replace(/[#*`_]/g, '')
      .replace(/https?:\/\/[^\s]+/g, 'link');

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
</script>

<div class="flex w-full justify-end">
  <div
    class="chat-content max-w-[88%] md:max-w-[78%] lg:max-w-[72%] rounded-2xl px-5 py-3.5 shadow-xs leading-relaxed overflow-hidden relative group transition-all bg-blue-600 text-white rounded-tr-none"
  >
    <div class="whitespace-pre-wrap break-words text-sm leading-relaxed font-sans select-text">
      {#if turn.cleanPrompt}
        {turn.cleanPrompt}
      {:else if turn.systemContext || turn.filesContext}
        <span class="italic text-xs text-blue-200 opacity-90 flex items-center gap-1.5">
          <i class="ph ph-sparkle"></i> Session initialized with environment context
        </span>
      {:else}
        {turn.rawText || ''}
      {/if}
    </div>

    <!-- Bubble Footer -->
    <div class="flex items-center justify-between mt-2 pt-2 border-t border-white/20 no-print text-[11px]">
      <button
        onclick={copyPrompt}
        title="Copy prompt"
        class="opacity-60 hover:opacity-100 transition-opacity mr-auto cursor-pointer"
      >
        {#if copied}
          <i class="ph ph-check text-green-400"></i>
        {:else}
          <i class="ph ph-copy"></i>
        {/if}
      </button>

      <div class="flex items-center gap-3">
        <button
          onclick={toggleTTS}
          title="Read aloud"
          class="opacity-60 hover:opacity-100 transition-all cursor-pointer {isSpeaking ? 'text-red-300 opacity-100' : ''}"
        >
          <i class="ph {isSpeaking ? 'ph-stop' : 'ph-play'}"></i>
        </button>

        {#if turn.userMsg?.timestamp}
          <span class="text-[10px] opacity-60">
            {new Date(turn.userMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        {/if}
      </div>
    </div>
  </div>
</div>
