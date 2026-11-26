<script lang="ts">
  import { toasts, removeToast } from '../../stores/toastStore';
  import { escapeHtml } from '../../utils/formatters';

  const typeIcons: Record<string, string> = {
    error: '<i class="ph ph-warning-circle text-red-500 text-lg shrink-0"></i>',
    warning: '<i class="ph ph-warning text-amber-500 text-lg shrink-0"></i>',
    success: '<i class="ph ph-check-circle text-emerald-400 text-lg shrink-0"></i>',
    info: '<i class="ph ph-info text-blue-400 text-lg shrink-0"></i>',
  };

  const borderColors: Record<string, string> = {
    error: 'border-red-500/60 dark:border-red-500/50',
    warning: 'border-amber-500/60 dark:border-amber-500/50',
    success: 'border-emerald-500/60 dark:border-emerald-500/50',
    info: 'border-blue-500/60 dark:border-blue-500/50',
  };
</script>

<div id="toast-container" class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
  {#each $toasts as toast (toast.id)}
    <div
      class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/95 text-slate-100 border {borderColors[toast.type] || borderColors.info} shadow-2xl backdrop-blur text-xs font-medium max-w-sm transition-all duration-300"
    >
      {@html typeIcons[toast.type] || typeIcons.info}
      <span class="flex-1 leading-snug">{toast.message}</span>
      <button
        onclick={() => removeToast(toast.id)}
        class="text-slate-400 hover:text-white p-0.5 cursor-pointer shrink-0"
        aria-label="Close notification"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>
  {/each}
</div>
