<script lang="ts">
  import type { Rule } from "./types.js";

  interface Props {
    rule: Rule;
    onClose: () => void;
  }

  let { rule, onClose }: Props = $props();

  function formatDate(iso: string | undefined): string {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Backdrop -->
<div
  role="presentation"
  tabindex="-1"
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
  onclick={onBackdropClick}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Card -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Rule metadata"
    tabindex="-1"
    class="w-full max-w-sm rounded-2xl bg-white dark:bg-surface-800 shadow-2xl ring-1 ring-surface-200 dark:ring-surface-700 overflow-hidden"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-5 pb-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <!-- Info icon -->
        <span class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="7" cy="7" r="6"/>
            <line x1="7" y1="6" x2="7" y2="10"/>
            <circle cx="7" cy="4" r="0.5" fill="currentColor" stroke="none"/>
          </svg>
        </span>
        <div class="min-w-0">
          <p class="text-xs font-medium text-surface-400 dark:text-surface-500 leading-none mb-0.5">Rule metadata</p>
          <p class="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{rule.name}</p>
        </div>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 dark:text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-700 dark:hover:text-surface-300 transition-colors ml-2"
        aria-label="Close"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
        </svg>
      </button>
    </div>

    <!-- Divider -->
    <div class="h-px bg-surface-100 dark:bg-surface-700 mx-5"></div>

    <!-- Fields -->
    <div class="px-5 py-4 flex flex-col gap-3">
      {@render metaRow("Created by", rule.metadata?.createdBy, "person")}
      {@render metaRow("Updated by", rule.metadata?.updatedBy, "person")}
      {@render metaRow("Created at", formatDate(rule.metadata?.createdAt), "clock")}
      {@render metaRow("Updated at", formatDate(rule.metadata?.updatedAt), "clock")}
    </div>

    <!-- Footer -->
    <div class="px-5 pb-5 pt-1">
      <button
        type="button"
        onclick={onClose}
        class="w-full text-sm font-medium px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
      >
        Close
      </button>
    </div>
  </div>
</div>

{#snippet metaRow(label: string, value: string | undefined, icon: "person" | "clock")}
  <div class="flex items-start gap-3">
    <span class="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-surface-100 dark:bg-surface-700 text-surface-400 dark:text-surface-500 mt-0.5">
      {#if icon === "person"}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="4" r="2.5"/>
          <path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5"/>
        </svg>
      {:else}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="6" r="5"/>
          <polyline points="6,3 6,6 8.5,6"/>
        </svg>
      {/if}
    </span>
    <div class="flex flex-col gap-0.5 min-w-0">
      <span class="text-[11px] font-medium text-surface-400 dark:text-surface-500 leading-none">{label}</span>
      <span class="text-sm text-surface-800 dark:text-surface-200 leading-snug {!value ? 'italic text-surface-400 dark:text-surface-600' : ''}">
        {value ?? "—"}
      </span>
    </div>
  </div>
{/snippet}
